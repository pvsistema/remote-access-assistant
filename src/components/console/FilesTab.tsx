import Icon from '@/components/ui/icon';
import type { Transfer } from '@/lib/api';
import { parseServerDate } from '@/lib/dates';

const size = (b: number) => {
  if (b < 1024) return `${b} Б`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} КБ`;
  return `${(b / 1024 / 1024).toFixed(1)} МБ`;
};

const FilesTab = ({ files }: { files: Transfer[] }) => (
  <section className="overflow-hidden rounded-[22px] border border-border bg-background">
    <header className="border-b border-border px-6 py-5">
      <h2 className="text-[1.15rem] font-bold">Передача файлов</h2>
      <p className="mt-1.5 text-[0.89rem] text-muted-foreground">
        История файлов, отправленных и полученных во время сеансов удалённого доступа.
      </p>
    </header>

    {files.length === 0 ? (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
          <Icon name="FolderSync" size={26} />
        </span>
        <p className="text-[1.02rem] font-semibold">Файлы ещё не передавались</p>
        <p className="max-w-[420px] text-[0.92rem] text-muted-foreground">
          Во время сеанса нажмите «Отправить файлы» — передача появится в этом списке.
        </p>
      </div>
    ) : (
      <ul className="divide-y divide-border">
        {files.map((f) => (
          <li key={f.id} className="flex items-center gap-4 px-6 py-4">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-secondary text-foreground">
              <Icon name={f.direction === 'upload' ? 'ArrowUp' : 'ArrowDown'} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.94rem] font-semibold">{f.file_name}</span>
              <span className="block text-[0.82rem] text-muted-foreground">
                {f.device_name || 'Устройство удалено'} · {size(f.size_bytes)}
              </span>
            </span>
            <span className="rounded-pill bg-primary/10 px-3 py-1.5 text-[0.78rem] font-semibold text-primary">
              {f.direction === 'upload' ? 'На удалённый ПК' : 'С удалённого ПК'}
            </span>
            <span className="whitespace-nowrap text-[0.83rem] text-muted-foreground">
              {parseServerDate(f.created_at).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default FilesTab;
