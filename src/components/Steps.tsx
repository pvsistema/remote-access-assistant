import Icon from '@/components/ui/icon';

const steps = [
  {
    n: '01',
    icon: 'Download',
    title: 'Скачайте и запустите',
    text: 'Один файл 14,8 МБ, установка не обязательна. Работает на Windows, macOS, Linux, Astra Linux и Android.',
  },
  {
    n: '02',
    icon: 'Hash',
    title: 'Узнайте код сеанса',
    text: 'Программа показывает шестизначный код и пароль. Клиент диктует их по телефону или присылает в мессенджере.',
  },
  {
    n: '03',
    icon: 'MousePointerClick',
    title: 'Управляйте компьютером',
    text: 'Экран, мышь, клавиатура, файлы и звук — как будто вы сидите за этой машиной. Сеанс пишется в журнал.',
  },
];

const Steps = () => {
  return (
    <section className="border-t border-border py-20 lg:py-24">
      <div className="pv-container">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="max-w-[16ch] text-[30px] font-bold leading-[1.1] -tracking-[0.03em] sm:text-[40px]">
            Три шага до удалённого рабочего стола
          </h2>
          <p className="max-w-[42ch] text-[0.98rem] leading-[1.6] text-muted-foreground">
            Ни настройки роутера, ни VPN, ни системного администратора на другом конце провода.
          </p>
        </div>

        <ol className="mt-12 grid gap-8 lg:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="border-t-2 border-primary pt-6">
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-secondary text-primary">
                  <Icon name={s.icon} size={22} />
                </span>
                <span className="font-mono text-[2rem] font-semibold leading-none text-border">
                  {s.n}
                </span>
              </div>
              <h3 className="mt-5 text-[1.25rem] font-bold -tracking-[0.02em]">{s.title}</h3>
              <p className="mt-3 text-[0.95rem] leading-[1.6] text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default Steps;
