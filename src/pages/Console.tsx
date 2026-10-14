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
import ServerTab from '@/components/console/ServerTab';
import ApiTab from '@/components/console/ApiTab';
import RemoteScreen from '@/components/console/RemoteScreen';
import { IncomingSessionPrompt, SharingBar } from '@/components/console/IncomingSessionPrompt';
import { useMyDevice } from '@/hooks/useMyDevice';
import { useIncomingSession } from '@/hooks/useIncomingSession';
import { toast } from '@/hooks/use-toast';
import {
  api,
  clearToken,
  clearGuestToken,
  ERRORS,
  getToken,
  isGuest,
  type Device,
  type Overview,
  type Session,
  type User,
} from '@/lib/api';

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
    clearGuestToken();
    localStorage.removeItem('pv_guest_pass');
    navigate('/login');
  }, [navigate]);

  const guest = isGuest();
  const [guestDevice, setGuestDevice] = useState<Device | null>(null);

  const load = useCallback(async () => {
    try {
      if (isGuest()) {
        // Guests have no account: only their own device and sessions.
        const state = await api.guestState();
        setGuestDevice(state.device);
        setData({ ...empty, devices: state.device ? [state.device] : [], sessions: state.sessions });
      } else {
        const [me, overview] = await Promise.all([api.me(), api.overview()]);
        setUser(me.user);
        setData(overview);
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (!getToken() && !isGuest()) {
      navigate('/login');
      return;
    }
    load();
  }, [load, navigate]);

  const registered = useMyDevice(!loading && !guest, load);
  const [guestPassword, setGuestPassword] = useState(() => localStorage.getItem('pv_guest_pass') || '');

  const refreshGuestPassword = useCallback(() => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    const p = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    localStorage.setItem('pv_guest_pass', p);
    setGuestPassword(p);
    if (guestDevice?.id) api.setDevicePassword(guestDevice.id, p).catch(() => undefined);
    return p;
  }, [guestDevice?.id]);

  useEffect(() => {
    if (guest && !['home', 'connect', 'files'].includes(tab)) setTab('home');
  }, [guest, tab]);

  const myDevice = guest ? guestDevice : registered.device;
  const password = guest ? guestPassword : registered.password;
  const refreshPassword = guest ? refreshGuestPassword : registered.refreshPassword;
  const { incoming, sharing, accept, reject, stopSharing } = useIncomingSession();

  useEffect(() => {
    const id = setInterval(() => {
      if (getToken()) api.overview().then(setData).catch(() => undefined);
      else if (isGuest())
        api
          .guestState()
          .then((st) => setData((cur) => ({ ...cur, sessions: st.sessions })))
          .catch(() => undefined);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const quickConnect = async (accessId: string, mode = 'control', password?: string) => {
    const clean = accessId.replace(/\D/g, '');
    if (clean.length < 6) {
      toast({ title: 'Введите ID', description: 'ID партнёра состоит из 9 цифр' });
      return;
    }
    try {
      const res = await api.createSession(
        clean,
        mode,
        { control: mode === 'control', files: true, clipboard: true, audio: false, record: false },
        password,
      );
      // The session stays "pending" until the remote user presses "Разрешить".
      setScreen({ ...res.session, status: 'pending', access_id: clean });
      load();
    } catch (err) {
      const code = (err as Error).message;
      if (code === 'password_required' || code === 'bad_device_password') {
        toast({ title: ERRORS[code], description: 'Укажите пароль на вкладке «Подключение»' });
      }
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
      guest={guest}
    >
      {tab === 'home' && (
        <HomeTab
          devices={data.devices}
          sessions={data.sessions}
          myAccessId={myDevice?.access_id || ''}
          myPassword={password}
          onRefreshPassword={refreshPassword}
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
      {tab === 'server' && <ServerTab />}
      {tab === 'api' && <ApiTab />}
    </ConsoleShell>
    </>
  );
};

export default Console;