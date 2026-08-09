import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';
import { api, type Device, type Message, type Session } from '@/lib/api';

const tools = [
  { key: 'chat', label: 'Чат', icon: 'MessagesSquare' },
  { key: 'files', label: 'Файлы', icon: 'FolderSync' },
  { key: 'info', label: 'Система', icon: 'Cpu' },
];

const RemoteScreen = ({
  session,
  device,
  onClose,
}: {
  session: Session;
  device: Device | undefined;
  onClose: () => void;
}) => {
  const [panel, setPanel] = useState<string | null>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [quality, setQuality] = useState<'auto' | 'speed' | 'quality'>('auto');
  const [muted, setMuted] = useState(!session.allow_audio);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = () => api.messages(session.id).then((r) => setMessages(r.messages)).catch(() => undefined);
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [session.id]);

  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await api.sendMessage(session.id, text.trim());
    setMessages((m) => [...m, res.message]);
    setText('');
  };

  const upload = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      await api.logTransfer({
        session_id: session.id,
        device_id: device?.id ?? null,
        file_name: f.name,
        size_bytes: f.size,
        direction: 'upload',
      });
    }
    toast({ title: 'Передача файлов', description: `${files.length} файл(ов) отправлено на удалённый ПК` });
  };

  const finish = async () => {
    await api.updateSession(session.id, 'closed');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#101114]">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 text-white">
        <span className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-primary" />
          <span className="text-[0.92rem] font-semibold">
            {device?.name || `ID ${session.access_id}`}
          </span>
        </span>
        <span className="rounded-pill bg-white/10 px-3 py-1.5 font-mono text-[0.78rem]">{time}</span>
        {session.is_recorded && (
          <span className="flex items-center gap-1.5 rounded-pill bg-primary px-3 py-1.5 text-[0.75rem] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> REC
          </span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setQuality(quality === 'auto' ? 'speed' : quality === 'speed' ? 'quality' : 'auto')}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[0.83rem] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="Gauge" size={16} />
            {quality === 'auto' ? 'Авто' : quality === 'speed' ? 'Скорость' : 'Качество'}
          </button>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            title={muted ? 'Включить звук' : 'Выключить звук'}
          >
            <Icon name={muted ? 'VolumeX' : 'Volume2'} size={17} />
          </button>
          <button
            type="button"
            onClick={() => toast({ title: 'Ctrl+Alt+Del отправлен', description: 'Комбинация передана на удалённый компьютер' })}
            className="rounded-lg px-3 py-2 font-mono text-[0.78rem] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            Ctrl+Alt+Del
          </button>
          {tools.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setPanel(panel === t.key ? null : t.key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[0.83rem] transition-colors ${
                panel === t.key ? 'bg-primary text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon name={t.icon} size={16} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={finish}
            className="ml-1 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[0.85rem] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Icon name="PhoneOff" size={16} /> Завершить
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="relative flex flex-col items-center gap-4 text-center text-white/70">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10">
              <Icon name="MonitorPlay" size={30} />
            </span>
            <p className="max-w-[420px] text-[0.98rem] leading-[1.55]">
              {session.status === 'pending'
                ? 'Ждём подтверждения на удалённом компьютере — попросите пользователя нажать «Разрешить».'
                : 'Изображение рабочего стола передаётся клиентом на C#. В браузере показан статус сеанса.'}
            </p>
            <span className="flex flex-wrap items-center justify-center gap-2 text-[0.78rem]">
              {[
                ['Управление', session.allow_control],
                ['Файлы', session.allow_files],
                ['Буфер обмена', session.allow_clipboard],
                ['Звук', session.allow_audio],
              ].map(([label, on]) => (
                <span
                  key={label as string}
                  className={`rounded-pill px-3 py-1.5 ${on ? 'bg-primary/25 text-white' : 'bg-white/10 text-white/45'}`}
                >
                  {label as string}
                </span>
              ))}
            </span>
          </div>
        </div>

        {panel && (
          <aside className="flex w-full max-w-[340px] flex-col border-l border-white/10 bg-[#16181c] text-white">
            {panel === 'chat' && (
              <>
                <div className="flex-1 space-y-3 overflow-auto p-5">
                  {messages.length === 0 ? (
                    <p className="text-[0.88rem] text-white/50">
                      Сообщения появятся в окне клиента на удалённом компьютере.
                    </p>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.88rem] ${
                          m.side === 'operator' ? 'ml-auto bg-primary' : 'bg-white/10'
                        }`}
                      >
                        {m.text}
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 p-3">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Сообщение"
                    className="h-10 flex-1 rounded-xl bg-white/10 px-4 text-[0.88rem] text-white outline-none placeholder:text-white/40"
                  />
                  <button type="submit" className="grid h-10 w-10 place-items-center rounded-xl bg-primary">
                    <Icon name="Send" size={16} />
                  </button>
                </form>
              </>
            )}

            {panel === 'files' && (
              <div className="flex flex-1 flex-col gap-4 p-5">
                <p className="text-[0.88rem] text-white/60">
                  Перетащите файлы или выберите с диска — они уйдут на удалённый компьютер.
                </p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="grid flex-1 place-items-center rounded-2xl border-2 border-dashed border-white/20 text-white/60 transition-colors hover:border-primary hover:text-white"
                >
                  <span className="flex flex-col items-center gap-2">
                    <Icon name="Upload" size={26} />
                    <span className="text-[0.88rem]">Выбрать файлы</span>
                  </span>
                </button>
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
              </div>
            )}

            {panel === 'info' && (
              <div className="flex flex-col gap-3 p-5 text-[0.88rem]">
                {[
                  ['Компьютер', device?.name || '—'],
                  ['Операционная система', [device?.os, device?.os_version].filter(Boolean).join(' ') || '—'],
                  ['Локальный адрес', device?.local_ip || '—'],
                  ['Версия клиента', device?.app_version || '—'],
                  ['Код сеанса', session.session_code],
                  ['Режим', session.mode],
                ].map(([k, v]) => (
                  <span key={k as string} className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
                    <span className="text-white/50">{k as string}</span>
                    <span className="text-right font-medium">{v as string}</span>
                  </span>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default RemoteScreen;
