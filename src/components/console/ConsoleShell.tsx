import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import type { User } from '@/lib/api';

export type TabKey = 'home' | 'devices' | 'connect' | 'files' | 'team' | 'log' | 'api';

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'home', label: 'Главная', icon: 'House' },
  { key: 'devices', label: 'Устройства', icon: 'MonitorSmartphone' },
  { key: 'connect', label: 'Подключение', icon: 'PlugZap' },
  { key: 'files', label: 'Файлы', icon: 'FolderSync' },
  { key: 'team', label: 'Команда', icon: 'Users' },
  { key: 'log', label: 'Журнал', icon: 'ScrollText' },
  { key: 'api', label: 'API для C#', icon: 'Code2' },
];

const ConsoleShell = ({
  user,
  tab,
  onTab,
  onLogout,
  children,
}: {
  user: User | null;
  tab: TabKey;
  onTab: (t: TabKey) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) => (
  <div className="min-h-screen bg-secondary">
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="pv-container flex h-[74px] items-center gap-6">
        <span className="flex items-center gap-3 text-foreground">
          <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-primary text-primary-foreground">
            <Icon name="MonitorSmartphone" size={20} />
          </span>
          <span className="hidden font-head text-[1.15rem] font-bold -tracking-[0.025em] sm:block">
            ПВ-СИСТЕМА <span className="font-normal text-muted-foreground">Доступ</span>
          </span>
        </span>

        <Link
          to="/help"
          className="ml-auto inline-flex items-center gap-2 rounded-pill border border-border px-5 py-3 text-[0.9rem] font-semibold leading-none text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Icon name="CircleHelp" size={17} />
          <span className="hidden sm:inline">Помощь</span>
        </Link>

        <span className="hidden text-right text-[0.85rem] leading-tight md:block">
          <span className="block font-semibold text-foreground">{user?.full_name || user?.email}</span>
          <span className="block text-muted-foreground">{user?.company || 'Личный аккаунт'}</span>
        </span>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-pill border border-border px-5 py-3 text-[0.9rem] font-semibold leading-none text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Icon name="LogOut" size={17} />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </div>

      <nav className="border-t border-border bg-secondary">
        <div className="pv-container flex h-[56px] items-center gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onTab(t.key)}
              className={`inline-flex flex-none items-center gap-2 rounded-xl px-4 py-2.5 text-[0.92rem] font-medium transition-colors ${
                tab === t.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-background hover:text-primary'
              }`}
            >
              <Icon name={t.icon} size={17} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </header>

    <main className="pv-container py-8 lg:py-11">{children}</main>
  </div>
);

export default ConsoleShell;