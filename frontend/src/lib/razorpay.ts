import type { PaymentGatewayOrder, User } from "../types";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

export async function loadRazorpay() {
  if (window.Razorpay) return true;

  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(input: {
  gateway: PaymentGatewayOrder;
  user: User;
  onSuccess: (response: RazorpayResponse) => void;
  onDismiss: () => void;
}) {
  if (input.gateway.mock) {
    input.onSuccess({
      razorpay_order_id: input.gateway.orderId,
      razorpay_payment_id: `mock_payment_${Date.now()}`,
      razorpay_signature: "mock_signature"
    });
    return;
  }

  const loaded = await loadRazorpay();
  if (!loaded || !window.Razorpay) throw new Error("Unable to load Razorpay checkout");

  const checkout = new window.Razorpay({
    key: input.gateway.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: input.gateway.amount,
    currency: input.gateway.currency,
    name: "MudraKart",
    description: "Custom stamps, boards, and stationery",
    order_id: input.gateway.orderId,
    prefill: {
      name: input.user.name,
      email: input.user.email
    },
    handler: input.onSuccess,
    modal: {
      ondismiss: input.onDismiss
    }
  });

  checkout.open();
}
