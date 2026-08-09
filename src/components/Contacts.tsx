import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';

type Errors = { name?: string; contact?: string; message?: string };

const channels = [
  {
    icon: 'Phone',
    label: 'Отдел продаж',
    value: '8 800 500-68-57',
    note: 'Пн–Пт, 9:00–19:00 МСК, звонок бесплатный',
    href: 'tel:88005006857',
  },
  {
    icon: 'Mail',
    label: 'Техническая поддержка',
    value: 'support@pv-dostup.ru',
    note: 'Круглосуточно, ответ в среднем за 7 минут',
    href: 'mailto:support@pv-dostup.ru',
  },
  {
    icon: 'Handshake',
    label: 'Партнёрам и интеграторам',
    value: 'partners@pv-dostup.ru',
    note: 'Реселлерская программа и совместные внедрения',
    href: 'mailto:partners@pv-dostup.ru',
  },
];

const Contacts = () => {
  const [form, setForm] = useState({ name: '', contact: '', message: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const validate = () => {
    const next: Errors = {};
    if (form.name.trim().length < 2) next.name = 'Укажите имя — минимум 2 символа';
    const c = form.contact.trim();
    const okMail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);
    const okPhone = /^\+?[\d\s()-]{10,18}$/.test(c);
    if (!okMail && !okPhone) next.contact = 'Введите корректную почту или телефон';
    if (form.message.trim().length < 10) next.message = 'Опишите задачу подробнее — от 10 символов';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSent(true);
    toast({
      title: 'Заявка отправлена',
      description: 'Свяжемся с вами в рабочее время и подберём тариф под ваши задачи.',
    });
    setForm({ name: '', contact: '', message: '' });
  };

  const field =
    'w-full rounded-xl border bg-background px-4 py-3.5 text-[0.95rem] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary';

  return (
    <section id="contacts" className="border-t border-border bg-secondary py-20 lg:py-28">
      <div className="pv-container grid gap-12 lg:grid-cols-2">
        <div>
          <span className="pv-eyebrow">Контакты и поддержка</span>
          <h2 className="mt-4 text-[30px] font-bold leading-[1.1] -tracking-[0.03em] sm:text-[40px]">
            Поможем выбрать тариф и развернуть систему
          </h2>
          <p className="mt-5 text-[1.02rem] leading-[1.6] text-muted-foreground">
            Расскажите про парк устройств и задачи — предложим конфигурацию, пришлём тестовые
            лицензии и документы для закупки.
          </p>

          <div className="mt-9 flex flex-col gap-px overflow-hidden rounded-2xl border border-border bg-border">
            {channels.map((c) => (
              <a
                key={c.label}
                href={c.href}
                className="group flex items-start gap-4 bg-card p-6 transition-colors hover:bg-background"
              >
                <span className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-accent text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon name={c.icon} fallback="Mail" size={20} />
                </span>
                <span>
                  <span className="block font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {c.label}
                  </span>
                  <span className="mt-1.5 block font-head text-[1.15rem] font-bold -tracking-[0.02em]">
                    {c.value}
                  </span>
                  <span className="mt-1 block text-[0.85rem] text-muted-foreground">{c.note}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 lg:p-10">
          {sent ? (
            <div className="flex animate-scale-in flex-col items-start gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
                <Icon name="Check" size={26} />
              </span>
              <h3 className="text-[1.4rem] font-bold -tracking-[0.02em]">Заявка принята</h3>
              <p className="text-[0.98rem] leading-[1.6] text-muted-foreground">
                Спасибо! Менеджер свяжется с вами в ближайшее рабочее время. Пока ждёте — скачайте
                программу и попробуйте подключение.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#download"
                  className="inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-3.5 text-[0.92rem] font-semibold leading-none text-primary-foreground transition-colors hover:bg-destructive"
                >
                  <Icon name="Download" size={17} />
                  Скачать программу
                </a>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="inline-flex items-center rounded-pill border border-border px-6 py-3.5 text-[0.92rem] font-semibold leading-none transition-colors hover:border-primary hover:text-primary"
                >
                  Отправить ещё одну
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h3 className="text-[1.4rem] font-bold -tracking-[0.02em]">Оставить заявку</h3>
              <p className="mt-2 text-[0.9rem] text-muted-foreground">
                Ответим на почту или перезвоним — как вам удобнее.
              </p>

              <div className="mt-7 flex flex-col gap-5">
                <label className="block">
                  <span className="mb-2 block text-[0.85rem] font-semibold">Как к вам обращаться</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Иван Петров"
                    className={`${field} ${errors.name ? 'border-primary' : 'border-border'}`}
                  />
                  {errors.name && (
                    <span className="mt-2 block text-[0.8rem] text-primary">{errors.name}</span>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-[0.85rem] font-semibold">Почта или телефон</span>
                  <input
                    type="text"
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    placeholder="ivan@company.ru"
                    className={`${field} ${errors.contact ? 'border-primary' : 'border-border'}`}
                  />
                  {errors.contact && (
                    <span className="mt-2 block text-[0.8rem] text-primary">{errors.contact}</span>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-[0.85rem] font-semibold">Задача</span>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Например: 250 рабочих мест, нужна админ-панель и журнал сеансов"
                    className={`${field} resize-none ${
                      errors.message ? 'border-primary' : 'border-border'
                    }`}
                  />
                  {errors.message && (
                    <span className="mt-2 block text-[0.8rem] text-primary">{errors.message}</span>
                  )}
                </label>
              </div>

              <button
                type="submit"
                className="mt-7 inline-flex w-full items-center justify-center gap-2.5 rounded-pill bg-primary px-[30px] py-[17px] text-[0.95rem] font-semibold leading-none text-primary-foreground transition-colors hover:bg-destructive"
              >
                Отправить заявку
                <Icon name="ArrowRight" size={18} />
              </button>
              <p className="mt-4 text-[0.78rem] leading-[1.5] text-muted-foreground">
                Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default Contacts;
