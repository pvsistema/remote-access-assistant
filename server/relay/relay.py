#!/usr/bin/env python3
"""ПВ-Система Доступ — сервер-ретранслятор.

Держит живое соединение между удалённым компьютером (агент) и оператором
и передаёт кадры экрана, команды мыши/клавиатуры и буфер обмена напрямую,
без базы данных. Кадры хранятся только в оперативной памяти.

Запуск: python3 relay.py   (настройки — через переменные окружения)
  RELAY_SECRET  — общий секрет с облаком (обязательно)
  RELAY_PORT    — порт, по умолчанию 8765
  RELAY_MAX_MB  — максимальный размер кадра, МБ (по умолчанию 8)
"""
import asyncio
import base64
import hashlib
import hmac
import json
import os
import time
from typing import Dict, Optional, Set

from aiohttp import WSMsgType, web

VERSION = '1.0.0'
SECRET = os.environ.get('RELAY_SECRET', '').encode()
PORT = int(os.environ.get('RELAY_PORT', '8765'))
MAX_FRAME = int(os.environ.get('RELAY_MAX_MB', '8')) * 1024 * 1024
IDLE_TIMEOUT = 15 * 60  # сеанс без участников живёт 15 минут


def _b64url_decode(value: str) -> bytes:
    pad = '=' * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + pad)


def check_ticket(ticket: str) -> Optional[dict]:
    """Проверяет пропуск, выданный облаком. Формат: payload_b64.signature_b64"""
    if not SECRET or not ticket or '.' not in ticket:
        return None
    payload_b64, sig_b64 = ticket.rsplit('.', 1)
    try:
        expected = hmac.new(SECRET, payload_b64.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64url_decode(sig_b64)):
            return None
        data = json.loads(_b64url_decode(payload_b64))
    except (ValueError, json.JSONDecodeError):
        return None
    if float(data.get('exp', 0)) < time.time():
        return None
    if data.get('role') not in ('agent', 'operator'):
        return None
    return data


class Session:
    """Один сеанс: удалённый компьютер и подключённые к нему операторы."""

    def __init__(self, sid: int):
        self.sid = sid
        self.agent: Optional[web.WebSocketResponse] = None
        self.operators: Set[web.WebSocketResponse] = set()
        self.last_frame: Optional[bytes] = None
        self.touched = time.monotonic()

    @property
    def empty(self) -> bool:
        return self.agent is None and not self.operators

    async def to_operators(self, data: bytes, binary: bool = True) -> None:
        self.touched = time.monotonic()
        dead = []
        for ws in list(self.operators):
            try:
                await (ws.send_bytes(data) if binary else ws.send_str(data.decode()))
            except (ConnectionError, RuntimeError):
                dead.append(ws)
        for ws in dead:
            self.operators.discard(ws)

    async def to_agent(self, text: str) -> None:
        self.touched = time.monotonic()
        if self.agent is None:
            return
        try:
            await self.agent.send_str(text)
        except (ConnectionError, RuntimeError):
            self.agent = None


SESSIONS: Dict[int, Session] = {}


async def ws_handler(request: web.Request) -> web.WebSocketResponse:
    ticket = check_ticket(request.query.get('ticket', ''))
    if not ticket:
        return web.json_response({'error': 'bad_ticket'}, status=403)

    sid = int(ticket.get('sid', 0))
    role = ticket['role']
    allow_control = bool(ticket.get('control', False))

    ws = web.WebSocketResponse(heartbeat=25, max_msg_size=MAX_FRAME + 65536)
    await ws.prepare(request)

    sess = SESSIONS.setdefault(sid, Session(sid))
    if role == 'agent':
        sess.agent = ws
    else:
        sess.operators.add(ws)

    await ws.send_str(json.dumps({'t': 'ready', 'role': role, 'session': sid}))

    # Новому оператору сразу отдаём последний кадр, чтобы не ждать следующего.
    if role == 'operator' and sess.last_frame:
        await ws.send_bytes(sess.last_frame)

    try:
        async for msg in ws:
            sess.touched = time.monotonic()
            if msg.type == WSMsgType.BINARY:
                # Кадр экрана: только от агента операторам.
                if role == 'agent' and len(msg.data) <= MAX_FRAME:
                    sess.last_frame = msg.data
                    await sess.to_operators(msg.data)
            elif msg.type == WSMsgType.TEXT:
                if role == 'operator':
                    # Команды управления — только если разрешено в пропуске.
                    try:
                        kind = json.loads(msg.data).get('kind', '')
                    except json.JSONDecodeError:
                        continue
                    if kind in ('mouse', 'key', 'hotkey') and not allow_control:
                        continue
                    await sess.to_agent(msg.data)
                else:
                    # От агента: буфер обмена, статус — всем операторам.
                    await sess.to_operators(msg.data.encode(), binary=False)
            elif msg.type == WSMsgType.ERROR:
                break
    finally:
        if role == 'agent':
            if sess.agent is ws:
                sess.agent = None
            await sess.to_operators(json.dumps({'t': 'agent_gone'}).encode(), binary=False)
        else:
            sess.operators.discard(ws)
        if sess.empty:
            SESSIONS.pop(sid, None)

    return ws


async def health(_: web.Request) -> web.Response:
    return web.json_response({
        'ok': True,
        'service': 'pv-relay',
        'version': VERSION,
        'sessions': len(SESSIONS),
        'configured': bool(SECRET),
    }, headers={'Access-Control-Allow-Origin': '*'})


async def cleanup(_: web.Application) -> None:
    while True:
        await asyncio.sleep(60)
        now = time.monotonic()
        for sid, sess in list(SESSIONS.items()):
            if sess.empty or now - sess.touched > IDLE_TIMEOUT:
                SESSIONS.pop(sid, None)


async def start_cleanup(app: web.Application) -> None:
    app['cleanup'] = asyncio.create_task(cleanup(app))


def build_app() -> web.Application:
    app = web.Application(client_max_size=MAX_FRAME + 65536)
    app.router.add_get('/ws', ws_handler)
    app.router.add_get('/health', health)
    app.router.add_get('/', health)
    app.on_startup.append(start_cleanup)
    return app


if __name__ == '__main__':
    if not SECRET:
        raise SystemExit('Не задан RELAY_SECRET — сервер не запущен')
    web.run_app(build_app(), host='0.0.0.0', port=PORT, access_log=None)