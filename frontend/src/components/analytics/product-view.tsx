"use client";
import { useEffect, useRef } from "react";
import {
  canTrack,
  readConsent,
  trackEvent,
  type CommerceItem,
} from "@/lib/analytics";
export function ProductView({
  id,
  title,
  value,
}: {
  id: string;
  title: string;
  value: number;
}) {
  const sent = useRef("");
  useEffect(() => {
    const send = () => {
      const key = `${id}.${readConsent()?.at}`;
      if (!canTrack() || sent.current === key) return;
      sent.current = key;
      void trackEvent("view_item", {
        itemId: id,
        itemName: title.slice(0, 100),
        value,
        currency: "MXN",
      });
    };
    send();
    window.addEventListener("lta:analytics-ready", send);
    return () => window.removeEventListener("lta:analytics-ready", send);
  }, [id, title, value]);
  return null;
}
export function CheckoutEvent({
  items,
  value,
}: {
  items: CommerceItem[];
  value: number;
}) {
  const sent = useRef("");
  const serialized = JSON.stringify(items);
  useEffect(() => {
    const send = () => {
      const key = String(readConsent()?.at);
      if (!canTrack() || sent.current === key) return;
      sent.current = key;
      void trackEvent("begin_checkout", {
        items: JSON.parse(serialized) as CommerceItem[],
        value,
        currency: "MXN",
      });
    };
    send();
    window.addEventListener("lta:analytics-ready", send);
    return () => window.removeEventListener("lta:analytics-ready", send);
  }, [serialized, value]);
  return null;
}
