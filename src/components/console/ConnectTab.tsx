import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';
import RemoteScreen from '@/components/console/RemoteScreen';
import { api, ERRORS, type Device, type Message, type Permissions, type Session } from '@/lib/api';
import { parseServerDate } from '@/lib/dates';

const modes = [
  { key: 'control', label: 'Полное управление', icon: 'MousePointerClick' },
  { key: 'view', label: 'Только просмотр', icon: 'Eye' },
  { key: 'files', label: 'Передача файлов', icon: 'FolderSync' },
];

const permList: { key: keyof Permissions; label: string; icon: string }[] = [
  { key: 'control', label: 'Управление мышью и клавиатурой', icon: 'MousePointer2' },
  { key: 'files', label: 'Передача файлов', icon: 'FolderSync' },
  { key: 'clipboard', label: 'Общий буфер обмена', icon: 'ClipboardCopy' },
  { key: 'audio', label: 'Звук с удалённого ПК', icon: 'Volume2' },
  { key: 'record', label: 'Запись сеанса', icon: 'Circle' },
];

const statusLabel: Record<string, string> = {
  pending: 'Ожидает подтверждения',
  active: 'Идёт сеанс',
  closed: 'Завершён',
  rejected: 'Отклонён',
};

const ConnectTab = ({
  presetId,
  sessions,
  devices,
  onChanged,
}: {
  presetId: string;
  sessions: Session[];
  devices: Device[];
  onChanged: () => void;
}) => {
  const [accessId, setAccessId] = useState(presetId);
  const [mode, setMode] = useState('control');
  const [perms, setPerms] = useState<Permissions>({
    control: true,
    files: true,
    clipboard: true,
    audio: false,
    record: false,
  });
  const [active, setActive] = useState<Session | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatText, setChatText] = useState('');
  const [screen, setScreen] = useState<Session | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const device = devices.find((d) => d.access_id === accessId.replace(/\D/g, ''));

  useEffect(() => {
    if (!active) return;
    const load = () => api.messages(active.id).then((r) => setMessages(r.messages)).catch(() => undefined);
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [active]);

  // While waiting for consent, watch the session status from the overview feed.
  useEffect(() => {
    if (!active || active.status !== 'pending') return;
    const fresh = sessions.find((s) => s.id === active.id);
    if (fresh && fresh.status !== 'pending') {
      const next = { ...active, status: fresh.status };
      setActive(next);
      if (fresh.status === 'active') setScreen(next);
    }
  }, [sessions, active]);

  const start = async () => {
    const clean = accessId.replace(/\D/g, '');
    if (clean.length < 6) {
      setError('Введите ID устройства — 9 цифр');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.createSession(clean, mode, perms, password.trim() || undefined);
      setActive(res.session);
      setMessages([]);
      onChanged();
    } catch (err) {
      setError(ERRORS[(err as Error).message] || 'Не удалось создать сеанс');
    } finally {
      setLoading(false);
    }
  };

  const update = async (status: 'closed' | 'rejected') => {
    if (!active) return;
    await api.updateSession(active.id, status);
    setActive(null);
    onChanged();
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !chatText.trim()) return;
    const res = await api.sendMessage(active.id, chatText.trim());
    setMessages((m) => [...m, res.message]);
    setChatText('');
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || !active) return;
    for (const f of Array.from(files)) {
      await api.logTransfer({
        session_id: active.id,
        device_id: device?.id ?? null,
        file_name: f.name,
        size_bytes: f.size,
        direction: 'upload',
      });
    }
    toast({ title: 'Файлы поставлены в очередь', description: `${files.length} файл(ов) отправляются на удалённый ПК` });
    onChanged();
  };

  if (screen) {
    return (
      <RemoteScreen
        session={screen}
        device={devices.find((d) => d.access_id === screen.access_id)}
        onClose={() => {
          setScreen(null);
          setActive(null);
          onChanged();
        }}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
      <section className="rounded-[22px] border border-border bg-background p-7">
        <h2 className="text-[1.2rem] font-bold">Новое подключение</h2>
        <p className="mt-2 text-[0.93rem] text-muted-foreground">
          Введите ID удалённого компьютера — консоль выдаст код сеанса и одноразовый пароль для клиента.
        </p>

        <label className="mt-7 block">
          <span className="text-[0.85rem] font-medium text-muted-foreground">ID устройства</span>
          <input
            value={accessId}
            onChange={(e) => setAccessId(e.target.value)}
            inputMode="numeric"
            placeholder="000 000 000"
            className="mt-2 h-[64px] w-full rounded-2xl border border-input bg-background px-5 font-mono text-[1.5rem] font-bold tracking-[0.12em] outline-none focus:border-primary"
          />
        </label>
        {device && (
          <p className="mt-2 flex items-center gap-2 text-[0.86rem] text-primary">
            <Icon name="Monitor" size={15} /> {device.name} · {device.is_online ? 'в сети' : 'не в сети'}
          </p>
        )}

        <label className="mt-4 block">
          <span className="text-[0.85rem] font-medium text-muted-foreground">
            Пароль удалённого компьютера
          </span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="off"
            placeholder="Спросите у владельца компьютера"
            className="mt-2 h-[52px] w-full rounded-2xl border border-input bg-background px-5 font-mono text-[1.05rem] tracking-[0.08em] outline-none focus:border-primary"
          />
          <span className="mt-1.5 block text-[0.8rem] text-muted-foreground">
            Не нужен для своих устройств. Пользователь на том компьютере всё равно подтверждает вход.
          </span>
        </label>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setMode(m.key);
                setPerms((p) => ({ ...p, control: m.key === 'control' }));
              }}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors ${
                mode === m.key ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground hover:border-primary/50'
              }`}
            >
              <Icon name={m.icon} size={19} />
              <span className="text-[0.87rem] font-semibold leading-tight">{m.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <span className="text-[0.85rem] font-medium text-muted-foreground">Права на сеанс</span>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {permList.map((p) => (
              <label
                key={p.key}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  perms[p.key] ? 'border-primary/40 bg-primary/5' : 'border-border'
                }`}
              >
                <input
                  type="checkbox"
                  checked={perms[p.key]}
                  onChange={(e) => setPerms((prev) => ({ ...prev, [p.key]: e.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                <Icon name={p.icon} size={16} className={perms[p.key] ? 'text-primary' : 'text-muted-foreground'} />
                <span className="text-[0.86rem] leading-tight">{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-[0.9rem] text-destructive">
            <Icon name="TriangleAlert" size={17} /> {error}
          </div>
        )}

        <button
          type="button"
          onClick={start}
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-pill bg-primary px-8 py-[17px] text-[0.98rem] font-semibold leading-none text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Icon name={loading ? 'LoaderCircle' : 'PlugZap'} size={18} className={loading ? 'animate-spin' : ''} />
          Начать сеанс
        </button>

        {active && (
          <div className="mt-6 animate-scale-in rounded-[20px] border border-primary/30 bg-primary/5 p-6">
            <span className="pv-eyebrow">{statusLabel[active.status]}</span>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-[0.82rem] text-muted-foreground">Код сеанса</span>
                <p className="font-mono text-[1.7rem] font-bold tracking-[0.14em] text-foreground">{active.session_code}</p>
              </div>
              <div>
                <span className="text-[0.82rem] text-muted-foreground">Одноразовый пароль</span>
                <p className="font-mono text-[1.7rem] font-bold tracking-[0.14em] text-foreground">{active.one_time_password}</p>
              </div>
            </div>
            <p className="mt-3 text-[0.85rem] text-muted-foreground">
              {active.status === 'pending'
                ? 'Ждём, пока пользователь на удалённом компьютере нажмёт «Разрешить». Запрос действует 15 минут.'
                : 'Доступ разрешён — можно открывать рабочий стол.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={active.status === 'pending'}
                onClick={() => setScreen({ ...active, status: 'active' })}
                className="inline-flex items-center gap-2 rounded-pill bg-primary px-5 py-3 text-[0.88rem] font-semibold leading-none text-primary-foreground disabled:opacity-50"
              >
                <Icon
                  name={active.status === 'pending' ? 'LoaderCircle' : 'MonitorPlay'}
                  size={16}
                  className={active.status === 'pending' ? 'animate-spin' : ''}
                />
                {active.status === 'pending' ? 'Ожидаем подтверждения' : 'Открыть рабочий стол'}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-pill border border-border bg-background px-5 py-3 text-[0.88rem] font-semibold leading-none text-foreground hover:border-primary hover:text-primary"
              >
                <Icon name="Upload" size={16} /> Отправить файлы
              </button>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
              <button
                type="button"
                onClick={() => update('closed')}
                className="inline-flex items-center gap-2 rounded-pill border border-border bg-background px-5 py-3 text-[0.88rem] font-semibold leading-none text-foreground hover:border-primary hover:text-primary"
              >
                <Icon name="Square" size={16} /> Завершить
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-6">
        {active && (
          <section className="flex max-h-[440px] flex-col rounded-[22px] border border-border bg-background">
            <header className="flex items-center gap-2.5 border-b border-border px-6 py-4">
              <Icon name="MessagesSquare" size={18} className="text-primary" />
              <h2 className="text-[1.05rem] font-bold">Чат с пользователем</h2>
            </header>
            <div className="flex-1 space-y-3 overflow-auto px-6 py-5">
              {messages.length === 0 ? (
                <p className="text-[0.9rem] text-muted-foreground">
                  Напишите сообщение — оно появится в окне клиента на удалённом ПК.
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[0.9rem] ${
                      m.side === 'operator'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground'
                    }`}
                  >
                    {m.text}
                  </div>
                ))
              )}
            </div>
            <form onSubmit={send} className="flex items-center gap-2 border-t border-border px-4 py-3">
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Сообщение пользователю"
                className="h-11 flex-1 rounded-xl bg-secondary px-4 text-[0.92rem] outline-none"
              />
              <button type="submit" className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Icon name="Send" size={17} />
              </button>
            </form>
          </section>
        )}

        <section className="rounded-[22px] border border-border bg-background p-7">
          <h2 className="text-[1.2rem] font-bold">Последние сеансы</h2>
          {sessions.length === 0 ? (
            <p className="mt-5 text-[0.93rem] text-muted-foreground">Сеансов пока не было.</p>
          ) : (
            <ul className="mt-5 flex flex-col divide-y divide-border">
              {sessions.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center gap-4 py-4">
                  <span
                    className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${
                      s.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    <Icon name={s.status === 'rejected' ? 'X' : 'Monitor'} size={18} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-mono text-[0.95rem] font-semibold">ID {s.access_id}</span>
                    <span className="block text-[0.82rem] text-muted-foreground">
                      {statusLabel[s.status] || s.status} ·{' '}
                      {parseServerDate(s.created_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                  {s.is_recorded && <Icon name="Circle" size={13} className="text-primary" />}
                  <span className="font-mono text-[0.9rem] text-muted-foreground">{s.session_code}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default ConnectTab;