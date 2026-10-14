import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';
import { api, type Device, type Message, type Session } from '@/lib/api';
import { useRemoteStream } from './useRemoteStream';

// Translate a browser mouse event into normalised remote coordinates (0..1),
// so the C# agent maps them to the actual screen resolution.
function relPoint(e: React.MouseEvent, el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
    y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
  };
}

const MOUSE_BTN: Record<number, string> = { 0: 'left', 1: 'middle', 2: 'right' };

const tools = [
  { key: 'chat', label: 'Чат', icon: 'MessagesSquare' },
  { key: 'files', label: 'Файлы', icon: 'FolderSync' },
  { key: 'terminal', label: 'Командная строка', icon: 'SquareTerminal' },
  { key: 'info', label: 'Сведения о системе', icon: 'Cpu' },
];

const RemoteScreen = ({
  session,
  device,
  onClose,
}: {
  session: Session;
  device: Device | undefined;
  onClose: () => void;
}) => {
  const [panel, setPanel] = useState<string | null>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [quality, setQuality] = useState<'auto' | 'speed' | 'quality'>('auto');
  const [muted, setMuted] = useState(!session.allow_audio);
  const [monitor, setMonitor] = useState(1);
  const [recording, setRecording] = useState(Boolean(session.is_recorded));
  const [fullscreen, setFullscreen] = useState(false);
  const [cmd, setCmd] = useState('');
  const [cmdLog, setCmdLog] = useState<string[]>(['Удалённая командная строка. Введите команду ниже.']);
  const [controlOn, setControlOn] = useState(Boolean(session.allow_control));
  const fileRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const lastMove = useRef(0);

  const active = session.status !== 'pending';
  const canControl = Boolean(session.allow_control) && controlOn;
  const { frame, connected, remoteClipboard, enqueue, sendNow, pushClipboard, live } = useRemoteStream(
    session.id,
    active,
    canControl,
    session.relay_url || '',
    session.relay_ticket || '',
  );

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Keyboard capture: forward key presses to the remote PC while controlling.
  useEffect(() => {
    if (!canControl) return;
    const down = (e: KeyboardEvent) => {
      if (e.key === 'F11') return;
      e.preventDefault();
      enqueue('key', { action: 'down', code: e.code, key: e.key });
    };
    const up = (e: KeyboardEvent) => {
      e.preventDefault();
      enqueue('key', { action: 'up', code: e.code, key: e.key });
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [canControl, enqueue]);

  // Bring the remote clipboard into the local one.
  useEffect(() => {
    if (remoteClipboard && navigator.clipboard) {
      navigator.clipboard.writeText(remoteClipboard).catch(() => undefined);
    }
  }, [remoteClipboard]);

  const onScreenMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!canControl || !screenRef.current) return;
      const now = performance.now();
      if (now - lastMove.current < 30) return;
      lastMove.current = now;
      enqueue('mouse', { action: 'move', ...relPoint(e, screenRef.current) });
    },
    [canControl, enqueue],
  );

  const onScreenMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!canControl || !screenRef.current) return;
      e.preventDefault();
      enqueue('mouse', { action: 'down', button: MOUSE_BTN[e.button] || 'left', ...relPoint(e, screenRef.current) });
    },
    [canControl, enqueue],
  );

  const onScreenMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!canControl || !screenRef.current) return;
      e.preventDefault();
      enqueue('mouse', { action: 'up', button: MOUSE_BTN[e.button] || 'left', ...relPoint(e, screenRef.current) });
    },
    [canControl, enqueue],
  );

  const onScreenWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!canControl) return;
      enqueue('mouse', { action: 'wheel', delta: e.deltaY > 0 ? -120 : 120 });
    },
    [canControl, enqueue],
  );

  useEffect(() => {
    const load = () => api.messages(session.id).then((r) => setMessages(r.messages)).catch(() => undefined);
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [session.id]);

  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await api.sendMessage(session.id, text.trim());
    setMessages((m) => [...m, res.message]);
    setText('');
  };

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const f of Array.from(files)) {
      if (f.size > 25 * 1024 * 1024) {
        toast({ title: 'Файл слишком большой', description: `${f.name} — максимум 25 МБ` });
        continue;
      }
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      await api.uploadFile(session.id, f.name, b64);
    }
    toast({ title: 'Передача файлов', description: `${files.length} файл(ов) отправлено на удалённый ПК` });
  };

  const finish = async () => {
    await api.updateSession(session.id, 'closed');
    onClose();
  };

  return (
    <div className="fixed inset-0 top-[var(--pv-titlebar,0px)] z-[60] flex flex-col bg-[#101114]">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#16181c] px-3 py-2 text-white">
        <button
          type="button"
          onClick={() => setFullscreen((f) => !f)}
          title="Во весь экран"
          className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Icon name={fullscreen ? 'Minimize' : 'Maximize'} size={17} />
        </button>

        <span className="mx-1 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[0.86rem] font-semibold">
            {device?.name || 'Удалённый ПК'} ({session.access_id})
          </span>
          <span className="ml-1 flex gap-1">
            {[1, 2].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMonitor(n)}
                className={`grid h-6 w-6 place-items-center rounded text-[0.75rem] font-semibold transition-colors ${
                  monitor === n ? 'bg-primary text-white' : 'bg-white/15 text-white/70 hover:text-white'
                }`}
                title={`Монитор ${n}`}
              >
                {n}
              </button>
            ))}
          </span>
        </span>

        <span className="rounded-lg bg-white/10 px-2.5 py-1.5 font-mono text-[0.78rem]">{time}</span>

        <div className="ml-auto flex flex-wrap items-center gap-0.5">
          {tools.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setPanel(panel === t.key ? null : t.key)}
              title={t.label}
              className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
                panel === t.key ? 'bg-primary text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon name={t.icon} size={17} />
            </button>
          ))}

          <span className="mx-1 h-6 w-px bg-white/15" />

          {session.allow_control && (
            <button
              type="button"
              onClick={() => setControlOn((v) => !v)}
              title={controlOn ? 'Управление включено — нажмите, чтобы только смотреть' : 'Только просмотр — нажмите, чтобы управлять'}
              className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
                controlOn ? 'bg-primary text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon name={controlOn ? 'MousePointerClick' : 'Eye'} size={17} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              sendNow('hotkey', { combo: 'ctrl+alt+del' });
              toast({ title: 'Ctrl+Alt+Del отправлен', description: 'Комбинация передана на удалённый компьютер' });
            }}
            title="Отправить Ctrl+Alt+Del"
            className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="Zap" size={17} />
          </button>
          <button
            type="button"
            onClick={() => setQuality(quality === 'auto' ? 'speed' : quality === 'speed' ? 'quality' : 'auto')}
            title="Качество изображения"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[0.8rem] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="MonitorCog" size={17} />
            <span className="hidden lg:inline">
              {quality === 'auto' ? 'Авто' : quality === 'speed' ? 'Скорость' : 'Качество'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRecording((r) => !r);
              toast({ title: recording ? 'Запись остановлена' : 'Идёт запись сеанса' });
            }}
            title="Запись сеанса"
            className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
              recording ? 'bg-primary text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon name="Video" size={17} />
          </button>
          <button
            type="button"
            onClick={() => toast({ title: 'Скриншот сохранён', description: 'Снимок экрана добавлен в файлы сеанса' })}
            title="Снимок экрана"
            className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="Camera" size={17} />
          </button>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            title={muted ? 'Включить звук' : 'Выключить звук'}
            className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name={muted ? 'VolumeX' : 'Volume2'} size={17} />
          </button>
          <button
            type="button"
            onClick={() => toast({ title: 'Голосовой вызов', description: 'Идёт соединение с пользователем' })}
            title="Голосовой вызов"
            className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="Phone" size={17} />
          </button>

          <button
            type="button"
            onClick={finish}
            title="Завершить сеанс"
            className="ml-1.5 grid h-9 w-9 place-items-center rounded-lg bg-primary text-white transition-opacity hover:opacity-90"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          ref={screenRef}
          onMouseMove={onScreenMouseMove}
          onMouseDown={onScreenMouseDown}
          onMouseUp={onScreenMouseUp}
          onWheel={onScreenWheel}
          onContextMenu={(e) => e.preventDefault()}
          className={`relative flex flex-1 items-center justify-center overflow-hidden ${
            canControl ? 'cursor-none' : ''
          }`}
        >
          {recording && (
            <span className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-[0.75rem] font-semibold text-white">
              <span className="h-2 w-2 animate-pulse-dot rounded-full bg-white" /> REC
            </span>
          )}

          {active && frame ? (
            <img
              src={frame.image_url || `data:image/jpeg;base64,${frame.image_b64}`}
              alt="Экран удалённого компьютера"
              draggable={false}
              className="max-h-full max-w-full select-none object-contain"
            />
          ) : (
            <>
              <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" />
              <div className="relative flex flex-col items-center gap-4 text-center text-white/70">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10">
                  <Icon name={active ? 'Loader' : 'MonitorPlay'} size={30} className={active ? 'animate-spin' : ''} />
                </span>
                <p className="max-w-[420px] text-[0.98rem] leading-[1.55]">
                  {session.status === 'pending'
                    ? 'Ждём подтверждения на удалённом компьютере — попросите пользователя нажать «Разрешить».'
                    : 'Подключаемся к рабочему столу — идёт получение изображения…'}
                </p>
                <span className="flex flex-wrap items-center justify-center gap-2 text-[0.78rem]">
                  {[
                    ['Управление', session.allow_control],
                    ['Файлы', session.allow_files],
                    ['Буфер обмена', session.allow_clipboard],
                    ['Звук', session.allow_audio],
                  ].map(([label, on]) => (
                    <span
                      key={label as string}
                      className={`rounded-pill px-3 py-1.5 ${on ? 'bg-primary/25 text-white' : 'bg-white/10 text-white/45'}`}
                    >
                      {label as string}
                    </span>
                  ))}
                </span>
              </div>
            </>
          )}

          {active && frame && canControl && (
            <span className="pointer-events-none absolute right-3 top-3 z-10 rounded-pill bg-primary/80 px-3 py-1 text-[0.72rem] font-semibold text-white">
              Управление активно
            </span>
          )}
        </div>

        {panel && (
          <aside className="flex w-full max-w-[340px] flex-col border-l border-white/10 bg-[#16181c] text-white">
            {panel === 'chat' && (
              <>
                <div className="flex-1 space-y-3 overflow-auto p-5">
                  {messages.length === 0 ? (
                    <p className="text-[0.88rem] text-white/50">
                      Сообщения появятся в окне клиента на удалённом компьютере.
                    </p>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.88rem] ${
                          m.side === 'operator' ? 'ml-auto bg-primary' : 'bg-white/10'
                        }`}
                      >
                        {m.text}
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 p-3">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Сообщение"
                    className="h-10 flex-1 rounded-xl bg-white/10 px-4 text-[0.88rem] text-white outline-none placeholder:text-white/40"
                  />
                  <button type="submit" className="grid h-10 w-10 place-items-center rounded-xl bg-primary">
                    <Icon name="Send" size={16} />
                  </button>
                </form>
              </>
            )}

            {panel === 'files' && (
              <div className="flex flex-1 flex-col gap-4 p-5">
                <p className="text-[0.88rem] text-white/60">
                  Перетащите файлы или выберите с диска — они уйдут на удалённый компьютер.
                </p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="grid flex-1 place-items-center rounded-2xl border-2 border-dashed border-white/20 text-white/60 transition-colors hover:border-primary hover:text-white"
                >
                  <span className="flex flex-col items-center gap-2">
                    <Icon name="Upload" size={26} />
                    <span className="text-[0.88rem]">Выбрать файлы</span>
                  </span>
                </button>
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
                {session.allow_clipboard && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const t = await navigator.clipboard.readText();
                        if (t) {
                          await pushClipboard(t);
                          toast({ title: 'Буфер обмена отправлен', description: 'Текст доступен на удалённом ПК' });
                        }
                      } catch {
                        toast({ title: 'Нет доступа к буферу обмена', description: 'Разрешите доступ в браузере' });
                      }
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-[0.85rem] text-white/80 transition-colors hover:bg-white/15"
                  >
                    <Icon name="ClipboardPaste" size={16} />
                    Отправить мой буфер обмена
                  </button>
                )}
              </div>
            )}

            {panel === 'terminal' && (
              <div className="flex flex-1 flex-col p-4">
                <div className="flex-1 overflow-auto rounded-lg bg-black/50 p-3 font-mono text-[0.78rem] leading-[1.6] text-emerald-300">
                  {cmdLog.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!cmd.trim()) return;
                    setCmdLog((l) => [...l, `C:\\> ${cmd}`, 'Команда отправлена на удалённый компьютер']);
                    setCmd('');
                  }}
                  className="mt-2 flex items-center gap-2"
                >
                  <input
                    value={cmd}
                    onChange={(e) => setCmd(e.target.value)}
                    placeholder="Команда"
                    className="h-10 flex-1 rounded-lg bg-white/10 px-3 font-mono text-[0.82rem] text-white outline-none placeholder:text-white/40"
                  />
                  <button type="submit" className="grid h-10 w-10 place-items-center rounded-lg bg-primary">
                    <Icon name="CornerDownLeft" size={16} />
                  </button>
                </form>
              </div>
            )}

            {panel === 'info' && (
              <div className="flex flex-col gap-3 p-5 text-[0.88rem]">
                {[
                  ['Компьютер', device?.name || '—'],
                  ['Операционная система', [device?.os, device?.os_version].filter(Boolean).join(' ') || '—'],
                  ['Локальный адрес', device?.local_ip || '—'],
                  ['Версия клиента', device?.app_version || '—'],
                  ['Код сеанса', session.session_code],
                  ['Режим', session.mode],
                ].map(([k, v]) => (
                  <span key={k as string} className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
                    <span className="text-white/50">{k as string}</span>
                    <span className="text-right font-medium">{v as string}</span>
                  </span>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      <footer className="flex h-[34px] flex-none items-center gap-4 border-t border-white/10 bg-[#16181c] px-4 text-[0.78rem] text-white/60">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          {session.status === 'pending'
            ? 'Ожидание подтверждения'
            : connected
              ? 'Соединение установлено'
              : 'Получение изображения…'}
        </span>
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <Icon name={live ? 'Zap' : 'Cloud'} size={13} className={live ? 'text-emerald-400' : ''} />
          {live ? 'Свой сервер' : 'Через облако'}
        </span>
        <span className="hidden sm:inline">Монитор {monitor}</span>
        <span className="hidden sm:inline">
          {quality === 'auto' ? 'Качество: авто' : quality === 'speed' ? 'Приоритет скорости' : 'Приоритет качества'}
        </span>
        <span className="ml-auto font-mono">Код {session.session_code}</span>
      </footer>
    </div>
  );
};

export default RemoteScreen;