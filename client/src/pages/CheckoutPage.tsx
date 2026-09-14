import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";
import { useAddresses } from "../hooks/useAddresses";
import { useConfirmPayment, useOrderQuote, usePaymentsConfig, usePlaceOrder } from "../hooks/useOrders";
import { useCart } from "../context/CartContext";
import AddressStep from "../components/checkout/AddressStep";
import DeliveryStep from "../components/checkout/DeliveryStep";
import PaymentStep from "../components/checkout/PaymentStep";
import ReviewStep from "../components/checkout/ReviewStep";
import StripePaymentStep from "../components/checkout/StripePaymentStep";
import OrderSummary from "../components/checkout/OrderSummary";
import ErrorState from "../components/ui/ErrorState";
import PageLoader from "../components/ui/PageLoader";
import Button from "../components/ui/Button";
import type { CardInput, DeliverySpeed } from "../lib/types";

type Step = "address" | "delivery" | "payment" | "review";

interface PaymentSession {
  orderId: string;
  clientSecret: string;
  total: number;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { refresh: refreshCart } = useCart();
  const { data: addressData } = useAddresses();
  const paymentsConfig = usePaymentsConfig();
  const stripeCheckout = paymentsConfig.data?.provider === "stripe";

  const [step, setStep] = useState<Step>("address");
  const [addressId, setAddressId] = useState<string | null>(null);
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>("standard");
  const [card, setCard] = useState<CardInput | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);

  const { data: quote, isLoading: quoteLoading, isError: quoteError, refetch: refetchQuote } = useOrderQuote(deliverySpeed);
  const placeOrder = usePlaceOrder();
  const confirmPayment = useConfirmPayment();

  const selectedAddress = addressData?.items.find((a) => a._id === addressId) ?? null;

  if (quoteError || paymentsConfig.isError) {
    return (
      <ErrorState
        message="Couldn't load your checkout details."
        onRetry={() => {
          refetchQuote();
          paymentsConfig.refetch();
        }}
      />
    );
  }

  if (paymentsConfig.isLoading) return <PageLoader label="Loading checkout" />;

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

  // Stripe: creates the pending order + PaymentIntent for the address and
  // delivery speed chosen so far. Re-run whenever the shopper comes back
  // through the delivery step, since either choice changes the total.
  async function startStripePayment() {
    if (!selectedAddress) return;
    setOrderError(null);
    setPaymentSession(null);
    setStep("payment");
    try {
      const { order, clientSecret } = await placeOrder.mutateAsync({ addressId: selectedAddress._id, deliverySpeed });
      if (!clientSecret) throw new Error("Payment couldn't be started. Try again.");
      setPaymentSession({ orderId: order._id, clientSecret, total: order.total });
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Payment couldn't be started. Try again.");
    }
  }

  async function finishStripePayment() {
    if (!paymentSession) return;
    await confirmPayment.mutateAsync(paymentSession.orderId);
    await refreshCart();
    navigate(`/orders/${paymentSession.orderId}?confirmed=1`, { replace: true });
  }

  async function handleMockPlaceOrder() {
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
    // The mock form collects card fields first and charges on a separate review step.
    ...(stripeCheckout ? [] : [{ key: "review" as const, label: "Review" }]),
  ];
  const activeStep = steps.findIndex((item) => item.key === step);

  return (
    <div className="page-shell py-6">
      <p className="eyebrow">{stripeCheckout ? "Secure checkout" : "Secure demo checkout"}</p>
      <h1 className="page-title mt-1 text-ink">Checkout</h1>
      <nav className="mt-6" aria-label="Checkout progress">
        <ol className={`grid gap-1 sm:flex sm:items-center ${steps.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
          {steps.map((item, index) => (
            <li
              key={item.key}
              aria-current={index === activeStep ? "step" : undefined}
              className="flex min-w-0 flex-col items-center sm:flex-1 sm:flex-row"
            >
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
              onClick={() => {
                setOrderError(null);
                setStep(steps[activeStep - 1].key);
              }}
              className="inline-flex items-center gap-1 text-sm font-semibold text-harbor hover:underline"
            >
              <ChevronLeft size={16} aria-hidden /> Back to {steps[activeStep - 1].label.toLowerCase()}
            </button>
          )}
          {step === "address" && (
            <AddressStep selectedId={addressId} onSelect={setAddressId} onContinue={() => setStep("delivery")} />
          )}
          {step === "delivery" && (
            <DeliveryStep
              value={deliverySpeed}
              onChange={setDeliverySpeed}
              onContinue={stripeCheckout ? startStripePayment : () => setStep("payment")}
            />
          )}
          {step === "payment" &&
            (stripeCheckout ? (
              orderError ? (
                <div role="alert" className="rounded-md border border-clay/30 bg-clay/5 p-4 text-sm text-clay">
                  <p className="font-semibold">{orderError}</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={startStripePayment}>
                    Try again
                  </Button>
                </div>
              ) : paymentSession ? (
                <StripePaymentStep
                  clientSecret={paymentSession.clientSecret}
                  total={paymentSession.total}
                  onConfirmed={finishStripePayment}
                />
              ) : (
                <p role="status" className="text-sm text-slate">
                  Preparing secure payment…
                </p>
              )
            ) : (
              <PaymentStep
                busy={false}
                onSubmit={(c) => {
                  setCard(c);
                  setStep("review");
                }}
              />
            ))}
          {!stripeCheckout && step === "review" && selectedAddress && card && (
            <ReviewStep
              address={selectedAddress}
              deliverySpeed={deliverySpeed}
              card={card}
              onEditAddress={() => setStep("address")}
              onEditDelivery={() => setStep("delivery")}
              onEditPayment={() => setStep("payment")}
              onPlaceOrder={handleMockPlaceOrder}
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
