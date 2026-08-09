import Icon from '@/components/ui/icon';

const points = [
  {
    icon: 'Lock',
    title: 'Сквозное шифрование AES-256',
    text: 'Трафик сеанса шифруется на устройствах, ключи вырабатываются по RSA-4096 и не хранятся на серверах.',
  },
  {
    icon: 'Server',
    title: 'Серверы только в России',
    text: 'Дата-центры уровня Tier III в Москве и Екатеринбурге. Обработка данных по 152-ФЗ.',
  },
  {
    icon: 'FileCheck2',
    title: 'Реестр отечественного ПО',
    text: 'Продукт включён в единый реестр российских программ — подходит для закупок по 44-ФЗ и 223-ФЗ.',
  },
  {
    icon: 'KeyRound',
    title: 'Контроль доступа',
    text: 'Двухфакторная аутентификация, белые списки устройств, подтверждение сеанса пользователем и автоблокировка.',
  },
  {
    icon: 'ScrollText',
    title: 'Полный аудит',
    text: 'Журнал всех подключений с видеозаписью экрана и выгрузкой в SIEM вашей организации.',
  },
  {
    icon: 'ShieldAlert',
    title: 'Защита от подбора',
    text: 'Одноразовые коды сеанса, ограничение попыток, уведомления о входе с нового устройства.',
  },
];

const badges = [
  'Реестр российского ПО',
  'Соответствие 152-ФЗ',
  'Astra Linux SE 1.7',
  'ГОСТ-шифрование (опция)',
];

const Security = () => {
  return (
    <section id="security" className="py-20 lg:py-28">
      <div className="pv-container grid gap-12 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div>
          <span className="pv-eyebrow">Безопасность и сертификация</span>
          <h2 className="mt-4 text-[30px] font-bold leading-[1.1] -tracking-[0.03em] sm:text-[40px]">
            Доступ, который примет служба безопасности
          </h2>
          <p className="mt-5 text-[1.02rem] leading-[1.6] text-muted-foreground">
            Мы проектировали продукт под требования корпоративных и государственных заказчиков:
            российская инфраструктура, полный аудит действий оператора и возможность развернуть
            сервер в закрытом контуре.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {badges.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-2 rounded-pill border border-border bg-secondary px-4 py-2.5 text-[0.82rem] font-medium"
              >
                <Icon name="BadgeCheck" size={15} className="text-primary" />
                {b}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
          {points.map((p) => (
            <article key={p.title} className="bg-card p-7">
              <Icon name={p.icon} size={22} className="text-primary" />
              <h3 className="mt-4 text-[1.08rem] font-bold -tracking-[0.02em]">{p.title}</h3>
              <p className="mt-2.5 text-[0.9rem] leading-[1.6] text-muted-foreground">{p.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Security;