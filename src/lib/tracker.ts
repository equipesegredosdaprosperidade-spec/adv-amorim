// Lightweight Pixel-style tracker stored in localStorage.
export type TrackEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase"
  | "Contact"
  | "Click"
  | "WhatsAppClick";

export interface TrackEvent {
  name: TrackEventName;
  ts: number;
  path: string;
  device: "mobile" | "tablet" | "desktop";
  lang: string;
  meta?: Record<string, unknown>;
}

const KEY = "site_tracker_events_v1";
// No cap on stored events — user requirement: never hide or trim data.
// (localStorage quota ~5MB still applies; we guard against quota errors on write.)

// Configurable economics for ROI/CTR
const ROI_KEY = "site_roi_config";
// costPerVisit is derived from Pixel (CPM ÷ 1000). pixelDriven must be true to show "Custo estimado".
export type RoiConfig = { valuePerConversion: number; costPerVisit: number; pixelDriven: boolean };
export const DEFAULT_ROI: RoiConfig = { valuePerConversion: 0, costPerVisit: 0, pixelDriven: false };
export function getRoiConfig(): RoiConfig {
  if (typeof window === "undefined") return DEFAULT_ROI;
  try { return { ...DEFAULT_ROI, ...JSON.parse(localStorage.getItem(ROI_KEY) || "{}") }; }
  catch { return DEFAULT_ROI; }
}
export function setRoiConfig(c: RoiConfig) {
  localStorage.setItem(ROI_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event("tracker-update"));
}

function deviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function getEvents(): TrackEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearEvents() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("tracker-update"));
}

export function track(name: TrackEventName, meta?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const evts = getEvents();
  evts.push({
    name,
    ts: Date.now(),
    path: window.location.pathname + window.location.hash,
    device: deviceType(),
    lang: navigator.language || "pt-BR",
    meta,
  });
  try {
    localStorage.setItem(KEY, JSON.stringify(evts));
  } catch {
    // Quota exceeded — drop oldest 10% and retry once, never wipe everything.
    const drop = Math.max(1, Math.floor(evts.length * 0.1));
    evts.splice(0, drop);
    try { localStorage.setItem(KEY, JSON.stringify(evts)); } catch { /* ignore */ }
  }
  // Forward to Meta Pixel (fbq) when present. Standard event names map 1:1;
  // custom names (WhatsAppClick) go through trackCustom.
  try {
    const w = window as unknown as { fbq?: (...args: unknown[]) => void };
    if (typeof w.fbq === "function") {
      const standard = new Set([
        "PageView","ViewContent","AddToCart","InitiateCheckout",
        "AddPaymentInfo","Purchase","Contact",
      ]);
      if (standard.has(name)) w.fbq("track", name, meta || {});
      else w.fbq("trackCustom", name, meta || {});
    }
  } catch { /* ignore pixel failures */ }
  window.dispatchEvent(new Event("tracker-update"));
}

/**
 * Always fire WhatsAppClick (specific) + Contact + InitiateCheckout for
 * WhatsApp clicks, on every route/page that uses this helper. The
 * conversion-rate denominator in computeMetrics() is total PageView
 * (site visits), so Contact / PageView * 100 is the WhatsApp click rate.
 */
export function trackContact(source: string, channel: string = "whatsapp") {
  const meta = { source, channel, path: typeof window !== "undefined" ? window.location.pathname : "" };
  track("WhatsAppClick", meta);
  track("Contact", meta);
  track("InitiateCheckout", meta);
}

export function filterByRange(events: TrackEvent[], from: number, to: number) {
  return events.filter((e) => e.ts >= from && e.ts <= to);
}

export type RangeKey = "today" | "7d" | "30d" | "all" | "custom";
export function rangeBounds(key: RangeKey, customFrom?: number, customTo?: number): { from: number; to: number } {
  const now = Date.now();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  switch (key) {
    case "today": return { from: startOfDay.getTime(), to: now };
    case "7d": return { from: now - 7 * 86400000, to: now };
    case "30d": return { from: now - 30 * 86400000, to: now };
    case "all": return { from: 0, to: now };
    case "custom": return { from: customFrom ?? 0, to: customTo ?? now };
  }
}

/**
 * CTR / conversion / ROI computations.
 *
 * AUDIT: `visits` is ALWAYS counts.PageView (every page view recorded
 * in localStorage by every route), independent of Pixel state. So the
 * conversion-rate denominator is always total site visits — even when
 * the Meta Pixel is disabled, has no ID, or is only partially configured.
 * `contacts` is every WhatsApp click (Contact event fired by trackContact).
 *   conversion = contacts / total-site-visits * 100
 * `cost` / `cpm` are the ONLY values gated on `pixelDriven`.
 */
export function computeMetrics(events: TrackEvent[]) {
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.name] = (counts[e.name] || 0) + 1;
  const visits = counts.PageView || 0; // total site visits (Pixel-independent)
  const contacts = counts.Contact || 0; // WhatsApp clicks
  const clicks = (counts.Click || 0) + contacts;
  const purchases = counts.Purchase || 0;
  const cfg = getRoiConfig();
  const conversion = visits ? (contacts / visits) * 100 : 0;
  const ctr = visits ? (clicks / visits) * 100 : 0;
  const revenue = (purchases || contacts) * cfg.valuePerConversion;
  // Only show cost when the data came from the Pixel.
  const cost = cfg.pixelDriven ? visits * cfg.costPerVisit : 0;
  const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
  // cpm = cost per mille (per 1000 views)
  const cpm = cfg.pixelDriven ? cfg.costPerVisit * 1000 : 0;
  return { visits, contacts, clicks, purchases, conversion, ctr, revenue, cost, roi, cpm, counts, pixelDriven: cfg.pixelDriven };
}
