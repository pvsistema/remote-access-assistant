import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';

type OsKey = 'windows' | 'linux' | 'macos';

const builds: Record<
  OsKey,
  {
    label: string;
    icon: string;
    version: string;
    size: string;
    note: string;
    files: { name: string; meta: string }[];
  }
> = {
  windows: {
    label: 'Windows',
    icon: 'Monitor',
    version: '4.8.2',
    size: '14,8 МБ',
    note: 'Windows 7 / 8.1 / 10 / 11, Server 2012–2022. Модуль поддержки работает без установки и прав администратора.',
    files: [
      { name: 'Полная версия (.exe)', meta: '14,8 МБ · x64' },
      { name: 'Модуль поддержки без установки', meta: '6,2 МБ · x86/x64' },
      { name: 'MSI для групповых политик', meta: '15,4 МБ · корпоративная' },
    ],
  },
  linux: {
    label: 'Linux',
    icon: 'Terminal',
    version: '4.8.1',
    size: '22,4 МБ',
    note: 'Astra Linux Special Edition, РЕД ОС, ALT Linux, Ubuntu 20.04+, Debian 11+. Поддержка X11 и Wayland.',
    files: [
      { name: 'Пакет .deb', meta: '22,4 МБ · amd64' },
      { name: 'Пакет .rpm', meta: '22,1 МБ · x86_64' },
      { name: 'Сборка для Astra Linux', meta: '23,0 МБ · сертифицированная' },
    ],
  },
  macos: {
    label: 'macOS',
    icon: 'Apple',
    version: '4.7.9',
    size: '26,1 МБ',
    note: 'macOS 11 Big Sur и новее. Универсальная сборка для Apple Silicon и Intel, подписана и нотаризована.',
    files: [
      { name: 'Образ .dmg (Universal)', meta: '26,1 МБ · ARM + Intel' },
      { name: 'Модуль поддержки', meta: '11,3 МБ · Universal' },
      { name: 'Пакет .pkg для MDM', meta: '26,8 МБ · корпоративная' },
    ],
  },
};

const order: OsKey[] = ['windows', 'linux', 'macos'];

const Download = () => {
  const [os, setOs] = useState<OsKey>('windows');
  const build = builds[os];

  const start = (fileName: string) => {
    toast({
      title: 'Загрузка началась',
      description: `${fileName} — ${build.label} ${build.version}. Если файл не сохранился, повторите нажатие.`,
    });
  };

  return (
    <section id="download" className="py-20 lg:py-28">
      <div className="pv-container">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[680px]">
            <span className="pv-eyebrow">Скачать программу</span>
            <h2 className="mt-4 text-[30px] font-bold leading-[1.1] -tracking-[0.03em] sm:text-[40px]">
              Одна программа для всех ваших устройств
            </h2>
            <p className="mt-5 text-[1.05rem] leading-[1.6] text-muted-foreground">
              Бесплатно для личного использования. Дистрибутивы собираются в России и проверяются
              антивирусами перед публикацией.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-pill border border-border bg-secondary p-1.5">
            {order.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setOs(key)}
                className={`inline-flex items-center gap-2 rounded-pill px-5 py-3 text-[0.9rem] font-semibold leading-none transition-colors ${
                  os === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:text-primary'
                }`}
              >
                <Icon name={builds[key].icon} fallback="Monitor" size={17} />
                {builds[key].label}
              </button>
            ))}
          </div>
        </div>

        <div
          key={os}
          className="mt-10 grid animate-fade-in gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-[1fr_1.1fr]"
        >
          <div className="bg-card p-8 lg:p-10">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-primary text-primary-foreground">
                <Icon name={build.icon} fallback="Monitor" size={22} />
              </span>
              <div>
                <h3 className="text-[1.4rem] font-bold -tracking-[0.02em]">
                  ПВ-СИСТЕМА Доступ для {build.label}
                </h3>
                <p className="font-mono text-[0.8rem] text-muted-foreground">
                  версия {build.version} · {build.size} · от 12 мая 2026
                </p>
              </div>
            </div>
            <p className="mt-6 text-[0.95rem] leading-[1.6] text-muted-foreground">{build.note}</p>
            <button
              type="button"
              onClick={() => start(build.files[0].name)}
              className="mt-8 inline-flex w-full items-center justify-center gap-2.5 rounded-pill bg-primary px-[30px] py-[17px] text-[0.95rem] font-semibold leading-none text-primary-foreground transition-colors hover:bg-destructive sm:w-auto"
            >
              <Icon name="Download" size={18} />
              Скачать для {build.label}
            </button>
            <p className="mt-4 flex items-center gap-2 text-[0.82rem] text-muted-foreground">
              <Icon name="ShieldCheck" size={15} className="text-primary" />
              Без рекламы и подписок для домашнего использования
            </p>
          </div>

          <div className="bg-card p-8 lg:p-10">
            <span className="pv-eyebrow">Другие сборки</span>
            <ul className="mt-5 divide-y divide-border">
              {build.files.map((file) => (
                <li key={file.name} className="flex items-center justify-between gap-4 py-4">
                  <span>
                    <span className="block text-[0.98rem] font-semibold">{file.name}</span>
                    <span className="font-mono text-[0.78rem] text-muted-foreground">
                      {file.meta}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => start(file.name)}
                    aria-label={`Скачать: ${file.name}`}
                    className="grid h-10 w-10 flex-none place-items-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Icon name="ArrowDown" size={17} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[0.82rem] leading-[1.55] text-muted-foreground">
              Нужна массовая установка на парк из сотен машин? Напишите нам — пришлём тихий
              установщик с предзаданными настройками и шаблон групповой политики.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Download;
