import base64
import json
import os
from typing import Any, Dict, Optional

import boto3
import psycopg2
import psycopg2.extras

SCHEMA = 't_p23746347_remote_access_assist'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, X-Device-Uid, X-Guest-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def _resp(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'statusCode': status,
        'headers': CORS,
        'isBase64Encoded': False,
        'body': json.dumps(body, default=str),
    }


def _auth(cur, token: str) -> Optional[dict]:
    if not token:
        return None
    cur.execute(
        f"SELECT a.id, a.full_name FROM {SCHEMA}.auth_tokens t "
        f"JOIN {SCHEMA}.accounts a ON a.id = t.account_id "
        f"WHERE t.token = %s AND t.expires_at > NOW()",
        (token,),
    )
    row = cur.fetchone()
    return dict(row) if row else None


def _device_auth(cur, device_uid: str) -> Optional[dict]:
    if not device_uid:
        return None
    cur.execute(
        f"SELECT id, account_id, name FROM {SCHEMA}.devices WHERE device_uid = %s",
        (device_uid,),
    )
    row = cur.fetchone()
    return dict(row) if row else None


def _session(cur, account_id: int, session_id: int) -> Optional[dict]:
    cur.execute(
        f"SELECT id, device_id, status, allow_control, allow_files, allow_clipboard "
        f"FROM {SCHEMA}.sessions WHERE id = %s AND account_id = %s",
        (session_id, account_id),
    )
    row = cur.fetchone()
    return dict(row) if row else None


def _guest_session(cur, guest_token: str, session_id: int) -> Optional[dict]:
    # A guest may touch a session they started, or one aimed at their device.
    cur.execute(
        f"SELECT s.id, s.device_id, s.status, s.allow_control, s.allow_files, s.allow_clipboard "
        f"FROM {SCHEMA}.sessions s WHERE s.id = %s AND (s.guest_token = %s OR s.device_id IN "
        f"(SELECT id FROM {SCHEMA}.devices WHERE guest_token = %s))",
        (session_id, guest_token, guest_token),
    )
    row = cur.fetchone()
    return dict(row) if row else None


def _device_session(cur, device_id: int, session_id: int) -> Optional[dict]:
    cur.execute(
        f"SELECT id, device_id, status, allow_control, allow_files, allow_clipboard "
        f"FROM {SCHEMA}.sessions WHERE id = %s AND device_id = %s",
        (session_id, device_id),
    )
    row = cur.fetchone()
    return dict(row) if row else None


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """Передача изображения рабочего стола, команд мыши и клавиатуры, буфера обмена и файлов между оператором и C#-клиентом"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''
    device_uid = headers.get('X-Device-Uid') or headers.get('x-device-uid') or ''
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    session_id = _int(params.get('session_id') or body.get('session_id'))

    # Two callers: the operator (browser, X-Auth-Token) and the C#-agent on the
    # remote PC (X-Device-Uid). Each may only touch its own session.
    guest_token = (headers.get('X-Guest-Token') or headers.get('x-guest-token') or '').strip()
    if guest_token and (len(guest_token) > 64 or not all(c in '0123456789abcdefABCDEF' for c in guest_token)):
        return _resp(400, {'error': 'bad_guest_token'})

    is_agent = False
    if device_uid:
        dev = _device_auth(cur, device_uid)
        if not dev:
            return _resp(401, {'error': 'unauthorized'})
        aid = dev['account_id']
        is_agent = True
        sess = _device_session(cur, dev['id'], session_id) if session_id else None
    elif guest_token and not token:
        cur.execute(
            f"SELECT account_id FROM {SCHEMA}.devices WHERE guest_token=%s LIMIT 1", (guest_token,)
        )
        row = cur.fetchone()
        if not row:
            return _resp(401, {'error': 'unauthorized'})
        aid = row['account_id']
        sess = _guest_session(cur, guest_token, session_id) if session_id else None
    else:
        user = _auth(cur, token)
        if not user:
            return _resp(401, {'error': 'unauthorized'})
        aid = user['id']
        sess = _session(cur, aid, session_id) if session_id else None

    if not sess:
        return _resp(404, {'error': 'session_not_found'})

    # --- Оператор: получить последний кадр рабочего стола ---
    if method == 'GET' and action == 'frame':
        since = _int(params.get('since'), -1)
        cur.execute(
            f"SELECT seq, monitor, width, height, image_b64, updated_at "
            f"FROM {SCHEMA}.session_frames WHERE session_id = %s",
            (session_id,),
        )
        row = cur.fetchone()
        if not row:
            return _resp(200, {'frame': None, 'seq': 0})
        if row['seq'] <= since:
            return _resp(200, {'frame': None, 'seq': row['seq'], 'unchanged': True})
        return _resp(200, {'frame': dict(row), 'seq': row['seq']})

    # --- Клиент: забрать очередь команд оператора ---
    if method == 'GET' and action == 'commands':
        cur.execute(
            f"SELECT id, kind, payload FROM {SCHEMA}.session_commands "
            f"WHERE session_id = %s AND taken = FALSE ORDER BY id LIMIT 100",
            (session_id,),
        )
        rows = [dict(r) for r in cur.fetchall()]
        if rows:
            ids = ','.join(str(r['id']) for r in rows)
            cur.execute(
                f"UPDATE {SCHEMA}.session_commands SET taken = TRUE WHERE id IN ({ids})"
            )
        for r in rows:
            try:
                r['payload'] = json.loads(r['payload'])
            except json.JSONDecodeError:
                r['payload'] = {}
        return _resp(200, {'commands': rows, 'session_status': sess['status']})

    # --- Общий буфер обмена ---
    if method == 'GET' and action == 'clipboard':
        since = _int(params.get('since'), -1)
        cur.execute(
            f"SELECT side, text_value, seq, updated_at FROM {SCHEMA}.session_clipboard WHERE session_id = %s",
            (session_id,),
        )
        row = cur.fetchone()
        if not row or row['seq'] <= since:
            return _resp(200, {'clipboard': None, 'seq': row['seq'] if row else 0})
        return _resp(200, {'clipboard': dict(row), 'seq': row['seq']})

    # --- Клиент: список файлов, которые надо скачать на удалённый ПК ---
    if method == 'GET' and action == 'pending_files':
        cur.execute(
            f"SELECT id, file_name, size_bytes, file_url FROM {SCHEMA}.file_transfers "
            f"WHERE session_id = %s AND direction = 'upload' AND delivered = FALSE AND file_url <> '' "
            f"ORDER BY id LIMIT 20",
            (session_id,),
        )
        return _resp(200, {'files': [dict(r) for r in cur.fetchall()]})

    if method != 'POST':
        return _resp(405, {'error': 'method_not_allowed'})

    # --- Клиент: прислать кадр рабочего стола ---
    if action == 'push_frame':
        image_b64 = body.get('image_b64') or ''
        if not image_b64:
            return _resp(400, {'error': 'image_required'})
        monitor = _int(body.get('monitor'), 1)
        width = _int(body.get('width'))
        height = _int(body.get('height'))
        cur.execute(
            f"INSERT INTO {SCHEMA}.session_frames (session_id, seq, monitor, width, height, image_b64, updated_at) "
            f"VALUES (%s, 1, %s, %s, %s, %s, NOW()) "
            f"ON CONFLICT (session_id) DO UPDATE SET seq = {SCHEMA}.session_frames.seq + 1, "
            f"monitor = EXCLUDED.monitor, width = EXCLUDED.width, height = EXCLUDED.height, "
            f"image_b64 = EXCLUDED.image_b64, updated_at = NOW() RETURNING seq",
            (session_id, monitor, width, height, image_b64),
        )
        return _resp(200, {'ok': True, 'seq': cur.fetchone()['seq']})

    # --- Оператор: отправить команду (мышь, клавиатура, буфер, спец-клавиши) ---
    if action == 'command':
        kind = (body.get('kind') or '').strip()[:24]
        if not kind:
            return _resp(400, {'error': 'kind_required'})
        if kind in ('mouse', 'key', 'hotkey') and not sess['allow_control']:
            return _resp(403, {'error': 'control_not_allowed'})
        payload = json.dumps(body.get('payload') or {})
        cur.execute(
            f"INSERT INTO {SCHEMA}.session_commands (session_id, kind, payload) VALUES (%s, %s, %s) RETURNING id",
            (session_id, kind, payload),
        )
        return _resp(200, {'ok': True, 'id': cur.fetchone()['id']})

    # --- Оператор: пакет команд за один запрос (движения мыши) ---
    if action == 'commands_batch':
        items = body.get('items') or []
        if not sess['allow_control']:
            return _resp(403, {'error': 'control_not_allowed'})
        saved = 0
        for item in items[:60]:
            kind = (item.get('kind') or '').strip()[:24]
            if not kind:
                continue
            cur.execute(
                f"INSERT INTO {SCHEMA}.session_commands (session_id, kind, payload) VALUES (%s, %s, %s)",
                (session_id, kind, json.dumps(item.get('payload') or {})),
            )
            saved += 1
        return _resp(200, {'ok': True, 'saved': saved})

    # --- Буфер обмена: обе стороны пишут сюда ---
    if action == 'set_clipboard':
        if not sess['allow_clipboard']:
            return _resp(403, {'error': 'clipboard_not_allowed'})
        text_value = (body.get('text') or '')[:100000]
        side = (body.get('side') or 'operator')[:16]
        cur.execute(
            f"INSERT INTO {SCHEMA}.session_clipboard (session_id, side, text_value, seq, updated_at) "
            f"VALUES (%s, %s, %s, 1, NOW()) "
            f"ON CONFLICT (session_id) DO UPDATE SET side = EXCLUDED.side, text_value = EXCLUDED.text_value, "
            f"seq = {SCHEMA}.session_clipboard.seq + 1, updated_at = NOW() RETURNING seq",
            (session_id, side, text_value),
        )
        seq = cur.fetchone()['seq']
        if side == 'operator':
            cur.execute(
                f"INSERT INTO {SCHEMA}.session_commands (session_id, kind, payload) VALUES (%s, 'clipboard', %s)",
                (session_id, json.dumps({'text': text_value})),
            )
        return _resp(200, {'ok': True, 'seq': seq})

    # --- Оператор: загрузить файл для удалённого ПК ---
    if action == 'upload_file':
        if not sess['allow_files']:
            return _resp(403, {'error': 'files_not_allowed'})
        file_name = (body.get('file_name') or 'file.bin')[:255]
        data_b64 = body.get('data_b64') or ''
        if not data_b64:
            return _resp(400, {'error': 'data_required'})
        raw = base64.b64decode(data_b64)
        key = f"sessions/{session_id}/{file_name}"
        _s3().put_object(Bucket='files', Key=key, Body=raw, ContentType='application/octet-stream')
        url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        cur.execute(
            f"INSERT INTO {SCHEMA}.file_transfers (account_id, device_id, session_id, file_name, size_bytes, "
            f"direction, status, file_url) VALUES (%s, %s, %s, %s, %s, 'upload', 'ready', %s) RETURNING id",
            (aid, sess['device_id'], session_id, file_name, len(raw), url),
        )
        transfer_id = cur.fetchone()['id']
        cur.execute(
            f"INSERT INTO {SCHEMA}.session_commands (session_id, kind, payload) VALUES (%s, 'file', %s)",
            (session_id, json.dumps({'id': transfer_id, 'name': file_name, 'url': url})),
        )
        return _resp(200, {'ok': True, 'id': transfer_id, 'url': url})

    # --- Клиент: подтвердить, что файл скачан ---
    if action == 'file_delivered':
        transfer_id = _int(body.get('transfer_id'))
        cur.execute(
            f"UPDATE {SCHEMA}.file_transfers SET delivered = TRUE, status = 'done' "
            f"WHERE id = %s AND account_id = %s",
            (transfer_id, aid),
        )
        return _resp(200, {'ok': True})

    return _resp(400, {'error': 'unknown_action'})