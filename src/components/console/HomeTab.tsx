import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';
import { api, type Device } from '@/lib/api';

const UID_KEY = 'pv_device_uid';

const getUid = () => {
  let uid = localStorage.getItem(UID_KEY);
  if (!uid) {
    uid = `web-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(UID_KEY, uid);
  }
  return uid;
};

const browserName = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Браузер';
};

const osName = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Linux')) return 'Linux';
  return 'ОС';
};

const HomeTab = ({
  devices,
  onConnect,
  onRefresh,
}: {
  devices: Device[];
  onConnect: (accessId: string) => void;
  onRefresh: () => void;
}) => {
  const [me, setMe] = useState<{ access_id: string; name: string } | null>(null);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState('');
  const [partnerId, setPartnerId] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('pv_device_pass') || String(Math.floor(1000 + Math.random() * 9000));
    localStorage.setItem('pv_device_pass', saved);
    setPassword(saved);

    api
      .registerDevice({
        device_uid: getUid(),
        name: `${browserName()} · ${osName()}`,
        os: osName(),
        os_version: browserName(),
        app_version: 'web 1.0',
        local_ip: '',
        unattended: false,
      })
      .then((r) => {
        setMe(r.device);
        onRefresh();
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = (v: string, key: string) => {
    navigator.clipboard?.writeText(v);
    setCopied(key);
    setTimeout(() => setCopied(''), 1600);
  };

  const newPassword = () => {
    const p = String(Math.floor(1000 + Math.random() * 9000));
    localStorage.setItem('pv_device_pass', p);
    setPassword(p);
    toast({ title: 'Пароль обновлён', description: 'Старый одноразовый пароль больше не действует' });
  };

  const recent = devices.filter((d) => d.access_id !== me?.access_id).slice(0, 6);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-[22px] border border-border bg-background p-7">
        <span className="pv-eyebrow">Этот компьютер</span>
        <h2 className="mt-3 text-[1.25rem] font-bold">Разрешить управление</h2>
        <p className="mt-2 text-[0.93rem] text-muted-foreground">
          Передайте эти данные специалисту — он подключится к вашему рабочему столу.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center gap-4 rounded-2xl bg-secondary px-5 py-5">
            <span className="flex-1">
              <span className="block font-mono text-[0.72rem] uppercase tracking-[0.08em] text-muted-foreground">
                Ваш ID
              </span>
              <span className="mt-1 block font-head text-[2rem] font-bold leading-none tracking-[0.08em]">
                {me ? me.access_id.replace(/(\d{3})(?=\d)/g, '$1 ') : '— — —'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => me && copy(me.access_id, 'id')}
              className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary"
              aria-label="Скопировать ID"
            >
              <Icon name={copied === 'id' ? 'Check' : 'Copy'} size={18} />
            </button>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-secondary px-5 py-5">
            <span className="flex-1">
              <span className="block font-mono text-[0.72rem] uppercase tracking-[0.08em] text-muted-foreground">
                Одноразовый пароль
              </span>
              <span className="mt-1 block font-head text-[2rem] font-bold leading-none tracking-[0.12em]">
                {password}
              </span>
            </span>
            <button
              type="button"
              onClick={newPassword}
              className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary"
              aria-label="Обновить пароль"
            >
              <Icon name="RefreshCw" size={18} />
            </button>
            <button
              type="button"
              onClick={() => copy(password, 'pass')}
              className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary"
              aria-label="Скопировать пароль"
            >
              <Icon name={copied === 'pass' ? 'Check' : 'Copy'} size={18} />
            </button>
          </div>
        </div>

        <p className="mt-5 flex items-start gap-2.5 text-[0.85rem] leading-[1.5] text-muted-foreground">
          <Icon name="ShieldCheck" size={16} className="mt-0.5 flex-none text-primary" />
          Соединение шифруется, пароль действует один сеанс. Никому не диктуйте эти данные по
          просьбе из мессенджера или звонка от «банка».
        </p>
      </section>

      <section className="rounded-[22px] border border-border bg-background p-7">
        <span className="pv-eyebrow">Удалённый компьютер</span>
        <h2 className="mt-3 text-[1.25rem] font-bold">Управлять другим ПК</h2>
        <p className="mt-2 text-[0.93rem] text-muted-foreground">
          Введите ID партнёра, чтобы открыть его рабочий стол.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConnect(partnerId.replace(/\D/g, ''));
          }}
          className="mt-6 flex flex-col gap-3"
        >
          <input
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            inputMode="numeric"
            placeholder="ID партнёра"
            className="h-[64px] rounded-2xl border border-input bg-background px-5 font-mono text-[1.5rem] font-bold tracking-[0.12em] outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2.5 rounded-pill bg-primary px-8 py-[17px] text-[0.98rem] font-semibold leading-none text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Icon name="PlugZap" size={18} /> Подключиться
          </button>
        </form>

        <div className="mt-7">
          <span className="text-[0.85rem] font-medium text-muted-foreground">Недавние</span>
          {recent.length === 0 ? (
            <p className="mt-3 text-[0.9rem] text-muted-foreground">
              Здесь появятся компьютеры, к которым вы подключались.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-border">
              {recent.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-3">
                  <span
                    className={`h-2.5 w-2.5 flex-none rounded-full ${
                      d.is_online ? 'animate-pulse-dot bg-primary' : 'bg-muted-foreground/40'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.93rem] font-semibold">{d.name}</span>
                    <span className="block font-mono text-[0.78rem] text-muted-foreground">
                      ID {d.access_id}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onConnect(d.access_id)}
                    className="rounded-pill border border-border px-4 py-2 text-[0.83rem] font-semibold transition-colors hover:border-primary hover:text-primary"
                  >
                    Открыть
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomeTab;
