// Bottom-center toast stack for transient confirmations (e.g. task created).
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';

export function ToastStack() {
  const toasts = useAppStore((s) => s.toasts);
  return (
    <div className="nb-toasts" data-testid="toast-stack">
      {toasts.map((t) => (
        <div className="nb-toast" key={t.id} data-testid="toast-message">
          <span className="ti"><Icons.check size={14} /></span>{t.text}
        </div>
      ))}
    </div>
  );
}
