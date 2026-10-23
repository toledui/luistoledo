"use client";
import {
  CurrencyAttribution,
  CurrencySelector,
  useCurrencyQuote,
} from "./currency-context";
export function OrderCurrencyPayment({
  amount,
  busy,
  onPay,
}: {
  amount: number;
  busy: boolean;
  onPay: (token?: string) => void;
}) {
  const { quote, error, enabled } = useCurrencyQuote(amount);
  return (
    <div>
      <CurrencySelector disabled={busy} />
      {quote && (
        <p>
          A pagar en Stripe: <strong>{quote.formatted}</strong>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        disabled={busy || (enabled && !quote)}
        onClick={() => {
          if (!enabled || (quote && quote.exp > Date.now()))
            onPay(quote?.token);
        }}
      >
        {busy ? "Preparando pago…" : "Completar pago"}
      </button>
      <CurrencyAttribution />
    </div>
  );
}
