export function cleanPath(path: string) {
  // Never persist query strings, fragments, verification tokens or certificate codes.
  const result = path.split(/[?#]/)[0].slice(0, 500);
  if (!result.startsWith('/') || result.startsWith('//')) return '/';
  return result.replace(/(\/certificados\/verificar\/)[^/]+/, '$1[code]');
}
export function attribution(input: {
  source?: string;
  medium?: string;
  referrer?: string;
}) {
  if (input.source) {
    const source = input.source.trim().toLowerCase().slice(0, 150);
    const aiSources: Record<string, string> = {
      'chatgpt.com': 'chatgpt',
      'chat.openai.com': 'chatgpt',
      chatgpt: 'chatgpt',
      'gemini.google.com': 'gemini',
      gemini: 'gemini',
      'perplexity.ai': 'perplexity.ai',
      'claude.ai': 'claude.ai',
      'copilot.microsoft.com': 'copilot.microsoft.com',
    };
    return {
      source: aiSources[source] || source,
      medium: input.medium || (aiSources[source] ? 'ai_referral' : 'campaign'),
    };
  }
  let host = '';
  try {
    const url = new URL(input.referrer || '');
    if (/^https?:$/.test(url.protocol)) host = url.hostname.toLowerCase();
  } catch {
    /* missing referrer */
  }
  const matches = (domain: string) =>
    host === domain || host.endsWith(`.${domain}`);
  if (['chatgpt.com', 'chat.openai.com'].some(matches))
    return { source: 'chatgpt', medium: 'ai_referral' };
  if (matches('gemini.google.com'))
    return { source: 'gemini', medium: 'ai_referral' };
  if (['perplexity.ai', 'claude.ai', 'copilot.microsoft.com'].some(matches))
    return { source: host, medium: 'ai_referral' };
  if (/^(www\.)?google\.[a-z.]+$/.test(host))
    return { source: 'google', medium: 'organic' };
  if (matches('bing.com')) return { source: 'bing', medium: 'organic' };
  if (
    [
      'facebook.com',
      'instagram.com',
      't.co',
      'linkedin.com',
      'youtube.com',
    ].some(matches)
  )
    return { source: host, medium: 'social' };
  return host
    ? { source: host, medium: 'referral' }
    : { source: 'direct', medium: 'none' };
}
export const metaEvents: Record<string, string> = {
  page_view: 'PageView',
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  sign_up: 'CompleteRegistration',
  generate_lead: 'Lead',
  purchase: 'Purchase',
};
