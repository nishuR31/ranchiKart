import useShopStore from "../store/useShopStore";

export default function Toast() {
  const toast = useShopStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type}`} key={toast.id}>
      {toast.message}
    </div>
  );
}
