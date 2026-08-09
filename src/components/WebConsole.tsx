import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const points = [
  ['BookUser', 'Адресная книга', 'Группы, избранное, поиск по ID и заметки. Включение выключенного ПК по сети.'],
  ['ShieldCheck', 'Права на сеанс', 'Управление, файлы, буфер обмена, звук и запись — включаются по отдельности.'],
  ['MessagesSquare', 'Чат и передача файлов', 'Переписка с пользователем прямо в сеансе и история всех переданных файлов.'],
  ['Users', 'Команда операторов', 'Приглашение сотрудников, роли и блокировка доступа. Журнал всех действий.'],
];

const rows = [
  ['Бухгалтерия ПК-3', '841 686 479', true],
  ['Склад — терминал', '512 004 118', true],
  ['Ноутбук директора', '730 991 245', false],
];

const WebConsole = () => (
  <section id="console" className="border-t border-border bg-secondary py-20 lg:py-28">
    <div className="pv-container grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
      <div>
        <span className="pv-eyebrow">Веб-консоль</span>
        <h2 className="mt-4 text-[30px] font-bold leading-[1.1] -tracking-[0.03em] sm:text-[40px]">
          Управляйте парком компьютеров прямо в браузере
        </h2>
        <p className="mt-5 text-[1.05rem] leading-[1.6] text-muted-foreground">
          Личный кабинет уже работает: устройства, коды подключения, сеансы и журнал событий —
          без установки чего-либо на ваш компьютер.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {points.map(([icon, title, text]) => (
            <li key={title as string} className="rounded-2xl border border-border bg-background p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon name={icon as string} size={19} />
              </span>
              <span className="mt-3.5 block text-[1rem] font-semibold">{title as string}</span>
              <span className="mt-1.5 block text-[0.88rem] leading-[1.5] text-muted-foreground">
                {text as string}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2.5 rounded-pill bg-primary px-[30px] py-[17px] text-[0.95rem] font-semibold leading-none text-primary-foreground transition-colors hover:bg-destructive"
          >
            <Icon name="LogIn" size={18} />
            Открыть консоль
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2.5 rounded-pill border border-border bg-background px-[30px] py-[17px] text-[0.95rem] font-semibold leading-none text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Создать аккаунт
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-border bg-background shadow-[0_28px_60px_hsl(var(--foreground)/0.08)]">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <span className="h-3 w-3 rounded-full bg-primary/70" />
          <span className="h-3 w-3 rounded-full bg-border" />
          <span className="h-3 w-3 rounded-full bg-border" />
          <span className="ml-3 font-mono text-[0.78rem] text-muted-foreground">
            ПВ-СИСТЕМА Доступ · консоль оператора
          </span>
        </div>

        <div className="grid grid-cols-3 gap-px bg-border">
          {[
            ['Устройств', '12'],
            ['В сети', '8'],
            ['Сеансов за месяц', '146'],
          ].map(([label, value]) => (
            <div key={label} className="bg-background px-5 py-5">
              <span className="block font-head text-[1.7rem] font-bold leading-none">{value}</span>
              <span className="mt-1.5 block text-[0.8rem] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <ul className="divide-y divide-border border-t border-border">
          {rows.map(([name, id, online]) => (
            <li key={name as string} className="flex items-center gap-3.5 px-5 py-4">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-secondary text-foreground">
                <Icon name="Monitor" size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.94rem] font-semibold">{name as string}</span>
                <span className="block font-mono text-[0.78rem] text-muted-foreground">ID {id as string}</span>
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-[0.78rem] font-semibold ${
                  online ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${online ? 'animate-pulse-dot bg-primary' : 'bg-muted-foreground'}`} />
                {online ? 'В сети' : 'Не в сети'}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-4 border-t border-border bg-secondary px-5 py-5">
          <span>
            <span className="block font-mono text-[0.7rem] uppercase tracking-[0.06em] text-muted-foreground">
              Код сеанса
            </span>
            <span className="block font-head text-[1.35rem] font-bold tracking-[0.08em]">372 433</span>
          </span>
          <span className="border-l border-border pl-4">
            <span className="block font-mono text-[0.7rem] uppercase tracking-[0.06em] text-muted-foreground">
              Пароль
            </span>
            <span className="block font-head text-[1.35rem] font-bold tracking-[0.08em]">2790</span>
          </span>
          <span className="ml-auto inline-flex items-center gap-2 text-[0.82rem] font-semibold text-primary">
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-primary" />
            Идёт сеанс
          </span>
        </div>
      </div>
    </div>
  </section>
);

export default WebConsole;