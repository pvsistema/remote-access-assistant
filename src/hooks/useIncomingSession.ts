import { useCallback, useEffect, useState } from 'react';
import { api, getToken, isGuest, type Session } from '@/lib/api';

type Host = { chrome?: { webview?: { postMessage: (m: unknown) => void } } };

const deviceUid = () => localStorage.getItem('pv_device_uid') || '';

// Passes the relay address and pass to the C# host, so the desktop is streamed
// through the user's own server when one is configured.
const startAgent = (session: Session, relay = '', ticket = '') => {
  const wv = (window as unknown as Host).chrome?.webview;
  if (!wv) return; // outside the desktop host there is nothing to capture
  wv.postMessage(
    `agent:start:${JSON.stringify({
      session: session.id,
      uid: deviceUid(),
      files: Boolean(session.allow_files),
      relay,
      ticket,
    })}`,
  );
};

const stopAgent = () => {
  (window as unknown as Host).chrome?.webview?.postMessage('agent:stop');
};

// Watches for an operator connecting to THIS device and lets the local user
// accept or reject. On accept, tells the C# host to start desktop sharing.
export function useIncomingSession() {
  const [incoming, setIncoming] = useState<Session | null>(null);
  const [sharing, setSharing] = useState<Session | null>(null);

  useEffect(() => {
    const tick = async () => {
      try {
        const { sessions } = await api.myIncoming();
        const now = Date.now();
        const pending = sessions.find(
          (s) => s.status === 'pending' && new Date(s.expires_at).getTime() > now,
        );
        setIncoming((cur) => (cur && cur.id === pending?.id ? cur : pending ?? null));

        // Operator ended the session — stop sharing.
        if (sharing) {
          const still = sessions.find((s) => s.id === sharing.id);
          if (!still || still.status !== 'active') {
            stopAgent();
            setSharing(null);
          }
        }
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(() => {
      if (getToken() || isGuest()) tick();
    }, 3000);
    return () => clearInterval(id);
  }, [sharing]);

  const accept = useCallback(async (session: Session) => {
    // The confirm response carries the relay address and a pass for this side.
    const res = await api.confirmSession(session.id);
    startAgent(session, res.relay_url || '', res.relay_ticket || '');
    setSharing(session);
    setIncoming(null);
  }, []);

  const reject = useCallback(async (session: Session) => {
    await api.updateSession(session.id, 'rejected').catch(() => undefined);
    setIncoming(null);
  }, []);

  const stopSharing = useCallback(async () => {
    if (sharing) await api.updateSession(sharing.id, 'closed').catch(() => undefined);
    stopAgent();
    setSharing(null);
  }, [sharing]);

  return { incoming, sharing, accept, reject, stopSharing };
}