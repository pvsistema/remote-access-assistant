import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import ConsoleShell, { type TabKey } from '@/components/console/ConsoleShell';
import DevicesTab from '@/components/console/DevicesTab';
import ConnectTab from '@/components/console/ConnectTab';
import HomeTab from '@/components/console/HomeTab';
import FilesTab from '@/components/console/FilesTab';
import TeamTab from '@/components/console/TeamTab';
import LogTab from '@/components/console/LogTab';
import ApiTab from '@/components/console/ApiTab';
import RemoteScreen from '@/components/console/RemoteScreen';
import { IncomingSessionPrompt, SharingBar } from '@/components/console/IncomingSessionPrompt';
import { useMyDevice } from '@/hooks/useMyDevice';
import { useIncomingSession } from '@/hooks/useIncomingSession';
import { toast } from '@/hooks/use-toast';
import { api, clearToken, getToken, type Overview, type Session, type User } from '@/lib/api';

const empty: Overview = {
  devices: [],
  groups: [],
  team: [],
  files: [],
  sessions: [],
  logs: [],
  stats: { devices: 0, online: 0, sessions_30d: 0 },
  relay_url: '',
};

const Console = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<Overview>(empty);
  const [tab, setTab] = useState<TabKey>(initialId ? 'connect' : 'home');
  const [presetId, setPresetId] = useState(initialId);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Session | null>(null);

  const logout = useCallback(() => {
    clearToken();
    navigate('/login');
  }, [navigate]);

  const load = useCallback(async () => {
    try {
      const [me, overview] = await Promise.all([api.me(), api.overview()]);
      setUser(me.user);
      setData(overview);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (!getToken()) {
      navigate('/login');
      return;
    }
    load();
  }, [load, navigate]);

  const { device: myDevice, password, refreshPassword } = useMyDevice(!loading, load);
  const { incoming, sharing, accept, reject, stopSharing } = useIncomingSession(myDevice?.id);

  useEffect(() => {
    const id = setInterval(() => {
      if (getToken()) api.overview().then(setData).catch(() => undefined);
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const quickConnect = async (accessId: string, mode = 'control') => {
    const clean = accessId.replace(/\D/g, '');
    if (clean.length < 6) {
      toast({ title: 'Введите ID', description: 'ID партнёра состоит из 9 цифр' });
      return;
    }
    try {
      const res = await api.createSession(clean, mode, {
        control: mode === 'control',
        files: true,
        clipboard: true,
        audio: false,
        record: false,
      });
      await api.updateSession(res.session.id, 'active');
      setScreen({ ...res.session, status: 'active', access_id: clean });
      load();
    } catch {
      setPresetId(clean);
      setTab('connect');
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-secondary">
        <Icon name="LoaderCircle" size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  const overlays = (
    <>
      {incoming && <IncomingSessionPrompt session={incoming} onAccept={accept} onReject={reject} />}
      {sharing && !incoming && <SharingBar onStop={stopSharing} />}
    </>
  );

  if (screen) {
    return (
      <>
        <RemoteScreen
          session={screen}
          device={data.devices.find((d) => d.access_id === screen.access_id)}
          onClose={() => {
            setScreen(null);
            load();
          }}
        />
        {overlays}
      </>
    );
  }

  return (
    <>
    {overlays}
    <ConsoleShell
      user={user}
      tab={tab}
      onTab={setTab}
      onLogout={logout}
      myDevice={myDevice}
      password={password}
      onRefreshPassword={refreshPassword}
      online={data.stats.online}
    >
      {tab === 'home' && (
        <HomeTab
          devices={data.devices}
          sessions={data.sessions}
          myAccessId={myDevice?.access_id || ''}
          onRefresh={load}
          onConnect={quickConnect}
        />
      )}
      {tab === 'devices' && (
        <DevicesTab
          devices={data.devices}
          groups={data.groups}
          stats={data.stats}
          onRefresh={load}
          onConnect={quickConnect}
        />
      )}
      {tab === 'connect' && (
        <ConnectTab presetId={presetId} sessions={data.sessions} devices={data.devices} onChanged={load} />
      )}
      {tab === 'files' && <FilesTab files={data.files} />}
      {tab === 'team' && <TeamTab team={data.team} onRefresh={load} />}
      {tab === 'log' && <LogTab logs={data.logs} />}
      {tab === 'api' && <ApiTab />}
    </ConsoleShell>
    </>
  );
};

export default Console;