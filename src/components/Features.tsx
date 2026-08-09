import { useState } from 'react';
import Icon from '@/components/ui/icon';

const features = [
  {
    icon: 'MonitorSmartphone',
    title: 'Мгновенное подключение',
    text: 'Шестизначный код сеанса вместо белого IP. Работает через NAT и корпоративный файрвол, без проброса портов и VPN.',
  },
  {
    icon: 'Headset',
    title: 'Удалённая техподдержка',
    text: 'Модуль без установки и прав администратора: клиент запускает файл, называет код — вы уже на его рабочем столе.',
  },
  {
    icon: 'FolderSync',
    title: 'Передача файлов',
    text: 'Двухпанельный менеджер, drag-and-drop, докачка при обрыве связи и передача из буфера обмена в обе стороны.',
  },
  {
    icon: 'Building2',
    title: 'Админ-панель компании',
    text: 'Группы устройств, роли операторов, единый адресный список, журнал сеансов и запись подключений.',
  },
  {
    icon: 'Zap',
    title: 'Плавная картинка',
    text: 'Собственный кодек с адаптивным битрейтом: комфортная работа даже на 512 Кбит/с и на мобильном интернете.',
  },
  {
    icon: 'Terminal',
    title: 'Работа без экрана',
    text: 'Диспетчер задач, реестр, службы и командная строка в фоне — обслуживайте ПК, не отвлекая сотрудника.',
  },
  {
    icon: 'Users',
    title: 'Многопользовательские сеансы',
    text: 'Несколько операторов на одном экране, чат, голосовая связь и запись сеанса для разбора инцидента.',
  },
  {
    icon: 'Wallpaper',
    title: 'Свой бренд',
    text: 'Собственный логотип, цвета и имя модуля поддержки — клиент скачивает программу с вашего сайта.',
  },
];

const Features = () => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? features : features.slice(0, 6);

  return (
    <section id="features" className="border-t border-border bg-secondary py-20 lg:py-28">
      <div className="pv-container">
        <div className="max-w-[720px]">
          <span className="pv-eyebrow">Возможности программы</span>
          <h2 className="mt-4 text-[30px] font-bold leading-[1.1] -tracking-[0.03em] sm:text-[40px]">
            Всё для удалённой работы и поддержки — в одном окне
          </h2>
          <p className="mt-5 text-[1.05rem] leading-[1.6] text-muted-foreground">
            «ПВ-СИСТЕМА Доступ» заменяет связку из нескольких утилит: подключение, файлы, чат,
            инвентаризация и контроль доступа работают из единой консоли оператора.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((f) => (
            <article
              key={f.title}
              className="group animate-fade-in bg-card p-7 transition-colors hover:bg-background"
            >
              <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-accent text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon name={f.icon} size={22} />
              </span>
              <h3 className="mt-5 text-[1.2rem] font-bold -tracking-[0.02em]">{f.title}</h3>
              <p className="mt-3 text-[0.95rem] leading-[1.6] text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-8 inline-flex items-center gap-2 rounded-pill border border-primary px-[26px] py-3.5 text-[0.95rem] font-semibold leading-none text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          {expanded ? 'Свернуть список' : 'Показать все возможности'}
          <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={18} />
        </button>
      </div>
    </section>
  );
};

export default Features;
