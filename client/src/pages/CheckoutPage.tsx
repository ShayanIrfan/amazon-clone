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
import Stepper from "../components/checkout/Stepper";
import ErrorState from "../components/ui/ErrorState";
import PageLoader from "../components/ui/PageLoader";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
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
  const { refresh: refreshCart, flush: flushCart, syncing: cartSyncing, version: cartVersion } = useCart();
  const { data: addressData } = useAddresses();
  const paymentsConfig = usePaymentsConfig();
  const stripeCheckout = paymentsConfig.data?.provider === "stripe";

  const [step, setStep] = useState<Step>("address");
  const [addressId, setAddressId] = useState<string | null>(null);
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>("standard");
  const [card, setCard] = useState<CardInput | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);

  // The quote prices the server's copy of the cart, so it waits for any
  // in-flight cart writes (e.g. "Buy Now" adds the item and navigates here at once).
  const {
    data: quote,
    isLoading: quoteLoading,
    isPlaceholderData: quoteIsPlaceholder,
    isError: quoteError,
    refetch: refetchQuote,
  } = useOrderQuote(deliverySpeed, cartVersion, !cartSyncing);
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

  // Only trust "empty" from a quote of the fully synced cart, never a placeholder.
  if (!cartSyncing && quote && !quoteIsPlaceholder && quote.itemCount === 0) {
    return (
      <div className="page-shell flex min-h-[52vh] flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="eyebrow">Checkout</p>
        <h1 className="page-title text-ink">Your cart is empty</h1>
        <p className="muted">Add something to your cart before checking out.</p>
        <button
          type="button"
          onClick={() => navigate("/search")}
          className="mt-2 rounded-full bg-harbor px-6 py-2.5 text-sm font-semibold text-white hover:bg-harbor-dark"
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
      await flushCart();
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
      await flushCart();
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

  function goToStep(index: number) {
    setOrderError(null);
    setStep(steps[index].key);
  }

  return (
    <div className="page-shell py-8">
      <PageHeader eyebrow={stripeCheckout ? "Secure checkout" : "Secure demo checkout"} title="Checkout" />
      <div className="mt-6 rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
        <Stepper steps={steps} active={activeStep} onGoTo={goToStep} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel className="p-5 sm:p-6">
          {activeStep > 0 && (
            <button
              type="button"
              onClick={() => goToStep(activeStep - 1)}
              className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-harbor hover:underline"
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
                <div role="alert" className="rounded-2xl border border-clay/30 bg-clay/5 p-4 text-sm text-clay">
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
        </Panel>

        <div className="lg:sticky lg:top-36 lg:h-fit">
          <OrderSummary quote={quote} isLoading={cartSyncing || quoteLoading} />
        </div>
      </div>
    </div>
  );
}
