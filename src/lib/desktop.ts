// Bridge between the web UI and the C# desktop host (WebView2).
// In the browser these are no-ops.

type WebViewBridge = { postMessage: (msg: unknown) => void };

const getWebView = (): WebViewBridge | null => {
  const w = window as unknown as { chrome?: { webview?: WebViewBridge } };
  return w.chrome?.webview ?? null;
};

// True only when running inside PVSDOST.exe (flag injected by the host).
export const isDesktop = (): boolean =>
  Boolean((window as unknown as { __PVSDOST_DESKTOP__?: boolean }).__PVSDOST_DESKTOP__);

const send = (cmd: string) => getWebView()?.postMessage({ cmd });

export const windowControls = {
  minimize: () => send('minimize'),
  toggleMaximize: () => send('maximize'),
  close: () => send('close'),
  // Start native window drag (also enables Aero Snap to screen edges).
  startDrag: () => send('drag'),
};

type HostWebView = {
  postMessage: (m: unknown) => void;
  addEventListener: (t: 'message', cb: (e: { data: unknown }) => void) => void;
  removeEventListener: (t: 'message', cb: (e: { data: unknown }) => void) => void;
};
type Host = { __PVSDOST__?: { desktop?: boolean }; chrome?: { webview?: HostWebView } };

const host = () => window as unknown as Host;

export const isDesktopApp = () => Boolean(host().__PVSDOST__?.desktop && host().chrome?.webview);

// Asks the desktop host for the Windows autostart state (or changes it)
// and resolves with the actual state it reports back; null outside the app.
export const desktopAutostart = (value?: boolean): Promise<boolean | null> => {
  const wv = host().chrome?.webview;
  if (!wv || !isDesktopApp()) return Promise.resolve(null);
  return new Promise((resolve) => {
    const onMsg = (e: { data: unknown }) => {
      const d = e.data as { type?: string; enabled?: boolean } | null;
      if (d?.type !== 'autostart') return;
      wv.removeEventListener('message', onMsg);
      clearTimeout(timer);
      resolve(Boolean(d.enabled));
    };
    const timer = setTimeout(() => {
      wv.removeEventListener('message', onMsg);
      resolve(null);
    }, 3000);
    wv.addEventListener('message', onMsg);
    wv.postMessage(value === undefined ? 'app:autostart:get' : `app:autostart:${value ? 'on' : 'off'}`);
  });
};