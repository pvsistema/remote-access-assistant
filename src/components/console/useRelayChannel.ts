import { useCallback, useEffect, useRef, useState } from 'react';
import type { Frame } from '@/lib/api';

type Options = {
  url: string;
  ticket: string;
  active: boolean;
  onFrame: (frame: Frame) => void;
  onClipboard?: (text: string) => void;
};

// Live channel to the user's own relay server: frames arrive as they are
// produced, commands leave instantly. Falls back to cloud polling if the
// server is unreachable.
export function useRelayChannel({ url, ticket, active, onFrame, onClipboard }: Options) {
  const [live, setLive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const objUrlRef = useRef<string>('');
  const frameRef = useRef(onFrame);
  const clipRef = useRef(onClipboard);

  frameRef.current = onFrame;
  clipRef.current = onClipboard;

  useEffect(() => {
    if (!active || !url || !ticket) {
      setLive(false);
      return;
    }

    let closed = false;
    let retry: ReturnType<typeof setTimeout>;
    let attempts = 0;

    const connect = () => {
      if (closed) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(`${url}?ticket=${encodeURIComponent(ticket)}`);
      } catch {
        setLive(false);
        return;
      }
      ws.binaryType = 'blob';
      wsRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        setLive(true);
      };

      ws.onmessage = (e) => {
        if (typeof e.data === 'string') {
          try {
            const msg = JSON.parse(e.data);
            if (msg.t === 'agent_gone') setLive(false);
            if (msg.kind === 'clipboard' && msg.payload?.text) clipRef.current?.(msg.payload.text);
          } catch {
            /* ignore malformed service messages */
          }
          return;
        }
        // Binary message = JPEG frame. Shown via object URL (no base64 cost).
        const blob = e.data as Blob;
        const next = URL.createObjectURL(blob);
        const prev = objUrlRef.current;
        objUrlRef.current = next;
        frameRef.current({ seq: 0, monitor: 1, width: 0, height: 0, image_url: next } as Frame);
        if (prev) URL.revokeObjectURL(prev);
      };

      ws.onclose = () => {
        setLive(false);
        wsRef.current = null;
        if (closed) return;
        attempts += 1;
        retry = setTimeout(connect, Math.min(1000 * attempts, 5000));
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      closed = true;
      clearTimeout(retry);
      wsRef.current?.close();
      wsRef.current = null;
      if (objUrlRef.current) {
        URL.revokeObjectURL(objUrlRef.current);
        objUrlRef.current = '';
      }
      setLive(false);
    };
  }, [url, ticket, active]);

  // Returns true when the command went through the live channel.
  const send = useCallback((kind: string, payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify({ kind, payload }));
      return true;
    } catch {
      return false;
    }
  }, []);

  return { live, send };
}
