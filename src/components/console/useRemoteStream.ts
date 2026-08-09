import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Frame } from '@/lib/api';

// Operator-side remote desktop stream: polls the latest frame, batches outgoing
// mouse/keyboard commands, and syncs the shared clipboard.
export function useRemoteStream(sessionId: number, active: boolean, allowControl: boolean) {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [connected, setConnected] = useState(false);
  const [remoteClipboard, setRemoteClipboard] = useState('');

  const seqRef = useRef(-1);
  const clipSeqRef = useRef(-1);
  const queueRef = useRef<{ kind: string; payload: Record<string, unknown> }[]>([]);
  const busyRef = useRef(false);

  // Poll frames as fast as the round-trip allows (long-poll style loop).
  useEffect(() => {
    if (!active) return;
    let stop = false;
    const loop = async () => {
      while (!stop) {
        try {
          const r = await api.frame(sessionId, seqRef.current);
          if (stop) break;
          if (r.frame) {
            seqRef.current = r.frame.seq;
            setFrame(r.frame);
            setConnected(true);
          } else if (r.seq === 0) {
            setConnected(false);
          }
        } catch {
          if (!stop) await new Promise((res) => setTimeout(res, 1000));
        }
        await new Promise((res) => setTimeout(res, 120));
      }
    };
    loop();
    return () => {
      stop = true;
    };
  }, [sessionId, active]);

  // Flush queued input commands in small batches (~30/s).
  useEffect(() => {
    if (!active || !allowControl) return;
    const id = setInterval(async () => {
      if (busyRef.current || queueRef.current.length === 0) return;
      const items = queueRef.current.splice(0, 40);
      busyRef.current = true;
      try {
        await api.commandsBatch(sessionId, items);
      } catch {
        /* drop on failure to avoid backlog */
      } finally {
        busyRef.current = false;
      }
    }, 33);
    return () => clearInterval(id);
  }, [sessionId, active, allowControl]);

  // Poll shared clipboard coming from the remote PC.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(async () => {
      try {
        const r = await api.clipboard(sessionId, clipSeqRef.current);
        if (r.clipboard && r.clipboard.side === 'client') {
          clipSeqRef.current = r.clipboard.seq;
          setRemoteClipboard(r.clipboard.text_value);
        } else if (r.seq) {
          clipSeqRef.current = r.seq;
        }
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => clearInterval(id);
  }, [sessionId, active]);

  const enqueue = useCallback(
    (kind: string, payload: Record<string, unknown>) => {
      if (!allowControl) return;
      queueRef.current.push({ kind, payload });
    },
    [allowControl],
  );

  // Immediate (non-batched) command for hotkeys / Ctrl+Alt+Del.
  const sendNow = useCallback(
    (kind: string, payload: Record<string, unknown>) => {
      api.command(sessionId, kind, payload).catch(() => undefined);
    },
    [sessionId],
  );

  const pushClipboard = useCallback(
    (text: string) => api.setClipboard(sessionId, text).catch(() => undefined),
    [sessionId],
  );

  return { frame, connected, remoteClipboard, enqueue, sendNow, pushClipboard };
}
