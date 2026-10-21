import { permanentRedirect } from "next/navigation";

// Keep a route fallback for bookmarked links and generated development types.
// next.config.ts applies the same 308 before routing and preserves query strings.
export default function PreviousPrivacyPage() {
  permanentRedirect("/aviso-de-privacidad");
}
