import { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { api, type Device, type Session } from '@/lib/api';

const filters = [
  { key: 'recent', label: 'Последние сеансы' },
  { key: 'fav', label: 'Избранное' },
  { key: 'online', label: 'В сети' },
  { key: 'book', label: 'Адресная книга' },
];

const osIcon = (os: string) => {
  const s = (os || '').toLowerCase();
  if (s.includes('mac')) return 'Apple';
  if (s.includes('linux') || s.includes('astra')) return 'Terminal';
  if (s.includes('android')) return 'Smartphone';
  return 'Monitor';
};

const HomeTab = ({
  devices,
  sessions,
  myAccessId,
  onConnect,
  onRefresh,
}: {
  devices: Device[];
  sessions: Session[];
  myAccessId: string;
  onConnect: (accessId: string, mode?: string) => void;
  onRefresh: () => void;
}) => {
  const [partnerId, setPartnerId] = useState('');
  const [filter, setFilter] = useState('recent');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState<number | null>(null);
  const [modeOpen, setModeOpen] = useState(false);

  const others = devices.filter((d) => d.access_id !== myAccessId);

  const list = useMemo(() => {
    const recentIds = sessions.map((s) => s.access_id);
    let base = others;
    if (filter === 'fav') base = others.filter((d) => d.is_favorite);
    if (filter === 'online') base = others.filter((d) => d.is_online);
    if (filter === 'recent') {
      const inRecent = others.filter((d) => recentIds.includes(d.access_id));
      base = inRecent.length ? inRecent : others;
    }
    const q = query.trim().toLowerCase();
    return q ? base.filter((d) => `${d.name} ${d.access_id} ${d.note}`.toLowerCase().includes(q)) : base;
  }, [others, sessions, filter, query]);

  const toggleFav = async (d: Device) => {
    await api.updateDevice(d.id, { is_favorite: !d.is_favorite });
    setMenu(null);
    onRefresh();
  };

  const fmtId = (v: string) => v.replace(/(\d{3})(?=\d)/g, '$1 ');

  return (
    <div className="flex flex-col gap-6">
      <section className="max-w-[520px] rounded-2xl border border-border bg-background p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <h2 className="text-[1.15rem] font-bold leading-tight">Управление удалённым рабочим столом</h2>
        <input
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onConnect(partnerId.replace(/\D/g, ''))}
          inputMode="numeric"
          placeholder="ID партнёра"
          className="mt-4 h-[50px] w-full rounded-lg border border-input bg-background px-4 text-[1.15rem] outline-none focus:border-primary"
        />
        <div className="relative mt-4 flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onConnect(partnerId.replace(/\D/g, ''))}
            className="rounded-lg bg-primary px-6 py-2.5 text-[0.9rem] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Подключиться
          </button>
          <button
            type="button"
            onClick={() => setModeOpen((o) => !o)}
            className="grid h-[42px] w-[42px] place-items-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90"
            aria-label="Режим подключения"
          >
            <Icon name="ChevronDown" size={17} />
          </button>
          {modeOpen && (
            <div className="absolute right-0 top-[48px] z-20 w-[240px] overflow-hidden rounded-xl border border-border bg-background py-1 shadow-lg">
              {[
                ['control', 'Полное управление', 'MousePointerClick'],
                ['view', 'Только просмотр', 'Eye'],
                ['files', 'Передача файлов', 'FolderSync'],
              ].map(([m, label, icon]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setModeOpen(false);
                    onConnect(partnerId.replace(/\D/g, ''), m);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[0.88rem] hover:bg-secondary"
                >
                  <Icon name={icon} size={16} className="text-muted-foreground" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-4 py-2 text-[0.9rem] transition-colors ${
              filter === f.key
                ? 'bg-background font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}

        <label className="ml-auto flex h-10 w-[220px] items-center gap-2 rounded-lg border border-border bg-background px-3">
          <Icon name="Search" size={16} className="flex-none text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск"
            className="w-full bg-transparent text-[0.88rem] outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="text-muted-foreground">
              <Icon name="CircleX" size={15} />
            </button>
          )}
        </label>
        <span className="flex overflow-hidden rounded-lg border border-border">
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`grid h-10 w-10 place-items-center transition-colors ${
                view === v ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
              }`}
              aria-label={v === 'grid' ? 'Плитками' : 'Списком'}
            >
              <Icon name={v === 'grid' ? 'LayoutGrid' : 'List'} size={17} />
            </button>
          ))}
        </span>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <Icon name="MonitorOff" size={26} />
          </span>
          <p className="text-[1rem] font-semibold">Здесь пока пусто</p>
          <p className="max-w-[400px] text-[0.9rem] text-muted-foreground">
            Введите ID партнёра выше — компьютер появится в списке после первого подключения.
          </p>
        </div>
      ) : view === 'grid' ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
          {list.map((d) => (
            <li
              key={d.id}
              className="overflow-hidden rounded-xl border border-border bg-background transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            >
              <button
                type="button"
                onClick={() => onConnect(d.access_id)}
                className="grid h-[120px] w-full place-items-center bg-primary/15 text-primary/70"
              >
                <span className="flex flex-col items-center gap-2">
                  <Icon name={osIcon(d.os)} size={38} />
                  <span className="max-w-[170px] truncate px-2 text-[0.76rem] text-foreground/60">{d.name}</span>
                </span>
              </button>
              <div className="relative flex items-center gap-2 px-3 py-2.5">
                <span
                  className={`h-2 w-2 flex-none rounded-full ${
                    d.is_online ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                  }`}
                />
                <span className="min-w-0 flex-1 truncate font-mono text-[0.88rem]">{fmtId(d.access_id)}</span>
                {d.is_favorite && <Icon name="Star" size={14} className="flex-none text-primary" />}
                <button
                  type="button"
                  onClick={() => setMenu(menu === d.id ? null : d.id)}
                  className="text-muted-foreground transition-colors hover:text-primary"
                  aria-label="Действия"
                >
                  <Icon name="EllipsisVertical" size={16} />
                </button>
                {menu === d.id && (
                  <div className="absolute right-2 top-[42px] z-20 w-[215px] overflow-hidden rounded-xl border border-border bg-background py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => onConnect(d.access_id, 'control')}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[0.86rem] hover:bg-secondary"
                    >
                      <Icon name="MousePointerClick" size={15} /> Управлять
                    </button>
                    <button
                      type="button"
                      onClick={() => onConnect(d.access_id, 'files')}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[0.86rem] hover:bg-secondary"
                    >
                      <Icon name="FolderSync" size={15} /> Передать файлы
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFav(d)}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[0.86rem] hover:bg-secondary"
                    >
                      <Icon name="Star" size={15} /> {d.is_favorite ? 'Убрать из избранного' : 'В избранное'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.wakeDevice(d.id);
                        setMenu(null);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[0.86rem] hover:bg-secondary"
                    >
                      <Icon name="Power" size={15} /> Включить по сети
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {list.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`h-2 w-2 flex-none rounded-full ${d.is_online ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
              <Icon name={osIcon(d.os)} size={18} className="flex-none text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.92rem] font-medium">{d.name}</span>
                <span className="block font-mono text-[0.78rem] text-muted-foreground">{fmtId(d.access_id)}</span>
              </span>
              {d.is_favorite && <Icon name="Star" size={15} className="text-primary" />}
              <button
                type="button"
                onClick={() => onConnect(d.access_id)}
                className="rounded-lg border border-border px-4 py-2 text-[0.85rem] font-semibold transition-colors hover:border-primary hover:text-primary"
              >
                Подключиться
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HomeTab;
