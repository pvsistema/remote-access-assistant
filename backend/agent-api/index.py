import json
import os
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

import psycopg2
import psycopg2.extras

SCHEMA = 't_p23746347_remote_access_assist'
RELAY_URL = 'wss://relay.pv-access.ru/v1'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, X-Device-Uid',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def _resp(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {'statusCode': status, 'headers': CORS, 'isBase64Encoded': False, 'body': json.dumps(body, default=str)}


def _digits(n: int) -> str:
    return ''.join(random.choice(string.digits) for _ in range(n))


def _auth(cur, token: str) -> Optional[dict]:
    if not token:
        return None
    cur.execute(
        f"SELECT a.id, a.email, a.full_name, a.company, a.role FROM {SCHEMA}.auth_tokens t "
        f"JOIN {SCHEMA}.accounts a ON a.id = t.account_id "
        f"WHERE t.token = %s AND t.expires_at > NOW()",
        (token,),
    )
    row = cur.fetchone()
    return dict(row) if row else None


def _log(cur, account_id, event_type, message, device_id=None, session_id=None, ip=''):
    cur.execute(
        f"INSERT INTO {SCHEMA}.activity_log (account_id, device_id, session_id, event_type, message, ip) "
        f"VALUES (%s, %s, %s, %s, %s, %s)",
        (account_id, device_id, session_id, event_type, message, ip),
    )


def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """API удалённого доступа: регистрация устройств из C#-клиента, heartbeat, выдача кодов сеанса, журнал подключений"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''
    ip = (((event.get('requestContext') or {}).get('identity') or {}).get('sourceIp')) or ''
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user = _auth(cur, token)
    if not user:
        return _resp(401, {'error': 'unauthorized'})
    aid = user['id']

    if method == 'GET' and action == 'overview':
        cur.execute(
            f"SELECT id, device_uid, access_id, name, os, os_version, app_version, local_ip, unattended, "
            f"is_online, last_seen, created_at FROM {SCHEMA}.devices WHERE account_id = %s ORDER BY is_online DESC, name",
            (aid,),
        )
        devices = [dict(r) for r in cur.fetchall()]
        cur.execute(
            f"SELECT id, access_id, session_code, status, mode, operator_name, started_at, ended_at, created_at, expires_at "
            f"FROM {SCHEMA}.sessions WHERE account_id = %s ORDER BY created_at DESC LIMIT 25",
            (aid,),
        )
        sessions = [dict(r) for r in cur.fetchall()]
        cur.execute(
            f"SELECT id, event_type, message, ip, created_at FROM {SCHEMA}.activity_log "
            f"WHERE account_id = %s ORDER BY created_at DESC LIMIT 40",
            (aid,),
        )
        logs = [dict(r) for r in cur.fetchall()]
        online = sum(1 for d in devices if d['is_online'])
        cur.execute(
            f"SELECT COUNT(*) AS c FROM {SCHEMA}.sessions WHERE account_id = %s AND created_at > NOW() - INTERVAL '30 days'",
            (aid,),
        )
        month = cur.fetchone()['c']
        return _resp(200, {
            'devices': devices,
            'sessions': sessions,
            'logs': logs,
            'stats': {'devices': len(devices), 'online': online, 'sessions_30d': month},
            'relay_url': RELAY_URL,
        })

    if method != 'POST':
        return _resp(405, {'error': 'method_not_allowed'})

    if action == 'register_device':
        device_uid = (body.get('device_uid') or '').strip()
        if not device_uid:
            return _resp(400, {'error': 'device_uid_required'})
        cur.execute(f"SELECT id, access_id FROM {SCHEMA}.devices WHERE device_uid = %s", (device_uid,))
        existing = cur.fetchone()
        name = (body.get('name') or 'Компьютер').strip()[:255]
        os_name = (body.get('os') or '').strip()[:64]
        os_version = (body.get('os_version') or '').strip()[:64]
        app_version = (body.get('app_version') or '').strip()[:32]
        local_ip = (body.get('local_ip') or '').strip()[:64]
        unattended = bool(body.get('unattended'))
        if existing:
            cur.execute(
                f"UPDATE {SCHEMA}.devices SET name=%s, os=%s, os_version=%s, app_version=%s, local_ip=%s, "
                f"unattended=%s, is_online=TRUE, last_seen=NOW(), account_id=%s WHERE id=%s "
                f"RETURNING id, access_id, name",
                (name, os_name, os_version, app_version, local_ip, unattended, aid, existing['id']),
            )
        else:
            access_id = _digits(9)
            cur.execute(
                f"INSERT INTO {SCHEMA}.devices (account_id, device_uid, access_id, name, os, os_version, app_version, "
                f"local_ip, unattended, is_online, last_seen) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,TRUE,NOW()) "
                f"RETURNING id, access_id, name",
                (aid, device_uid, access_id, name, os_name, os_version, app_version, local_ip, unattended),
            )
        dev = dict(cur.fetchone())
        _log(cur, aid, 'device_register', f"Устройство «{dev['name']}» подключено к аккаунту", dev['id'], None, ip)
        return _resp(200, {'device': dev, 'relay_url': RELAY_URL})

    if action == 'heartbeat':
        device_uid = (body.get('device_uid') or '').strip()
        cur.execute(
            f"UPDATE {SCHEMA}.devices SET is_online=TRUE, last_seen=NOW() "
            f"WHERE device_uid=%s AND account_id=%s RETURNING id, access_id",
            (device_uid, aid),
        )
        row = cur.fetchone()
        if not row:
            return _resp(404, {'error': 'device_not_found'})
        cur.execute(
            f"SELECT id, session_code, mode, operator_name, status FROM {SCHEMA}.sessions "
            f"WHERE device_id=%s AND status='pending' AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
            (row['id'],),
        )
        pending = cur.fetchone()
        return _resp(200, {'ok': True, 'pending_session': dict(pending) if pending else None})

    if action == 'set_offline':
        device_uid = (body.get('device_uid') or '').strip()
        cur.execute(
            f"UPDATE {SCHEMA}.devices SET is_online=FALSE, last_seen=NOW() WHERE device_uid=%s AND account_id=%s",
            (device_uid, aid),
        )
        return _resp(200, {'ok': True})

    if action == 'create_session':
        access_id = (body.get('access_id') or '').strip()
        mode = (body.get('mode') or 'control')[:24]
        cur.execute(
            f"SELECT id, name, account_id FROM {SCHEMA}.devices WHERE access_id=%s", (access_id,)
        )
        dev = cur.fetchone()
        code = _digits(6)
        otp = _digits(4)
        expires = datetime.utcnow() + timedelta(minutes=15)
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (account_id, device_id, access_id, session_code, one_time_password, "
            f"status, mode, operator_name, relay_url, expires_at) "
            f"VALUES (%s,%s,%s,%s,%s,'pending',%s,%s,%s,%s) RETURNING id, session_code, one_time_password, expires_at, status, mode",
            (aid, dev['id'] if dev else None, access_id, code, otp, mode,
             user['full_name'] or user['email'], RELAY_URL, expires),
        )
        sess = dict(cur.fetchone())
        _log(cur, aid, 'session_create', f'Создан сеанс к ID {access_id}', dev['id'] if dev else None, sess['id'], ip)
        sess['relay_url'] = RELAY_URL
        sess['device_name'] = dev['name'] if dev else None
        return _resp(200, {'session': sess})

    if action == 'update_session':
        session_id = body.get('session_id')
        status = (body.get('status') or '')[:24]
        if status not in ('active', 'closed', 'rejected'):
            return _resp(400, {'error': 'bad_status'})
        if status == 'active':
            cur.execute(
                f"UPDATE {SCHEMA}.sessions SET status='active', started_at=NOW() WHERE id=%s AND account_id=%s "
                f"RETURNING id, device_id, access_id",
                (session_id, aid),
            )
        else:
            cur.execute(
                f"UPDATE {SCHEMA}.sessions SET status=%s, ended_at=NOW() WHERE id=%s AND account_id=%s "
                f"RETURNING id, device_id, access_id",
                (status, session_id, aid),
            )
        row = cur.fetchone()
        if not row:
            return _resp(404, {'error': 'session_not_found'})
        labels = {'active': 'Сеанс подтверждён', 'closed': 'Сеанс завершён', 'rejected': 'Сеанс отклонён'}
        _log(cur, aid, f'session_{status}', f"{labels[status]} · ID {row['access_id']}", row['device_id'], row['id'], ip)
        return _resp(200, {'ok': True, 'status': status})

    if action == 'rename_device':
        cur.execute(
            f"UPDATE {SCHEMA}.devices SET name=%s WHERE id=%s AND account_id=%s RETURNING id, name",
            ((body.get('name') or '').strip()[:255], body.get('device_id'), aid),
        )
        row = cur.fetchone()
        if not row:
            return _resp(404, {'error': 'device_not_found'})
        return _resp(200, {'device': dict(row)})

    return _resp(400, {'error': 'unknown_action'})
