import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const mainNav = [
  { label: 'Возможности', href: '#features' },
  { label: 'Веб-консоль', href: '#console' },
  { label: 'Скачать', href: '#download' },
  { label: 'Цены', href: '#pricing' },
  { label: 'Поддержка', href: '#contacts' },
];

const subNav = [
  { label: 'Главная', href: '#top' },
  { label: 'Для дома', href: '#cases' },
  { label: 'Для компаний', href: '#pricing' },
  { label: 'Госорганизациям', href: '#security' },
  { label: 'Партнёрам', href: '#contacts' },
];

const BrandMark = () => (
  <span
    className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-primary"
    aria-hidden="true"
  >
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect
        x="1"
        y="3"
        width="20"
        height="13"
        rx="2.5"
        stroke="currentColor"
        className="text-primary-foreground"
        strokeWidth="1.8"
      />
      <path
        d="M7 19.5h8"
        stroke="currentColor"
        className="text-primary-foreground"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8.5 9.5 11 12l2.5-2.5"
        stroke="currentColor"
        className="text-primary-foreground"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

export const Brand = () => (
  <a href="#top" className="flex items-center gap-3.5 text-foreground no-underline">
    <BrandMark />
    <span className="whitespace-nowrap font-head text-[1.35rem] font-bold -tracking-[0.025em]">
      ПВ-СИСТЕМА <span className="font-normal text-muted-foreground">Доступ</span>
    </span>
  </a>
);

const Header = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 bg-background transition-shadow ${
        scrolled ? 'shadow-[0_10px_30px_-24px_hsl(var(--foreground)/0.6)]' : ''
      }`}
    >
      {/* верхняя полоса */}
      <div className="animate-rise">
        <div className="pv-container flex h-[76px] items-center gap-11 lg:h-[92px]">
          <Brand />

          <nav className="ml-2 hidden items-center gap-[30px] xl:flex" aria-label="Основная навигация">
            {mainNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="whitespace-nowrap border-b-2 border-transparent py-1.5 text-[0.95rem] font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-[18px]">
            <a
              href="tel:88005006857"
              className="hidden whitespace-nowrap font-head text-[1.05rem] font-bold text-foreground transition-colors hover:text-primary sm:block"
            >
              8&nbsp;800&nbsp;500-68-57
            </a>
            <Link
              to="/login"
              className="hidden items-center rounded-pill border border-primary px-[30px] py-[15px] text-[0.95rem] font-semibold leading-none text-primary transition-colors hover:bg-primary hover:text-primary-foreground lg:inline-flex"
            >
              Личный кабинет
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={open}
              className="grid h-11 w-11 place-items-center rounded-xl border border-border text-foreground transition-colors hover:border-primary hover:text-primary xl:hidden"
            >
              <Icon name={open ? 'X' : 'Menu'} size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* вторая полоса навигации */}
      <nav
        className="hidden animate-rise border-y border-border bg-secondary [animation-delay:.14s] xl:block"
        aria-label="Разделы"
      >
        <div className="pv-container flex h-[58px] items-center gap-[34px]">
          {subNav.map((item, i) => (
            <a
              key={item.href + item.label}
              href={item.href}
              className={`text-[0.95rem] font-medium transition-colors hover:text-primary ${
                i === 0 ? 'text-primary' : 'text-foreground'
              }`}
            >
              {item.label}
            </a>
          ))}
          <span className="ml-auto flex items-center gap-3.5 text-[0.82rem] tracking-[0.02em] text-muted-foreground">
            <span className="inline-block h-[5px] w-[5px] rounded-full bg-primary" aria-hidden="true" />
            Windows&nbsp;<i className="not-italic font-semibold text-foreground">·</i>&nbsp;macOS&nbsp;
            <i className="not-italic font-semibold text-foreground">·</i>&nbsp;Linux&nbsp;
            <i className="not-italic font-semibold text-foreground">·</i>&nbsp;Astra&nbsp;Linux&nbsp;
            <i className="not-italic font-semibold text-foreground">·</i>&nbsp;Android
          </span>
        </div>
      </nav>

      {/* мобильное меню */}
      {open && (
        <div className="animate-fade-in border-t border-border bg-background xl:hidden">
          <div className="pv-container flex flex-col gap-1 py-5">
            {[...mainNav, ...subNav.slice(1)].map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary"
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center justify-center gap-2.5 rounded-pill bg-primary px-[30px] py-[15px] text-[0.95rem] font-semibold leading-none text-primary-foreground"
            >
              <Icon name="LogIn" size={18} />
              Личный кабинет
            </Link>
            <a
              href="#download"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-pill border border-primary px-[30px] py-[15px] text-[0.95rem] font-semibold leading-none text-primary"
            >
              <Icon name="Download" size={18} />
              Скачать программу
            </a>
            <a
              href="tel:88005006857"
              className="mt-2 px-3 py-2 font-head text-lg font-bold text-foreground"
            >
              8 800 500-68-57
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;