"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import styles from "./currency.module.css";

export type Quote = {
  base: string;
  currency: string;
  amount: number;
  formatted: string;
  token: string;
  exp: number;
  at: number;
  source: string;
};
type Options = {
  currencies: string[];
  defaultCurrency: string;
  country: string | null;
  unavailable?: boolean;
};
type CurrencyContextValue = {
  currency: string;
  currencies: string[];
  unavailable: boolean;
  ready: boolean;
  locked: boolean;
  lockCurrency: (locked: boolean) => void;
  setCurrency: (currency: string) => void;
  getQuote: (amount: number, currency?: string) => Promise<Quote>;
};
const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const storageKey = "lta_currency_v1";
// Display order for the website; Stripe and exchange-rate availability still apply.
const websiteCurrencies = [
  "MXN", "USD", "CAD", "BRL", "ARS", "CLP", "COP", "PEN", "UYU",
  "PYG", "BOB", "CRC", "GTQ", "HNL", "NIO", "DOP", "EUR",
];
const cache = new Map<string, { promise: Promise<Quote>; until: number }>();

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setSelected] = useState("MXN");
  const [locked, lockCurrency] = useState(false);
  const [ready, setReady] = useState(false);
  const [options, setOptions] = useState<Options>({
    currencies: ["MXN"],
    defaultCurrency: "MXN",
    country: null,
  });
  useEffect(() => {
    let active = true;
    void apiFetch<Options>("/payments/currencies", { cache: "no-store" })
      .then((value) => {
        if (!active) return;
        const currencies = websiteCurrencies.filter((code) => value.currencies.includes(code));
        setOptions({ ...value, currencies });
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(storageKey);
        } catch {}
        setSelected(
          saved && currencies.includes(saved)
            ? saved
            : currencies.includes(value.defaultCurrency) ? value.defaultCurrency : "MXN",
        );
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setOptions({
            currencies: ["MXN"],
            defaultCurrency: "MXN",
            country: null,
            unavailable: true,
          });
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const setCurrency = useCallback(
    (value: string) => {
      if (locked || !options.currencies.includes(value)) return;
      setSelected(value);
      try {
        localStorage.setItem(storageKey, value);
      } catch {}
    },
    [options.currencies, locked],
  );
  const getQuote = useCallback(
    (amount: number, target = currency) => {
      const base = Number(amount.toFixed(2));
      const key = `${target}:${base}`;
      const existing = cache.get(key);
      if (existing && existing.until > Date.now()) return existing.promise;
      if (cache.size > 500) cache.clear();
      const promise = apiFetch<Quote>("/payments/currency-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMxn: base, currency: target }),
        cache: "no-store",
      });
      const entry = { promise, until: Date.now() + 5 * 60_000 };
      cache.set(key, entry);
      void promise
        .then((result) => {
          entry.until = Math.min(entry.until, result.exp - 30000);
        })
        .catch(() => {
          cache.delete(key);
        });
      return promise;
    },
    [currency],
  );
  const value = useMemo(
    () => ({
      currency,
      currencies: options.currencies,
      unavailable: !!options.unavailable,
      ready,
      locked,
      lockCurrency,
      setCurrency,
      getQuote,
    }),
    [currency, options, setCurrency, getQuote, locked, ready],
  );
  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}
export function useCurrency() {
  return useContext(CurrencyContext);
}
export function useCurrencyQuote(
  amount: number,
  target?: string,
  quoteForMxn = true,
) {
  const context = useCurrency();
  const currency = target ?? context?.currency ?? "MXN";
  const getQuote = context?.getQuote;
  const ready = context?.ready;
  const [result, setResult] = useState<{
    quote?: Quote;
    error?: string;
    key: string;
  }>({ key: "" });
  const [refresh, setRefresh] = useState(0);
  const key = `${currency}:${Number(amount).toFixed(2)}`;
  useEffect(() => {
    if (
      !getQuote ||
      !ready ||
      (!quoteForMxn && currency === "MXN") ||
      !Number.isFinite(amount) ||
      amount < 0
    )
      return;
    let active = true;
    void getQuote(amount, currency)
      .then((quote) => {
        if (active) setResult({ quote, key });
      })
      .catch((e: unknown) => {
        if (active)
          setResult({
            key,
            error:
              e instanceof Error
                ? e.message
                : "No fue posible convertir el precio.",
          });
      });
    const timer = window.setTimeout(() => setRefresh((n) => n + 1), 4 * 60_000);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [amount, currency, getQuote, key, refresh, ready, quoteForMxn]);
  const quote = result.key === key && result.quote ? result.quote : undefined;
  return {
    quote,
    error: result.key === key ? result.error : undefined,
    currency,
    enabled: !!context,
  };
}
export function CurrencySelector({ disabled = false }: { disabled?: boolean }) {
  const context = useCurrency();
  if (!context) return null;
  return <CurrencyPicker context={context} disabled={disabled} />;
}

const normalizeSearch = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");

function CurrencyPicker({ context, disabled }: {
  context: CurrencyContextValue;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<{
    left: number; top?: number; bottom?: number; maxHeight: number;
  }>({ left: 12, top: 80, maxHeight: 400 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const blocked = disabled || context.locked || !context.ready;
  const expanded = open && !blocked;
  const options = useMemo(() => {
    const names = new Intl.DisplayNames(["es"], { type: "currency" });
    return context.currencies.map((code) => ({ code, name: names.of(code) ?? code }));
  }, [context.currencies]);
  const filtered = options.filter(({ code, name }) =>
    normalizeSearch(`${code} ${name}`).includes(normalizeSearch(search.trim())),
  );
  const updatePosition = useCallback(() => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(320, window.innerWidth - 24);
    const below = window.innerHeight - rect.bottom - 20;
    const above = rect.top - 20;
    const openAbove = below < 220 && above > below;
    setPosition({
      left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
      top: openAbove ? undefined : rect.bottom + 8,
      bottom: openAbove ? window.innerHeight - rect.top + 8 : undefined,
      maxHeight: Math.max(120, Math.min(400, openAbove ? above : below)),
    });
  }, []);
  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  };
  const select = (code: string) => {
    context.setCurrency(code);
    close(true);
  };
  const show = () => {
    setSearch("");
    setActive(Math.max(0, options.findIndex(({ code }) => code === context.currency)));
    updatePosition();
    setOpen(true);
  };
  useEffect(() => {
    if (!expanded) return;
    input.current?.focus();
    const outside = (event: PointerEvent | FocusEvent) => {
      const target = event.target as Node | null;
      if (!trigger.current?.contains(target) && !panel.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [expanded, updatePosition]);
  useEffect(() => {
    if (expanded) {
      document.getElementById(`${id}-option-${active}`)?.scrollIntoView?.({ block: "nearest" });
    }
  }, [active, expanded, id, search]);
  return (
    <div className={styles.selector}>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-label={`Moneda de pago: ${context.currency}`}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-controls={expanded ? `${id}-panel` : undefined}
        disabled={blocked}
        onClick={() => expanded ? close() : show()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          }
        }}
      >
        {context.currency}<ChevronDown size={14} aria-hidden="true" />
      </button>
      {expanded && createPortal(
        <div
          ref={panel}
          id={`${id}-panel`}
          role="dialog"
          aria-label="Seleccionar moneda"
          className={styles.panel}
          style={position}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close(true);
            }
          }}
        >
          <div className={styles.search}>
            <Search size={16} aria-hidden="true" />
            <input
              ref={input}
              role="combobox"
              aria-label="Buscar moneda"
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls={`${id}-list`}
              aria-activedescendant={filtered[active] ? `${id}-option-${active}` : undefined}
              placeholder="Buscar moneda…"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setActive(0); }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const step = event.key === "ArrowDown" ? 1 : -1;
                  setActive((current) => Math.max(0, Math.min(filtered.length - 1, current + step)));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  if (filtered[active]) select(filtered[active].code);
                }
              }}
            />
          </div>
          <div id={`${id}-list`} role="listbox" aria-label="Monedas disponibles" className={styles.list}>
            {filtered.map(({ code, name }, index) => (
              <div
                key={code}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={code === context.currency}
                className={`${styles.option} ${index === active ? styles.active : ""}`}
                onPointerMove={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(code)}
              >
                <strong>{code}</strong><span>{name}</span>
                {code === context.currency && <Check size={16} aria-hidden="true" />}
              </div>
            ))}
          </div>
          {!filtered.length && <p className={styles.message} role="status">No se encontraron monedas.</p>}
          {context.unavailable && <p className={styles.message} role="status">Conversión no disponible por el momento.</p>}
        </div>, document.body,
      )}
    </div>
  );
}
export function CurrencyPrice({ amount }: { amount: number | string }) {
  const { quote, currency, error } = useCurrencyQuote(
    Number(amount),
    undefined,
    false,
  );
  if (currency === "MXN")
    return <>${Number(amount).toLocaleString("es-MX")} MXN</>;
  if (error) return <span title={error}>Conversión no disponible</span>;
  return <>{quote?.formatted ?? "Calculando…"}</>;
}
export function CurrencyAttribution() {
  const currency = useCurrency()?.currency ?? "MXN";
  return currency !== "MXN" ? (
    <small className={styles.source}>
      Tipo de cambio diario de{" "}
      <a
        href="https://www.exchangerate-api.com"
        target="_blank"
        rel="noreferrer"
      >
        ExchangeRate-API
      </a>
      . El total se confirma antes de pagar.
    </small>
  ) : null;
}
export function formatChargedCurrency(amount: string | number, currency: string) {
  const zero = ['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','VND','VUV','XAF','XOF','XPF'].includes(currency.toUpperCase());
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, currencyDisplay: 'code' }).format(Number(amount) / (zero ? 1 : 100));
}
