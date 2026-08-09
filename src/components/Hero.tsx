import Icon from '@/components/ui/icon';
import QuickConnect from '@/components/QuickConnect';

const HERO_IMAGE =
  'https://cdn.poehali.dev/projects/42fb022b-172b-44cd-99bf-901d0446c150/files/65ea7778-164a-4aa8-8614-b713ed5a720c.jpg';

const Hero = () => {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="pv-container grid items-center gap-10 py-14 lg:grid-cols-[minmax(0,620px)_minmax(0,1fr)] lg:py-0 lg:min-h-[640px]">
        {/* текст */}
        <div>
          <h1 className="max-w-[15ch] animate-rise text-[38px] font-bold leading-[1.08] -tracking-[0.032em] [animation-delay:.14s] sm:text-[46px] lg:text-[54px]">
            Подключиться к чужому компьютеру за&nbsp;9&nbsp;секунд
          </h1>
          <p className="mt-[22px] max-w-[46ch] animate-rise text-[1.05rem] leading-[1.55] text-muted-foreground [animation-delay:.23s] lg:text-[1.12rem]">
            Клиент называет{' '}
            <em className="font-semibold not-italic text-foreground">шестизначный код</em> — вы
            видите его экран, управляете мышью и передаёте файлы. Без настройки роутера, VPN и прав
            администратора.
          </p>
          <div className="mt-[30px] max-w-[540px] animate-rise [animation-delay:.23s]">
            <QuickConnect />
          </div>

          <div className="mt-6 flex animate-rise flex-wrap items-center gap-5 [animation-delay:.3s]">
            <a
              href="#download"
              className="inline-flex items-center gap-2.5 rounded-pill border border-primary px-[30px] py-[15px] text-[0.95rem] font-semibold leading-none text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Icon name="Download" size={17} />
              Скачать программу
            </a>
            <span className="max-w-[26ch] text-[0.85rem] leading-[1.45] text-muted-foreground">
              14,8&nbsp;МБ, без установки. Серверы в&nbsp;России, реестр&nbsp;РФ.
            </span>
          </div>
        </div>

        {/* фото в круге */}
        <div className="relative flex h-full animate-rise items-center justify-center [animation-delay:.34s] lg:justify-end">
          <span
            className="pointer-events-none absolute hidden aspect-square w-[660px] rounded-full border border-border lg:block lg:-right-[130px]"
            aria-hidden="true"
          />
          <div className="relative aspect-square w-full max-w-[340px] rounded-full bg-accent sm:max-w-[440px] lg:w-[560px] lg:max-w-none lg:-mr-20">
            <img
              src={HERO_IMAGE}
              alt="Специалисты поддержки за ноутбуками в офисе"
              className="block h-full w-full rounded-full object-cover"
            />
            <div className="absolute bottom-4 left-0 flex items-center gap-4 rounded-[18px] border border-border bg-background px-5 py-4 shadow-[0_18px_40px_hsl(var(--foreground)/0.10)] sm:bottom-10 lg:-left-[34px] lg:bottom-24">
              <span>
                <span className="mb-1.5 block font-mono text-[0.7rem] uppercase tracking-[0.06em] text-muted-foreground">
                  Код сеанса
                </span>
                <span className="block font-head text-[1.5rem] font-bold leading-none tracking-[0.06em]">
                  418&nbsp;720
                </span>
              </span>
              <span className="flex items-center gap-2 border-l border-border pl-4 text-[0.82rem] font-semibold text-primary">
                <span
                  className="h-2 w-2 animate-pulse-dot rounded-full bg-primary"
                  aria-hidden="true"
                />
                Идёт подключение
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;