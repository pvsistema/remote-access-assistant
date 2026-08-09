import { useState } from 'react';
import Icon from '@/components/ui/icon';
import type { Device } from '@/lib/api';
import { api } from '@/lib/api';

const fmt = (v: string | null) => {
  if (!v) return '—';
  const d = new Date(v.replace(' ', 'T'));
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const osIcon = (os: string) => {
  const s = (os || '').toLowerCase();
  if (s.includes('mac')) return 'Apple';
  if (s.includes('linux') || s.includes('astra')) return 'Terminal';
  if (s.includes('android')) return 'Smartphone';
  return 'Monitor';
};

const DevicesTab = ({
  devices,
  stats,
  onConnect,
  onRefresh,
}: {
  devices: Device[];
  stats: { devices: number; online: number; sessions_30d: number };
  onConnect: (accessId: string) => void;
  onRefresh: () => void;
}) => {
  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [copied, setCopied] = useState('');

  const save = async (id: number) => {
    if (name.trim()) await api.renameDevice(id, name.trim());
    setEditing(null);
    onRefresh();
  };

  const copy = (v: string) => {
    navigator.clipboard?.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(''), 1600);
  };

  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Всего устройств', stats.devices, 'MonitorSmartphone'],
          ['Сейчас в сети', stats.online, 'Wifi'],
          ['Сеансов за 30 дней', stats.sessions_30d, 'History'],
        ].map(([label, value, icon]) => (
          <div key={label as string} className="flex items-center gap-4 rounded-[22px] border border-border bg-background p-6">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-primary/10 text-primary">
              <Icon name={icon as string} size={22} />
            </span>
            <span>
              <span className="block font-head text-[1.9rem] font-bold leading-none">{value as number}</span>
              <span className="mt-1.5 block text-[0.87rem] text-muted-foreground">{label as string}</span>
            </span>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[22px] border border-border bg-background">
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-5">
          <h2 className="text-[1.15rem] font-bold">Мои компьютеры</h2>
          <button
            type="button"
            onClick={onRefresh}
            className="ml-auto inline-flex items-center gap-2 rounded-pill border border-border px-4 py-2.5 text-[0.87rem] font-semibold leading-none transition-colors hover:border-primary hover:text-primary"
          >
            <Icon name="RefreshCw" size={15} /> Обновить
          </button>
        </header>

        {devices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <Icon name="MonitorOff" size={26} />
            </span>
            <p className="text-[1.02rem] font-semibold">Пока нет подключённых устройств</p>
            <p className="max-w-[420px] text-[0.92rem] text-muted-foreground">
              Установите клиент на компьютер и войдите в нём под этим аккаунтом — устройство появится здесь автоматически.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {devices.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-4 px-6 py-5">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-secondary text-foreground">
                  <Icon name={osIcon(d.os)} size={20} />
                </span>

                <div className="min-w-[190px] flex-1">
                  {editing === d.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-10 flex-1 rounded-xl border border-input px-3 text-[0.94rem] outline-none focus:border-primary"
                      />
                      <button type="button" onClick={() => save(d.id)} className="text-primary">
                        <Icon name="Check" size={19} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(d.id);
                        setName(d.name);
                      }}
                      className="group flex items-center gap-2 text-left"
                    >
                      <span className="font-semibold text-foreground">{d.name || 'Без названия'}</span>
                      <Icon name="Pencil" size={14} className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  )}
                  <span className="mt-1 block text-[0.83rem] text-muted-foreground">
                    {[d.os, d.os_version, d.local_ip].filter(Boolean).join(' · ') || 'Данные появятся после запуска клиента'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => copy(d.access_id)}
                  title="Скопировать ID"
                  className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-2.5 font-mono text-[0.95rem] font-semibold tracking-[0.06em] text-foreground transition-colors hover:text-primary"
                >
                  {d.access_id}
                  <Icon name={copied === d.access_id ? 'Check' : 'Copy'} size={15} />
                </button>

                <span
                  className={`inline-flex items-center gap-2 rounded-pill px-3.5 py-2 text-[0.82rem] font-semibold ${
                    d.is_online ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${d.is_online ? 'animate-pulse-dot bg-primary' : 'bg-muted-foreground'}`} />
                  {d.is_online ? 'В сети' : fmt(d.last_seen)}
                </span>

                <button
                  type="button"
                  onClick={() => onConnect(d.access_id)}
                  className="inline-flex items-center gap-2 rounded-pill bg-primary px-5 py-3 text-[0.88rem] font-semibold leading-none text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Icon name="PlugZap" size={16} /> Подключиться
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default DevicesTab;
