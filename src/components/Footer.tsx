import Icon from '@/components/ui/icon';

const columns = [
  {
    title: 'Продукт',
    links: [
      { label: 'Возможности', href: '#features' },
      { label: 'Скачать', href: '#download' },
      { label: 'Тарифы и лицензии', href: '#pricing' },
      { label: 'Безопасность', href: '#security' },
    ],
  },
  {
    title: 'Решения',
    links: [
      { label: 'Для дома', href: '#cases' },
      { label: 'Для компаний', href: '#pricing' },
      { label: 'Госорганизациям', href: '#security' },
      { label: 'Аутсорс-поддержке', href: '#cases' },
    ],
  },
  {
    title: 'Помощь',
    links: [
      { label: 'Частые вопросы', href: '#faq' },
      { label: 'Контакты', href: '#contacts' },
      { label: 'Партнёрам', href: '#contacts' },
      { label: 'Статус сервисов', href: '#contacts' },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="border-t border-border bg-secondary py-14">
      <div className="pv-container">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-3.5">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-primary text-primary-foreground">
                <Icon name="MonitorDot" fallback="Monitor" size={22} />
              </span>
              <span className="font-head text-[1.25rem] font-bold -tracking-[0.025em]">
                ПВ-СИСТЕМА <span className="font-normal text-muted-foreground">Доступ</span>
              </span>
            </div>
            <p className="mt-5 max-w-[38ch] text-[0.9rem] leading-[1.6] text-muted-foreground">
              Российская программа удалённого доступа и технической поддержки. Серверы в России,
              продукт в реестре отечественного ПО.
            </p>
            <a
              href="tel:88005006857"
              className="mt-6 inline-block font-head text-[1.2rem] font-bold transition-colors hover:text-primary"
            >
              8 800 500-68-57
            </a>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {col.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-[0.92rem] text-foreground transition-colors hover:text-primary"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-7 text-[0.82rem] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 ООО «ПВ-СИСТЕМА». Все права защищены.</span>
          <span className="flex flex-wrap gap-5">
            <a href="#contacts" className="transition-colors hover:text-primary">
              Политика конфиденциальности
            </a>
            <a href="#contacts" className="transition-colors hover:text-primary">
              Лицензионное соглашение
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
