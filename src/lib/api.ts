export const AUTH_URL = 'https://functions.poehali.dev/b3762411-99d5-494c-8713-a885caa529ef';
export const AGENT_URL = 'https://functions.poehali.dev/71f9d96f-2470-4e7e-b343-63fbb92271f6';

const TOKEN_KEY = 'pv_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export type User = {
  id: number;
  email: string;
  full_name: string;
  company: string;
  role: string;
};

export type Device = {
  id: number;
  device_uid: string;
  access_id: string;
  name: string;
  os: string;
  os_version: string;
  app_version: string;
  local_ip: string;
  unattended: boolean;
  is_online: boolean;
  last_seen: string | null;
  created_at: string;
};

export type Session = {
  id: number;
  access_id: string;
  session_code: string;
  status: string;
  mode: string;
  operator_name: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  expires_at: string;
  one_time_password?: string;
  relay_url?: string;
  device_name?: string | null;
};

export type LogItem = {
  id: number;
  event_type: string;
  message: string;
  ip: string;
  created_at: string;
};

export type Overview = {
  devices: Device[];
  sessions: Session[];
  logs: LogItem[];
  stats: { devices: number; online: number; sessions_30d: number };
  relay_url: string;
};

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': getToken(),
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'request_failed');
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>(`${AUTH_URL}?action=login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (payload: { email: string; password: string; full_name: string; company: string }) =>
    request<{ token: string; user: User }>(`${AUTH_URL}?action=register`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: () => request<{ user: User }>(`${AUTH_URL}?action=me`),
  overview: () => request<Overview>(`${AGENT_URL}?action=overview`),
  createSession: (access_id: string, mode: string) =>
    request<{ session: Session }>(`${AGENT_URL}?action=create_session`, {
      method: 'POST',
      body: JSON.stringify({ access_id, mode }),
    }),
  updateSession: (session_id: number, status: 'active' | 'closed' | 'rejected') =>
    request<{ ok: boolean }>(`${AGENT_URL}?action=update_session`, {
      method: 'POST',
      body: JSON.stringify({ session_id, status }),
    }),
  registerDevice: (payload: Record<string, unknown>) =>
    request<{ device: { id: number; access_id: string; name: string } }>(
      `${AGENT_URL}?action=register_device`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  renameDevice: (device_id: number, name: string) =>
    request<{ device: { id: number; name: string } }>(`${AGENT_URL}?action=rename_device`, {
      method: 'POST',
      body: JSON.stringify({ device_id, name }),
    }),
  setOffline: (device_uid: string) =>
    request<{ ok: boolean }>(`${AGENT_URL}?action=set_offline`, {
      method: 'POST',
      body: JSON.stringify({ device_uid }),
    }),
};

export const ERRORS: Record<string, string> = {
  invalid_credentials: 'Неверная почта или пароль',
  email_exists: 'Этот e-mail уже зарегистрирован',
  bad_credentials: 'Проверьте почту и пароль (от 6 символов)',
  unauthorized: 'Сессия истекла, войдите заново',
  device_not_found: 'Устройство не найдено',
  session_not_found: 'Сеанс не найден',
  request_failed: 'Не удалось выполнить запрос',
};
