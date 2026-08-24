import useShopStore from "../store/useShopStore";

export default function Toast() {
  const toast = useShopStore((s) => s.toast);
  const clearToast = useShopStore((s) => s.clearToast);
  
  if (!toast) return null;

  if (toast.type === "confirm") {
    return (
      <div className="toast toast-confirm" key={toast.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'auto' }}>
        <div>{toast.message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm" onClick={() => {
            if (toast.onCancel) toast.onCancel();
            clearToast();
          }}>Cancel</button>
          <button className="btn btn-sm btn-primary" onClick={() => {
            if (toast.onConfirm) toast.onConfirm();
            clearToast();
          }}>Confirm</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`toast toast-${toast.type}`} key={toast.id}>
      {toast.message}
    </div>
  );
}
