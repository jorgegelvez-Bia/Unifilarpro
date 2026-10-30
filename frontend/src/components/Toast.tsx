import { useEffect } from 'react';
import { useStore } from '@/store/diagram';

export function Toast() {
  const toast = useStore((s) => s.toast);
  const setToast = useStore((s) => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  if (!toast) return null;
  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-sm text-paper shadow-lg">
      {toast}
    </div>
  );
}
