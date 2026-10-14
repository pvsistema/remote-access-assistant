import base64
import hashlib
import hmac
import json
import os
import random
import secrets
import string
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

import psycopg2
import psycopg2.extras

SCHEMA = 't_p23746347_remote_access_assist'
# Own relay server (own VPS) is configured per account; empty = cloud polling only.
TICKET_TTL = 6 * 60 * 60


def _relay(cur, account_id: int) -> Optional[dict]:
    cur.execute(
        f"SELECT url, secret, enabled FROM {SCHEMA}.relay_servers WHERE account_id=%s",
        (account_id,),
    )
    row = cur.fetchone()
    if not row or not row['enabled'] or not row['url'] or not row['secret']:
        return None
    return dict(row)


def _relay_ticket(secret: str, session_id: int, role: str, control: bool) -> str:
    """Короткий подписанный пропуск: ретранслятор проверяет его без базы."""
    payload = json.dumps({
        'sid': session_id,
        'role': role,
        'control': bool(control),
        'exp': time.time() + TICKET_TTL,
    }, separators=(',', ':')).encode()
    p = base64.urlsafe_b64encode(payload).rstrip(b'=').decode()
    sig = hmac.new(secret.encode(), p.encode(), hashlib.sha256).digest()
    return f"{p}.{base64.urlsafe_b64encode(sig).rstrip(b'=').decode()}"


def _relay_info(cur, account_id: int, session_id: int, role: str, control: bool) -> dict:
    """Данные для подключения к своему серверу; пусто — работаем через облако."""
    srv = _relay(cur, account_id)
    if not srv:
        return {'relay_url': '', 'relay_ticket': ''}
    return {
        'relay_url': srv['url'],
        'relay_ticket': _relay_ticket(srv['secret'], session_id, role, control),
    }
GUEST_EMAIL = 'guest@pv-access.local'

# Actions available without registration (guest mode: ID + password only).
GUEST_ACTIONS = {
    'guest_register', 'guest_state', 'create_session', 'update_session',
    'confirm_session', 'my_incoming', 'messages', 'send_message',
    'set_device_password', 'heartbeat', 'set_offline',
}

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, X-Device-Uid, X-Guest-Token',
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

    # Guest mode: no registration, identified only by a device token.
    guest_token = (headers.get('X-Guest-Token') or headers.get('x-guest-token') or '').strip()
    # Tokens are generated as hex by us; reject anything else (SQL safety).
    if guest_token and (len(guest_token) > 64 or not all(c in string.hexdigits for c in guest_token)):
        return _resp(400, {'error': 'bad_guest_token'})
    guest = False
    user = _auth(cur, token)

    # guest_register is the entry point: it works without any token yet.
    if not user and action in GUEST_ACTIONS and (guest_token or action == 'guest_register'):
        cur.execute(f"SELECT id FROM {SCHEMA}.accounts WHERE email=%s", (GUEST_EMAIL,))
        row = cur.fetchone()
        if not row:
            return _resp(500, {'error': 'guest_account_missing'})
        guest = True
        aid = row['id']
        user = {'id': aid, 'email': '', 'full_name': 'Гость', 'company': '', 'role': 'guest'}
    elif not user:
        return _resp(401, {'error': 'unauthorized'})
    else:
        aid = user['id']



    if method == 'GET' and action == 'overview':
        cur.execute(
            f"SELECT d.id, d.device_uid, d.access_id, d.name, d.os, d.os_version, d.app_version, d.local_ip, "
            f"d.unattended, d.is_online, d.last_seen, d.created_at, d.group_id, d.is_favorite, d.note, d.mac_address, "
            f"g.name AS group_name FROM {SCHEMA}.devices d "
            f"LEFT JOIN {SCHEMA}.device_groups g ON g.id = d.group_id "
            f"WHERE d.account_id = %s AND d.guest_token = '' "
            f"ORDER BY d.is_favorite DESC, d.is_online DESC, d.name",
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
            'relay': {'configured': bool(_relay(cur, aid))},
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
        return _resp(200, {'device': dev, 'relay_configured': bool(_relay(cur, aid))})

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
        return _resp(200, {
            'ok': True,
            'pending_session': dict(pending) if pending else None,
            'relay_configured': bool(_relay(cur, aid)),
        })

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
            f"SELECT id, name, account_id, permanent_password, unattended, guest_token "
            f"FROM {SCHEMA}.devices WHERE access_id=%s",
            (access_id,),
        )
        dev = cur.fetchone()
        if not dev:
            return _resp(404, {'error': 'device_not_found'})

        # A device from another account may only be accessed with its password.
        # All guests share one service account, so they are compared by token.
        if guest:
            own = dev['guest_token'] == guest_token and dev['guest_token'] != ''
        else:
            own = dev['account_id'] == aid and not dev['guest_token']
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
        operator = (body.get('operator_name') or '').strip()[:255] if guest else ''
        # Both sides must meet on the SAME relay — the one of the remote PC owner.
        srv = _relay(cur, dev['account_id'])
        relay_url = srv['url'] if srv else ''
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (account_id, guest_token, device_id, access_id, session_code, "
            f"one_time_password, status, mode, operator_name, relay_url, expires_at, allow_control, "
            f"allow_files, allow_clipboard, allow_audio, is_recorded) "
            f"VALUES (%s,%s,%s,%s,%s,%s,'pending',%s,%s,%s,%s,%s,%s,%s,%s,%s) "
            f"RETURNING id, session_code, one_time_password, expires_at, status, mode, "
            f"allow_control, allow_files, allow_clipboard, allow_audio, is_recorded",
            (aid, guest_token if guest else '', dev['id'], access_id, code, otp, mode,
             operator or user['full_name'] or user['email'] or 'Гость', relay_url, expires,
             bool(perms.get('control', mode == 'control')), bool(perms.get('files', True)),
             bool(perms.get('clipboard', True)), bool(perms.get('audio', False)),
             bool(perms.get('record', False))),
        )
        sess = dict(cur.fetchone())
        _log(cur, aid, 'session_create', f'Создан сеанс к ID {access_id}', dev['id'], sess['id'], ip)
        sess['relay_url'] = relay_url
        sess['relay_ticket'] = (
            _relay_ticket(srv['secret'], sess['id'], 'operator', sess['allow_control']) if srv else ''
        )
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
        if guest:
            cur.execute(
                f"UPDATE {SCHEMA}.sessions s SET status=%s, ended_at=NOW() "
                f"WHERE s.id=%s AND (s.guest_token=%s OR s.device_id IN "
                f"(SELECT id FROM {SCHEMA}.devices WHERE guest_token=%s)) "
                f"RETURNING s.id, s.device_id, s.access_id",
                (status, session_id, guest_token, guest_token),
            )
        else:
            cur.execute(
                f"UPDATE {SCHEMA}.sessions s SET status=%s, ended_at=NOW() "
                f"WHERE s.id=%s AND (s.account_id=%s OR s.device_id IN "
                f"(SELECT id FROM {SCHEMA}.devices WHERE account_id=%s)) "
                f"AND s.guest_token='' "
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

    # --- Own relay server (e.g. a Beget VPS) ---

    if action == 'get_relay':
        if guest:
            return _resp(403, {'error': 'account_required'})
        cur.execute(
            f"SELECT url, enabled, last_ok_at, last_status, updated_at FROM {SCHEMA}.relay_servers "
            f"WHERE account_id=%s",
            (aid,),
        )
        row = cur.fetchone()
        return _resp(200, {'relay': dict(row) if row else None})

    if action == 'save_relay':
        if guest:
            return _resp(403, {'error': 'account_required'})
        url = (body.get('url') or '').strip()[:255]
        secret_value = (body.get('secret') or '').strip()[:128]
        enabled = bool(body.get('enabled', True))

        if url and not (url.startswith('wss://') or url.startswith('ws://')):
            return _resp(400, {'error': 'bad_relay_url'})
        if url and not secret_value:
            cur.execute(f"SELECT secret FROM {SCHEMA}.relay_servers WHERE account_id=%s", (aid,))
            old = cur.fetchone()
            secret_value = old['secret'] if old else ''
            if not secret_value:
                return _resp(400, {'error': 'secret_required'})

        cur.execute(
            f"INSERT INTO {SCHEMA}.relay_servers (account_id, url, secret, enabled, updated_at) "
            f"VALUES (%s,%s,%s,%s,NOW()) ON CONFLICT (account_id) DO UPDATE SET "
            f"url=EXCLUDED.url, secret=EXCLUDED.secret, enabled=EXCLUDED.enabled, updated_at=NOW() "
            f"RETURNING url, enabled",
            (aid, url, secret_value, enabled),
        )
        saved = dict(cur.fetchone())
        _log(cur, aid, 'relay_save', f"Свой сервер связи: {url or 'отключён'}", None, None, ip)
        return _resp(200, {'ok': True, 'relay': saved})

    # Checks that the relay server is alive and reachable.
    if action == 'check_relay':
        if guest:
            return _resp(403, {'error': 'account_required'})
        cur.execute(f"SELECT url FROM {SCHEMA}.relay_servers WHERE account_id=%s", (aid,))
        row = cur.fetchone()
        url = (body.get('url') or (row['url'] if row else '') or '').strip()
        if not url:
            return _resp(400, {'error': 'url_required'})

        health = url.replace('wss://', 'https://').replace('ws://', 'http://')
        if health.endswith('/ws'):
            health = health[:-3]
        health = health.rstrip('/') + '/health'

        status, detail = 'error', ''
        try:
            with urllib.request.urlopen(health, timeout=4) as r:
                data = json.loads(r.read().decode()[:2000])
                if data.get('service') == 'pv-relay':
                    status = 'ok'
                    detail = f"версия {data.get('version', '?')}, сеансов: {data.get('sessions', 0)}"
                else:
                    detail = 'по этому адресу отвечает другая программа'
        except urllib.error.HTTPError as e:
            detail = f'сервер ответил кодом {e.code}'
        except Exception:
            detail = 'сервер не отвечает'

        cur.execute(
            f"UPDATE {SCHEMA}.relay_servers SET last_status=%s, "
            f"last_ok_at=CASE WHEN %s THEN NOW() ELSE last_ok_at END WHERE account_id=%s",
            (detail[:255], status == 'ok', aid),
        )
        return _resp(200, {'status': status, 'detail': detail, 'checked': health})

    # --- Guest mode (no registration) ---

    # Creates a guest identity + device, returns ID and password to dictate.
    if action == 'guest_register':
        new_token = guest_token or secrets.token_hex(16)
        device_uid = (body.get('device_uid') or '').strip()[:64] or f'guest-{new_token[:12]}'
        name = (body.get('name') or 'Мой компьютер').strip()[:255]
        os_name = (body.get('os') or '').strip()[:64]
        os_version = (body.get('os_version') or '').strip()[:64]
        app_version = (body.get('app_version') or '').strip()[:32]

        cur.execute(
            f"SELECT id, access_id FROM {SCHEMA}.devices WHERE device_uid=%s AND guest_token=%s",
            (device_uid, new_token),
        )
        existing = cur.fetchone()
        password = (body.get('password') or '').strip()
        if len(password) < 4:
            password = ''.join(random.choice('abcdefghijkmnpqrstuvwxyz23456789') for _ in range(6))

        if existing:
            cur.execute(
                f"UPDATE {SCHEMA}.devices SET name=%s, os=%s, os_version=%s, app_version=%s, "
                f"permanent_password=%s, is_online=TRUE, last_seen=NOW() WHERE id=%s "
                f"RETURNING id, access_id, name",
                (name, os_name, os_version, app_version, _make_pwd(password), existing['id']),
            )
        else:
            cur.execute(
                f"INSERT INTO {SCHEMA}.devices (account_id, guest_token, device_uid, access_id, name, os, "
                f"os_version, app_version, permanent_password, is_online, last_seen) "
                f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,TRUE,NOW()) RETURNING id, access_id, name",
                (aid, new_token, device_uid, _digits(9), name, os_name, os_version,
                 app_version, _make_pwd(password)),
            )
        dev = dict(cur.fetchone())
        return _resp(200, {
            'guest_token': new_token,
            'device': dev,
            'password': password,
        })

    # Current guest state: my device + my incoming/outgoing sessions.
    if action == 'guest_state':
        cur.execute(
            f"SELECT id, device_uid, access_id, name, os, os_version, app_version, is_online, last_seen "
            f"FROM {SCHEMA}.devices WHERE guest_token=%s ORDER BY id LIMIT 1",
            (guest_token,),
        )
        row = cur.fetchone()
        device = dict(row) if row else None
        sessions = []
        if device:
            cur.execute(
                f"SELECT s.id, s.access_id, s.session_code, s.status, s.mode, s.operator_name, "
                f"s.created_at, s.expires_at, s.allow_control, s.allow_files, s.allow_clipboard, "
                f"s.allow_audio, s.is_recorded, s.guest_token "
                f"FROM {SCHEMA}.sessions s "
                f"WHERE (s.device_id=%s OR s.guest_token=%s) AND s.expires_at > NOW() "
                f"AND s.status IN ('pending','active') ORDER BY s.created_at DESC LIMIT 10",
                (device['id'], guest_token),
            )
            sessions = [dict(r) for r in cur.fetchall()]
        return _resp(200, {'device': device, 'sessions': sessions})

    # --- Consent on the controlled side ---

    # Sessions requested BY OTHERS to devices owned by this account.
    if action == 'my_incoming':
        cur.execute(
            f"SELECT s.id, s.access_id, s.session_code, s.status, s.mode, s.operator_name, "
            f"s.created_at, s.expires_at, s.allow_control, s.allow_files, s.allow_clipboard, "
            f"s.allow_audio, s.is_recorded, d.device_uid, d.name AS device_name "
            f"FROM {SCHEMA}.sessions s JOIN {SCHEMA}.devices d ON d.id = s.device_id "
            + ("WHERE d.guest_token=%s " if guest else "WHERE d.account_id=%s AND d.guest_token='' ")
            + f"AND s.status IN ('pending','active') AND s.expires_at > NOW() "
            f"ORDER BY s.created_at DESC LIMIT 10",
            (guest_token if guest else aid,),
        )
        return _resp(200, {'sessions': [dict(r) for r in cur.fetchall()]})

    # The controlled machine confirms an incoming request.
    if action == 'confirm_session':
        cur.execute(
            f"UPDATE {SCHEMA}.sessions s SET status='active', started_at=NOW() "
            f"WHERE s.id=%s AND s.status='pending' AND s.expires_at > NOW() "
            f"AND s.device_id IN (SELECT id FROM {SCHEMA}.devices WHERE "
            + ("guest_token=%s" if guest else "account_id=%s AND guest_token=''")
            + ") RETURNING s.id, s.device_id, s.access_id",
            (body.get('session_id'), guest_token if guest else aid),
        )
        row = cur.fetchone()
        if not row:
            return _resp(404, {'error': 'session_not_found'})
        _log(cur, aid, 'session_active', f"Сеанс подтверждён · ID {row['access_id']}",
             row['device_id'], row['id'], ip)
        # The controlled side joins the relay as the "agent" role.
        return _resp(200, {
            'ok': True,
            'status': 'active',
            **_relay_info(cur, aid, row['id'], 'agent', True),
        })

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