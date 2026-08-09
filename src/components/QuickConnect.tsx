import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { getToken } from '@/lib/api';

const QuickConnect = ({ compact = false }: { compact?: boolean }) => {
  const navigate = useNavigate();
  const [id, setId] = useState('');

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = id.replace(/\D/g, '').slice(0, 9);
    const target = getToken() ? '/console' : '/login';
    navigate(clean ? `${target}?id=${clean}` : target);
  };

  return (
    <form
      onSubmit={go}
      className={`flex w-full flex-wrap items-center gap-3 ${
        compact ? '' : 'rounded-[22px] border border-border bg-background p-3 shadow-[0_18px_40px_hsl(var(--foreground)/0.06)]'
      }`}
    >
      <label className="flex min-w-[190px] flex-1 items-center gap-3 rounded-[16px] bg-secondary px-4">
        <Icon name="Fingerprint" size={18} className="flex-none text-primary" />
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          inputMode="numeric"
          placeholder="ID удалённого ПК"
          aria-label="ID удалённого компьютера"
          className="h-[54px] w-full bg-transparent font-mono text-[1.05rem] font-semibold tracking-[0.08em] text-foreground outline-none placeholder:font-body placeholder:text-[0.95rem] placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground"
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-[54px] flex-none items-center gap-2.5 rounded-[16px] bg-primary px-7 text-[0.95rem] font-semibold leading-none text-primary-foreground transition-colors hover:bg-destructive"
      >
        <Icon name="PlugZap" size={18} />
        Подключиться
      </button>
    </form>
  );
};

export default QuickConnect;
