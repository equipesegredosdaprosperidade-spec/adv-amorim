import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  verifyAdminCredentials,
  verifyAdminSession,
  newSession,
  signSession,
  checkRate,
  recordFailure,
  clearRate,
} from "@/lib/admin-auth.server";

const SiteStateSchema = z.object({
  contentOverrides: z.record(z.string(), z.string()),
  imageOverrides: z.record(z.string(), z.string()),
  logoDataUrl: z.string().nullable(),
  themeOverride: z.record(z.string(), z.string()).nullable(),
  whatsappNumber: z.string(),
  whatsappMessage: z.string(),
  pixelConfig: z.record(z.string(), z.unknown()),
  siteEnabled: z.boolean(),
});

function requireAdmin(adminSession: string, adminSignature: string) {
  if (!verifyAdminSession(adminSession, adminSignature)) {
    throw new Error("Sessão administrativa inválida. Faça login novamente.");
  }
}

function rowToState(row: any) {
  return {
    contentOverrides: row?.content_overrides || {},
    imageOverrides: row?.image_overrides || {},
    logoDataUrl: row?.logo_dataurl ?? null,
    themeOverride: row?.theme_override ?? null,
    whatsappNumber: row?.whatsapp_number || "",
    whatsappMessage: row?.whatsapp_message || "",
    pixelConfig: row?.pixel_config || {},
    siteEnabled: row?.site_enabled !== false,
  };
}

/** Server-side admin session verification. The client-side `isAdminAuthed()`
 *  only checks token format; this round-trip confirms the HMAC signature is
 *  valid before the admin UI is rendered. */
export const verifyAdminSessionFn = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    adminSession: z.string().length(64),
    adminSignature: z.string().length(64),
  }).parse(input))
  .handler(async ({ data }) => {
    const { verifyAdminSession } = await import("@/lib/admin-auth.server");
    return { ok: verifyAdminSession(data.adminSession, data.adminSignature) };
  });

/** Server-side admin login. Verifies credentials against server-only env vars
 *  and returns an HMAC-signed session token. The password never reaches the client bundle. */
export const adminServerLogin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(256),
  }).parse(input))
  .handler(async ({ data }) => {
    const key = data.email.trim().toLowerCase();
    const rate = checkRate(key);
    if (rate.locked) {
      return { ok: false as const, message: `Bloqueado. Aguarde ${rate.secondsLeft}s.`, lockSeconds: rate.secondsLeft };
    }
    if (!verifyAdminCredentials(data.email, data.password)) {
      recordFailure(key);
      return { ok: false as const, message: "Credenciais inválidas." };
    }
    clearRate(key);
    const session = newSession();
    const signature = signSession(session);
    return { ok: true as const, session, signature };
  });

export const savePublishedSiteState = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    adminSession: z.string().length(64),
    adminSignature: z.string().length(64),
    state: SiteStateSchema,
    baseVersion: z.number().int().nonnegative().nullable().optional(),
    label: z.string().max(120).nullable().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.adminSession, data.adminSignature);

    const db = supabaseAdmin as any;
    const { data: cur, error: readErr } = await db
      .from("site_published_state")
      .select("version")
      .eq("singleton_key", "main")
      .maybeSingle();
    if (readErr) throw new Error(`Falha ao ler versão atual: ${readErr.message}`);

    const currentVersion: number = cur?.version ?? 0;
    if (
      data.baseVersion !== undefined &&
      data.baseVersion !== null &&
      currentVersion > 0 &&
      data.baseVersion !== currentVersion
    ) {
      throw new Error(
        `CONFLICT:${currentVersion}: Outro editor já salvou (versão ${currentVersion}). Recarregue para ver a versão mais recente antes de salvar de novo.`
      );
    }
    const nextVersion = currentVersion + 1;
    const { state } = data;

    const { error } = await db
      .from("site_published_state")
      .upsert({
        singleton_key: "main",
        content_overrides: state.contentOverrides,
        image_overrides: state.imageOverrides,
        logo_dataurl: state.logoDataUrl,
        theme_override: state.themeOverride,
        whatsapp_number: state.whatsappNumber,
        whatsapp_message: state.whatsappMessage,
        pixel_config: state.pixelConfig,
        site_enabled: state.siteEnabled,
        version: nextVersion,
        published_at: new Date().toISOString(),
      }, { onConflict: "singleton_key" });
    if (error) throw new Error(`Falha ao salvar no banco de dados: ${error.message}`);

    await db.from("site_version_history").insert({
      version: nextVersion,
      label: data.label ?? null,
      content_overrides: state.contentOverrides,
      image_overrides: state.imageOverrides,
      logo_dataurl: state.logoDataUrl,
      theme_override: state.themeOverride,
      whatsapp_number: state.whatsappNumber,
      whatsapp_message: state.whatsappMessage,
      pixel_config: state.pixelConfig,
      site_enabled: state.siteEnabled,
    });

    return { ok: true, version: nextVersion, savedAt: new Date().toISOString() };
  });

export const listSiteVersions = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    adminSession: z.string().length(64),
    adminSignature: z.string().length(64),
  }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.adminSession, data.adminSignature);
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("site_version_history")
      .select("id,version,label,created_at")
      .order("version", { ascending: false })
      .limit(100);
    if (error) throw new Error(`Falha ao listar versões: ${error.message}`);
    return { versions: rows || [] };
  });

export const restoreSiteVersion = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    adminSession: z.string().length(64),
    adminSignature: z.string().length(64),
    versionId: z.string().uuid(),
  }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.adminSession, data.adminSignature);
    const db = supabaseAdmin as any;
    const { data: row, error } = await db
      .from("site_version_history").select("*").eq("id", data.versionId).maybeSingle();
    if (error || !row) throw new Error("Versão não encontrada.");

    const { data: cur } = await db
      .from("site_published_state").select("version").eq("singleton_key", "main").maybeSingle();
    const nextVersion = (cur?.version ?? 0) + 1;
    const state = rowToState(row);

    const { error: upErr } = await db
      .from("site_published_state").upsert({
        singleton_key: "main",
        content_overrides: state.contentOverrides,
        image_overrides: state.imageOverrides,
        logo_dataurl: state.logoDataUrl,
        theme_override: state.themeOverride,
        whatsapp_number: state.whatsappNumber,
        whatsapp_message: state.whatsappMessage,
        pixel_config: state.pixelConfig,
        site_enabled: state.siteEnabled,
        version: nextVersion,
        published_at: new Date().toISOString(),
      }, { onConflict: "singleton_key" });
    if (upErr) throw new Error(`Falha ao restaurar: ${upErr.message}`);

    await db.from("site_version_history").insert({
      version: nextVersion,
      label: `Restauração da v${row.version}`,
      content_overrides: state.contentOverrides,
      image_overrides: state.imageOverrides,
      logo_dataurl: state.logoDataUrl,
      theme_override: state.themeOverride,
      whatsapp_number: state.whatsappNumber,
      whatsapp_message: state.whatsappMessage,
      pixel_config: state.pixelConfig,
      site_enabled: state.siteEnabled,
    });

    return { ok: true, version: nextVersion };
  });

export const testDatabasePersistence = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    adminSession: z.string().length(64),
    adminSignature: z.string().length(64),
    token: z.string().min(8).max(128),
  }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.adminSession, data.adminSignature);
    const db = supabaseAdmin as any;
    const start = Date.now();
    const { data: ins, error: insErr } = await db
      .from("site_version_history")
      .insert({
        version: 0,
        label: `__dbtest__:${data.token}`,
        content_overrides: { __test__: data.token },
        image_overrides: {},
        pixel_config: {},
        site_enabled: true,
      })
      .select("id,label,content_overrides,created_at")
      .single();
    if (insErr) throw new Error(`Falha na gravação: ${insErr.message}`);

    const { data: read, error: readErr } = await db
      .from("site_version_history")
      .select("id,label,content_overrides,created_at")
      .eq("id", ins.id)
      .single();
    if (readErr) throw new Error(`Falha na leitura: ${readErr.message}`);

    await db.from("site_version_history").delete().eq("id", ins.id);

    return {
      ok: true,
      elapsedMs: Date.now() - start,
      wrote: ins,
      readBack: read,
      match: read?.content_overrides?.__test__ === data.token,
    };
  });
