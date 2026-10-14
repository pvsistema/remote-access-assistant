import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Frame } from '@/lib/api';
import { useRelayChannel } from './useRelayChannel';

// Operator-side remote desktop stream.
// Preferred path: the account's own relay server (live, instant frames).
// Fallback: polling the cloud function, used when no relay is configured
// or the relay is unreachable.
export function useRemoteStream(
  sessionId: number,
  active: boolean,
  allowControl: boolean,
  relayUrl = '',
  relayTicket = '',
) {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [connected, setConnected] = useState(false);
  const [remoteClipboard, setRemoteClipboard] = useState('');

  const seqRef = useRef(-1);
  const clipSeqRef = useRef(-1);
  const queueRef = useRef<{ kind: string; payload: Record<string, unknown> }[]>([]);
  const busyRef = useRef(false);

  const onRelayFrame = useCallback((f: Frame) => {
    setFrame(f);
    setConnected(true);
  }, []);

  const { live, send } = useRelayChannel({
    url: relayUrl,
    ticket: relayTicket,
    active,
    onFrame: onRelayFrame,
    onClipboard: setRemoteClipboard,
  });

  // Poll frames only while the live channel is down.
  useEffect(() => {
    if (!active || live) return;
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
  }, [sessionId, active, live]);

  // Flush queued input commands in small batches (~30/s) when polling.
  useEffect(() => {
    if (!active || !allowControl || live) return;
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
  }, [sessionId, active, allowControl, live]);

  // Poll shared clipboard coming from the remote PC (cloud path only).
  useEffect(() => {
    if (!active || live) return;
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
  }, [sessionId, active, live]);

  const enqueue = useCallback(
    (kind: string, payload: Record<string, unknown>) => {
      if (!allowControl) return;
      // Live channel delivers immediately; otherwise batch for the cloud.
      if (send(kind, payload)) return;
      queueRef.current.push({ kind, payload });
    },
    [allowControl, send],
  );

  // Immediate (non-batched) command for hotkeys / Ctrl+Alt+Del.
  const sendNow = useCallback(
    (kind: string, payload: Record<string, unknown>) => {
      if (send(kind, payload)) return;
      api.command(sessionId, kind, payload).catch(() => undefined);
    },
    [sessionId, send],
  );

  const pushClipboard = useCallback(
    (text: string) => {
      if (send('clipboard', { text })) return Promise.resolve();
      return api.setClipboard(sessionId, text).catch(() => undefined);
    },
    [sessionId, send],
  );

  return { frame, connected, remoteClipboard, enqueue, sendNow, pushClipboard, live };
}
