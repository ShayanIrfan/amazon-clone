import { useState } from "react";
import { useNavigate } from "react-router";
import { useAddresses } from "../hooks/useAddresses";
import { useOrderQuote, usePlaceOrder } from "../hooks/useOrders";
import { useCart } from "../context/CartContext";
import AddressStep from "../components/checkout/AddressStep";
import DeliveryStep from "../components/checkout/DeliveryStep";
import PaymentStep from "../components/checkout/PaymentStep";
import ReviewStep from "../components/checkout/ReviewStep";
import OrderSummary from "../components/checkout/OrderSummary";
import ErrorState from "../components/common/ErrorState";
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

  const { data: quote, isLoading: quoteLoading, isError: quoteError } = useOrderQuote(deliverySpeed);
  const placeOrder = usePlaceOrder();

  const selectedAddress = addressData?.items.find((a) => a._id === addressId) ?? null;

  if (quoteError) {
    return <ErrorState message="Couldn't load your checkout details." />;
  }

  if (quote && quote.itemCount === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-16 text-center">
        <h1 className="text-xl font-bold text-neutral-900">Your cart is empty</h1>
        <p className="text-neutral-600">Add something to your cart before checking out.</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-2 rounded-full bg-amazon-yellow px-6 py-2 text-sm font-medium text-neutral-900 hover:brightness-95"
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-4">
      <h1 className="text-2xl font-medium text-neutral-900">Checkout</h1>
      <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_280px]">
        <div className="space-y-4">
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
