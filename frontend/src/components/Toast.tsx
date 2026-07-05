import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useShopStore } from "../store/useShopStore";

const TOAST_STYLES = {
  success: {
    bg: "bg-emerald-950/95 border-emerald-500/40",
    icon: CheckCircle,
    iconColor: "text-emerald-400",
    titleColor: "text-emerald-100"
  },
  error: {
    bg: "bg-rose-950/95 border-rose-500/40",
    icon: AlertCircle,
    iconColor: "text-rose-400",
    titleColor: "text-rose-100"
  },
  warning: {
    bg: "bg-amber-950/95 border-amber-500/40",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    titleColor: "text-amber-100"
  },
  info: {
    bg: "bg-indigo-950/95 border-indigo-500/40",
    icon: Info,
    iconColor: "text-indigo-400",
    titleColor: "text-indigo-100"
  }
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useShopStore();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl shadow-black/40 ${style.bg} animate-in slide-in-from-right-4 duration-300`}
          >
            <Icon size={18} className={`shrink-0 mt-0.5 ${style.iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-tight ${style.titleColor}`}>
                {toast.title}
              </p>
              {toast.message && (
                <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 text-white/30 hover:text-white/60 transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
