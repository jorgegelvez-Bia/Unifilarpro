import { CloudChip } from '@/components/CloudPanel';
import { ExportButtons } from '@/components/ExportButtons';

export function Header({ onToggleList }: { onToggleList: () => void }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2.5">
      <h1 className="m-0 flex items-center gap-3 text-[22px] font-bold">
        <img src="/logo.svg" alt="" className="h-[46px] w-[46px]" />
        <span>
          Unifilar<span className="font-extrabold text-[#0F7B6C] dark:text-[#4DB6AC]">Pro</span>{' '}
          <span className="font-semibold text-muted">Medida</span>
          <small className="block text-[13px] font-normal text-muted">Diagrama unifilar del sistema de medida</small>
        </span>
      </h1>
      <div className="flex flex-wrap items-center gap-2">
        <CloudChip />
        <button className="btn" onClick={onToggleList}>
          Mis diagramas
        </button>
        <ExportButtons />
      </div>
    </header>
  );
}
