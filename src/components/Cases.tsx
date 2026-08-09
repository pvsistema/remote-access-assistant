import { useState } from 'react';
import Icon from '@/components/ui/icon';

const cases = [
  {
    key: 'support',
    tab: 'Аутсорс-поддержка',
    icon: 'Headset',
    title: 'Сервисная компания обслуживает 1 200 клиентов',
    text: 'Инженеры подключаются по коду сеанса без выезда: клиент скачивает модуль поддержки с сайта компании и называет шесть цифр. Каждое подключение автоматически попадает в журнал и в отчёт для биллинга.',
    stats: [
      { value: '−68%', label: 'выездов на объект' },
      { value: '9 сек', label: 'до начала сеанса' },
      { value: '4,9', label: 'оценка клиентов' },
    ],
  },
  {
    key: 'corp',
    tab: 'Корпоративный IT-отдел',
    icon: 'Building2',
    title: 'Сеть из 40 филиалов под одной админ-панелью',
    text: 'Устройства разбиты по группам и городам, у каждого инженера — свои права. Обновления и настройки раскатываются через групповые политики, а руководитель видит статистику нагрузки по отделам.',
    stats: [
      { value: '3 400', label: 'управляемых ПК' },
      { value: '12 мин', label: 'среднее время решения' },
      { value: '24/7', label: 'дежурная смена' },
    ],
  },
  {
    key: 'gov',
    tab: 'Госорганизация',
    icon: 'Landmark',
    title: 'Закрытый контур на Astra Linux',
    text: 'Сервер развёрнут внутри учреждения, доступа в интернет нет. Продукт из реестра отечественного ПО закрывает требования импортозамещения, все сеансы пишутся и хранятся на стороне заказчика.',
    stats: [
      { value: '0', label: 'внешних подключений' },
      { value: '100%', label: 'данных внутри контура' },
      { value: '44-ФЗ', label: 'закупка по реестру' },
    ],
  },
  {
    key: 'home',
    tab: 'Личное использование',
    icon: 'House',
    title: 'Рабочий стол офисного ПК из дома',
    text: 'Неконтролируемый доступ по паролю: домашний ноутбук подключается к рабочей машине, файлы переносятся перетаскиванием, а печать идёт на домашний принтер. Помочь родителям с компьютером — тоже пара кликов.',
    stats: [
      { value: '0 ₽', label: 'домашняя лицензия' },
      { value: '512 Кбит/с', label: 'минимальный канал' },
      { value: '5 ОС', label: 'поддерживается' },
    ],
  },
];

const Cases = () => {
  const [active, setActive] = useState(cases[0].key);
  const item = cases.find((c) => c.key === active) ?? cases[0];

  return (
    <section id="cases" className="border-t border-border bg-secondary py-20 lg:py-28">
      <div className="pv-container">
        <div className="max-w-[680px]">
          <span className="pv-eyebrow">Сценарии использования</span>
          <h2 className="mt-4 text-[30px] font-bold leading-[1.1] -tracking-[0.03em] sm:text-[40px]">
            Как программу используют каждый день
          </h2>
        </div>

        <div className="mt-10 flex flex-wrap gap-2.5">
          {cases.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setActive(c.key)}
              className={`inline-flex items-center gap-2 rounded-pill border px-5 py-3 text-[0.9rem] font-semibold leading-none transition-colors ${
                active === c.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:border-primary hover:text-primary'
              }`}
            >
              <Icon name={c.icon} fallback="Circle" size={17} />
              {c.tab}
            </button>
          ))}
        </div>

        <div
          key={item.key}
          className="mt-8 grid animate-fade-in gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-[1.4fr_1fr]"
        >
          <div className="bg-card p-8 lg:p-10">
            <h3 className="text-[1.5rem] font-bold leading-[1.2] -tracking-[0.025em]">
              {item.title}
            </h3>
            <p className="mt-5 text-[1rem] leading-[1.65] text-muted-foreground">{item.text}</p>
            <a
              href="#contacts"
              className="mt-8 inline-flex items-center gap-2 text-[0.95rem] font-semibold text-primary transition-colors hover:text-destructive"
            >
              Обсудить похожий сценарий
              <Icon name="ArrowRight" size={17} />
            </a>
          </div>
          <div className="grid bg-card">
            {item.stats.map((s) => (
              <div
                key={s.label}
                className="flex items-baseline gap-4 border-b border-border px-8 py-7 last:border-b-0 lg:px-10"
              >
                <span className="font-head text-[2rem] font-bold leading-none -tracking-[0.03em] text-primary">
                  {s.value}
                </span>
                <span className="text-[0.88rem] text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Cases;
