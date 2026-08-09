import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';

// Custom window title bar shown only inside the C# desktop host (PVSDOST.exe).
// Sends window commands to the host via the WebView2 message bridge.
type Host = {
  __PVSDOST__?: { desktop?: boolean };
  chrome?: { webview?: { postMessage: (msg: unknown) => void } };
};

const isDesktop = () => Boolean((window as unknown as Host).__PVSDOST__?.desktop);

const send = (cmd: string) => {
  const wv = (window as unknown as Host).chrome?.webview;
  wv?.postMessage(cmd);
};

const TitleBar = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const desktop = isDesktop();
    setShow(desktop);
    if (desktop) document.documentElement.style.setProperty('--pv-titlebar', '36px');
  }, []);

  if (!show) return null;

  return (
    <div
      className="flex h-9 flex-none select-none items-center bg-[#0f2f57] pl-3 pr-1 text-white/90"
      style={{ WebkitUserSelect: 'none' }}
      onMouseDown={(e) => {
        // Drag only with the left button on the empty area (not on buttons).
        if (e.button === 0 && (e.target as HTMLElement).dataset.drag === '1') send('win:drag');
      }}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).dataset.drag === '1') send('win:maximize');
      }}
    >
      <div data-drag="1" className="flex h-full flex-1 items-center gap-2">
        <span data-drag="1" className="grid h-5 w-5 place-items-center rounded bg-primary text-primary-foreground">
          <Icon name="MonitorSmartphone" size={13} />
        </span>
        <span data-drag="1" className="text-[0.78rem] font-semibold tracking-tight">
          ПВ-Система <span className="font-normal text-white/60">Доступ</span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => send('win:minimize')}
        title="Свернуть"
        className="grid h-9 w-11 place-items-center transition-colors hover:bg-white/10"
      >
        <Icon name="Minus" size={16} />
      </button>
      <button
        type="button"
        onClick={() => send('win:maximize')}
        title="Развернуть"
        className="grid h-9 w-11 place-items-center transition-colors hover:bg-white/10"
      >
        <Icon name="Square" size={13} />
      </button>
      <button
        type="button"
        onClick={() => send('win:close')}
        title="Закрыть"
        className="grid h-9 w-11 place-items-center transition-colors hover:bg-red-600"
      >
        <Icon name="X" size={16} />
      </button>
    </div>
  );
};

export default TitleBar;