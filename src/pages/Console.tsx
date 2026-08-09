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
import { api, clearToken, getToken, type Overview, type User } from '@/lib/api';

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

  useEffect(() => {
    const id = setInterval(() => {
      if (getToken()) api.overview().then(setData).catch(() => undefined);
    }, 15000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-secondary">
        <Icon name="LoaderCircle" size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ConsoleShell user={user} tab={tab} onTab={setTab} onLogout={logout}>
      {tab === 'home' && (
        <HomeTab
          devices={data.devices}
          onRefresh={load}
          onConnect={(id) => {
            setPresetId(id);
            setTab('connect');
          }}
        />
      )}
      {tab === 'devices' && (
        <DevicesTab
          devices={data.devices}
          groups={data.groups}
          stats={data.stats}
          onRefresh={load}
          onConnect={(id) => {
            setPresetId(id);
            setTab('connect');
          }}
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
  );
};

export default Console;