import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Shield, LogOut, Settings as SettingsIcon, BarChart3, Phone, Save, Trash2, RefreshCw,
  Download, FileImage, FileText, Lock, Activity, Wand2, Image as ImageIcon, Sparkles, Plus, X,
  Power, PowerOff, ExternalLink, RotateCcw, Eye, History, CheckCircle2, AlertCircle, CloudOff, Loader2, Database,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, Area, AreaChart, LabelList,
} from "recharts";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import {
  adminLogin, adminLogout, getAdminLockState,
  getWhatsAppNumber, setWhatsAppNumber, getWhatsAppMessage, setWhatsAppMessage,
  getLogoOverride, setLogoOverride, setThemeOverride, removeThemeOverride,
  getPixelConfig, setPixelConfig, type PixelConfig,
  getSiteEnabled, setSiteEnabled,
  snapshotContent, restoreContentSnapshot, clearContentOverrides, getContentOverrides,
  broadcastSiteEdit, onSiteEdit,
  onSyncChange, type SyncState, loadPublishedSiteState, publishCurrentState,
} from "@/lib/site-config";
import { listSiteVersions, restoreSiteVersion, verifyAdminSessionFn } from "@/lib/site-state.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  getEvents, clearEvents, type TrackEvent, type RangeKey, rangeBounds, filterByRange,
  computeMetrics, setRoiConfig, getRoiConfig,
} from "@/lib/tracker";

export const Route = createFileRoute("/admindev")({
  // Skip SSR for admin tooling so unauthenticated visitors never receive HTML
  // that hints at the structure of the admin UI.
  ssr: false,
  head: () => ({ meta: [{ title: "Admin Dev" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminDev,
});

function AdminDev() {
  // `verified` is gated by a server-side HMAC check. The client-side
  // `isAdminAuthed()` only validates the token *format*, so anyone could
  // forge sessionStorage values and see the admin UI. Always confirm with
  // the server before rendering the dashboard.
  const [verified, setVerified] = useState<"checking" | "no" | "yes">("checking");
  const verify = useServerFn(verifyAdminSessionFn);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const adminSession = sessionStorage.getItem("admindev_session") || "";
      const adminSignature = sessionStorage.getItem("admindev_token") || "";
      if (adminSession.length !== 64 || adminSignature.length !== 64) {
        if (!cancelled) setVerified("no");
        return;
      }
      try {
        const res = await verify({ data: { adminSession, adminSignature } });
        if (cancelled) return;
        if (res?.ok) setVerified("yes");
        else {
          adminLogout();
          setVerified("no");
        }
      } catch {
        if (!cancelled) setVerified("no");
      }
    })();
    return () => { cancelled = true; };
  }, [verify]);

  if (verified === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Verificando sessão…
        </div>
      </div>
    );
  }
  if (verified === "no") return <Login onSuccess={() => setVerified("yes")} />;
  return <Dashboard onLogout={() => { adminLogout(); setVerified("no"); }} />;
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lock, setLock] = useState(getAdminLockState());

  useEffect(() => {
    const t = setInterval(() => setLock(getAdminLockState()), 1000);
    return () => clearInterval(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.locked || busy) return;
    setBusy(true);
    const res = await adminLogin(email, password);
    setBusy(false);
    if (res.ok) { onSuccess(); return; }
    setError(res.message || "Erro.");
    setLock(getAdminLockState());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-primary)] px-4">
      <form onSubmit={submit} className="w-full max-w-md bg-card border-2 border-gold/40 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-[var(--gradient-red)] flex items-center justify-center border border-gold/40">
            <Lock className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gold">Área Restrita</h1>
            <p className="text-xs text-muted-foreground">Acesso exclusivo para administradores</p>
          </div>
        </div>
        <label className="block text-xs font-bold uppercase tracking-wide text-foreground/80 mb-1">E-mail</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={lock.locked || busy}
          autoComplete="off"
          className="w-full mb-4 px-3 py-2.5 rounded-md border-2 border-border bg-background text-foreground focus:border-gold outline-none" />
        <label className="block text-xs font-bold uppercase tracking-wide text-foreground/80 mb-1">Senha</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={lock.locked || busy}
          autoComplete="off"
          className="w-full mb-4 px-3 py-2.5 rounded-md border-2 border-border bg-background text-foreground focus:border-gold outline-none" />
        {error && <div className="mb-3 text-sm text-destructive font-medium">{error}</div>}
        {lock.locked && (
          <div className="mb-3 text-sm text-destructive font-medium">
            Bloqueado por {lock.secondsLeft}s após {lock.attempts} tentativas.
          </div>
        )}
        <button type="submit" disabled={lock.locked || busy}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-[var(--gradient-red)] text-gold border-2 border-gold/60 font-bold hover:text-white transition-colors disabled:opacity-50">
          <Shield className="w-4 h-4" /> {busy ? "Verificando…" : "Entrar"}
        </button>
        <p className="mt-4 text-[11px] text-center text-muted-foreground">Todas as tentativas são registradas e limitadas.</p>
      </form>
    </div>
  );
}

type Tab = "config" | "reports" | "quick" | "versions";

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("reports");
  useEffect(() => {
    loadPublishedSiteState().catch((err) => console.error("Falha ao carregar estado publicado:", err));
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-gold/30 bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-gold" />
            <div>
              <h1 className="font-bold text-gold">Admin Dev</h1>
              <p className="text-[11px] text-muted-foreground">Painel administrativo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SyncBadge />
            <button onClick={onLogout} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-border hover:border-destructive text-sm font-medium text-foreground">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1 flex-wrap">
          <TabBtn active={tab === "reports"} onClick={() => setTab("reports")} icon={<BarChart3 className="w-4 h-4" />}>Relatórios</TabBtn>
          <TabBtn active={tab === "config"} onClick={() => setTab("config")} icon={<SettingsIcon className="w-4 h-4" />}>Configurações</TabBtn>
          <TabBtn active={tab === "quick"} onClick={() => setTab("quick")} icon={<Wand2 className="w-4 h-4" />}>Edição Rápida</TabBtn>
          <TabBtn active={tab === "versions"} onClick={() => setTab("versions")} icon={<History className="w-4 h-4" />}>Versões</TabBtn>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === "config" && <ConfigTab />}
        {tab === "reports" && <ReportsTab />}
        {tab === "quick" && <QuickEditTab />}
        {tab === "versions" && <VersionsTab />}
      </main>
    </div>
  );
}

function SyncBadge() {
  const [s, setS] = useState<SyncState>({ status: "idle", at: 0, version: null });
  useEffect(() => onSyncChange(setS), []);
  const map: Record<SyncState["status"], { label: string; cls: string; Icon: any }> = {
    idle:     { label: "Aguardando",      cls: "text-muted-foreground border-border", Icon: CloudOff },
    saving:   { label: "Salvando…",       cls: "text-blue-400 border-blue-400/50",   Icon: Loader2 },
    saved:    { label: "Salvo no banco ✓", cls: "text-green-500 border-green-500/50", Icon: CheckCircle2 },
    synced:   { label: "Sincronizado",    cls: "text-green-500 border-green-500/50", Icon: CheckCircle2 },
    conflict: { label: "Conflito — resolvendo", cls: "text-amber-400 border-amber-400/60", Icon: AlertCircle },
    error:    { label: "Erro ao salvar",  cls: "text-destructive border-destructive/60", Icon: AlertCircle },
  };
  const cfg = map[s.status];
  const ago = s.at ? new Date(s.at).toLocaleTimeString() : "—";
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border-2 text-xs font-bold ${cfg.cls}`} title={s.message || ""}>
      <cfg.Icon className={`w-3.5 h-3.5 ${s.status === "saving" ? "animate-spin" : ""}`} />
      <span>{cfg.label}</span>
      {s.version !== null && <span className="opacity-70">v{s.version}</span>}
      <span className="opacity-50 hidden md:inline">{ago}</span>
    </div>
  );
}

function TabBtn({ children, active, onClick, icon }: { children: React.ReactNode; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
        active ? "border-gold text-gold" : "border-transparent text-muted-foreground hover:text-gold"
      }`}>
      {icon}{children}
    </button>
  );
}

/* ───────────── CONFIGURAÇÕES ───────────── */

function ConfigTab() {
  const [wa, setWa] = useState("");
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const [pixel, setPixel] = useState<PixelConfig>(getPixelConfig());
  const [pixelSaved, setPixelSaved] = useState(false);

  useEffect(() => {
    setWa(getWhatsAppNumber());
    setMsg(getWhatsAppMessage());
    setPixel(getPixelConfig());
  }, []);

  const save = () => {
    setWhatsAppNumber(wa);
    setWhatsAppMessage(msg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const savePixel = () => {
    setPixelConfig(pixel);
    // sync ROI driver from pixel: costPerVisit = CPM/1000 (CPM in BRL)
    const cpmBrl = pixel.cpmCents / 100;
    setRoiConfig({
      ...getRoiConfig(),
      costPerVisit: cpmBrl / 1000,
      pixelDriven: pixel.enabled && pixel.pixelId.trim().length > 0 && pixel.cpmCents > 0,
    });
    setPixelSaved(true);
    setTimeout(() => setPixelSaved(false), 2500);
  };

  const events = useLiveEvents();
  const totals = useMemo(() => countByName(events), [events]);
  const contacts = totals.Contact || 0;
  const views = totals.PageView || 0;
  const cpmBrl = pixel.cpmCents / 100;
  const estimatedCost = pixel.enabled && cpmBrl > 0 ? (views / 1000) * cpmBrl : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="bg-card border-2 border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-gold" />
          <h2 className="font-bold text-gold text-lg">Número do WhatsApp</h2>
        </div>
        <p className="text-sm text-foreground/85 mb-4">
          Altera automaticamente todos os botões de WhatsApp do site (incluindo o flutuante e URLs de rastreamento).
        </p>
        <label className="block text-xs font-bold uppercase tracking-wide text-foreground/80 mb-1">Número (com DDI/DDD, somente dígitos)</label>
        <input value={wa} onChange={(e) => setWa(e.target.value.replace(/\D/g, ""))}
          placeholder="5516993393313"
          className="w-full mb-4 px-3 py-2.5 rounded-md border-2 border-border bg-background text-foreground focus:border-gold outline-none font-mono" />
        <label className="block text-xs font-bold uppercase tracking-wide text-foreground/80 mb-1">Mensagem padrão</label>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3}
          className="w-full mb-4 px-3 py-2.5 rounded-md border-2 border-border bg-background text-foreground focus:border-gold outline-none" />
        <button onClick={save} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--gradient-red)] text-gold border-2 border-gold/60 font-bold hover:text-white">
          <Save className="w-4 h-4" /> Salvar
        </button>
        {saved && <span className="ml-3 text-sm text-green-500 font-medium">✓ Atualizado em todo o site</span>}
      </section>

      <section className="bg-card border-2 border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-gold" />
          <h2 className="font-bold text-gold text-lg">Rastreio do Pixel</h2>
        </div>
        <p className="text-sm text-foreground/85 mb-4">
          Conecte seu Pixel (Meta/TikTok/Google) para rastrear <strong>total de visualizações</strong>,
          <strong> custo por mil visualizações (CPM)</strong> e <strong>finalizações de vendas</strong>
          (contatos feitos pelo WhatsApp). Os números abaixo refletem <strong>apenas o que o Pixel rastreou</strong>,
          não as visitas gerais do site.
        </p>
        <label className="block text-xs font-bold uppercase tracking-wide text-foreground/80 mb-1">ID do Pixel</label>
        <input value={pixel.pixelId} onChange={(e) => setPixel({ ...pixel, pixelId: e.target.value.trim() })}
          placeholder="Ex.: 123456789012345"
          className="w-full mb-3 px-3 py-2.5 rounded-md border-2 border-border bg-background text-foreground focus:border-gold outline-none font-mono" />
        <label className="block text-xs font-bold uppercase tracking-wide text-foreground/80 mb-1">CPM — Custo por mil visualizações (R$)</label>
        <input type="number" min={0} step={0.01} value={pixel.cpmCents / 100}
          onChange={(e) => setPixel({ ...pixel, cpmCents: Math.round(Number(e.target.value || 0) * 100) })}
          placeholder="Ex.: 18.50"
          className="w-full mb-3 px-3 py-2.5 rounded-md border-2 border-border bg-background text-foreground focus:border-gold outline-none font-mono" />
        <label className="flex items-center gap-2 text-sm text-foreground/90 mb-4">
          <input type="checkbox" checked={pixel.enabled} onChange={(e) => setPixel({ ...pixel, enabled: e.target.checked })} />
          Ativar rastreio do Pixel (libera "Custo estimado" e CPM nos relatórios)
        </label>
        <button onClick={savePixel} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--gradient-red)] text-gold border-2 border-gold/60 font-bold hover:text-white">
          <Save className="w-4 h-4" /> Salvar Pixel
        </button>
        {pixelSaved && <span className="ml-3 text-sm text-green-500 font-medium">✓ Pixel atualizado</span>}

        {(() => {
          const pixelActive = pixel.enabled && pixel.pixelId.trim().length > 0;
          return (
            <>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <MiniKpi label="Visualizações (Pixel)" value={pixelActive ? views : "—"} />
                <MiniKpi label="Finalizações (Pixel)" value={pixelActive ? contacts : "—"} />
                <MiniKpi label="Custo estimado" value={pixelActive && cpmBrl > 0 ? `R$ ${estimatedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"} />
              </div>
              {!pixelActive && (
                <p className="mt-2 text-[11px] text-foreground/70">
                  Pixel desativado ou sem ID — nenhum dado rastreado pelo Pixel. As visitas gerais do site aparecem na aba <strong>Relatórios</strong>.
                </p>
              )}
              <p className="mt-2 text-[11px] text-foreground/70">Cada clique no WhatsApp dispara <code>Contact</code> + <code>InitiateCheckout</code> automaticamente. A <strong>Taxa de Conversão</strong> (em Relatórios) é calculada como cliques no WhatsApp ÷ visitas totais do site.</p>
            </>
          );
        })()}
      </section>

      <section className="bg-card border-2 border-border rounded-xl p-6 lg:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-gold" />
          <h2 className="font-bold text-gold text-lg">Eventos em tempo real</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {(["PageView","ViewContent","AddToCart","InitiateCheckout","AddPaymentInfo","Purchase","Contact","Click"] as const).map((n) => (
            <div key={n} className="p-3 rounded-lg bg-secondary border border-border">
              <div className="text-[11px] uppercase tracking-wide text-foreground/80">{n}</div>
              <div className="text-xl font-bold text-gold">{totals[n] || 0}</div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button onClick={() => clearEvents()} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border-2 border-border hover:border-destructive text-sm text-foreground">
            <Trash2 className="w-4 h-4" /> Limpar eventos
          </button>
        </div>
      </section>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg bg-secondary border border-border">
      <div className="text-[10px] uppercase tracking-wide text-foreground/75">{label}</div>
      <div className="text-base font-bold text-gold mt-0.5">{value}</div>
    </div>
  );
}

/* ───────────── RELATÓRIOS ───────────── */

function ReportsTab() {
  const events = useLiveEvents();
  const [range, setRange] = useState<RangeKey>("7d");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const bounds = useMemo(() => {
    if (range === "custom") {
      const f = from ? new Date(from).getTime() : 0;
      const t = to ? new Date(to + "T23:59:59").getTime() : Date.now();
      return { from: f, to: t };
    }
    return rangeBounds(range);
  }, [range, from, to]);

  const filtered = useMemo(() => filterByRange(events, bounds.from, bounds.to), [events, bounds]);
  const m = useMemo(() => computeMetrics(filtered), [filtered]);

  const dailySeries = useMemo(() => buildDailySeries(filtered, bounds.from, bounds.to), [filtered, bounds]);
  const deviceData = useMemo(() => groupBy(filtered, (e) => e.device), [filtered]);
  const langData = useMemo(() => groupBy(filtered, (e) => e.lang).slice(0, 6), [filtered]);
  const pagesData = useMemo(() => pageConversion(filtered), [filtered]);

  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const rangeLabel = range === "today" ? "Hoje" : range === "7d" ? "Últimos 7 dias" : range === "30d" ? "Últimos 30 dias" : range === "all" ? "Todo o período" : "Personalizado";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 bg-card border-2 border-border rounded-xl p-4">
        {(["today","7d","30d","all","custom"] as RangeKey[]).map((k) => (
          <button key={k} onClick={() => setRange(k)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border-2 transition-colors ${
              range === k ? "bg-[var(--gradient-red)] text-gold border-gold/60" : "border-border text-foreground/85 hover:border-gold"
            }`}>
            {k === "today" ? "Hoje" : k === "7d" ? "Últimos 7 dias" : k === "30d" ? "Últimos 30 dias" : k === "all" ? "Todo o período" : "Personalizado"}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-2 py-1.5 rounded border-2 border-border bg-background text-foreground text-sm" />
            <span className="text-xs text-muted-foreground">até</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-2 py-1.5 rounded border-2 border-border bg-background text-foreground text-sm" />
          </div>
        )}
        <div className="ml-auto flex gap-2 flex-wrap">
          <button onClick={() => window.dispatchEvent(new Event("tracker-update"))} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border-2 border-border text-xs font-semibold text-foreground hover:border-gold">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
          <button onClick={() => downloadCSV(filtered, m, rangeLabel)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border-2 border-border text-xs font-semibold text-foreground hover:border-gold">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button disabled={exporting} onClick={async () => { setExporting(true); await downloadImage(reportRef.current); setExporting(false); }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border-2 border-border text-xs font-semibold text-foreground hover:border-gold disabled:opacity-50">
            <FileImage className="w-3.5 h-3.5" /> PNG
          </button>
          <button disabled={exporting} onClick={async () => { setExporting(true); await downloadPDF(reportRef.current, rangeLabel); setExporting(false); }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border-2 border-border text-xs font-semibold text-foreground hover:border-gold disabled:opacity-50">
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6 bg-background p-6 rounded-xl">
        <div className="flex items-center justify-between border-b-2 border-gold/30 pb-3 mb-1">
          <div>
            <h2 className="text-2xl font-bold text-gold">Relatório de Performance</h2>
            <p className="text-sm text-foreground/80">{rangeLabel} · gerado em {new Date().toLocaleString("pt-BR")}</p>
          </div>
          <Shield className="w-8 h-8 text-gold" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Visitas (PageView)" value={m.visits} />
          <Kpi label="Conversões (WhatsApp)" value={m.contacts} accent />
          <Kpi label="Taxa de Conversão" value={`${m.conversion.toFixed(2)}%`} accent sub={`${m.contacts} / ${m.visits} visitas`} />
          <Kpi label="CTR" value={`${m.ctr.toFixed(2)}%`} sub={`${m.clicks} cliques`} />
          {m.pixelDriven && (
            <>
              <Kpi label="Custo estimado (Pixel)" value={`R$ ${m.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
              <Kpi label="CPM (Pixel)" value={`R$ ${m.cpm.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
            </>
          )}
          <Kpi label="Total de eventos" value={filtered.length} />
        </div>
        {!m.pixelDriven && (
          <div className="text-xs text-foreground/70 italic">
            "Custo estimado" e "CPM" aparecem apenas quando o Pixel está conectado em Configurações.
          </div>
        )}

        <div className="bg-card border-2 border-border rounded-xl p-5">
          <h3 className="font-bold text-gold mb-3">Crescimento — visitas vs conversões por dia</h3>
          <div className="h-80">
            <ResponsiveContainer>
              <AreaChart data={dailySeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gV" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.80 0.15 78)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="oklch(0.80 0.15 78)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gC" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.24 22)" stopOpacity={0.75} />
                    <stop offset="100%" stopColor="oklch(0.62 0.24 22)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} />
                <XAxis dataKey="day" stroke="var(--foreground)" fontSize={11} tickMargin={6} />
                <YAxis stroke="var(--foreground)" fontSize={11} allowDecimals={false} tickMargin={6} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--gold)", color: "var(--foreground)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="visits" name="Visitas" stroke="oklch(0.85 0.16 78)" fill="url(#gV)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="contacts" name="Conversões" stroke="oklch(0.62 0.24 22)" fill="url(#gC)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card border-2 border-border rounded-xl p-5">
            <h3 className="font-bold text-gold mb-3">Eventos por tipo</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={Object.entries(m.counts).map(([name, value]) => ({ name, value }))} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="bEvt" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.85 0.16 78)" />
                      <stop offset="100%" stopColor="oklch(0.62 0.24 22)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} />
                  <XAxis dataKey="name" stroke="var(--foreground)" fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke="var(--foreground)" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--gold)", color: "var(--foreground)", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="url(#bEvt)" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="value" position="top" fill="var(--foreground)" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-5">
            <h3 className="font-bold text-gold mb-3">Dispositivos (tendência)</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={deviceData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {deviceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-5">
            <h3 className="font-bold text-gold mb-3">Idiomas (top tendências)</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={langData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--foreground)" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="var(--foreground)" fontSize={11} width={80} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                  <Bar dataKey="value" fill="oklch(0.80 0.15 78)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-5">
            <h3 className="font-bold text-gold mb-3">Conversões por página</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-foreground/80">
                  <tr><th className="py-2 pr-3">Página</th><th className="pr-3">Visitas</th><th className="pr-3">Conversões</th><th>Taxa</th></tr>
                </thead>
                <tbody>
                  {pagesData.length === 0 && <tr><td colSpan={4} className="py-3 text-muted-foreground">Sem dados no período.</td></tr>}
                  {pagesData.map((p) => (
                    <tr key={p.path} className="border-t border-border">
                      <td className="py-1.5 pr-3 truncate max-w-[220px] text-foreground/90">{p.path || "/"}</td>
                      <td className="pr-3 text-foreground/90">{p.visits}</td>
                      <td className="pr-3 text-foreground/90">{p.contacts}</td>
                      <td className="font-bold text-gold">{p.visits ? ((p.contacts / p.visits) * 100).toFixed(1) : "0.0"}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-xl p-5">
          <h3 className="font-bold text-gold mb-3">Últimos eventos (tempo real)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-foreground/80">
                <tr><th className="py-2 pr-3">Hora</th><th className="pr-3">Evento</th><th className="pr-3">Página</th><th className="pr-3">Dispositivo</th><th>Idioma</th></tr>
              </thead>
              <tbody>
                {filtered.slice(-15).reverse().map((e, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-1.5 pr-3 font-mono text-foreground/90">{new Date(e.ts).toLocaleString("pt-BR")}</td>
                    <td className="pr-3 font-semibold text-gold">{e.name}</td>
                    <td className="pr-3 truncate max-w-[200px] text-foreground/90">{e.path}</td>
                    <td className="pr-3 text-foreground/90">{e.device}</td>
                    <td className="text-foreground/90">{e.lang}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, sub }: { label: string; value: string | number; accent?: boolean; sub?: string }) {
  return (
    <div className={`p-5 rounded-xl border-2 ${accent ? "border-gold/60 bg-[var(--gradient-red)]" : "border-border bg-card"}`}>
      <div className={`text-xs uppercase tracking-wide ${accent ? "text-gold/90" : "text-foreground/80"}`}>{label}</div>
      <div className={`text-3xl font-bold ${accent ? "text-gold" : "text-gold"}`}>{value}</div>
      {sub && <div className={`text-[11px] mt-1 ${accent ? "text-gold/80" : "text-foreground/70"}`}>{sub}</div>}
    </div>
  );
}

/* ───────────── EDIÇÃO RÁPIDA ───────────── */

function QuickEditTab() {
  const [logoData, setLogoData] = useState<string | null>(getLogoOverride());
  const [palette, setPalette] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOut, setAiOut] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [pairs, setPairs] = useState<{ find: string; replace: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("site_text_pairs") || "[]"); } catch { return []; }
  });

  const onLogoFile = async (file: File) => {
    setBusy(true);
    const dataUrl = await fileToDataUrl(file);
    setLogoData(dataUrl);
    setLogoOverride(dataUrl);
    const colors = await extractDominantColors(dataUrl);
    setPalette(colors);
    setBusy(false);
  };

  const applyPaletteAsTheme = () => {
    if (palette.length < 2) return;
    // Order extracted colors by perceived lightness so we can pick a dark
    // bg, a mid surface and a bright accent. Then derive complementary
    // foreground/card/border so the WHOLE site re-skins, not just accents.
    const sorted = [...palette].sort((a, b) => luminance(a) - luminance(b));
    const dark = sorted[0];
    const mid = sorted[Math.floor(sorted.length / 2)];
    const bright = sorted[sorted.length - 1];
    const bgIsDark = luminance(dark) < 0.5;
    const foregroundHex = bgIsDark ? "#f5f5f5" : "#101010";
    setThemeOverride({
      background: hexToOklch(dark, bgIsDark ? 0.14 : 0.96),
      foreground: hexToOklch(foregroundHex, bgIsDark ? 0.96 : 0.16),
      card: hexToOklch(dark, bgIsDark ? 0.20 : 0.92),
      popover: hexToOklch(dark, bgIsDark ? 0.20 : 0.92),
      secondary: hexToOklch(dark, bgIsDark ? 0.22 : 0.90),
      muted: hexToOklch(dark, bgIsDark ? 0.26 : 0.88),
      border: hexToOklch(mid, bgIsDark ? 0.34 : 0.78),
      accent: hexToOklch(mid, bgIsDark ? 0.30 : 0.82),
      primary: hexToOklch(bright, bgIsDark ? 0.86 : 0.42),
      gold: hexToOklch(bright, bgIsDark ? 0.82 : 0.42),
    });
  };


  const resetTheme = () => { removeThemeOverride(); localStorage.removeItem("site_theme_override"); window.dispatchEvent(new Event("site-config-change")); };
  const removeLogo = () => { setLogoOverride(null); setLogoData(null); setPalette([]); };

  const savePairs = (next: { find: string; replace: string }[]) => {
    setPairs(next);
    localStorage.setItem("site_text_pairs", JSON.stringify(next));
    window.dispatchEvent(new Event("site-config-change"));
  };

  const runAi = async () => {
    setAiBusy(true);
    setAiOut("");
    try {
      // Use Lovable AI Gateway if available; falls back to message otherwise.
      const r = await fetch("/api/public/ai-rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setAiOut(j.text || "(sem resposta)");
    } catch (e) {
      setAiOut("IA indisponível no momento. Use o editor manual abaixo para definir substituições de texto.");
    } finally {
      setAiBusy(false);
    }
  };

  const [siteOn, setSiteOn] = useState(getSiteEnabled());
  const toggleSite = () => { const v = !siteOn; setSiteEnabled(v); setSiteOn(v); };
  const [overridesCount, setOverridesCount] = useState(Object.keys(getContentOverrides()).length);
  const [embedOpen, setEmbedOpen] = useState(true);
  const [embedKey, setEmbedKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const refresh = () => setOverridesCount(Object.keys(getContentOverrides()).length);
    const off = onSiteEdit(refresh);
    refresh();
    return off;
  }, []);
  const reloadEmbed = () => setEmbedKey((k) => k + 1);
  const doSnapshot = async () => {
    try {
      await snapshotContent();
      alert("✓ Versão salva permanentemente no banco de dados (textos + imagens). Ficam disponíveis para todos os clientes.");
    } catch (err) {
      console.error("Falha ao salvar versão no banco:", err);
      alert(`Erro ao salvar no banco de dados: ${err instanceof Error ? err.message : "erro desconhecido"}`);
    }
  };
  const doRestore = () => {
    if (!confirm("Restaurar a última versão salva?")) return;
    if (restoreContentSnapshot()) { alert("Versão restaurada."); reloadEmbed(); } else alert("Nenhum snapshot disponível.");
  };
  const doReset = () => {
    if (!confirm("Apagar TODAS as edições de texto e voltar ao original?")) return;
    clearContentOverrides();
    reloadEmbed();
    alert("Textos restaurados ao original.");
  };
  // SALVAMENTO DE TEXTO PRIORITÁRIO — força flush do span em edição dentro do iframe,
  // salva snapshot permanente e dispara broadcast imediato para todas as abas/janelas
  // do site (clientes recebem a atualização sem precisar recarregar).
  const doPrioritySave = async () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      const active = doc?.activeElement as HTMLElement | null;
      if (active && active.getAttribute("contenteditable") === "true") active.blur();
    } catch { /* cross-origin guard — same-origin so should be fine */ }
    try {
      await snapshotContent();
      broadcastSiteEdit("force");
      alert("✓ Texto salvo com prioridade no banco de dados. As alterações já estão visíveis e permanentes para o site do cliente.");
    } catch (err) {
      console.error("Falha no salvamento prioritário no banco:", err);
      alert(`ERRO: o salvamento prioritário falhou no banco de dados. ${err instanceof Error ? err.message : "Verifique o console."}`);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-card border-2 border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-gold" />
          <h2 className="font-bold text-gold text-lg">Editor ao vivo do site (cópia editável)</h2>
        </div>
        <p className="text-sm text-foreground/85 mb-4">
          Abaixo está uma <strong>cópia do site</strong> em modo edição — você permanece no AdminDev.
          Clique em <strong>qualquer texto</strong> (títulos, parágrafos, botões, itens de menu, rodapé…),
          edite frase por frase e clique fora para salvar. As mudanças se aplicam ao site real automaticamente.
          Use os botões abaixo para salvar uma versão, restaurar a última, ou apagar tudo.
        </p>
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <button onClick={() => setEmbedOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[var(--gradient-red)] text-gold border-2 border-gold/60 font-bold hover:text-white">
            <Eye className="w-4 h-4" /> {embedOpen ? "Ocultar cópia editável" : "Abrir cópia editável"}
          </button>
          <button onClick={reloadEmbed} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border-2 border-gold/60 text-gold font-bold hover:bg-gold/10">
            <RotateCcw className="w-4 h-4" /> Recarregar cópia
          </button>
          <a href="/?edit=1" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border-2 border-border text-foreground font-bold hover:border-gold">
            <ExternalLink className="w-4 h-4" /> Abrir em nova aba
          </a>
          <button onClick={doSnapshot} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border-2 border-gold/60 text-gold font-bold hover:bg-gold/10">
            <Save className="w-4 h-4" /> Salvar versão atual
          </button>
          <button onClick={doPrioritySave}
            title="Força a gravação imediata de qualquer texto em edição e envia agora para o site do cliente"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background border-2 border-gold font-bold hover:brightness-110 shadow-md">
            <Save className="w-4 h-4" /> Salvamento de texto prioritário
          </button>
          <button onClick={doRestore} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border-2 border-border text-foreground font-bold hover:border-gold">
            <RotateCcw className="w-4 h-4" /> Restaurar última
          </button>
          <button onClick={doReset} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border-2 border-border text-destructive font-bold hover:border-destructive">
            <Trash2 className="w-4 h-4" /> Apagar todas as edições
          </button>
          <span className="text-xs text-foreground/70 ml-auto">{overridesCount} edições aplicadas</span>
        </div>
        {embedOpen && (
          <div className="rounded-lg border-2 border-gold/40 overflow-hidden bg-background">
            <div className="flex items-center justify-between px-3 py-2 bg-card/60 border-b-2 border-border text-xs">
              <span className="text-foreground/80">Cópia ao vivo · clique nos textos para editar · alterações salvam automaticamente</span>
              <span className="text-gold font-bold">MODO EDIÇÃO</span>
            </div>
            <iframe
              key={embedKey}
              ref={iframeRef}
              src="/?edit=1&embed=1"
              title="Cópia editável do site"
              className="w-full bg-background"
              style={{ height: "min(80vh, 900px)", border: 0 }}
            />
          </div>
        )}
      </section>

      <section className="bg-card border-2 border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          {siteOn ? <Power className="w-5 h-5 text-green-500" /> : <PowerOff className="w-5 h-5 text-destructive" />}
          <h2 className="font-bold text-gold text-lg">Site Online / Offline</h2>
        </div>
        <p className="text-sm text-foreground/85 mb-4">
          Tira o site temporariamente do ar para clientes <strong>sem apagar nenhum dado</strong>.
          Você (admin) continua vendo o site normalmente. Visitantes veem uma página de manutenção
          com link para o WhatsApp.
        </p>
        <button onClick={toggleSite}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-md border-2 font-bold ${
            siteOn ? "border-destructive text-destructive hover:bg-destructive/10" : "border-green-500 text-green-500 hover:bg-green-500/10"
          }`}>
          {siteOn ? <><PowerOff className="w-4 h-4" /> Desligar site (modo manutenção)</> : <><Power className="w-4 h-4" /> Ligar site (voltar ao ar)</>}
        </button>
        <div className="mt-3 text-sm">
          Status atual: {siteOn
            ? <span className="text-green-500 font-bold">ONLINE — visível para todos</span>
            : <span className="text-destructive font-bold">OFFLINE — em manutenção para clientes</span>}
        </div>
      </section>

      <section className="bg-card border-2 border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-5 h-5 text-gold" />
          <h2 className="font-bold text-gold text-lg">Logo do site & cores automáticas</h2>
        </div>
        <p className="text-sm text-foreground/85 mb-4">
          Carregue uma nova logo. Extraímos automaticamente as cores dominantes para sugerir a paleta do site.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 items-start">
          <div className="sm:col-span-1 p-4 rounded-lg border-2 border-dashed border-gold/40 bg-background flex flex-col items-center justify-center text-center min-h-[180px]">
            {logoData ? (
              <img src={logoData} alt="Logo" className="max-h-32 object-contain mb-2" />
            ) : (
              <div className="text-xs text-foreground/70 mb-2">Nenhuma logo carregada</div>
            )}
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--gradient-red)] text-gold border-2 border-gold/60 text-xs font-bold cursor-pointer hover:text-white">
              <Plus className="w-3.5 h-3.5" /> Trocar logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && onLogoFile(e.target.files[0])} />
            </label>
            {logoData && (
              <button onClick={removeLogo} className="mt-2 text-xs text-destructive hover:underline">Remover</button>
            )}
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs uppercase font-bold text-foreground/80 mb-2">Cores detectadas</div>
            <div className="flex flex-wrap gap-2 mb-4 min-h-[44px]">
              {busy && <div className="text-xs text-muted-foreground">Analisando logo…</div>}
              {palette.map((c, i) => (
                <div key={i} className="w-10 h-10 rounded border-2 border-border" style={{ backgroundColor: c }} title={c} />
              ))}
              {!busy && palette.length === 0 && <div className="text-xs text-muted-foreground">Carregue uma logo para extrair a paleta.</div>}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button disabled={palette.length < 2} onClick={applyPaletteAsTheme} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--gradient-red)] text-gold border-2 border-gold/60 text-sm font-bold hover:text-white disabled:opacity-50">
                <Sparkles className="w-4 h-4" /> Aplicar paleta no site
              </button>
              <button onClick={resetTheme} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-border text-sm font-bold text-foreground hover:border-destructive">
                <X className="w-4 h-4" /> Restaurar tema padrão
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card border-2 border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="w-5 h-5 text-gold" />
          <h2 className="font-bold text-gold text-lg">Editor de Textos (substituições)</h2>
        </div>
        <p className="text-sm text-foreground/85 mb-4">
          Defina pares <strong>buscar → substituir</strong>. Cada par é aplicado imediatamente em todo o site.
        </p>
        <div className="space-y-2 mb-4">
          {pairs.map((p, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <input value={p.find} placeholder="Texto atual" onChange={(e) => { const n = [...pairs]; n[i] = { ...n[i], find: e.target.value }; savePairs(n); }}
                className="px-3 py-2 rounded border-2 border-border bg-background text-foreground text-sm focus:border-gold outline-none" />
              <input value={p.replace} placeholder="Novo texto" onChange={(e) => { const n = [...pairs]; n[i] = { ...n[i], replace: e.target.value }; savePairs(n); }}
                className="px-3 py-2 rounded border-2 border-border bg-background text-foreground text-sm focus:border-gold outline-none" />
              <button onClick={() => savePairs(pairs.filter((_, j) => j !== i))} className="px-3 py-2 rounded border-2 border-border hover:border-destructive text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => savePairs([...pairs, { find: "", replace: "" }])}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-gold/60 text-gold text-sm font-bold hover:bg-gold hover:text-gold-foreground">
          <Plus className="w-4 h-4" /> Adicionar par
        </button>
        <p className="mt-3 text-[11px] text-foreground/70">Dica: as substituições são aplicadas no navegador (live). Para mudanças permanentes em produção, edite o conteúdo do código.</p>
      </section>

      <section className="bg-card border-2 border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-gold" />
          <h2 className="font-bold text-gold text-lg">Assistente de Conteúdo (IA)</h2>
        </div>
        <p className="text-sm text-foreground/85 mb-4">
          Descreva como deseja reescrever os textos do site. A sugestão pode ser copiada/colada nos pares acima.
        </p>
        <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3}
          placeholder='Ex: "Reescreva o título do hero em tom mais empático e direto"'
          className="w-full mb-3 px-3 py-2.5 rounded-md border-2 border-border bg-background text-foreground focus:border-gold outline-none" />
        <button onClick={runAi} disabled={aiBusy || !aiPrompt.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--gradient-red)] text-gold border-2 border-gold/60 font-bold hover:text-white disabled:opacity-50">
          <Sparkles className="w-4 h-4" /> {aiBusy ? "Gerando…" : "Gerar sugestão"}
        </button>
        {aiOut && (
          <pre className="mt-4 p-3 rounded bg-background border border-border text-xs whitespace-pre-wrap text-foreground/90">{aiOut}</pre>
        )}
      </section>
    </div>
  );
}

/* ───────────── helpers ───────────── */

const PIE_COLORS = ["oklch(0.55 0.22 22)", "oklch(0.80 0.15 78)", "oklch(0.40 0.13 18)", "oklch(0.65 0.12 30)"];

function useLiveEvents() {
  const [events, setEvents] = useState<TrackEvent[]>([]);
  useEffect(() => {
    const refresh = () => setEvents(getEvents());
    refresh();
    window.addEventListener("tracker-update", refresh);
    window.addEventListener("storage", refresh);
    const id = setInterval(refresh, 2000);
    return () => { window.removeEventListener("tracker-update", refresh); window.removeEventListener("storage", refresh); clearInterval(id); };
  }, []);
  return events;
}

function countByName(events: TrackEvent[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const e of events) r[e.name] = (r[e.name] || 0) + 1;
  return r;
}
function groupBy(events: TrackEvent[], key: (e: TrackEvent) => string) {
  const m = new Map<string, number>();
  for (const e of events) { const k = key(e); m.set(k, (m.get(k) || 0) + 1); }
  return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
function pageConversion(events: TrackEvent[]) {
  const map = new Map<string, { visits: number; contacts: number }>();
  for (const e of events) {
    const k = e.path || "/";
    if (!map.has(k)) map.set(k, { visits: 0, contacts: 0 });
    const row = map.get(k)!;
    if (e.name === "PageView") row.visits++;
    if (e.name === "Contact") row.contacts++;
  }
  return Array.from(map, ([path, v]) => ({ path, ...v })).sort((a, b) => b.visits - a.visits).slice(0, 10);
}
function buildDailySeries(events: TrackEvent[], from: number, to: number) {
  const days: { day: string; ts: number; visits: number; contacts: number }[] = [];
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(0, 0, 0, 0);
  const totalDays = Math.min(60, Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1));
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    days.push({ day: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), ts: d.getTime(), visits: 0, contacts: 0 });
  }
  for (const e of events) {
    const idx = Math.floor((e.ts - start.getTime()) / 86400000);
    if (idx >= 0 && idx < days.length) {
      if (e.name === "PageView") days[idx].visits++;
      if (e.name === "Contact") days[idx].contacts++;
    }
  }
  return days;
}

function downloadCSV(events: TrackEvent[], m: ReturnType<typeof computeMetrics>, rangeLabel: string) {
  const lines: string[] = [];
  lines.push(`"Relatório - ${rangeLabel} - gerado em ${new Date().toISOString()}"`);
  lines.push("");
  lines.push('"KPI","Valor"');
  lines.push(`"Visitas (PageView)","${m.visits}"`);
  lines.push(`"Conversões (Contact)","${m.contacts}"`);
  lines.push(`"Taxa de Conversão (%)","${m.conversion.toFixed(2)}"`);
  lines.push(`"CTR (%)","${m.ctr.toFixed(2)}"`);
  if (m.pixelDriven) {
    lines.push(`"Custo estimado (R$)","${m.cost.toFixed(2)}"`);
    lines.push(`"CPM (R$)","${m.cpm.toFixed(2)}"`);
  }
  lines.push("");
  lines.push('"timestamp","datetime","event","path","device","lang"');
  for (const e of events) {
    lines.push(`"${e.ts}","${new Date(e.ts).toISOString()}","${e.name}","${e.path}","${e.device}","${e.lang}"`);
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `relatorio-${Date.now()}.csv`);
}

async function downloadImage(el: HTMLElement | null) {
  if (!el) return;
  const url = await htmlToImage.toPng(el, {
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "#1a1a2e",
    pixelRatio: 3,
    cacheBust: true,
  });
  const a = document.createElement("a"); a.href = url; a.download = `relatorio-${Date.now()}.png`; a.click();
}

async function downloadPDF(el: HTMLElement | null, rangeLabel: string) {
  if (!el) return;
  const dataUrl = await htmlToImage.toPng(el, {
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "#1a1a2e",
    pixelRatio: 3,
    cacheBust: true,
  });
  const img = new Image(); img.src = dataUrl;
  await new Promise((res) => { img.onload = res; });
  // A4 portrait with margins; scale image to fit width and paginate
  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const targetW = pageW - margin * 2;
  const ratio = targetW / img.width;
  const targetH = img.height * ratio;

  // header
  pdf.setFontSize(14); pdf.setTextColor(190, 150, 50);
  pdf.text(`Relatório de Performance — ${rangeLabel}`, margin, 18);
  pdf.setFontSize(9); pdf.setTextColor(110);
  pdf.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margin, 32);

  let drawn = 0;
  const usableH = pageH - margin - 40;
  while (drawn < targetH) {
    // remaining height in source image coords
    const remaining = targetH - drawn;
    const sliceH = Math.min(usableH, remaining);
    // draw the full image but offset upward so the "window" shows the right slice
    pdf.addImage(dataUrl, "PNG", margin, 40 - drawn, targetW, targetH, undefined, "FAST");
    // mask outside the usable area by drawing white rectangles
    pdf.setFillColor(255, 255, 255);
    // top mask (above 40)
    if (40 > 0) pdf.rect(0, 0, pageW, 40, "F");
    // bottom mask (below 40 + sliceH)
    pdf.rect(0, 40 + sliceH, pageW, pageH - (40 + sliceH), "F");
    drawn += sliceH;
    if (drawn < targetH) pdf.addPage();
  }
  pdf.save(`relatorio-${Date.now()}.pdf`);
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}

/** Extract up to 5 dominant colors using a small canvas + bucketed histogram. */
async function extractDominantColors(dataUrl: string): Promise<string[]> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = dataUrl;
  await new Promise((res) => { img.onload = res; });
  const W = 64, H = 64;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // skip near-white / near-black to find brand colors
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx > 245 && mn > 240) continue;
    if (mx < 25) continue;
    const k = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
    const cur = buckets.get(k) || { r: 0, g: 0, b: 0, n: 0 };
    cur.r += r; cur.g += g; cur.b += b; cur.n++;
    buckets.set(k, cur);
  }
  const top = Array.from(buckets.values()).sort((a, b) => b.n - a.n).slice(0, 5);
  return top.map((t) => rgbToHex(Math.round(t.r / t.n), Math.round(t.g / t.n), Math.round(t.b / t.n)));
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function hexToOklch(hex: string, forcedL?: number) {
  // Approximate hex → oklch (no precise color conversion; use HSL as a stand-in for hue+chroma)
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r / 255) h = ((g / 255 - b / 255) / d) % 6;
    else if (max === g / 255) h = (b / 255 - r / 255) / d + 2;
    else h = (r / 255 - g / 255) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const L = forcedL ?? l;
  const C = Math.min(0.22, s * 0.25);
  return `oklch(${L.toFixed(2)} ${C.toFixed(3)} ${h.toFixed(0)})`;
}

/* ───────────── VERSÕES (Histórico) ───────────── */
type VersionRow = { id: string; version: number; label: string | null; created_at: string };
function VersionsTab() {
  const list = useServerFn(listSiteVersions);
  const restore = useServerFn(restoreSiteVersion);
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = async () => {
    setBusy(true); setErr(null);
    try {
      const adminSession = sessionStorage.getItem("admindev_session") || "";
      const adminSignature = sessionStorage.getItem("admindev_token") || "";
      const res: any = await list({ data: { adminSession, adminSignature } });
      setRows(res.versions || []);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  useEffect(() => { reload(); }, []);

  const doRestore = async (id: string, version: number) => {
    if (!confirm(`Restaurar versão v${version}? Isso passa o site inteiro para o conteúdo dessa versão (uma nova versão será criada).`)) return;
    setBusy(true); setErr(null);
    try {
      const adminSession = sessionStorage.getItem("admindev_session") || "";
      const adminSignature = sessionStorage.getItem("admindev_token") || "";
      const res: any = await restore({ data: { adminSession, adminSignature, versionId: id } });
      await loadPublishedSiteState();
      alert(`✓ Versão restaurada. Nova versão atual: v${res.version}`);
      reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg); alert(`Erro ao restaurar: ${msg}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <section className="bg-card border-2 border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gold" />
            <h2 className="font-bold text-gold text-lg">Histórico de versões (banco de dados)</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={reload} disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border-2 border-border hover:border-gold text-sm font-bold">
              <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} /> Atualizar
            </button>
            <a href="/dbtest" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border-2 border-gold/60 text-gold text-sm font-bold hover:bg-gold/10">
              <Database className="w-4 h-4" /> Testar persistência
            </a>
          </div>
        </div>
        <p className="text-sm text-foreground/80 mb-4">
          Toda vez que você clica em <strong>Salvar versão atual</strong> ou no <strong>Salvamento prioritário</strong>,
          uma cópia completa do site (textos, imagens, logo, tema, WhatsApp, pixel) é gravada aqui no banco.
          Você pode restaurar qualquer versão a qualquer momento.
        </p>
        {err && <div className="mb-3 px-3 py-2 rounded bg-destructive/15 text-destructive text-sm border border-destructive/40">{err}</div>}
        {rows.length === 0 && !busy && (
          <p className="text-sm text-muted-foreground italic">Nenhuma versão salva ainda. Vá em "Edição Rápida" e clique em "Salvar versão atual".</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b-2 border-border">
                <th className="py-2 pr-3">Versão</th>
                <th className="py-2 pr-3">Rótulo</th>
                <th className="py-2 pr-3">Data</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-bold text-gold">v{r.version}</td>
                  <td className="py-2 pr-3">{r.label || <span className="text-muted-foreground italic">sem rótulo</span>}</td>
                  <td className="py-2 pr-3 text-foreground/80">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => doRestore(r.id, r.version)} disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border-2 border-gold/60 text-gold text-xs font-bold hover:bg-gold/10">
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
