import Icon from '@/components/ui/icon';
import type { Session } from '@/lib/api';

// Shown on the REMOTE PC when an operator requests to connect.
export function IncomingSessionPrompt({
  session,
  onAccept,
  onReject,
}: {
  session: Session;
  onAccept: (s: Session) => void;
  onReject: (s: Session) => void;
}) {
  const perms = [
    ['Просмотр экрана', true],
    ['Управление', Boolean(session.allow_control)],
    ['Файлы', Boolean(session.allow_files)],
    ['Буфер обмена', Boolean(session.allow_clipboard)],
  ] as const;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-[420px] rounded-3xl bg-background p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Icon name="MonitorSmartphone" size={24} />
          </span>
          <div>
            <p className="text-[1.05rem] font-semibold">Запрос на подключение</p>
            <p className="text-[0.85rem] text-muted-foreground">
              {session.operator_name || 'Оператор'} хочет подключиться к этому компьютеру
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2 rounded-2xl bg-secondary p-4">
          {perms.map(([label, on]) => (
            <div key={label} className="flex items-center gap-2 text-[0.88rem]">
              <Icon
                name={on ? 'CircleCheck' : 'CircleSlash'}
                size={16}
                className={on ? 'text-primary' : 'text-muted-foreground/50'}
              />
              <span className={on ? '' : 'text-muted-foreground/60'}>{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => onReject(session)}
            className="h-11 flex-1 rounded-xl bg-secondary text-[0.92rem] font-medium transition-colors hover:bg-secondary/70"
          >
            Отклонить
          </button>
          <button
            type="button"
            onClick={() => onAccept(session)}
            className="h-11 flex-1 rounded-xl bg-primary text-[0.92rem] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Разрешить
          </button>
        </div>
      </div>
    </div>
  );
}

// Small persistent bar while the remote desktop is being shared.
export function SharingBar({ onStop }: { onStop: () => void }) {
  return (
    <div className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-pill bg-primary px-4 py-2.5 text-primary-foreground shadow-xl">
      <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-white" />
      <span className="text-[0.86rem] font-medium">Идёт удалённый сеанс — ваш экран виден оператору</span>
      <button
        type="button"
        onClick={onStop}
        className="rounded-pill bg-white/20 px-3 py-1 text-[0.82rem] font-semibold transition-colors hover:bg-white/30"
      >
        Завершить
      </button>
    </div>
  );
}
