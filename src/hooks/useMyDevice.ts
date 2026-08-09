import { useCallback, useEffect, useState } from 'react';
import { api, type Device } from '@/lib/api';

const UID_KEY = 'pv_device_uid';
const PASS_KEY = 'pv_device_pass';

const makePassword = () => {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const getUid = () => {
  let uid = localStorage.getItem(UID_KEY);
  if (!uid) {
    uid = `web-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(UID_KEY, uid);
  }
  return uid;
};

export const browserName = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('YaBrowser')) return 'Yandex';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Браузер';
};

export const osName = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Linux')) return 'Linux';
  return 'ОС';
};

export const useMyDevice = (enabled: boolean, onRegistered?: () => void) => {
  const [device, setDevice] = useState<Device | null>(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!enabled) return;
    const saved = localStorage.getItem(PASS_KEY) || makePassword();
    localStorage.setItem(PASS_KEY, saved);
    setPassword(saved);

    api
      .registerDevice({
        device_uid: getUid(),
        name: `${browserName()} · ${osName()}`,
        os: osName(),
        os_version: browserName(),
        app_version: 'web 3.0',
        local_ip: '',
        unattended: false,
      })
      .then((r) => {
        setDevice(r.device as Device);
        onRegistered?.();
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const refreshPassword = useCallback(() => {
    const p = makePassword();
    localStorage.setItem(PASS_KEY, p);
    setPassword(p);
    return p;
  }, []);

  return { device, password, refreshPassword };
};
