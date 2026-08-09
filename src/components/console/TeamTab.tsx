import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { api, type Member } from '@/lib/api';

const roles: Record<string, string> = {
  admin: 'Администратор',
  operator: 'Оператор',
  viewer: 'Только просмотр',
};

const statuses: Record<string, string> = {
  invited: 'Приглашён',
  active: 'Активен',
  blocked: 'Заблокирован',
};

const TeamTab = ({ team, onRefresh }: { team: Member[]; onRefresh: () => void }) => {
  const [form, setForm] = useState({ email: '', full_name: '', role: 'operator' });
  const [error, setError] = useState('');

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.inviteMember(form.email.trim(), form.full_name.trim(), form.role);
      setForm({ email: '', full_name: '', role: 'operator' });
      onRefresh();
    } catch {
      setError('Проверьте адрес электронной почты');
    }
  };

  const change = async (m: Member, patch: { role?: string; status?: string }) => {
    await api.updateMember(m.id, patch.role ?? m.role, patch.status ?? m.status);
    onRefresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section className="rounded-[22px] border border-border bg-background p-7">
        <h2 className="text-[1.15rem] font-bold">Пригласить оператора</h2>
        <p className="mt-2 text-[0.92rem] text-muted-foreground">
          Сотрудник получит код приглашения и доступ к устройствам вашей организации.
        </p>
        <form onSubmit={invite} className="mt-6 flex flex-col gap-4">
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Имя и фамилия"
            className="h-[52px] rounded-2xl border border-input px-5 text-[0.95rem] outline-none focus:border-primary"
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            type="email"
            required
            placeholder="operator@company.ru"
            className="h-[52px] rounded-2xl border border-input px-5 text-[0.95rem] outline-none focus:border-primary"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="h-[52px] rounded-2xl border border-input bg-background px-5 text-[0.95rem] outline-none focus:border-primary"
          >
            {Object.entries(roles).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {error && <span className="text-[0.88rem] text-destructive">{error}</span>}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2.5 rounded-pill bg-primary px-8 py-4 text-[0.95rem] font-semibold leading-none text-primary-foreground"
          >
            <Icon name="UserPlus" size={18} /> Отправить приглашение
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-border bg-background">
        <header className="border-b border-border px-6 py-5">
          <h2 className="text-[1.15rem] font-bold">Операторы</h2>
        </header>
        {team.length === 0 ? (
          <p className="px-6 py-14 text-center text-[0.94rem] text-muted-foreground">
            Вы работаете один. Пригласите коллег, чтобы вести поддержку вместе.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {team.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-secondary font-semibold uppercase text-foreground">
                  {(m.full_name || m.email)[0]}
                </span>
                <span className="min-w-[150px] flex-1">
                  <span className="block text-[0.94rem] font-semibold">{m.full_name || m.email}</span>
                  <span className="block text-[0.82rem] text-muted-foreground">{m.email}</span>
                </span>
                <select
                  value={m.role}
                  onChange={(e) => change(m, { role: e.target.value })}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-[0.85rem] outline-none focus:border-primary"
                >
                  {Object.entries(roles).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <span
                  className={`rounded-pill px-3 py-1.5 text-[0.78rem] font-semibold ${
                    m.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {statuses[m.status] || m.status}
                </span>
                <button
                  type="button"
                  onClick={() => change(m, { status: m.status === 'blocked' ? 'active' : 'blocked' })}
                  className="text-muted-foreground transition-colors hover:text-primary"
                  title={m.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
                >
                  <Icon name={m.status === 'blocked' ? 'LockOpen' : 'Lock'} size={17} />
                </button>
                {m.status === 'invited' && (
                  <span className="w-full font-mono text-[0.78rem] text-muted-foreground">
                    Код приглашения: {m.invite_code}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default TeamTab;
