import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { api, ERRORS, type Session } from '@/lib/api';

const modes = [
  { key: 'control', label: 'Полное управление', icon: 'MousePointerClick' },
  { key: 'view', label: 'Только просмотр', icon: 'Eye' },
  { key: 'files', label: 'Передача файлов', icon: 'FolderSync' },
];

const ConnectTab = ({
  presetId,
  sessions,
  onChanged,
}: {
  presetId: string;
  sessions: Session[];
  onChanged: () => void;
}) => {
  const [accessId, setAccessId] = useState(presetId);
  const [mode, setMode] = useState('control');
  const [active, setActive] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const start = async () => {
    const clean = accessId.replace(/\D/g, '');
    if (clean.length < 6) {
      setError('Введите ID устройства — 9 цифр');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.createSession(clean, mode);
      setActive(res.session);
      onChanged();
    } catch (err) {
      setError(ERRORS[(err as Error).message] || 'Не удалось создать сеанс');
    } finally {
      setLoading(false);
    }
  };

  const update = async (status: 'active' | 'closed' | 'rejected') => {
    if (!active) return;
    await api.updateSession(active.id, status);
    setActive(status === 'active' ? { ...active, status: 'active' } : null);
    onChanged();
  };

  const statusLabel: Record<string, string> = {
    pending: 'Ожидает подтверждения',
    active: 'Идёт сеанс',
    closed: 'Завершён',
    rejected: 'Отклонён',
  };

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

        <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors ${
                mode === m.key ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground hover:border-primary/50'
              }`}
            >
              <Icon name={m.icon} size={19} />
              <span className="text-[0.87rem] font-semibold leading-tight">{m.label}</span>
            </button>
          ))}
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
              Канал: {active.relay_url} · действует 15 минут
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {active.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => update('active')}
                  className="inline-flex items-center gap-2 rounded-pill bg-primary px-5 py-3 text-[0.88rem] font-semibold leading-none text-primary-foreground"
                >
                  <Icon name="Check" size={16} /> Подтвердить
                </button>
              )}
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

      <section className="rounded-[22px] border border-border bg-background p-7">
        <h2 className="text-[1.2rem] font-bold">Последние сеансы</h2>
        {sessions.length === 0 ? (
          <p className="mt-5 text-[0.93rem] text-muted-foreground">Сеансов пока не было.</p>
        ) : (
          <ul className="mt-5 flex flex-col divide-y divide-border">
            {sessions.slice(0, 10).map((s) => (
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
                    {new Date(s.created_at.replace(' ', 'T')).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
                <span className="font-mono text-[0.9rem] text-muted-foreground">{s.session_code}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ConnectTab;
