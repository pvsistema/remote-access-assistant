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
