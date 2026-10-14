import Icon from '@/components/ui/icon';
import type { LogItem } from '@/lib/api';
import { parseServerDate } from '@/lib/dates';

const icons: Record<string, string> = {
  login: 'LogIn',
  register: 'UserPlus',
  device_register: 'MonitorSmartphone',
  session_create: 'PlugZap',
  session_active: 'Play',
  session_closed: 'Square',
  session_rejected: 'X',
};

const LogTab = ({ logs }: { logs: LogItem[] }) => (
  <section className="overflow-hidden rounded-[22px] border border-border bg-background">
    <header className="border-b border-border px-6 py-5">
      <h2 className="text-[1.15rem] font-bold">Журнал событий</h2>
      <p className="mt-1.5 text-[0.89rem] text-muted-foreground">
        Все действия в аккаунте: входы, подключения устройств и сеансы удалённого доступа.
      </p>
    </header>

    {logs.length === 0 ? (
      <p className="px-6 py-14 text-center text-[0.95rem] text-muted-foreground">Событий пока нет.</p>
    ) : (
      <ul className="divide-y divide-border">
        {logs.map((l) => (
          <li key={l.id} className="flex items-center gap-4 px-6 py-4">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-secondary text-foreground">
              <Icon name={icons[l.event_type] || 'Activity'} size={18} />
            </span>
            <span className="flex-1 text-[0.94rem] text-foreground">{l.message}</span>
            <span className="hidden font-mono text-[0.8rem] text-muted-foreground sm:block">{l.ip || '—'}</span>
            <span className="whitespace-nowrap text-[0.83rem] text-muted-foreground">
              {parseServerDate(l.created_at).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default LogTab;
