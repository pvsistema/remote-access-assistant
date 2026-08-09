import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const CtaBand = () => {
  return (
    <section className="border-t border-border py-16 lg:py-20">
      <div className="pv-container">
        <div className="relative overflow-hidden rounded-[28px] bg-foreground px-8 py-12 text-background lg:px-14 lg:py-16">
          <span
            className="pointer-events-none absolute -right-24 -top-24 hidden aspect-square w-[420px] rounded-full border border-background/15 lg:block"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute -bottom-40 right-16 hidden aspect-square w-[380px] rounded-full border border-background/10 lg:block"
            aria-hidden="true"
          />
          <div className="relative max-w-[720px]">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-background/60">
              Начните за минуту
            </span>
            <h2 className="mt-4 text-[28px] font-bold leading-[1.12] -tracking-[0.03em] sm:text-[38px]">
              Скачайте программу и подключитесь к первому компьютеру прямо сейчас
            </h2>
            <p className="mt-5 max-w-[52ch] text-[1rem] leading-[1.6] text-background/70">
              Регистрация не нужна для первого сеанса: запустите файл, назовите код — и вы уже
              управляете удалённым рабочим столом.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#download"
                className="inline-flex items-center gap-2.5 rounded-pill bg-primary px-[30px] py-[17px] text-[0.95rem] font-semibold leading-none text-primary-foreground transition-colors hover:bg-destructive"
              >
                <Icon name="Download" size={18} />
                Скачать бесплатно
              </a>
              <Link
                to="/"
                className="inline-flex items-center gap-2.5 rounded-pill border border-background/30 px-[30px] py-[17px] text-[0.95rem] font-semibold leading-none text-background transition-colors hover:bg-background hover:text-foreground"
              >
                <Icon name="ArrowLeft" size={18} />
                Вернуться в программу
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBand;