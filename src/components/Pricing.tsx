import { useState } from 'react';
import Icon from '@/components/ui/icon';

const plans = [
  {
    name: 'Домашний',
    tagline: 'Личные компьютеры и помощь родным',
    monthly: 0,
    yearly: 0,
    priceNote: 'Бесплатно навсегда',
    cta: 'Скачать бесплатно',
    features: [
      '1 оператор, до 3 устройств',
      'Подключение по коду сеанса',
      'Передача файлов',
      'Чат и буфер обмена',
      'Некоммерческое использование',
    ],
  },
  {
    name: 'Специалист',
    tagline: 'Приходящий админ и аутсорс-поддержка',
    monthly: 690,
    yearly: 550,
    priceNote: 'за оператора в месяц',
    cta: 'Попробовать 14 дней',
    highlight: true,
    features: [
      'Безлимит подключений',
      'Адресная книга и неконтролируемый доступ',
      'Запись сеансов, журнал действий',
      'Свой логотип в модуле поддержки',
      'Работа в фоне: службы, реестр, консоль',
    ],
  },
  {
    name: 'Компания',
    tagline: 'IT-отдел и распределённые филиалы',
    monthly: 1890,
    yearly: 1490,
    priceNote: 'за оператора в месяц',
    cta: 'Запросить расчёт',
    features: [
      'Админ-панель, группы и роли',
      'SSO, двухфакторная аутентификация',
      'Массовое развёртывание через GPO/MDM',
      'Инвентаризация парка устройств',
      'Приоритетная поддержка 24/7',
    ],
  },
  {
    name: 'On-premise',
    tagline: 'Госорганизации и закрытый контур',
    monthly: null,
    yearly: null,
    priceNote: 'по запросу',
    cta: 'Обсудить внедрение',
    features: [
      'Сервер в вашем контуре, без интернета',
      'Реестр отечественного ПО',
      'Astra Linux, РЕД ОС, ALT Linux',
      'Бессрочная лицензия',
      'Обучение и техсопровождение',
    ],
  },
];

const Pricing = () => {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="border-t border-border bg-secondary py-20 lg:py-28">
      <div className="pv-container">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[680px]">
            <span className="pv-eyebrow">Тарифы и лицензии</span>
            <h2 className="mt-4 text-[30px] font-bold leading-[1.1] -tracking-[0.03em] sm:text-[40px]">
              Прозрачные цены, лицензия на оператора
            </h2>
            <p className="mt-5 text-[1.05rem] leading-[1.6] text-muted-foreground">
              Платите только за тех, кто подключается. Количество управляемых компьютеров не
              ограничено ни в одном коммерческом тарифе.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-pill border border-border bg-background p-1.5">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`rounded-pill px-5 py-3 text-[0.9rem] font-semibold leading-none transition-colors ${
                !yearly ? 'bg-primary text-primary-foreground' : 'text-foreground hover:text-primary'
              }`}
            >
              Помесячно
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`rounded-pill px-5 py-3 text-[0.9rem] font-semibold leading-none transition-colors ${
                yearly ? 'bg-primary text-primary-foreground' : 'text-foreground hover:text-primary'
              }`}
            >
              На год −20%
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const price = yearly ? plan.yearly : plan.monthly;
            return (
              <article
                key={plan.name}
                className={`flex flex-col rounded-2xl border bg-card p-7 transition-shadow hover:shadow-[0_24px_50px_-30px_hsl(var(--foreground)/0.5)] ${
                  plan.highlight ? 'border-primary' : 'border-border'
                }`}
              >
                {plan.highlight && (
                  <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-pill bg-primary px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground">
                    Выбирают чаще
                  </span>
                )}
                <h3 className="text-[1.3rem] font-bold -tracking-[0.02em]">{plan.name}</h3>
                <p className="mt-2 text-[0.88rem] leading-[1.5] text-muted-foreground">
                  {plan.tagline}
                </p>

                <div className="mt-6 border-y border-border py-5">
                  <span className="block font-head text-[2rem] font-bold leading-none -tracking-[0.03em]">
                    {price === null ? 'Индивидуально' : price === 0 ? '0 ₽' : `${price} ₽`}
                  </span>
                  <span className="mt-2 block text-[0.82rem] text-muted-foreground">
                    {price === null || price === 0
                      ? plan.priceNote
                      : `${plan.priceNote}${yearly ? ' при оплате за год' : ''}`}
                  </span>
                </div>

                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[0.9rem] leading-[1.5]">
                      <Icon name="Check" size={17} className="mt-0.5 flex-none text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.monthly === 0 ? '#download' : '#contacts'}
                  className={`mt-7 inline-flex items-center justify-center rounded-pill border border-primary px-6 py-3.5 text-[0.92rem] font-semibold leading-none transition-colors ${
                    plan.highlight
                      ? 'bg-primary text-primary-foreground hover:bg-destructive hover:border-destructive'
                      : 'text-primary hover:bg-primary hover:text-primary-foreground'
                  }`}
                >
                  {plan.cta}
                </a>
              </article>
            );
          })}
        </div>

        <p className="mt-8 text-[0.85rem] text-muted-foreground">
          Образовательным и медицинским учреждениям — скидка 40%. Партнёрам и интеграторам доступна
          реселлерская программа.
        </p>
      </div>
    </section>
  );
};

export default Pricing;
