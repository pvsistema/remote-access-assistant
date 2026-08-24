import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { api, setToken, setGuestToken, ERRORS } from '@/lib/api';
import { browserName, osName } from '@/hooks/useMyDevice';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetId = searchParams.get('id') || '';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', full_name: '', company: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Guest mode: get an ID and a password right away, no account needed.
  const enterAsGuest = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.guestRegister({
        name: `${browserName()} · ${osName()}`,
        os: osName(),
        os_version: browserName(),
      });
      setGuestToken(res.guest_token);
      localStorage.setItem('pv_guest_pass', res.password);
      navigate(presetId ? `/console?id=${presetId}` : '/console');
    } catch {
      setError('Не удалось начать быстрый сеанс. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(form.email.trim(), form.password)
          : await api.register({
              email: form.email.trim(),
              password: form.password,
              full_name: form.full_name.trim(),
              company: form.company.trim(),
            });
      setToken(res.token);
      navigate(presetId ? `/console?id=${presetId}` : '/console');
    } catch (err) {
      setError(ERRORS[(err as Error).message] || 'Не удалось выполнить вход');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col justify-center px-6 py-14 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-[440px] animate-rise">
          <span className="mb-10 inline-flex items-center gap-3 text-foreground">
            <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-primary text-primary-foreground">
              <Icon name="MonitorSmartphone" size={22} />
            </span>
            <span className="font-head text-[1.3rem] font-bold -tracking-[0.025em]">
              ПВ-СИСТЕМА <span className="font-normal text-muted-foreground">Доступ</span>
            </span>
          </span>

          <h1 className="text-[2rem] font-bold leading-tight">
            {mode === 'login' ? 'Вход в программу' : 'Регистрация аккаунта'}
          </h1>
          <p className="mt-3 text-[0.98rem] text-muted-foreground">
            {mode === 'login'
              ? 'Ваш ID, удалённый рабочий стол, файлы и чат — в одном окне.'
              : 'Создайте аккаунт — к нему будут привязаны все ваши компьютеры.'}
          </p>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
            {mode === 'register' && (
              <>
                <Field label="Имя и фамилия" value={form.full_name} onChange={(v) => set('full_name', v)} placeholder="Иван Петров" />
                <Field label="Организация" value={form.company} onChange={(v) => set('company', v)} placeholder="ООО «Пример»" />
              </>
            )}
            <Field
              label="Рабочая почта"
              type="email"
              required
              value={form.email}
              onChange={(v) => set('email', v)}
              placeholder="admin@company.ru"
            />
            <Field
              label="Пароль"
              type="password"
              required
              value={form.password}
              onChange={(v) => set('password', v)}
              placeholder="Минимум 6 символов"
            />

            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-[0.9rem] text-destructive">
                <Icon name="TriangleAlert" size={17} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-pill bg-primary px-8 py-[17px] text-[0.98rem] font-semibold leading-none text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Icon name={loading ? 'LoaderCircle' : 'LogIn'} size={18} className={loading ? 'animate-spin' : ''} />
              {mode === 'login' ? 'Войти в программу' : 'Создать аккаунт'}
            </button>
          </form>

          <div className="mt-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[0.82rem] text-muted-foreground">или</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={enterAsGuest}
            disabled={loading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded-pill border-2 border-primary px-8 py-[15px] text-[0.98rem] font-semibold leading-none text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
          >
            <Icon name="Zap" size={18} />
            Быстрый сеанс без регистрации
          </button>
          <p className="mt-2.5 text-center text-[0.85rem] text-muted-foreground">
            Сразу получите свой ID и пароль — как в Ассистенте
          </p>

          <p className="mt-7 text-[0.92rem] text-muted-foreground">
            {mode === 'login' ? 'Ещё нет аккаунта? ' : 'Уже зарегистрированы? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="font-semibold text-primary hover:underline"
            >
              {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
          <Link to="/help" className="mt-8 inline-flex items-center gap-2 text-[0.9rem] text-muted-foreground hover:text-primary">
            <Icon name="CircleHelp" size={16} /> О программе и помощь
          </Link>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-secondary lg:block">
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(hsl(var(--foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground))_1px,transparent_1px)] [background-size:38px_38px]" />
        <div className="relative flex h-full flex-col justify-center gap-6 px-16">
          <span className="pv-eyebrow">Программа удалённого доступа</span>
          <h2 className="max-w-[420px] text-[2.1rem] font-bold leading-[1.2]">
            Удалённый рабочий стол за девять секунд
          </h2>
          <ul className="mt-2 flex max-w-[430px] flex-col gap-4">
            {[
              ['Fingerprint', 'Свой ID и одноразовый пароль для входящих подключений'],
              ['MonitorPlay', 'Окно удалённого рабочего стола с панелью инструментов'],
              ['FolderSync', 'Передача файлов и чат прямо во время сеанса'],
              ['BookUser', 'Адресная книга, группы, команда операторов и журнал'],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-start gap-3.5 rounded-2xl border border-border bg-background p-4">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon name={icon} size={19} />
                </span>
                <span className="pt-2 text-[0.95rem] text-foreground">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) => (
  <label className="flex flex-col gap-2">
    <span className="text-[0.85rem] font-medium text-muted-foreground">{label}</span>
    <input
      type={type}
      value={value}
      required={required}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-[54px] rounded-2xl border border-input bg-background px-5 text-[0.98rem] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
    />
  </label>
);

export default Login;