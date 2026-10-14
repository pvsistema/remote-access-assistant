import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';
import type { Device, User } from '@/lib/api';

export type TabKey = 'home' | 'devices' | 'connect' | 'files' | 'team' | 'log' | 'server' | 'api';

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'home', label: 'Главная', icon: 'House' },
  { key: 'devices', label: 'Адресная книга', icon: 'BookUser' },
  { key: 'connect', label: 'Подключение', icon: 'PlugZap' },
  { key: 'files', label: 'Файлы', icon: 'FolderSync' },
  { key: 'team', label: 'Команда', icon: 'Users' },
  { key: 'log', label: 'Журнал', icon: 'ScrollText' },
  { key: 'server', label: 'Свой сервер', icon: 'Server' },
  { key: 'api', label: 'API для C#', icon: 'Code2' },
];

// In guest mode there is no account, so account-only sections are hidden.
const GUEST_TABS: TabKey[] = ['home', 'connect', 'files'];

const ConsoleShell = ({
  user,
  tab,
  onTab,
  onLogout,
  myDevice,
  password,
  onRefreshPassword,
  online,
  guest = false,
  children,
}: {
  user: User | null;
  tab: TabKey;
  onTab: (t: TabKey) => void;
  onLogout: () => void;
  myDevice: Device | null;
  password: string;
  onRefreshPassword: () => void;
  online: number;
  guest?: boolean;
  children: React.ReactNode;
}) => {
  const [copied, setCopied] = useState('');
  const visibleTabs = guest ? tabs.filter((t) => GUEST_TABS.includes(t.key)) : tabs;

  const copy = (value: string, key: string) => {
    navigator.clipboard?.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const share = () => {
    const link = `${window.location.origin}/?id=${myDevice?.access_id || ''}`;
    navigator.clipboard?.writeText(link);
    toast({ title: 'Ссылка скопирована', description: 'Отправьте её специалисту для подключения' });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary">
      <header className="flex h-[52px] flex-none items-center gap-3 border-b border-border bg-background px-4">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Icon name="MonitorSmartphone" size={17} />
        </span>
        <span className="font-head text-[0.98rem] font-bold -tracking-[0.02em]">
          ПВ-СИСТЕМА <span className="font-normal text-muted-foreground">Доступ</span>
        </span>

        <span className="ml-auto hidden text-right text-[0.8rem] leading-tight sm:block">
          <span className="block font-semibold">
            {guest ? 'Быстрый сеанс' : user?.full_name || user?.email}
          </span>
          <span className="block text-muted-foreground">
            {guest ? 'Без регистрации' : user?.company || 'Личный аккаунт'}
          </span>
        </span>
        <Link
          to="/help"
          title="Помощь и сведения о программе"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
        >
          <Icon name="CircleHelp" size={18} />
        </Link>
        <button
          type="button"
          onClick={onLogout}
          title="Выйти"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
        >
          <Icon name="LogOut" size={18} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[268px] flex-none flex-col border-r border-border bg-background px-5 py-6 md:flex">
          <p className="text-[0.83rem] leading-[1.45] text-muted-foreground">
            Ваш рабочий стол доступен с этим идентификатором и паролем
          </p>

          <div className="mt-5 border-l-[3px] border-primary pl-3.5">
            <span className="flex items-center gap-2">
              <span className="text-[0.82rem] text-muted-foreground">ID</span>
              <button
                type="button"
                onClick={share}
                title="Скопировать ссылку-приглашение"
                className="ml-auto text-muted-foreground transition-colors hover:text-primary"
              >
                <Icon name="Share2" size={16} />
              </button>
              <button
                type="button"
                onClick={() => myDevice && copy(myDevice.access_id, 'id')}
                title="Скопировать ID"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <Icon name={copied === 'id' ? 'Check' : 'Copy'} size={16} />
              </button>
            </span>
            <span className="mt-0.5 block font-head text-[1.45rem] font-bold leading-tight">
              {myDevice ? myDevice.access_id.replace(/(\d{3})(?=\d)/g, '$1 ') : '— — —'}
            </span>
          </div>

          <div className="mt-5 border-l-[3px] border-primary pl-3.5">
            <span className="flex items-center gap-2">
              <span className="text-[0.82rem] text-muted-foreground">Пароль</span>
              <button
                type="button"
                onClick={() => copy(password, 'pass')}
                title="Скопировать пароль"
                className="ml-auto text-muted-foreground transition-colors hover:text-primary"
              >
                <Icon name={copied === 'pass' ? 'Check' : 'Copy'} size={16} />
              </button>
              <button
                type="button"
                onClick={onRefreshPassword}
                title="Сменить пароль"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <Icon name="RotateCcw" size={16} />
              </button>
            </span>
            <span className="mt-0.5 block font-mono text-[1.3rem] font-bold tracking-[0.06em]">{password}</span>
          </div>

          <nav className="mt-7 flex flex-col gap-1">
            {visibleTabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => onTab(t.key)}
                className={`inline-flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[0.9rem] font-medium transition-colors ${
                  tab === t.key ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
                }`}
              >
                <Icon name={t.icon} size={17} />
                {t.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 text-center">
            <p className="text-[0.85rem] font-semibold leading-[1.4]">Есть вопросы или нашли ошибку?</p>
            <Link
              to="/help"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary px-4 py-2.5 text-[0.87rem] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Служба поддержки
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto">
          <nav className="flex gap-1 overflow-x-auto border-b border-border bg-background px-4 py-2 md:hidden">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => onTab(t.key)}
                className={`inline-flex flex-none items-center gap-2 rounded-lg px-3 py-2 text-[0.85rem] font-medium ${
                  tab === t.key ? 'bg-primary text-primary-foreground' : 'text-foreground'
                }`}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
              </button>
            ))}
          </nav>
          <div className="p-5 lg:p-7">{children}</div>
        </main>
      </div>

      <footer className="flex h-[38px] flex-none items-center gap-3 border-t border-border bg-background px-5 text-[0.82rem] text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Готово
        </span>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:inline">{online} устройств в сети</span>
        <span className="ml-auto font-mono text-[0.76rem]">версия 3.0</span>
      </footer>
    </div>
  );
};

export default ConsoleShell;