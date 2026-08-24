import { useCallback, useEffect, useState } from 'react';
import { api, getToken, type Session } from '@/lib/api';

type Host = { chrome?: { webview?: { postMessage: (m: unknown) => void } } };

const deviceUid = () => localStorage.getItem('pv_device_uid') || '';

const startAgent = (session: Session) => {
  const wv = (window as unknown as Host).chrome?.webview;
  if (!wv) return; // outside the desktop host there is nothing to capture
  const files = session.allow_files ? '1' : '0';
  wv.postMessage(`agent:start:${session.id}:${deviceUid()}:${files}`);
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
      if (getToken()) tick();
    }, 3000);
    return () => clearInterval(id);
  }, [sharing]);

  const accept = useCallback(async (session: Session) => {
    await api.confirmSession(session.id);
    startAgent(session);
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