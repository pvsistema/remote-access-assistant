import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';
import { api, type RelayServer } from '@/lib/api';

// Lets the user point the program at their own server (e.g. a Beget VPS),
// so the remote desktop goes straight through it instead of the cloud.
const ServerTab = () => {
  const [relay, setRelay] = useState<RelayServer | null>(null);
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ status: string; detail: string } | null>(null);

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const command =
    `curl -fsSL ${origin}/server/install.sh -o install.sh && ` +
    `RELAY_SOURCE=${origin}/server/relay.py bash install.sh ваш-домен.ру`;

  const load = useCallback(async () => {
    try {
      const r = await api.getRelay();
      setRelay(r.relay);
      setUrl(r.relay?.url || '');
    } catch {
      /* no access — stays empty */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text);
    toast({ title: `${what} скопирована` });
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.saveRelay({ url: url.trim(), secret: secret.trim(), enabled: true });
      setSecret('');
      await load();
      toast({ title: 'Сервер сохранён' });
      check();
    } catch (e) {
      const code = (e as Error).message;
      toast({
        title:
          code === 'bad_relay_url'
            ? 'Адрес должен начинаться с wss:// или ws://'
            : code === 'secret_required'
              ? 'Введите ключ связи с сервера'
              : 'Не удалось сохранить',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setChecking(true);
    setResult(null);
    try {
      const r = await api.checkRelay(url.trim() || undefined);
      setResult(r);
      load();
    } catch {
      setResult({ status: 'error', detail: 'не удалось выполнить проверку' });
    } finally {
      setChecking(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await api.saveRelay({ url: '', secret: '', enabled: false });
      setUrl('');
      setResult(null);
      await load();
      toast({ title: 'Работаем через облако' });
    } finally {
      setBusy(false);
    }
  };

  const connected = Boolean(relay?.url && relay?.enabled);

  return (
    <div className="flex max-w-[860px] flex-col gap-5">
      <section className="rounded-2xl border border-border bg-background p-6">
        <span className="flex items-center gap-2.5">
          <span
            className={`grid h-10 w-10 place-items-center rounded-xl ${
              connected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-secondary text-muted-foreground'
            }`}
          >
            <Icon name={connected ? 'Server' : 'Cloud'} size={20} />
          </span>
          <span>
            <span className="block text-[1.05rem] font-bold leading-tight">
              {connected ? 'Работает через ваш сервер' : 'Работает через облако'}
            </span>
            <span className="block text-[0.86rem] text-muted-foreground">
              {connected
                ? relay?.url
                : 'Картинка идёт медленнее. Подключите свой сервер — будет плавное видео.'}
            </span>
          </span>
        </span>

        {relay?.last_status && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-secondary px-4 py-3 text-[0.86rem]">
            <Icon
              name={relay.last_ok_at ? 'CircleCheck' : 'TriangleAlert'}
              size={16}
              className={`mt-0.5 flex-none ${relay.last_ok_at ? 'text-emerald-600' : 'text-amber-600'}`}
            />
            Последняя проверка: {relay.last_status}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-background p-6">
        <h3 className="text-[1.05rem] font-bold leading-tight">Шаг 1. Установите сервер</h3>
        <p className="mt-1.5 text-[0.88rem] text-muted-foreground">
          Зайдите на свой сервер по SSH (в панели Бегета — «Терминал») и вставьте эту команду.
          Домен должен указывать на этот сервер.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl bg-[#16181c]">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-[0.76rem] text-white/50">Выполнить от имени root</span>
            <button
              type="button"
              onClick={() => copy(command, 'Команда')}
              className="inline-flex items-center gap-1.5 text-[0.8rem] text-white/70 hover:text-white"
            >
              <Icon name="Copy" size={14} /> Копировать
            </button>
          </div>
          <pre className="overflow-x-auto px-4 pb-4 text-[0.8rem] leading-relaxed text-emerald-300">
            {command}
          </pre>
        </div>
        <p className="mt-3 text-[0.84rem] text-muted-foreground">
          Установка займёт 2–3 минуты. В конце программа покажет адрес сервера и ключ связи —
          их нужно вписать ниже.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-background p-6">
        <h3 className="text-[1.05rem] font-bold leading-tight">Шаг 2. Впишите данные сервера</h3>

        <label className="mt-4 flex flex-col gap-2">
          <span className="text-[0.85rem] font-medium text-muted-foreground">Адрес сервера</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="wss://ваш-домен.ру/ws"
            className="h-[50px] rounded-xl border border-input bg-background px-4 text-[0.95rem] outline-none focus:border-primary"
          />
        </label>

        <label className="mt-4 flex flex-col gap-2">
          <span className="text-[0.85rem] font-medium text-muted-foreground">
            Ключ связи {relay?.url && '(оставьте пустым, чтобы не менять)'}
          </span>
          <input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            type="password"
            placeholder="длинная строка из букв и цифр"
            className="h-[50px] rounded-xl border border-input bg-background px-4 font-mono text-[0.95rem] outline-none focus:border-primary"
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={save}
            disabled={busy || !url.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-[0.9rem] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Icon name={busy ? 'LoaderCircle' : 'Save'} size={16} className={busy ? 'animate-spin' : ''} />
            Сохранить
          </button>
          <button
            type="button"
            onClick={check}
            disabled={checking || !url.trim()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-[0.9rem] font-medium transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <Icon
              name={checking ? 'LoaderCircle' : 'Activity'}
              size={16}
              className={checking ? 'animate-spin' : ''}
            />
            Проверить связь
          </button>
          {connected && (
            <button
              type="button"
              onClick={disable}
              disabled={busy}
              className="ml-auto text-[0.86rem] text-muted-foreground hover:text-destructive"
            >
              Вернуться на облако
            </button>
          )}
        </div>

        {result && (
          <p
            className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-[0.88rem] ${
              result.status === 'ok'
                ? 'bg-emerald-500/10 text-emerald-700'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            <Icon
              name={result.status === 'ok' ? 'CircleCheck' : 'TriangleAlert'}
              size={16}
              className="mt-0.5 flex-none"
            />
            {result.status === 'ok' ? `Сервер на связи — ${result.detail}` : `Нет связи: ${result.detail}`}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-secondary/40 p-6">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-bold">
          <Icon name="CircleHelp" size={17} className="text-primary" />
          Что это даёт
        </h3>
        <ul className="mt-3 flex flex-col gap-2 text-[0.88rem] text-muted-foreground">
          {[
            'Изображение экрана идёт напрямую через ваш сервер — заметно плавнее',
            'Мышь и клавиатура срабатывают без задержки',
            'Изображение нигде не сохраняется: сервер только передаёт его дальше',
            'Если сервер недоступен, программа сама вернётся на облако — связь не прервётся',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Icon name="Check" size={15} className="mt-0.5 flex-none text-primary" />
              {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default ServerTab;
