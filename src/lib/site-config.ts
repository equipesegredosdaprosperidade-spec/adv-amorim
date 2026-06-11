// WhatsApp number, admin auth + session, logo override, theme override,
// pixel config, site online/offline, inline content overrides + snapshots.

import { supabase } from "@/integrations/supabase/client";
import { savePublishedSiteState, adminServerLogin } from "@/lib/site-state.functions";

/* ─── Sync status (live indicator for admin + site) ─── */
export type SyncStatus = "idle" | "saving" | "saved" | "error" | "conflict" | "synced";
export type SyncState = { status: SyncStatus; at: number; version: number | null; message?: string };
let _syncState: SyncState = { status: "idle", at: 0, version: null };
export function getSyncState(): SyncState { return _syncState; }
function setSyncState(s: Partial<SyncState>) {
  _syncState = { ..._syncState, ...s, at: Date.now() };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("site-sync-change", { detail: _syncState }));
  }
}
export function onSyncChange(cb: (s: SyncState) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = (e: Event) => cb((e as CustomEvent).detail as SyncState);
  window.addEventListener("site-sync-change", h);
  cb(_syncState);
  return () => window.removeEventListener("site-sync-change", h);
}
let _currentVersion: number | null = null;
export function getCurrentVersion(): number | null { return _currentVersion; }

const WA_KEY = "site_wa_number";
const WA_MSG_KEY = "site_wa_msg";
const ADMIN_SESSION = "admindev_session";
const ADMIN_TOKEN_KEY = "admindev_token";
const LOGO_KEY = "site_logo_dataurl";
const THEME_KEY = "site_theme_override";
const RATE_KEY = "admindev_rate";
const PIXEL_KEY = "site_pixel_cfg";
const ENABLED_KEY = "site_enabled";
const CONTENT_KEY = "site_content_overrides";
const CONTENT_SNAPSHOT_KEY = "site_content_snapshot";
const IMAGE_KEY = "site_image_overrides";
const TEXT_PAIRS_KEY = "site_text_pairs";


export const DEFAULT_WA = "5516993393313";
export const DEFAULT_MSG = "Olá, gostaria de agendar uma consulta.";
export type PublishedSiteState = {
  contentOverrides: ContentMap;
  imageOverrides: ImageMap;
  logoDataUrl: string | null;
  themeOverride: ThemeOverride | null;
  whatsappNumber: string;
  whatsappMessage: string;
  pixelConfig: PixelConfig;
  siteEnabled: boolean;
};

// Admin credentials live ONLY on the server (src/lib/admin-auth.server.ts).
// The client calls the `adminServerLogin` server function which returns an
// HMAC-signed session token; the client only ever stores that token.

export function getWhatsAppNumber(): string {
  if (typeof window === "undefined") return DEFAULT_WA;
  return localStorage.getItem(WA_KEY) || DEFAULT_WA;
}
export function setWhatsAppNumber(n: string) {
  localStorage.setItem(WA_KEY, n.replace(/\D/g, ""));
  window.dispatchEvent(new Event("site-config-change"));
  publishIfAdmin();
}
export function getWhatsAppMessage(): string {
  if (typeof window === "undefined") return DEFAULT_MSG;
  return localStorage.getItem(WA_MSG_KEY) || DEFAULT_MSG;
}
export function setWhatsAppMessage(m: string) {
  localStorage.setItem(WA_MSG_KEY, m);
  window.dispatchEvent(new Event("site-config-change"));
  publishIfAdmin();
}
export function buildWaUrl(): string {
  return `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(getWhatsAppMessage())}`;
}

function parseJson<T>(raw: string | null, fallback: T): T {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

/* ─── Pixel config ─── */
export type PixelConfig = {
  pixelId: string;       // ex.: Meta Pixel ID
  cpmCents: number;      // custo por mil impressões em centavos (0 = desativado)
  enabled: boolean;
};
export const DEFAULT_PIXEL: PixelConfig = { pixelId: "", cpmCents: 0, enabled: false };
export function getPixelConfig(): PixelConfig {
  if (typeof window === "undefined") return DEFAULT_PIXEL;
  try { return { ...DEFAULT_PIXEL, ...JSON.parse(localStorage.getItem(PIXEL_KEY) || "{}") }; }
  catch { return DEFAULT_PIXEL; }
}
export function setPixelConfig(c: PixelConfig) {
  localStorage.setItem(PIXEL_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event("site-config-change"));
  publishIfAdmin();
}

/* ─── Site enabled (on/off) ─── */
export function getSiteEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(ENABLED_KEY);
  return v === null ? true : v === "1";
}
export function setSiteEnabled(on: boolean) {
  localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  window.dispatchEvent(new Event("site-config-change"));
  publishIfAdmin();
}

/* ─── Cross-tab/iframe live sync (BroadcastChannel + window event) ─── */
let _bc: BroadcastChannel | null = null;
function getBC(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!_bc && typeof BroadcastChannel !== "undefined") {
    try { _bc = new BroadcastChannel("site-edits"); } catch { _bc = null; }
  }
  return _bc;
}
export function broadcastSiteEdit(kind: "content" | "image" | "force" = "content") {
  if (typeof window === "undefined") return;
  try { getBC()?.postMessage({ kind, ts: Date.now() }); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent("site-config-change", { detail: { kind } }));
}
export function onSiteEdit(cb: (kind: string) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const ch = getBC();
  const bcHandler = (e: MessageEvent) => cb(e.data?.kind || "content");
  const winHandler = (e: Event) => cb((e as CustomEvent).detail?.kind || "content");
  const storageHandler = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith("site_")) cb("storage");
  };
  ch?.addEventListener("message", bcHandler);
  window.addEventListener("site-config-change", winHandler as EventListener);
  window.addEventListener("storage", storageHandler);
  return () => {
    ch?.removeEventListener("message", bcHandler);
    window.removeEventListener("site-config-change", winHandler as EventListener);
    window.removeEventListener("storage", storageHandler);
  };
}

function getAdminCredentials() {
  if (typeof window === "undefined") return null;
  const adminSession = sessionStorage.getItem(ADMIN_SESSION);
  const adminSignature = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return adminSession && adminSignature ? { adminSession, adminSignature } : null;
}

export function collectPublishedSiteState(): PublishedSiteState {
  return {
    contentOverrides: getContentOverrides(),
    imageOverrides: getImageOverrides(),
    logoDataUrl: getLogoOverride(),
    themeOverride: getThemeOverride(),
    whatsappNumber: getWhatsAppNumber(),
    whatsappMessage: getWhatsAppMessage(),
    pixelConfig: getPixelConfig(),
    siteEnabled: getSiteEnabled(),
  };
}

export function applyPublishedSiteState(state: PublishedSiteState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONTENT_KEY, JSON.stringify(state.contentOverrides || {}));
  localStorage.setItem(IMAGE_KEY, JSON.stringify(state.imageOverrides || {}));
  localStorage.setItem(WA_KEY, state.whatsappNumber || DEFAULT_WA);
  localStorage.setItem(WA_MSG_KEY, state.whatsappMessage || DEFAULT_MSG);
  localStorage.setItem(PIXEL_KEY, JSON.stringify(state.pixelConfig || DEFAULT_PIXEL));
  localStorage.setItem(ENABLED_KEY, state.siteEnabled ? "1" : "0");
  if (state.logoDataUrl) localStorage.setItem(LOGO_KEY, state.logoDataUrl); else localStorage.removeItem(LOGO_KEY);
  if (state.themeOverride) { localStorage.setItem(THEME_KEY, JSON.stringify(state.themeOverride)); applyThemeOverride(state.themeOverride); }
  else { localStorage.removeItem(THEME_KEY); removeThemeOverride(); }
  broadcastSiteEdit("force");
}

function rowToPublishedState(row: any): PublishedSiteState {
  return {
    contentOverrides: row?.content_overrides || {},
    imageOverrides: row?.image_overrides || {},
    logoDataUrl: row?.logo_dataurl || null,
    themeOverride: row?.theme_override || null,
    whatsappNumber: row?.whatsapp_number || DEFAULT_WA,
    whatsappMessage: row?.whatsapp_message || DEFAULT_MSG,
    pixelConfig: { ...DEFAULT_PIXEL, ...(row?.pixel_config || {}) },
    siteEnabled: row?.site_enabled !== false,
  };
}

export async function loadPublishedSiteState() {
  const { data, error } = await (supabase as any)
    .from("site_published_state")
    .select("*")
    .eq("singleton_key", "main")
    .maybeSingle();
  if (error) {
    setSyncState({ status: "error", message: error.message });
    throw new Error(`Falha ao carregar estado publicado: ${error.message}`);
  }
  if (!data) { setSyncState({ status: "synced", version: 0 }); return null; }
  _currentVersion = typeof data.version === "number" ? data.version : 1;
  const state = rowToPublishedState(data);
  applyPublishedSiteState(state);
  setSyncState({ status: "synced", version: _currentVersion });
  return state;
}

export async function publishCurrentState(opts?: { label?: string }) {
  const creds = getAdminCredentials();
  if (!creds) throw new Error("Sessão administrativa expirada. Entre novamente no AdminDev.");
  setSyncState({ status: "saving" });
  const attempt = async (baseVersion: number | null) => {
    return savePublishedSiteState({ data: {
      ...creds, state: collectPublishedSiteState(),
      baseVersion: baseVersion ?? undefined,
      label: opts?.label ?? null,
    } });
  };
  try {
    let res;
    try {
      res = await attempt(_currentVersion);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("CONFLICT:")) {
        // Conflict resolution: reload latest, then retry once with merged base.
        setSyncState({ status: "conflict", message: "Conflito detectado — recarregando última versão e tentando novamente." });
        await loadPublishedSiteState();
        res = await attempt(_currentVersion);
      } else { throw err; }
    }
    _currentVersion = res.version;
    setSyncState({ status: "saved", version: res.version });
    broadcastSiteEdit("force");
    return res;
  } catch (err) {
    setSyncState({ status: "error", message: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

let publishTimer: number | null = null;
function publishIfAdmin() {
  if (typeof window === "undefined" || !isAdminAuthed()) return;
  if (publishTimer !== null) window.clearTimeout(publishTimer);
  publishTimer = window.setTimeout(() => {
    publishTimer = null;
    publishCurrentState().catch((err) => console.error("Falha ao salvar no banco:", err));
  }, 250);
}

export function subscribeToPublishedSiteState(onApply?: () => void) {
  const channel = (supabase as any)
    .channel("site-published-state-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "site_published_state", filter: "singleton_key=eq.main" }, (payload: any) => {
      const row = payload.new;
      _currentVersion = typeof row?.version === "number" ? row.version : _currentVersion;
      applyPublishedSiteState(rowToPublishedState(row));
      setSyncState({ status: "synced", version: _currentVersion });
      onApply?.();
    })
    .subscribe();
  return () => { try { (supabase as any).removeChannel(channel); } catch { /* ignore */ } };
}


/* ─── Inline content overrides (texto editável por clique) ─── */
export type ContentMap = Record<string, string>;
export function getContentOverrides(): ContentMap {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(CONTENT_KEY) || "{}"); } catch { return {}; }
}
export function setContentOverrides(m: ContentMap) {
  localStorage.setItem(CONTENT_KEY, JSON.stringify(m));
  broadcastSiteEdit("content");
  publishIfAdmin();
}
const IMAGE_SNAPSHOT_KEY = "site_image_snapshot";
export async function snapshotContent() {
  // Save text + image overrides together so "Salvar versão" preserves the
  // full visual state. localStorage is persistent across reloads and sessions.
  const curText = localStorage.getItem(CONTENT_KEY) || "{}";
  const curImg = localStorage.getItem(IMAGE_KEY) || "{}";
  localStorage.setItem(CONTENT_SNAPSHOT_KEY, curText);
  localStorage.setItem(IMAGE_SNAPSHOT_KEY, curImg);
  // Also write a timestamped backup (keeps last 5) to protect against accidental wipes.
  try {
    const backups: { ts: number; text: string; img: string }[] = JSON.parse(
      localStorage.getItem("site_content_backups") || "[]"
    );
    backups.push({ ts: Date.now(), text: curText, img: curImg });
    while (backups.length > 5) backups.shift();
    localStorage.setItem("site_content_backups", JSON.stringify(backups));
  } catch { /* ignore */ }
  await publishCurrentState();
}
export function restoreContentSnapshot(): boolean {
  const snap = localStorage.getItem(CONTENT_SNAPSHOT_KEY);
  const snapImg = localStorage.getItem(IMAGE_SNAPSHOT_KEY);
  if (!snap && !snapImg) return false;
  if (snap) localStorage.setItem(CONTENT_KEY, snap);
  if (snapImg) localStorage.setItem(IMAGE_KEY, snapImg);
  broadcastSiteEdit("force");
  return true;
}
export function clearContentOverrides() {
  localStorage.removeItem(CONTENT_KEY);
  localStorage.removeItem(IMAGE_KEY);
  broadcastSiteEdit("force");
  publishIfAdmin();
}

/* ─── Image overrides (troca de imagens via click) ─── */
export type ImageMap = Record<string, string>;
export function getImageOverrides(): ImageMap {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(IMAGE_KEY) || "{}"); } catch { return {}; }
}
export function setImageOverrides(m: ImageMap) {
  try {
    localStorage.setItem(IMAGE_KEY, JSON.stringify(m));
  } catch {
    // localStorage cheio (data URLs grandes) — alerta sem quebrar
    alert("Não foi possível salvar a imagem: armazenamento local cheio. Use uma URL externa em vez de upload.");
    return;
  }
  broadcastSiteEdit("image");
  publishIfAdmin();
}


/* ─── Admin auth with persistent rate-limiting ─── */
type RateState = { attempts: number; lockedUntil: number };
function getRate(): RateState {
  try { return JSON.parse(localStorage.getItem(RATE_KEY) || '{"attempts":0,"lockedUntil":0}'); }
  catch { return { attempts: 0, lockedUntil: 0 }; }
}
function setRate(r: RateState) { localStorage.setItem(RATE_KEY, JSON.stringify(r)); }
export function getAdminLockState(): { locked: boolean; secondsLeft: number; attempts: number } {
  const r = getRate();
  const now = Date.now();
  const left = Math.max(0, Math.ceil((r.lockedUntil - now) / 1000));
  return { locked: r.lockedUntil > now, secondsLeft: left, attempts: r.attempts };
}

export function isAdminAuthed(): boolean {
  if (typeof window === "undefined") return false;
  const tok = sessionStorage.getItem(ADMIN_SESSION);
  const sig = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (!tok || !sig) return false;
  return tok.length === 64 && sig.length === 64 && tok !== sig;
}

export async function adminLogin(email: string, password: string): Promise<{ ok: boolean; message?: string; lockSeconds?: number }> {
  const state = getAdminLockState();
  if (state.locked) return { ok: false, message: `Bloqueado. Aguarde ${state.secondsLeft}s.`, lockSeconds: state.secondsLeft };
  try {
    const res = await adminServerLogin({ data: { email: email.trim(), password } });
    if (!res.ok) {
      const r = getRate();
      r.attempts = (r.attempts || 0) + 1;
      if (r.attempts >= 5) {
        const ladder = [30_000, 120_000, 600_000, 3_600_000];
        const idx = Math.min(ladder.length - 1, Math.floor(r.attempts / 5) - 1);
        r.lockedUntil = Date.now() + ladder[idx];
      }
      setRate(r);
      return { ok: false, message: res.message || "Credenciais inválidas.", lockSeconds: res.lockSeconds };
    }
    setRate({ attempts: 0, lockedUntil: 0 });
    sessionStorage.setItem(ADMIN_SESSION, res.session);
    sessionStorage.setItem(ADMIN_TOKEN_KEY, res.signature);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha no login." };
  }
}

export function adminLogout() {
  sessionStorage.removeItem(ADMIN_SESSION);
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

/* ─── Logo override ─── */
export function getLogoOverride(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LOGO_KEY);
}
export function setLogoOverride(dataUrl: string | null) {
  if (dataUrl) localStorage.setItem(LOGO_KEY, dataUrl);
  else localStorage.removeItem(LOGO_KEY);
  window.dispatchEvent(new Event("site-config-change"));
  publishIfAdmin();
}

/* ─── Theme override ─── */
export type ThemeOverride = {
  primary?: string; gold?: string; background?: string; accent?: string;
  foreground?: string; card?: string; border?: string; secondary?: string; muted?: string; popover?: string;
};
export function getThemeOverride(): ThemeOverride | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(THEME_KEY) || "null"); } catch { return null; }
}
export function setThemeOverride(t: ThemeOverride | null) {
  if (t) localStorage.setItem(THEME_KEY, JSON.stringify(t));
  else localStorage.removeItem(THEME_KEY);
  if (t) applyThemeOverride(t); else removeThemeOverride();
  window.dispatchEvent(new Event("site-config-change"));
  publishIfAdmin();
}
export function applyThemeOverride(t: ThemeOverride) {
  if (typeof document === "undefined") return;
  const r = document.documentElement.style;
  if (t.gold) r.setProperty("--gold", t.gold);
  if (t.primary) r.setProperty("--primary", t.primary);
  if (t.background) r.setProperty("--background", t.background);
  if (t.accent) r.setProperty("--accent", t.accent);
  if (t.foreground) {
    r.setProperty("--foreground", t.foreground);
    r.setProperty("--card-foreground", t.foreground);
    r.setProperty("--popover-foreground", t.foreground);
    r.setProperty("--secondary-foreground", t.foreground);
    r.setProperty("--accent-foreground", t.foreground);
    r.setProperty("--muted-foreground", t.foreground);
  }
  if (t.card) r.setProperty("--card", t.card);
  if (t.popover) r.setProperty("--popover", t.popover);
  if (t.border) { r.setProperty("--border", t.border); r.setProperty("--input", t.border); }
  if (t.secondary) r.setProperty("--secondary", t.secondary);
  if (t.muted) r.setProperty("--muted", t.muted);
}
export function removeThemeOverride() {
  if (typeof document === "undefined") return;
  const r = document.documentElement.style;
  ["--gold","--primary","--background","--accent","--foreground","--card","--card-foreground","--popover","--popover-foreground","--secondary","--secondary-foreground","--accent-foreground","--muted-foreground","--border","--input","--muted"].forEach((v) => r.removeProperty(v));
}
