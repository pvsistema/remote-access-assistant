export const AUTH_URL = 'https://functions.poehali.dev/b3762411-99d5-494c-8713-a885caa529ef';
export const AGENT_URL = 'https://functions.poehali.dev/71f9d96f-2470-4e7e-b343-63fbb92271f6';
export const STREAM_URL = 'https://functions.poehali.dev/db97b202-938b-4e3c-bee5-4e64927b6717';

const TOKEN_KEY = 'pv_token';
const GUEST_KEY = 'pv_guest_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Guest mode: work by ID + password without registration.
export const getGuestToken = () => localStorage.getItem(GUEST_KEY) || '';
export const setGuestToken = (t: string) => localStorage.setItem(GUEST_KEY, t);
export const clearGuestToken = () => localStorage.removeItem(GUEST_KEY);
export const isGuest = () => !getToken() && Boolean(getGuestToken());

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
  group_id: number | null;
  group_name: string | null;
  is_favorite: boolean;
  note: string;
  mac_address: string;
};

export type Group = { id: number; name: string };

export type Member = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  status: string;
  invite_code: string;
  created_at: string;
};

export type Transfer = {
  id: number;
  file_name: string;
  size_bytes: number;
  direction: string;
  status: string;
  created_at: string;
  device_name: string | null;
};

export type Message = {
  id: number;
  author: string;
  side: string;
  text: string;
  created_at: string;
};

export type Permissions = {
  control: boolean;
  files: boolean;
  clipboard: boolean;
  audio: boolean;
  record: boolean;
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
  relay_ticket?: string;
  device_name?: string | null;
  allow_control?: boolean;
  allow_files?: boolean;
  allow_clipboard?: boolean;
  allow_audio?: boolean;
  is_recorded?: boolean;
};

export type RelayServer = {
  url: string;
  enabled: boolean;
  last_ok_at: string | null;
  last_status: string;
  updated_at: string;
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
  groups: Group[];
  team: Member[];
  files: Transfer[];
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
      ...(getGuestToken() ? { 'X-Guest-Token': getGuestToken() } : {}),
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
  createSession: (access_id: string, mode: string, permissions?: Permissions, password?: string) =>
    request<{ session: Session }>(`${AGENT_URL}?action=create_session`, {
      method: 'POST',
      body: JSON.stringify({ access_id, mode, permissions, password }),
    }),
  getRelay: () =>
    request<{ relay: RelayServer | null }>(`${AGENT_URL}?action=get_relay`, {
      method: 'POST',
      body: '{}',
    }),
  saveRelay: (payload: { url: string; secret?: string; enabled?: boolean }) =>
    request<{ ok: boolean; relay: { url: string; enabled: boolean } }>(
      `${AGENT_URL}?action=save_relay`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  checkRelay: (url?: string) =>
    request<{ status: string; detail: string; checked: string }>(`${AGENT_URL}?action=check_relay`, {
      method: 'POST',
      body: JSON.stringify(url ? { url } : {}),
    }),
  guestRegister: (payload: { name?: string; os?: string; os_version?: string; device_uid?: string }) =>
    request<{ guest_token: string; device: Device; password: string }>(
      `${AGENT_URL}?action=guest_register`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  guestState: () =>
    request<{ device: Device | null; sessions: Session[] }>(`${AGENT_URL}?action=guest_state`, {
      method: 'POST',
      body: '{}',
    }),
  myIncoming: () =>
    request<{ sessions: Session[] }>(`${AGENT_URL}?action=my_incoming`, {
      method: 'POST',
      body: '{}',
    }),
  confirmSession: (session_id: number) =>
    request<{ ok: boolean; relay_url?: string; relay_ticket?: string }>(
      `${AGENT_URL}?action=confirm_session`,
      { method: 'POST', body: JSON.stringify({ session_id }) },
    ),
  setDevicePassword: (device_id: number, password: string) =>
    request<{ ok: boolean }>(`${AGENT_URL}?action=set_device_password`, {
      method: 'POST',
      body: JSON.stringify({ device_id, password }),
    }),
  createGroup: (name: string) =>
    request<{ group: Group }>(`${AGENT_URL}?action=create_group`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  updateDevice: (device_id: number, patch: Record<string, unknown>) =>
    request<{ device: Device }>(`${AGENT_URL}?action=update_device`, {
      method: 'POST',
      body: JSON.stringify({ device_id, ...patch }),
    }),
  wakeDevice: (device_id: number) =>
    request<{ ok: boolean; message: string }>(`${AGENT_URL}?action=wake_device`, {
      method: 'POST',
      body: JSON.stringify({ device_id }),
    }),
  messages: (session_id: number) =>
    request<{ messages: Message[] }>(`${AGENT_URL}?action=messages&session_id=${session_id}`),
  sendMessage: (session_id: number, text: string, side: 'operator' | 'client' = 'operator') =>
    request<{ message: Message }>(`${AGENT_URL}?action=send_message`, {
      method: 'POST',
      body: JSON.stringify({ session_id, text, side }),
    }),
  logTransfer: (payload: {
    session_id?: number | null;
    device_id?: number | null;
    file_name: string;
    size_bytes: number;
    direction: 'upload' | 'download';
  }) =>
    request<{ transfer: Transfer }>(`${AGENT_URL}?action=log_transfer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  inviteMember: (email: string, full_name: string, role: string) =>
    request<{ member: Member }>(`${AGENT_URL}?action=invite_member`, {
      method: 'POST',
      body: JSON.stringify({ email, full_name, role }),
    }),
  updateMember: (member_id: number, role: string, status: string) =>
    request<{ member: Member }>(`${AGENT_URL}?action=update_member`, {
      method: 'POST',
      body: JSON.stringify({ member_id, role, status }),
    }),
  updateSession: (session_id: number, status: 'closed' | 'rejected') =>
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

  // --- Remote desktop stream (operator side) ---
  frame: (session_id: number, since: number) =>
    request<{ frame: Frame | null; seq: number; unchanged?: boolean }>(
      `${STREAM_URL}?action=frame&session_id=${session_id}&since=${since}`,
    ),
  command: (session_id: number, kind: string, payload: Record<string, unknown>) =>
    request<{ ok: boolean }>(`${STREAM_URL}?action=command`, {
      method: 'POST',
      body: JSON.stringify({ session_id, kind, payload }),
    }),
  commandsBatch: (session_id: number, items: { kind: string; payload: Record<string, unknown> }[]) =>
    request<{ ok: boolean; saved: number }>(`${STREAM_URL}?action=commands_batch`, {
      method: 'POST',
      body: JSON.stringify({ session_id, items }),
    }),
  clipboard: (session_id: number, since: number) =>
    request<{ clipboard: { side: string; text_value: string; seq: number } | null; seq: number }>(
      `${STREAM_URL}?action=clipboard&session_id=${session_id}&since=${since}`,
    ),
  setClipboard: (session_id: number, text: string) =>
    request<{ ok: boolean; seq: number }>(`${STREAM_URL}?action=set_clipboard`, {
      method: 'POST',
      body: JSON.stringify({ session_id, text, side: 'operator' }),
    }),
  uploadFile: (session_id: number, file_name: string, data_b64: string) =>
    request<{ ok: boolean; id: number; url: string }>(`${STREAM_URL}?action=upload_file`, {
      method: 'POST',
      body: JSON.stringify({ session_id, file_name, data_b64 }),
    }),
};

export type Frame = {
  seq: number;
  monitor: number;
  width: number;
  height: number;
  // Cloud polling delivers base64; the relay delivers a ready object URL.
  image_b64?: string;
  image_url?: string;
  updated_at?: string;
};

export const ERRORS: Record<string, string> = {
  invalid_credentials: 'Неверная почта или пароль',
  email_exists: 'Этот e-mail уже зарегистрирован',
  bad_credentials: 'Проверьте почту и пароль (от 6 символов)',
  unauthorized: 'Сессия истекла, войдите заново',
  device_not_found: 'Устройство с таким ID не найдено',
  session_not_found: 'Сеанс не найден',
  request_failed: 'Не удалось выполнить запрос',
  password_required: 'Введите пароль удалённого компьютера',
  bad_device_password: 'Неверный пароль удалённого компьютера',
  password_too_short: 'Пароль должен быть не короче 4 символов',
  confirm_on_remote_side: 'Подтвердить сеанс может только удалённый компьютер',
};