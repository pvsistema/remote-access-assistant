import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any

import psycopg2
import psycopg2.extras

SCHEMA = 't_p23746347_remote_access_assist'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def _conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def _hash(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 120000).hex()


def _make_hash(password: str) -> str:
    salt = secrets.token_hex(8)
    return f'{salt}${_hash(password, salt)}'


def _check_hash(password: str, stored: str) -> bool:
    if '$' not in stored:
        return False
    salt, digest = stored.split('$', 1)
    return secrets.compare_digest(_hash(password, salt), digest)


def _resp(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {'statusCode': status, 'headers': CORS, 'isBase64Encoded': False, 'body': json.dumps(body, default=str)}


def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """Регистрация, вход и проверка сессии оператора личного кабинета ПВ-СИСТЕМА Доступ"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''

    conn = _conn()
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET' and action == 'me':
        if not token:
            return _resp(401, {'error': 'no_token'})
        cur.execute(
            f"SELECT a.id, a.email, a.full_name, a.company, a.role FROM {SCHEMA}.auth_tokens t "
            f"JOIN {SCHEMA}.accounts a ON a.id = t.account_id "
            f"WHERE t.token = %s AND t.expires_at > NOW()",
            (token,),
        )
        row = cur.fetchone()
        if not row:
            return _resp(401, {'error': 'invalid_token'})
        return _resp(200, {'user': dict(row)})

    if method != 'POST':
        return _resp(405, {'error': 'method_not_allowed'})

    body = json.loads(event.get('body') or '{}')
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''

    if action == 'register':
        if len(email) < 5 or len(password) < 6:
            return _resp(400, {'error': 'bad_credentials'})
        cur.execute(f"SELECT id FROM {SCHEMA}.accounts WHERE email = %s", (email,))
        if cur.fetchone():
            return _resp(409, {'error': 'email_exists'})
        cur.execute(
            f"INSERT INTO {SCHEMA}.accounts (email, password_hash, full_name, company) "
            f"VALUES (%s, %s, %s, %s) RETURNING id, email, full_name, company, role",
            (email, _make_hash(password), (body.get('full_name') or '').strip(), (body.get('company') or '').strip()),
        )
        user = dict(cur.fetchone())
    elif action == 'login':
        cur.execute(
            f"SELECT id, email, full_name, company, role, password_hash FROM {SCHEMA}.accounts WHERE email = %s",
            (email,),
        )
        row = cur.fetchone()
        if not row or not _check_hash(password, row['password_hash']):
            return _resp(401, {'error': 'invalid_credentials'})
        user = {k: row[k] for k in ('id', 'email', 'full_name', 'company', 'role')}
    else:
        return _resp(400, {'error': 'unknown_action'})

    new_token = secrets.token_hex(32)
    expires = datetime.utcnow() + timedelta(days=14)
    cur.execute(
        f"INSERT INTO {SCHEMA}.auth_tokens (account_id, token, expires_at) VALUES (%s, %s, %s)",
        (user['id'], new_token, expires),
    )
    cur.execute(
        f"INSERT INTO {SCHEMA}.activity_log (account_id, event_type, message) VALUES (%s, %s, %s)",
        (user['id'], action, 'Вход в личный кабинет' if action == 'login' else 'Регистрация аккаунта'),
    )
    cur.close()
    conn.close()
    return _resp(200, {'token': new_token, 'user': user})
