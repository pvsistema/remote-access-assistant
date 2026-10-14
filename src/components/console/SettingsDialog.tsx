import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { api, ERRORS, type Device } from '@/lib/api';
import { desktopAutostart, isDesktopApp } from '@/lib/desktop';

const SettingsDialog = ({
  open,
  onOpenChange,
  device,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  device: Device | null;
}) => {
  const desktop = isDesktopApp();
  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPwd('');
    setPwd2('');
    desktopAutostart().then(setAutostart);
    if (device?.id) api.unattendedStatus(device.id).then((r) => setEnabled(r.enabled)).catch(() => undefined);
  }, [open, device?.id]);

  const toggleAutostart = async (v: boolean) => {
    setAutostart(v);
    const real = await desktopAutostart(v);
    if (real !== null) setAutostart(real);
  };

  const save = async () => {
    if (!device?.id) return;
    if (pwd.length < 6) {
      toast({ title: 'Пароль слишком короткий', description: 'Не менее 6 символов' });
      return;
    }
    if (pwd !== pwd2) {
      toast({ title: 'Пароли не совпадают' });
      return;
    }
    setSaving(true);
    try {
      await api.setUnattended(device.id, pwd);
      setEnabled(true);
      setPwd('');
      setPwd2('');
      toast({
        title: 'Постоянный пароль сохранён',
        description: 'Теперь к этому ПК можно подключаться без подтверждения',
      });
      if (desktop && !autostart) toggleAutostart(true);
    } catch (e) {
      toast({ title: ERRORS[(e as Error).message] || 'Не удалось сохранить пароль' });
    } finally {
      setSaving(false);
    }
  };

  const disable = async () => {
    if (!device?.id) return;
    try {
      await api.setUnattended(device.id, '');
      setEnabled(false);
      toast({ title: 'Постоянный пароль отключён' });
    } catch {
      toast({ title: 'Не удалось отключить пароль' });
    }
  };

  const input =
    'h-11 w-full rounded-lg border border-border bg-background px-3.5 text-[0.95rem] outline-none transition-colors focus:border-primary';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-head">Настройки</DialogTitle>
        </DialogHeader>

        <section className="rounded-xl bg-secondary p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <Icon name="Power" size={17} className="text-primary" />
            Запуск
          </h3>
          <label className="mt-4 flex items-center justify-between gap-4">
            <span className="text-[0.92rem]">
              Запускать вместе с Windows
              <span className="block text-[0.8rem] text-muted-foreground">
                Программа стартует свёрнутой в трей, и ПК доступен всегда
              </span>
            </span>
            <Switch
              checked={Boolean(autostart)}
              disabled={!desktop || autostart === null}
              onCheckedChange={toggleAutostart}
            />
          </label>
          {!desktop && (
            <p className="mt-3 text-[0.8rem] text-muted-foreground">
              Доступно в установленной программе для Windows.
            </p>
          )}
        </section>

        <section className="rounded-xl bg-secondary p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <Icon name="KeyRound" size={17} className="text-primary" />
            Постоянный пароль
            {enabled && (
              <span className="ml-auto rounded-pill bg-primary/10 px-2.5 py-0.5 text-[0.75rem] font-semibold text-primary">
                Включён
              </span>
            )}
          </h3>
          <p className="mt-2 text-[0.84rem] leading-[1.5] text-muted-foreground">
            Кто введёт ID этого компьютера и постоянный пароль, подключится сразу — без кнопки
            «Разрешить» на этом ПК. Временный пароль продолжает работать как раньше.
          </p>

          {!device ? (
            <p className="mt-4 text-[0.85rem] text-muted-foreground">Устройство ещё регистрируется…</p>
          ) : (
            <div className="mt-4 flex flex-col gap-2.5">
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder={enabled ? 'Новый постоянный пароль' : 'Постоянный пароль'}
                  autoComplete="new-password"
                  className={`${input} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                  title={show ? 'Скрыть' : 'Показать'}
                >
                  <Icon name={show ? 'EyeOff' : 'Eye'} size={18} />
                </button>
              </div>
              <input
                type={show ? 'text' : 'password'}
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                placeholder="Повторите пароль"
                autoComplete="new-password"
                className={input}
              />
              <span className="text-[0.78rem] text-muted-foreground">* Не менее 6 символов</span>
              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !pwd}
                  className="h-10 rounded-lg bg-primary px-5 text-[0.9rem] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {enabled ? 'Сменить пароль' : 'Сохранить пароль'}
                </button>
                {enabled && (
                  <button
                    type="button"
                    onClick={disable}
                    className="h-10 rounded-lg border border-border bg-background px-5 text-[0.9rem] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    Отключить
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
