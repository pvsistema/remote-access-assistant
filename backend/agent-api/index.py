import hashlib
import json
import os
import random
import secrets
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


def _pwd_hash(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 120000).hex()


def _make_pwd(password: str) -> str:
    salt = secrets.token_hex(8)
    return f'{salt}${_pwd_hash(password, salt)}'


def _check_pwd(password: str, stored: str) -> bool:
    if not stored or '$' not in stored:
        return False
    salt, digest = stored.split('$', 1)
    return secrets.compare_digest(_pwd_hash(password, salt), digest)


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
            f"SELECT d.id, d.device_uid, d.access_id, d.name, d.os, d.os_version, d.app_version, d.local_ip, "
            f"d.unattended, d.is_online, d.last_seen, d.created_at, d.group_id, d.is_favorite, d.note, d.mac_address, "
            f"g.name AS group_name FROM {SCHEMA}.devices d "
            f"LEFT JOIN {SCHEMA}.device_groups g ON g.id = d.group_id "
            f"WHERE d.account_id = %s ORDER BY d.is_favorite DESC, d.is_online DESC, d.name",
            (aid,),
        )
        devices = [dict(r) for r in cur.fetchall()]
        cur.execute(
            f"SELECT id, name FROM {SCHEMA}.device_groups WHERE account_id = %s ORDER BY name", (aid,)
        )
        groups = [dict(r) for r in cur.fetchall()]
        cur.execute(
            f"SELECT id, email, full_name, role, status, invite_code, created_at FROM {SCHEMA}.team_members "
            f"WHERE owner_id = %s ORDER BY created_at DESC",
            (aid,),
        )
        team = [dict(r) for r in cur.fetchall()]
        cur.execute(
            f"SELECT f.id, f.file_name, f.size_bytes, f.direction, f.status, f.created_at, d.name AS device_name "
            f"FROM {SCHEMA}.file_transfers f LEFT JOIN {SCHEMA}.devices d ON d.id = f.device_id "
            f"WHERE f.account_id = %s ORDER BY f.created_at DESC LIMIT 30",
            (aid,),
        )
        files = [dict(r) for r in cur.fetchall()]
        cur.execute(
            f"SELECT id, access_id, session_code, status, mode, operator_name, started_at, ended_at, created_at, "
            f"expires_at, allow_control, allow_files, allow_clipboard, allow_audio, is_recorded "
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
            'groups': groups,
            'team': team,
            'files': files,
            'sessions': sessions,
            'logs': logs,
            'stats': {'devices': len(devices), 'online': online, 'sessions_30d': month},
            'relay_url': RELAY_URL,
        })

    if method == 'GET' and action == 'messages':
        session_id = (params.get('session_id') or '0')
        cur.execute(
            f"SELECT id, author, side, text, created_at FROM {SCHEMA}.session_messages "
            f"WHERE session_id = %s ORDER BY created_at LIMIT 200",
            (int(session_id) if session_id.isdigit() else 0,),
        )
        return _resp(200, {'messages': [dict(r) for r in cur.fetchall()]})

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
        # Store the device access password so other accounts can connect with it.
        supplied_pwd = (body.get('password') or '').strip()
        if len(supplied_pwd) >= 4:
            cur.execute(
                f"UPDATE {SCHEMA}.devices SET permanent_password=%s WHERE id=%s",
                (_make_pwd(supplied_pwd), dev['id']),
            )
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
        supplied = (body.get('password') or '').strip()
        cur.execute(
            f"SELECT id, name, account_id, permanent_password, unattended "
            f"FROM {SCHEMA}.devices WHERE access_id=%s",
            (access_id,),
        )
        dev = cur.fetchone()
        if not dev:
            return _resp(404, {'error': 'device_not_found'})

        # A device from another account may only be accessed with its password.
        own = dev['account_id'] == aid
        if not own:
            if not dev['permanent_password']:
                return _resp(403, {'error': 'password_required'})
            if not supplied:
                return _resp(403, {'error': 'password_required'})
            if not _check_pwd(supplied, dev['permanent_password']):
                _log(cur, aid, 'session_denied', f'Неверный пароль к ID {access_id}', dev['id'], None, ip)
                return _resp(403, {'error': 'bad_device_password'})

        code = _digits(6)
        otp = _digits(4)
        expires = datetime.utcnow() + timedelta(minutes=15)
        perms = body.get('permissions') or {}
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (account_id, device_id, access_id, session_code, one_time_password, "
            f"status, mode, operator_name, relay_url, expires_at, allow_control, allow_files, allow_clipboard, "
            f"allow_audio, is_recorded) "
            f"VALUES (%s,%s,%s,%s,%s,'pending',%s,%s,%s,%s,%s,%s,%s,%s,%s) "
            f"RETURNING id, session_code, one_time_password, expires_at, status, mode, "
            f"allow_control, allow_files, allow_clipboard, allow_audio, is_recorded",
            (aid, dev['id'], access_id, code, otp, mode,
             user['full_name'] or user['email'], RELAY_URL, expires,
             bool(perms.get('control', mode == 'control')), bool(perms.get('files', True)),
             bool(perms.get('clipboard', True)), bool(perms.get('audio', False)),
             bool(perms.get('record', False))),
        )
        sess = dict(cur.fetchone())
        _log(cur, aid, 'session_create', f'Создан сеанс к ID {access_id}', dev['id'], sess['id'], ip)
        sess['relay_url'] = RELAY_URL
        sess['device_name'] = dev['name']
        return _resp(200, {'session': sess})

    if action == 'update_session':
        session_id = body.get('session_id')
        status = (body.get('status') or '')[:24]
        if status not in ('closed', 'rejected'):
            # Only the controlled machine may confirm a session (action=confirm_session).
            return _resp(403, {'error': 'confirm_on_remote_side'})
        # Either side may end the session: the operator who started it,
        # or the owner of the controlled device.
        cur.execute(
            f"UPDATE {SCHEMA}.sessions s SET status=%s, ended_at=NOW() "
            f"WHERE s.id=%s AND (s.account_id=%s OR s.device_id IN "
            f"(SELECT id FROM {SCHEMA}.devices WHERE account_id=%s)) "
            f"RETURNING s.id, s.device_id, s.access_id",
            (status, session_id, aid, aid),
        )
        row = cur.fetchone()
        if not row:
            return _resp(404, {'error': 'session_not_found'})
        labels = {'closed': 'Сеанс завершён', 'rejected': 'Сеанс отклонён'}
        _log(cur, aid, f'session_{status}', f"{labels[status]} · ID {row['access_id']}", row['device_id'], row['id'], ip)
        return _resp(200, {'ok': True, 'status': status})

    if action == 'create_group':
        name = (body.get('name') or '').strip()[:120]
        if not name:
            return _resp(400, {'error': 'name_required'})
        cur.execute(
            f"INSERT INTO {SCHEMA}.device_groups (account_id, name) VALUES (%s, %s) RETURNING id, name",
            (aid, name),
        )
        return _resp(200, {'group': dict(cur.fetchone())})

    if action == 'update_device':
        device_id = body.get('device_id')
        cur.execute(f"SELECT id FROM {SCHEMA}.devices WHERE id=%s AND account_id=%s", (device_id, aid))
        if not cur.fetchone():
            return _resp(404, {'error': 'device_not_found'})
        if 'name' in body:
            cur.execute(f"UPDATE {SCHEMA}.devices SET name=%s WHERE id=%s", ((body.get('name') or '').strip()[:255], device_id))
        if 'note' in body:
            cur.execute(f"UPDATE {SCHEMA}.devices SET note=%s WHERE id=%s", ((body.get('note') or '').strip(), device_id))
        if 'group_id' in body:
            gid = body.get('group_id')
            cur.execute(f"UPDATE {SCHEMA}.devices SET group_id=%s WHERE id=%s", (gid if gid else None, device_id))
        if 'is_favorite' in body:
            cur.execute(f"UPDATE {SCHEMA}.devices SET is_favorite=%s WHERE id=%s", (bool(body.get('is_favorite')), device_id))
        if 'unattended' in body:
            cur.execute(f"UPDATE {SCHEMA}.devices SET unattended=%s WHERE id=%s", (bool(body.get('unattended')), device_id))
        cur.execute(
            f"SELECT id, name, note, group_id, is_favorite, unattended FROM {SCHEMA}.devices WHERE id=%s", (device_id,)
        )
        return _resp(200, {'device': dict(cur.fetchone())})

    if action == 'wake_device':
        cur.execute(
            f"SELECT id, name, mac_address FROM {SCHEMA}.devices WHERE id=%s AND account_id=%s",
            (body.get('device_id'), aid),
        )
        dev = cur.fetchone()
        if not dev:
            return _resp(404, {'error': 'device_not_found'})
        _log(cur, aid, 'wake_on_lan', f"Отправлен сигнал включения на «{dev['name']}»", dev['id'], None, ip)
        return _resp(200, {'ok': True, 'message': 'Магический пакет отправлен в локальную сеть устройства'})

    if action == 'send_message':
        session_id = body.get('session_id')
        text = (body.get('text') or '').strip()
        if not text:
            return _resp(400, {'error': 'text_required'})
        side = 'client' if body.get('side') == 'client' else 'operator'
        cur.execute(
            f"INSERT INTO {SCHEMA}.session_messages (session_id, account_id, author, side, text) "
            f"VALUES (%s,%s,%s,%s,%s) RETURNING id, author, side, text, created_at",
            (session_id, aid, user['full_name'] or user['email'], side, text[:2000]),
        )
        return _resp(200, {'message': dict(cur.fetchone())})

    if action == 'log_transfer':
        cur.execute(
            f"INSERT INTO {SCHEMA}.file_transfers (session_id, account_id, device_id, file_name, size_bytes, direction, status) "
            f"VALUES (%s,%s,%s,%s,%s,%s,'done') RETURNING id, file_name, size_bytes, direction, status, created_at",
            (body.get('session_id'), aid, body.get('device_id'), (body.get('file_name') or 'file')[:255],
             int(body.get('size_bytes') or 0), 'download' if body.get('direction') == 'download' else 'upload'),
        )
        row = dict(cur.fetchone())
        _log(cur, aid, 'file_transfer', f"Передан файл {row['file_name']}", body.get('device_id'), body.get('session_id'), ip)
        return _resp(200, {'transfer': row})

    if action == 'invite_member':
        email = (body.get('email') or '').strip().lower()
        if '@' not in email:
            return _resp(400, {'error': 'bad_email'})
        code = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        cur.execute(
            f"INSERT INTO {SCHEMA}.team_members (owner_id, email, full_name, role, status, invite_code) "
            f"VALUES (%s,%s,%s,%s,'invited',%s) RETURNING id, email, full_name, role, status, invite_code, created_at",
            (aid, email, (body.get('full_name') or '').strip()[:255], (body.get('role') or 'operator')[:32], code),
        )
        member = dict(cur.fetchone())
        _log(cur, aid, 'team_invite', f'Приглашён оператор {email}', None, None, ip)
        return _resp(200, {'member': member})

    if action == 'update_member':
        cur.execute(
            f"UPDATE {SCHEMA}.team_members SET role=%s, status=%s WHERE id=%s AND owner_id=%s "
            f"RETURNING id, email, role, status",
            ((body.get('role') or 'operator')[:32], (body.get('status') or 'invited')[:24], body.get('member_id'), aid),
        )
        row = cur.fetchone()
        if not row:
            return _resp(404, {'error': 'member_not_found'})
        return _resp(200, {'member': dict(row)})

    if action == 'rename_device':
        cur.execute(
            f"UPDATE {SCHEMA}.devices SET name=%s WHERE id=%s AND account_id=%s RETURNING id, name",
            ((body.get('name') or '').strip()[:255], body.get('device_id'), aid),
        )
        row = cur.fetchone()
        if not row:
            return _resp(404, {'error': 'device_not_found'})
        return _resp(200, {'device': dict(row)})

    # --- Consent on the controlled side ---

    # Sessions requested BY OTHERS to devices owned by this account.
    if action == 'my_incoming':
        cur.execute(
            f"SELECT s.id, s.access_id, s.session_code, s.status, s.mode, s.operator_name, "
            f"s.created_at, s.expires_at, s.allow_control, s.allow_files, s.allow_clipboard, "
            f"s.allow_audio, s.is_recorded, d.device_uid, d.name AS device_name "
            f"FROM {SCHEMA}.sessions s JOIN {SCHEMA}.devices d ON d.id = s.device_id "
            f"WHERE d.account_id=%s AND s.status IN ('pending','active') AND s.expires_at > NOW() "
            f"ORDER BY s.created_at DESC LIMIT 10",
            (aid,),
        )
        return _resp(200, {'sessions': [dict(r) for r in cur.fetchall()]})

    # The controlled machine confirms an incoming request.
    if action == 'confirm_session':
        cur.execute(
            f"UPDATE {SCHEMA}.sessions s SET status='active', started_at=NOW() "
            f"WHERE s.id=%s AND s.status='pending' AND s.expires_at > NOW() "
            f"AND s.device_id IN (SELECT id FROM {SCHEMA}.devices WHERE account_id=%s) "
            f"RETURNING s.id, s.device_id, s.access_id",
            (body.get('session_id'), aid),
        )
        row = cur.fetchone()
        if not row:
            return _resp(404, {'error': 'session_not_found'})
        _log(cur, aid, 'session_active', f"Сеанс подтверждён · ID {row['access_id']}",
             row['device_id'], row['id'], ip)
        return _resp(200, {'ok': True, 'status': 'active'})

    # Owner sets/updates the permanent access password of their device.
    if action == 'set_device_password':
        password = (body.get('password') or '').strip()
        if len(password) < 4:
            return _resp(400, {'error': 'password_too_short'})
        cur.execute(
            f"UPDATE {SCHEMA}.devices SET permanent_password=%s WHERE id=%s AND account_id=%s RETURNING id",
            (_make_pwd(password), body.get('device_id'), aid),
        )
        if not cur.fetchone():
            return _resp(404, {'error': 'device_not_found'})
        return _resp(200, {'ok': True})

    return _resp(400, {'error': 'unknown_action'})