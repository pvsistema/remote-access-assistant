import { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';
import type { Device, Group } from '@/lib/api';
import { api } from '@/lib/api';
import { parseServerDate } from '@/lib/dates';

const fmt = (v: string | null) => {
  if (!v) return '—';
  const d = parseServerDate(v);
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
  groups,
  stats,
  onConnect,
  onRefresh,
}: {
  devices: Device[];
  groups: Group[];
  stats: { devices: number; online: number; sessions_30d: number };
  onConnect: (accessId: string) => void;
  onRefresh: () => void;
}) => {
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<number | 'all' | 'fav'>('all');
  const [editing, setEditing] = useState<Device | null>(null);
  const [copied, setCopied] = useState('');
  const [newGroup, setNewGroup] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return devices.filter((d) => {
      if (groupFilter === 'fav' && !d.is_favorite) return false;
      if (typeof groupFilter === 'number' && d.group_id !== groupFilter) return false;
      if (!q) return true;
      return `${d.name} ${d.access_id} ${d.os} ${d.note}`.toLowerCase().includes(q);
    });
  }, [devices, query, groupFilter]);

  const copy = (v: string) => {
    navigator.clipboard?.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(''), 1600);
  };

  const toggleFav = async (d: Device) => {
    await api.updateDevice(d.id, { is_favorite: !d.is_favorite });
    onRefresh();
  };

  const wake = async (d: Device) => {
    const res = await api.wakeDevice(d.id);
    toast({ title: 'Wake-on-LAN', description: res.message });
    onRefresh();
  };

  const addGroup = async () => {
    if (!newGroup.trim()) return;
    await api.createGroup(newGroup.trim());
    setNewGroup('');
    onRefresh();
  };

  const saveDevice = async (patch: Record<string, unknown>) => {
    if (!editing) return;
    await api.updateDevice(editing.id, patch);
    setEditing(null);
    onRefresh();
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
          <h2 className="text-[1.15rem] font-bold">Адресная книга</h2>
          <label className="ml-auto flex h-11 min-w-[210px] flex-1 items-center gap-2.5 rounded-xl bg-secondary px-4 sm:max-w-[300px]">
            <Icon name="Search" size={17} className="flex-none text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени или ID"
              className="w-full bg-transparent text-[0.92rem] outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-pill border border-border px-4 py-2.5 text-[0.87rem] font-semibold leading-none transition-colors hover:border-primary hover:text-primary"
          >
            <Icon name="RefreshCw" size={15} /> Обновить
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-4">
          {[
            { key: 'all' as const, label: 'Все' },
            { key: 'fav' as const, label: 'Избранные' },
            ...groups.map((g) => ({ key: g.id, label: g.name })),
          ].map((g) => (
            <button
              key={String(g.key)}
              type="button"
              onClick={() => setGroupFilter(g.key)}
              className={`rounded-pill px-4 py-2 text-[0.85rem] font-semibold transition-colors ${
                groupFilter === g.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:text-primary'
              }`}
            >
              {g.label}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-2">
            <input
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addGroup()}
              placeholder="Новая группа"
              className="h-10 w-[150px] rounded-xl border border-input px-3 text-[0.85rem] outline-none focus:border-primary"
            />
            <button type="button" onClick={addGroup} className="text-primary" aria-label="Добавить группу">
              <Icon name="Plus" size={19} />
            </button>
          </span>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <Icon name="MonitorOff" size={26} />
            </span>
            <p className="text-[1.02rem] font-semibold">Здесь пока пусто</p>
            <p className="max-w-[420px] text-[0.92rem] text-muted-foreground">
              Установите клиент на компьютер и войдите в нём под этим аккаунтом — устройство появится в книге автоматически.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-4 px-6 py-5">
                <button
                  type="button"
                  onClick={() => toggleFav(d)}
                  aria-label="В избранное"
                  className={d.is_favorite ? 'text-primary' : 'text-muted-foreground/50 hover:text-primary'}
                >
                  <Icon name="Star" size={18} />
                </button>

                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-secondary text-foreground">
                  <Icon name={osIcon(d.os)} size={20} />
                </span>

                <div className="min-w-[190px] flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                    {d.name || 'Без названия'}
                    {d.unattended && (
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[0.7rem] font-semibold text-muted-foreground">
                        без подтверждения
                      </span>
                    )}
                    {d.group_name && (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[0.7rem] font-semibold text-primary">
                        {d.group_name}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[0.83rem] text-muted-foreground">
                    {[d.os, d.os_version, d.local_ip].filter(Boolean).join(' · ') || 'Данные появятся после запуска клиента'}
                    {d.note ? ` · ${d.note}` : ''}
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

                {!d.is_online && (
                  <button
                    type="button"
                    onClick={() => wake(d)}
                    title="Включить по сети (Wake-on-LAN)"
                    className="grid h-10 w-10 place-items-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Icon name="Power" size={17} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setEditing(d)}
                  title="Настройки устройства"
                  className="grid h-10 w-10 place-items-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Icon name="Settings2" size={17} />
                </button>

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

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-5" onClick={() => setEditing(null)}>
          <div
            className="w-full max-w-[460px] animate-scale-in rounded-[24px] border border-border bg-background p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[1.15rem] font-bold">Настройки устройства</h3>
            <EditForm device={editing} groups={groups} onSave={saveDevice} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
};

const EditForm = ({
  device,
  groups,
  onSave,
  onCancel,
}: {
  device: Device;
  groups: Group[];
  onSave: (patch: Record<string, unknown>) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(device.name);
  const [note, setNote] = useState(device.note);
  const [groupId, setGroupId] = useState<number | ''>(device.group_id ?? '');
  const [unattended, setUnattended] = useState(device.unattended);

  return (
    <div className="mt-5 flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-[0.85rem] font-medium text-muted-foreground">Название</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 rounded-xl border border-input px-4 text-[0.95rem] outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[0.85rem] font-medium text-muted-foreground">Заметка</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Например: касса, 2 этаж"
          className="h-12 rounded-xl border border-input px-4 text-[0.95rem] outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[0.85rem] font-medium text-muted-foreground">Группа</span>
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : '')}
          className="h-12 rounded-xl border border-input bg-background px-4 text-[0.95rem] outline-none focus:border-primary"
        >
          <option value="">Без группы</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3.5">
        <input
          type="checkbox"
          checked={unattended}
          onChange={(e) => setUnattended(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        <span className="text-[0.9rem]">Подключение без подтверждения на той стороне</span>
      </label>

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={() => onSave({ name, note, group_id: groupId || null, unattended })}
          className="flex-1 rounded-pill bg-primary py-3.5 text-[0.92rem] font-semibold text-primary-foreground"
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-pill border border-border px-6 py-3.5 text-[0.92rem] font-semibold text-foreground"
        >
          Отмена
        </button>
      </div>
    </div>
  );
};

export default DevicesTab;
