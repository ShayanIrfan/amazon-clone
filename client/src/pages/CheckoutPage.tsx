import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";
import { useAddresses } from "../hooks/useAddresses";
import { useOrderQuote, usePlaceOrder } from "../hooks/useOrders";
import { useCart } from "../context/CartContext";
import AddressStep from "../components/checkout/AddressStep";
import DeliveryStep from "../components/checkout/DeliveryStep";
import PaymentStep from "../components/checkout/PaymentStep";
import ReviewStep from "../components/checkout/ReviewStep";
import OrderSummary from "../components/checkout/OrderSummary";
import ErrorState from "../components/ui/ErrorState";
import type { CardInput, DeliverySpeed } from "../lib/types";

type Step = "address" | "delivery" | "payment" | "review";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { refresh: refreshCart } = useCart();
  const { data: addressData } = useAddresses();

  const [step, setStep] = useState<Step>("address");
  const [addressId, setAddressId] = useState<string | null>(null);
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>("standard");
  const [card, setCard] = useState<CardInput | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const { data: quote, isLoading: quoteLoading, isError: quoteError, refetch: refetchQuote } = useOrderQuote(deliverySpeed);
  const placeOrder = usePlaceOrder();

  const selectedAddress = addressData?.items.find((a) => a._id === addressId) ?? null;

  if (quoteError) {
    return <ErrorState message="Couldn't load your checkout details." onRetry={() => refetchQuote()} />;
  }

  if (quote && quote.itemCount === 0) {
    return (
      <div className="page-shell flex min-h-[52vh] flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="eyebrow">Checkout</p>
        <h1 className="page-title text-ink">Your cart is empty</h1>
        <p className="muted">Add something to your cart before checking out.</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-2 rounded-md bg-marigold px-6 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark"
        >
          Continue shopping
        </button>
      </div>
    );
  }

  async function handlePlaceOrder() {
    if (!selectedAddress || !card) return;
    setOrderError(null);
    try {
      const { order } = await placeOrder.mutateAsync({ addressId: selectedAddress._id, deliverySpeed, card });
      await refreshCart();
      navigate(`/orders/${order._id}?confirmed=1`, { replace: true });
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Couldn't place your order. Please try again.");
    }
  }

  const steps: { key: Step; label: string }[] = [
    { key: "address", label: "Address" },
    { key: "delivery", label: "Delivery" },
    { key: "payment", label: "Payment" },
    { key: "review", label: "Review" },
  ];
  const activeStep = steps.findIndex((item) => item.key === step);

  return (
    <div className="page-shell py-6">
      <p className="eyebrow">Secure demo checkout</p>
      <h1 className="page-title mt-1 text-ink">Checkout</h1>
      <nav className="mt-6" aria-label="Checkout progress">
        <ol className="grid grid-cols-4 gap-1 sm:flex sm:items-center">
          {steps.map((item, index) => (
            <li key={item.key} className="flex min-w-0 flex-col items-center sm:flex-1 sm:flex-row">
              <div className={`flex min-w-0 flex-col items-center gap-1 text-[0.7rem] sm:flex-row sm:gap-2 sm:text-sm ${index <= activeStep ? "font-semibold text-harbor" : "text-slate"}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${index <= activeStep ? "border-harbor bg-harbor text-white" : "border-line-strong bg-white"}`}>
                  {index + 1}
                </span>
                {item.label}
              </div>
              {index < steps.length - 1 && <span className={`mx-3 hidden h-px flex-1 sm:block ${index < activeStep ? "bg-harbor" : "bg-line"}`} />}
            </li>
          ))}
        </ol>
      </nav>
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {activeStep > 0 && (
            <button
              type="button"
              onClick={() => setStep(steps[activeStep - 1].key)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-harbor hover:underline"
            >
              <ChevronLeft size={16} aria-hidden /> Back to {steps[activeStep - 1].label.toLowerCase()}
            </button>
          )}
          {step === "address" && (
            <AddressStep selectedId={addressId} onSelect={setAddressId} onContinue={() => setStep("delivery")} />
          )}
          {step === "delivery" && (
            <DeliveryStep value={deliverySpeed} onChange={setDeliverySpeed} onContinue={() => setStep("payment")} />
          )}
          {step === "payment" && (
            <PaymentStep
              busy={false}
              onSubmit={(c) => {
                setCard(c);
                setStep("review");
              }}
            />
          )}
          {step === "review" && selectedAddress && card && (
            <ReviewStep
              address={selectedAddress}
              deliverySpeed={deliverySpeed}
              card={card}
              onEditAddress={() => setStep("address")}
              onEditDelivery={() => setStep("delivery")}
              onEditPayment={() => setStep("payment")}
              onPlaceOrder={handlePlaceOrder}
              busy={placeOrder.isPending}
              error={orderError}
            />
          )}
        </div>

        <OrderSummary quote={quote} isLoading={quoteLoading} />
      </div>
    </div>
  );
}
