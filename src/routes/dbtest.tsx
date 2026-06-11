import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { testDatabasePersistence } from "@/lib/site-state.functions";
import { isAdminAuthed } from "@/lib/site-config";
import { Database, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dbtest")({
  // Skip SSR entirely: admin tooling must never ship HTML to anonymous visitors.
  ssr: false,
  head: () => ({ meta: [{ title: "Teste de Persistência" }, { name: "robots", content: "noindex,nofollow" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAdminAuthed()) {
      throw redirect({ to: "/admindev" });
    }
  },
  component: DbTestPage,
});

function DbTestPage() {
  const run = useServerFn(testDatabasePersistence);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const doTest = async () => {
    setBusy(true); setErr(null); setResult(null);
    const token = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      const adminSession = sessionStorage.getItem("admindev_session") || "";
      const adminSignature = sessionStorage.getItem("admindev_token") || "";
      const res: any = await run({ data: { adminSession, adminSignature, token } });
      setResult(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-7 h-7 text-gold" />
          <h1 className="text-2xl font-bold text-gold">Teste de Persistência no Banco</h1>
        </div>
        <p className="text-foreground/80 mb-6">
          Este teste grava um registro temporário com um token único no banco e
          imediatamente faz a leitura desse mesmo registro. Se o token gravado e o
          token lido forem idênticos, a persistência real está funcionando — sem
          depender de cache, localStorage, ou recarregar o site.
        </p>
        <button onClick={doTest} disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-gold text-background border-2 border-gold font-bold hover:brightness-110 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          {busy ? "Gravando e lendo…" : "Executar teste agora"}
        </button>

        {err && (
          <div className="mt-6 p-4 rounded border-2 border-destructive/60 bg-destructive/10 text-destructive">
            <div className="flex items-center gap-2 font-bold mb-1"><AlertCircle className="w-4 h-4" /> Falha</div>
            <pre className="whitespace-pre-wrap text-xs">{err}</pre>
          </div>
        )}

        {result && (
          <div className={`mt-6 p-4 rounded border-2 ${result.match ? "border-green-500/60 bg-green-500/10 text-green-400" : "border-amber-500/60 bg-amber-500/10 text-amber-400"}`}>
            <div className="flex items-center gap-2 font-bold mb-2">
              {result.match ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {result.match ? `✓ Persistência REAL confirmada (${result.elapsedMs}ms)` : "Token não bateu — persistência com problemas"}
            </div>
            <pre className="text-xs whitespace-pre-wrap bg-background/50 p-3 rounded mt-2 overflow-x-auto text-foreground/80">
{JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
