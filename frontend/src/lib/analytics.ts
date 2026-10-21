import { privacy } from "./privacy";
export type Consent = {
  analytics: boolean;
  advertising: boolean;
  version: string;
  at: number;
};
export type AnalyticsConfig = {
  enabled: boolean;
  gtmId?: string;
  gaMeasurementId?: string;
  metaPixelId?: string;
  consentVersion: string;
};
export type CommerceItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
};
export type EventParams = {
  value?: number;
  currency?: string;
  itemId?: string;
  itemName?: string;
  items?: CommerceItem[];
};
type Session = {
  id: string;
  visitor: string;
  last: number;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  referrer?: string;
  entryPath: string;
};
type Pixel = ((...args: unknown[]) => void) & {
  queue: unknown[][];
  callMethod?: (...args: unknown[]) => void;
  push?: Pixel;
  loaded: boolean;
  version: string;
};
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: Pixel;
    _fbq?: Pixel;
  }
}
const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const consentKey = "lta_consent_v1";
const sessionKey = "lta_analytics_session_v1";
let config: AnalyticsConfig | null = null;
let current: Session | null = null;
let ready: Promise<void> = Promise.resolve();
let lastPage = "";
let lastRegistration = { id: "", at: 0 };
const serverSeen = new Set<string>();
const metaNames: Record<string, string> = {
  page_view: "PageView",
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  sign_up: "CompleteRegistration",
  generate_lead: "Lead",
  purchase: "Purchase",
};
export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const c = JSON.parse(
      localStorage.getItem(consentKey) || "null",
    ) as Consent | null;
    return c &&
      typeof c.analytics === "boolean" &&
      typeof c.advertising === "boolean" &&
      c.version === privacy.consentVersion &&
      Date.now() - c.at < 180 * 86400000
      ? c
      : null;
  } catch {
    return null;
  }
}
export function publicPath(path: string) {
  return path
    .split(/[?#]/)[0]
    .replace(/(\/certificados\/verificar\/)[^/]+/, "$1[code]");
}
function allowed() {
  return (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/admin") &&
    !!config?.enabled
  );
}
export function canTrack() {
  const c = readConsent();
  return allowed() && !!c && (c.analytics || c.advertising);
}
function cookie(name: string) {
  return document.cookie
    .split("; ")
    .find((v) => v.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
function loadScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  script.addEventListener("load", () => {
    const c = readConsent();
    if (allowed() && c && (c.analytics || c.advertising))
      void registerSession(c, true).catch(() => undefined);
  });
  document.head.appendChild(script);
}
function googleConsent(c: Consent) {
  window.dataLayer ||= [];
  // Google processes the native Arguments object as a command, unlike a data-layer event object.
  window.gtag ||= function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("consent", "update", {
    analytics_storage: c.analytics ? "granted" : "denied",
    ad_storage: c.advertising ? "granted" : "denied",
    ad_user_data: c.advertising ? "granted" : "denied",
    ad_personalization: c.advertising ? "granted" : "denied",
  });
}
function scripts(c: Consent) {
  googleConsent(c);
  if (c.analytics && config?.gtmId) {
    window.dataLayer!.push({ ga_measurement_id: config.gaMeasurementId });
    if (!document.getElementById("lta-gtm"))
      window.dataLayer!.push({ "gtm.start": Date.now(), event: "gtm.js" });
    loadScript(
      "lta-gtm",
      `https://www.googletagmanager.com/gtm.js?id=${config.gtmId}`,
    );
  } else if (c.analytics && config?.gaMeasurementId) {
    const first = !document.getElementById("lta-ga4");
    loadScript(
      "lta-ga4",
      `https://www.googletagmanager.com/gtag/js?id=${config.gaMeasurementId}`,
    );
    if (first) {
      window.gtag!("js", new Date());
      window.gtag!("config", config.gaMeasurementId, {
        send_page_view: false,
        page_location: location.origin + publicPath(location.pathname),
        page_referrer: safeReferrer(),
      });
    }
  }
  // Avoid loading the browser pixel on token-bearing account/payment pages.
  const sensitive =
    /(?:token|session_id|code)=/i.test(location.search) ||
    /\/(verificar-email|restablecer-contrasena|certificados\/verificar)/.test(
      location.pathname,
    );
  if (c.advertising && config?.metaPixelId && !sensitive) {
    if (!window.fbq) {
      const pixel: Pixel = Object.assign(
        function (...args: unknown[]) {
          if (pixel.callMethod) pixel.callMethod(...args);
          else pixel.queue.push(args);
        },
        { queue: [] as unknown[][], loaded: true, version: "2.0" },
      );
      pixel.push = pixel;
      window.fbq = pixel;
      window._fbq = pixel;
      pixel("set", "autoConfig", false, config.metaPixelId);
      pixel("consent", "grant");
      pixel("init", config.metaPixelId);
      loadScript("lta-meta", "https://connect.facebook.net/en_US/fbevents.js");
    } else window.fbq("consent", "grant");
  }
}
function safeReferrer() {
  try {
    const u = new URL(document.referrer);
    return u.origin === location.origin ? "" : u.origin;
  } catch {
    return "";
  }
}
function session(): Session {
  if (current && Date.now() - current.last < 30 * 60000) {
    current.last = Date.now();
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(current));
    } catch {}
    return current;
  }
  try {
    const stored = JSON.parse(
      sessionStorage.getItem(sessionKey) || "null",
    ) as Session | null;
    if (stored && Date.now() - stored.last < 30 * 60000) {
      current = stored;
      return session();
    }
  } catch {}
  let visitor = crypto.randomUUID() as string;
  try {
    visitor = localStorage.getItem("lta_visitor_v1") || visitor;
    localStorage.setItem("lta_visitor_v1", visitor);
  } catch {}
  const p = new URLSearchParams(location.search);
  current = {
    id: crypto.randomUUID(),
    visitor,
    last: Date.now(),
    entryPath: publicPath(location.pathname),
    referrer: safeReferrer(),
    source: p.get("utm_source")?.slice(0, 150) || undefined,
    medium: p.get("utm_medium")?.slice(0, 100) || undefined,
    campaign: p.get("utm_campaign")?.slice(0, 150) || undefined,
    term: p.get("utm_term")?.slice(0, 150) || undefined,
  };
  try {
    sessionStorage.setItem(sessionKey, JSON.stringify(current));
  } catch {}
  return current;
}
async function post(path: string, body: unknown) {
  const response = await fetch(`${api}/analytics/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Analytics unavailable");
}
async function registerSession(c: Consent, force = false) {
  const s = session();
  if (
    !force &&
    lastRegistration.id === s.id &&
    Date.now() - lastRegistration.at < 10000
  )
    return;
  const ga = cookie("_ga")?.match(/^GA\d\.\d\.(\d+\.\d+)$/)?.[1];
  // gtag get uses the actual GA session; never fabricate a GA client ID.
  let gaClientId = ga;
  let gaSessionId: string | undefined;
  const began = Date.now();
  if (c.analytics && config?.gaMeasurementId && window.gtag) {
    await Promise.race([
      new Promise<void>((resolve) => {
        window.gtag!(
          "get",
          config!.gaMeasurementId,
          "client_id",
          (value: string) => {
            if (/^[\d.]+$/.test(value)) gaClientId = value;
          },
        );
        window.gtag!(
          "get",
          config!.gaMeasurementId,
          "session_id",
          (value: string | number) => {
            if (/^\d+$/.test(String(value))) gaSessionId = String(value);
            if (
              Date.now() - began >= 800 &&
              gaClientId &&
              gaSessionId &&
              current?.id === s.id &&
              readConsent()?.at === c.at &&
              allowed()
            )
              void post("session", {
                sessionId: s.id,
                visitorId: s.visitor,
                analyticsConsent: c.analytics,
                advertisingConsent: c.advertising,
                path: s.entryPath,
                gaClientId,
                gaSessionId,
              }).catch(() => undefined);
            resolve();
          },
        );
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 800)),
    ]);
  }
  const fbp = c.advertising ? cookie("_fbp") : undefined;
  const fbclid = c.advertising
    ? new URLSearchParams(location.search).get("fbclid")
    : null;
  const fbc = c.advertising
    ? cookie("_fbc") ||
      (fbclid && /^[\w-]+$/.test(fbclid) && fbclid.length < 180
        ? `fb.1.${Date.now()}.${fbclid}`
        : undefined)
    : undefined;
  await post("session", {
    sessionId: s.id,
    visitorId: s.visitor,
    analyticsConsent: c.analytics,
    advertisingConsent: c.advertising,
    path: s.entryPath,
    referrer: s.referrer,
    source: s.source,
    medium: s.medium,
    campaign: s.campaign,
    term: s.term,
    gaClientId,
    gaSessionId,
    fbp,
    fbc,
  });
  lastRegistration = { id: s.id, at: Date.now() };
}
export async function initializeAnalytics(value: AnalyticsConfig) {
  config = value;
  const c = readConsent();
  if (!allowed() || !c || (!c.analytics && !c.advertising)) return;
  scripts(c);
  ready = registerSession(c).catch(() => undefined);
  await ready;
  window.dispatchEvent(new Event("lta:analytics-ready"));
}
export async function setConsent(analytics: boolean, advertising: boolean) {
  const prior = readConsent();
  const c: Consent = {
    analytics,
    advertising,
    version: privacy.consentVersion,
    at: Date.now(),
  };
  // Revoke every session for this visitor on this browser, including other open tabs.
  if (config?.enabled && prior && (prior.analytics || prior.advertising)) {
    const s = session();
    await post("session", {
      sessionId: s.id,
      visitorId: s.visitor,
      analyticsConsent: false,
      advertisingConsent: false,
      path: publicPath(location.pathname),
    }).catch(() => undefined);
  }
  lastRegistration = { id: "", at: 0 };
  try {
    localStorage.setItem(consentKey, JSON.stringify(c));
    sessionStorage.removeItem(sessionKey);
    if (!analytics && !advertising) localStorage.removeItem("lta_visitor_v1");
  } catch {}
  current = null;
  lastPage = "";
  googleConsent(c);
  if (!advertising) window.fbq?.("consent", "revoke");
  if (!analytics || !advertising) {
    for (const name of document.cookie
      .split(";")
      .map((v) => v.trim().split("=")[0])) {
      if (
        (!analytics && /^_ga/.test(name)) ||
        (!advertising && /^_fb[cp]$|^_gcl_/.test(name))
      ) {
        for (const domain of [
          "",
          location.hostname,
          `.${location.hostname.split(".").slice(-2).join(".")}`,
        ])
          document.cookie = `${name}=; Max-Age=0; path=/;${domain ? ` domain=${domain};` : ""} SameSite=Lax`;
      }
    }
  }
  window.dispatchEvent(new Event("lta:consent"));
  if (config) await initializeAnalytics(config);
}
export async function analyticsHeaders(): Promise<Record<string, string>> {
  if (!allowed()) return {};
  const c = readConsent();
  if (!c || (!c.analytics && !c.advertising)) return {};
  await ready;
  // Refresh identifiers after GA / Meta scripts finish and persist consent before business requests.
  await registerSession(c).catch(() => undefined);
  return { "x-lta-session": session().id };
}
export function externalEvent(
  name: string,
  eventId: string,
  params: EventParams = {},
  server = false,
) {
  const c = readConsent();
  if (!allowed() || !c) return;
  const ecommerce = {
    currency: params.currency || "MXN",
    ...(params.value !== undefined ? { value: params.value } : {}),
    ...(params.items
      ? { items: params.items }
      : params.itemId
        ? {
            items: [
              {
                item_id: params.itemId,
                item_name: params.itemName,
                quantity: 1,
                price: params.value,
              },
            ],
          }
        : {}),
  };
  const values = {
    event_id: eventId,
    page_location: location.origin + publicPath(location.pathname),
    page_referrer: safeReferrer(),
    ...ecommerce,
  };
  // Server-confirmed conversions go to GA4 exclusively through Measurement Protocol.
  if (c.analytics && !server) {
    if (config?.gtmId) {
      window.dataLayer ||= [];
      window.dataLayer.push({ ecommerce: null });
      window.dataLayer.push({
        event: "lta_event",
        event_name: name,
        ...values,
        ecommerce,
      });
    } else if (config?.gaMeasurementId) window.gtag?.("event", name, values);
  }
  const sensitive =
    /(?:token|session_id|code|email|password)=/i.test(location.search) ||
    /\/(verificar-email|restablecer-contrasena|certificados\/verificar)/.test(
      location.pathname,
    );
  if (c.advertising && metaNames[name] && !sensitive)
    window.fbq?.(
      "track",
      metaNames[name],
      {
        ...ecommerce,
        content_ids:
          params.items?.map((item) => item.item_id) ||
          (params.itemId ? [params.itemId] : undefined),
        content_type: "product",
      },
      { eventID: eventId },
    );
}
export async function trackEvent(name: string, params: EventParams = {}) {
  const c = readConsent();
  if (!allowed() || !c || (!c.analytics && !c.advertising)) return;
  await ready;
  if (!canTrack()) return;
  await registerSession(c).catch(() => undefined);
  if (readConsent()?.at !== c.at) return;
  const s = session();
  const id = crypto.randomUUID();
  if (c.analytics)
    await post("events", {
      sessionId: s.id,
      eventId: id,
      name,
      path: publicPath(location.pathname),
      ...params,
    }).catch(() => undefined);
  externalEvent(name, id, params);
  if (name === "page_view" && c.analytics && config?.gaMeasurementId)
    setTimeout(() => {
      if (allowed() && readConsent()?.at === c.at)
        void registerSession(c, true).catch(() => undefined);
    }, 1000);
}
export function trackPage() {
  const c = readConsent();
  if (!allowed() || !c || (!c.analytics && !c.advertising)) return;
  const key = `${session().id}:${location.pathname}`;
  if (lastPage === key) return;
  lastPage = key;
  void trackEvent("page_view");
}
export function confirmedBrowserEvent(value: unknown) {
  if (!value || typeof value !== "object") return;
  const event = (
    value as { analyticsEvent?: { name: string; eventId: string } }
  ).analyticsEvent;
  if (!event || serverSeen.has(event.eventId)) return;
  serverSeen.add(event.eventId);
  externalEvent(event.name, event.eventId, {}, true);
}
export function openConsentPreferences() {
  window.dispatchEvent(new Event("lta:preferences"));
}
