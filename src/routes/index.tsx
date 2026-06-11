import { createFileRoute } from "@tanstack/react-router";
import logoAsset from "@/assets/allan-logo.jpg.asset.json";
import heroAsset from "@/assets/allan-hero.jpg.asset.json";
import aboutAsset from "@/assets/allan-about.jpg.asset.json";
import { Scale, Users, ShieldCheck, FileText, Mail, MessageCircle, Instagram, ChevronDown, Menu, Calendar, ClipboardCheck, Search, Handshake, Clock, ArrowRight, Save, RotateCcw, X as XIcon, PowerOff, Landmark, Gavel, Banknote, Building2, Globe2, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buildWaUrl, getLogoOverride, getThemeOverride, applyThemeOverride, getSiteEnabled, snapshotContent, restoreContentSnapshot, clearContentOverrides, isAdminAuthed, onSiteEdit, loadPublishedSiteState, subscribeToPublishedSiteState, onSyncChange, type SyncState } from "@/lib/site-config";
import { track, trackContact } from "@/lib/tracker";
import { applyContentOverrides, canEnableEdit, enableInlineEdit, disableInlineEdit } from "@/lib/inline-editor";

const logo = logoAsset.url;
const hero = heroAsset.url;
const aboutImg = aboutAsset.url;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Allan Ribeiro — Advocacia Bancária · Defesa do Devedor em todo o Brasil" },
      { name: "description", content: "Advocacia especializada em Direito Bancário: defesa contra busca e apreensão, ações revisionais, juros abusivos e blindagem patrimonial. Atendimento 100% digital em todo o Brasil." },
      { property: "og:title", content: "Allan Ribeiro · Advocacia Bancária" },
      { property: "og:description", content: "Protegendo seu patrimônio contra abusos bancários e endividamento. Atendimento nacional." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: heroAsset.url },
      { property: "twitter:image", content: heroAsset.url },
    ],
    links: [
      { rel: "canonical", href: "/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LegalService",
        name: "Allan Ribeiro Oliveira Advocacia (ARO Advogados)",
        description: "Advocacia especializada em Direito Bancário · Defesa do Devedor com atuação em todo o Brasil",
        email: "contato@aroadvogados.com.br",
        areaServed: "BR",
        url: "/",
      }),
    }],
  }),
  component: Index,
});

/* Reveal on scroll */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { el.classList.add("is-visible"); io.unobserve(el); } });
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

function CTA({ children, className = "", variant = "red", source = "cta" }: { children: React.ReactNode; className?: string; variant?: "red" | "gold" | "outline"; source?: string }) {
  const base = "inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md font-semibold text-sm tracking-wide transition-all duration-300 hover:-translate-y-0.5 cursor-pointer";
  const styles = variant === "red"
    ? "bg-[var(--gradient-red)] text-gold border-2 border-gold/60 shadow-[var(--shadow-elegant)] hover:shadow-xl hover:text-white"
    : variant === "gold"
      ? "bg-[var(--gradient-gold)] text-gold-foreground shadow-[var(--shadow-gold)] hover:shadow-lg"
      : "border-2 border-gold text-gold hover:bg-gold hover:text-gold-foreground";
  return (
    <a href={buildWaUrl()} target="_blank" rel="noopener noreferrer"
       onClick={() => trackContact(source)}
       className={`${base} ${styles} ${className}`}>
      {children}
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(getLogoOverride() || logo);
  useEffect(() => {
    const refresh = () => setLogoUrl(getLogoOverride() || logo);
    window.addEventListener("site-config-change", refresh);
    return () => window.removeEventListener("site-config-change", refresh);
  }, []);
  const links = [
    { href: "#inicio", label: "Início" },
    { href: "#areas", label: "Áreas" },
    { href: "#consultoria", label: "Consultoria" },
    { href: "#sobre", label: "Sobre" },
    { href: "#processo", label: "Como Funciona" },
    { href: "#atendimento", label: "Atendimento" },
    { href: "#faq", label: "FAQ" },
  ];
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/95 border-b-2 border-gold/30">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <a href="#inicio" className="flex items-center gap-3">
          <img src={logoUrl} alt="Allan Ribeiro Advocacia Bancária" className="h-12 w-12 object-contain rounded" width={48} height={48} />
          <div className="hidden sm:block leading-tight">
            <div className="font-serif text-base font-bold text-gold">Allan Ribeiro</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-gold/80 font-semibold">Advocacia Bancária</div>
          </div>
        </a>
        <div className="flex items-center gap-3">
          <CTA className="hidden sm:inline-flex !py-2.5 !px-5" source="header-cta">
            <MessageCircle className="w-4 h-4" /> Falar com Advogado
          </CTA>
          <button onClick={() => setOpen(!open)} className="p-2 text-gold rounded-md border border-gold/40 hover:bg-gold/10 transition-colors" aria-label="Menu" aria-expanded={open}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-gold/30 bg-background animate-float-in">
          <div className="max-w-7xl mx-auto px-6 py-2 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                 className="block px-3 py-3 text-sm font-semibold text-foreground hover:text-gold transition-colors">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[var(--gradient-primary)]" />
      <div className="absolute inset-0 opacity-[0.10]" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, var(--gold) 0%, transparent 50%)" }} />
      <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28 grid lg:grid-cols-2 gap-12 items-center">
        <div className="animate-slide-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/15 border border-gold/40 text-xs uppercase tracking-[0.2em] mb-6 text-gold font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" /> Especialista em Direito Bancário
          </div>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-6 text-white">
            Protegendo seu <span className="text-gold">patrimônio</span> contra abusos bancários e endividamento.
          </h1>
          <p className="text-lg text-white/90 mb-8 max-w-xl leading-relaxed">
            Advocacia especializada em Defesa do Devedor, Juros Abusivos e Blindagem de Bens, liderada pelo Dr. Allan Ribeiro.
          </p>
          <div className="flex flex-wrap gap-4">
            <CTA className="animate-pulse-cta" source="hero">
              <MessageCircle className="w-5 h-5" /> Analisar Meu Caso no WhatsApp
            </CTA>
            <a href="#areas" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-md font-semibold text-sm border-2 border-gold/60 text-gold hover:bg-gold hover:text-gold-foreground transition-all">
              Áreas de Atuação
            </a>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6 text-sm text-white/85">
            <div><div className="font-serif text-2xl text-gold font-bold">Brasil</div>atendimento nacional</div>
            <div><div className="font-serif text-2xl text-gold font-bold">+1000</div>famílias defendidas</div>
            <div><div className="font-serif text-2xl text-gold font-bold">100%</div>digital e seguro</div>
          </div>
        </div>
        <div className="relative animate-slide-right">
          <div className="absolute -inset-4 bg-[var(--gradient-gold)] opacity-30 blur-2xl rounded-3xl animate-pulse" style={{ animationDuration: "4s" }} />
          <div className="relative rounded-2xl overflow-hidden shadow-[var(--shadow-elegant)] border-4 border-gold/50 tilt-hover">
            <img src={hero} alt="Identidade visual Allan Ribeiro Advogado" width={1280} height={853} className="w-full h-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}

const areas = [
  { icon: ShieldCheck, title: "Defesa contra Busca e Apreensão", desc: "Intervenção rápida para proteger seu veículo ou maquinário das garras bancárias." },
  { icon: FileText, title: "Ações Revisionais de Contratos", desc: "Análise minuciosa de financiamentos, cartões e empréstimos para eliminar juros abusivos." },
  { icon: Gavel, title: "Defesa de Execuções e Penhoras", desc: "Blindagem patrimonial de contas, imóveis e salários contra bloqueios judiciais." },
  { icon: Building2, title: "Passivo Bancário Empresarial", desc: "Renegociação estratégica de grandes dívidas (Capital de Giro, Conta Garantida) para salvar empresas." },
];

function Areas() {
  return (
    <section id="areas" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-bold mb-3">O que resolvemos</div>
          <h2 className="text-3xl md:text-4xl text-gold font-bold mb-4">Especialidades em Direito Bancário</h2>
          <p className="text-foreground/85">Atendimento técnico, ágil e focado na proteção dos seus bens.</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {areas.map((a, i) => (
            <Reveal key={a.title} delay={i * 90}>
              <div className="group h-full p-8 bg-card rounded-xl border-2 border-border glow-hover">
                <div className="w-12 h-12 rounded-lg bg-[var(--gradient-gold)] flex items-center justify-center mb-5 group-hover:rotate-6 group-hover:scale-110 transition-transform duration-500">
                  <a.icon className="w-6 h-6 text-gold-foreground" />
                </div>
                <h3 className="font-serif text-lg text-gold font-bold mb-2">{a.title}</h3>
                <p className="text-sm text-foreground/85 leading-relaxed">{a.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Consultoria() {
  const steps = [
    { icon: MessageCircle, title: "1. Primeiro Contato", desc: "Você envia uma mensagem detalhando sua dívida ou o processo que recebeu. Nosso time analisa os dados com sigilo absoluto." },
    { icon: Search, title: "2. Análise Preliminar", desc: "Identificamos imediatamente se há risco de penhora, leilão ou busca e apreensão para agir com urgência." },
    { icon: Calendar, title: "3. Consulta Online", desc: "Realizamos uma reunião digital para apresentar a estratégia exata de defesa e os direitos que o banco violou." },
    { icon: ClipboardCheck, title: "4. Plano de Blindagem", desc: "Apresentamos proposta com honorários transparentes, formas de pagamento facilitadas e o plano para reduzir sua dívida." },
    { icon: Handshake, title: "5. Ação Integrada", desc: "Assinamos o contrato digitalmente e nossa equipe assume as negociações ou defesas judiciais contra a instituição financeira." },
  ];
  return (
    <section id="consultoria" className="py-24 bg-[var(--gradient-surface)]">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-bold mb-3">Consultoria Jurídica</div>
          <h2 className="text-3xl md:text-4xl text-gold font-bold mb-4">Como entrar em contato</h2>
          <p className="text-foreground/85">Sabemos que lidar com dívidas e cobranças gera muita ansiedade. Explicamos exatamente o que acontece desde o primeiro contato — sem burocracia, sem juridiquês.</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <a href={buildWaUrl()} target="_blank" rel="noopener noreferrer" onClick={() => trackContact("consultoria-card-whatsapp")} className="p-6 bg-card rounded-xl border-2 border-border glow-hover group">
            <MessageCircle className="w-8 h-8 text-gold mb-3 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-gold mb-1">WhatsApp</div>
            <div className="text-sm text-foreground/85">Resposta imediata · fale agora com o Dr. Allan</div>
          </a>
          <a href={buildWaUrl()} target="_blank" rel="noopener noreferrer" onClick={() => trackContact("consultoria-card-digital")} className="p-6 bg-card rounded-xl border-2 border-border glow-hover">
            <Globe2 className="w-8 h-8 text-gold mb-3" />
            <div className="font-bold text-gold mb-1">Atendimento Digital</div>
            <div className="text-sm text-foreground/85">Videoconferências agendadas para todo o Brasil</div>
          </a>
          <a href="mailto:contato@aroadvogados.com.br" onClick={() => track("Contact", { source: "consultoria-card-email", channel: "email" })} className="p-6 bg-card rounded-xl border-2 border-border glow-hover">
            <Mail className="w-8 h-8 text-gold mb-3" />
            <div className="font-bold text-gold mb-1">E-mail</div>
            <div className="text-sm text-foreground/85">contato@aroadvogados.com.br</div>
          </a>
        </div>

        <Reveal className="mb-10">
          <div className="relative mx-auto max-w-3xl text-center px-6 py-6 rounded-xl border-2 border-gold/40 bg-card/60 backdrop-blur-sm">
            <div className="text-xs uppercase tracking-[0.25em] text-gold font-bold mb-2 flex items-center justify-center gap-2">
              <ArrowRight className="w-3.5 h-3.5" /> O que acontece em seguida
            </div>
            <p className="text-foreground/90 leading-relaxed">
              Depois que você clica em um dos canais, iniciamos um processo ágil de <strong className="text-gold">5 passos</strong> para conter as ameaças do banco. Cada etapa garante transparência e respeito ao seu momento financeiro.
            </p>
          </div>
        </Reveal>

        <div id="processo" className="grid md:grid-cols-5 gap-4 relative">
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 110} className="relative">
              <div className="step-card relative h-full p-6 bg-card rounded-xl border-2 border-border">
                {i < steps.length - 1 && <span className="step-connector hidden md:block" />}
                <div className="step-icon w-12 h-12 rounded-full bg-[var(--gradient-gold)] flex items-center justify-center mb-4 shadow-[var(--shadow-gold)]">
                  <s.icon className="w-6 h-6 text-gold-foreground" />
                </div>
                <h3 className="font-serif text-base text-gold font-bold mb-2">{s.title}</h3>
                <p className="text-xs text-foreground/85 leading-relaxed">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 text-center">
          <CTA source="consultoria-bottom"><MessageCircle className="w-4 h-4" /> Quero falar com o especialista</CTA>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="sobre" className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-5 gap-12 items-center">
        <Reveal className="lg:col-span-2 relative">
          <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-[var(--shadow-elegant)] border-4 border-gold/30 tilt-hover">
            <img src={aboutImg} alt="Dr. Allan Ribeiro — Advogado especialista em Direito Bancário" loading="lazy" width={800} height={1000} className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-6 -right-6 bg-[var(--gradient-gold)] text-gold-foreground px-6 py-4 rounded-xl shadow-lg hidden md:block animate-pop-in">
            <div className="font-serif text-xl font-bold">Defesa do</div>
            <div className="text-sm font-bold">Devedor</div>
          </div>
        </Reveal>
        <Reveal delay={120} className="lg:col-span-3">
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-bold mb-3">Quem somos</div>
          <h2 className="text-3xl md:text-4xl text-gold font-bold mb-6">Combate à Abusividade Bancária com Abrangência Nacional.</h2>
          <p className="text-foreground/90 leading-relaxed mb-5">
            O escritório liderado pelo <strong className="text-gold">Dr. Allan Ribeiro</strong> atua de forma focada no Direito Bancário, unindo tecnologia de ponta e conhecimento técnico para enfrentar grandes instituições financeiras de igual para igual. Através de um modelo de <strong className="text-gold">Advocacia Digital</strong>, o escritório derruba fronteiras geográficas para defender o patrimônio de pessoas físicas e empresas em qualquer tribunal do país.
          </p>
          <p className="text-foreground/85 leading-relaxed mb-8">
            Atuação pautada pela combatividade e pela ética inegociável — tratando cada caso com a urgência exigida por quem sofre com cobranças abusivas.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-secondary rounded-lg border border-gold/30 glow-hover">
              <Globe2 className="w-5 h-5 text-gold mb-2" />
              <div className="text-xs text-foreground/80">Abrangência</div>
              <div className="font-bold text-gold text-sm">Atuação Nacional</div>
            </div>
            <div className="p-4 bg-secondary rounded-lg border border-gold/30 glow-hover">
              <Landmark className="w-5 h-5 text-gold mb-2" />
              <div className="text-xs text-foreground/80">Foco</div>
              <div className="font-bold text-gold text-sm">Direito Bancário</div>
            </div>
            <div className="p-4 bg-secondary rounded-lg border border-gold/30 glow-hover">
              <Globe2 className="w-5 h-5 text-gold mb-2" />
              <div className="text-xs text-foreground/80">Modelo</div>
              <div className="font-bold text-gold text-sm">100% Digital</div>
            </div>
          </div>
          <CTA source="about"><MessageCircle className="w-4 h-4" /> Proteger meu patrimônio hoje</CTA>
        </Reveal>
      </div>
    </section>
  );
}

function Differentials() {
  const items = [
    { icon: Clock, title: "Urgência Bancária", desc: "Prazos contra bancos são vitais; respondemos rápido." },
    { icon: Lock, title: "Sigilo Bancário e Jurídico", desc: "Suas informações corporativas ou pessoais totalmente protegidas." },
    { icon: Banknote, title: "Cálculos Especializados", desc: "Análise matemática real para provar juros e taxas abusivas no tribunal." },
    { icon: Users, title: "Atendimento Descomplicado", desc: "Explicamos suas chances reais sem falsas promessas ou termos difíceis." },
  ];
  return (
    <section className="py-20 bg-[var(--gradient-primary)] text-white relative overflow-hidden">
      <div className="absolute inset-0 shine-gold opacity-30" />
      <div className="relative max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-12">
          <Scale className="w-12 h-12 text-gold mx-auto mb-4 animate-pop-in" />
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-white">Por que escolher nossa advocacia bancária</h2>
          <p className="text-white/90">Consultoria digital ágil e segura para clientes em todo o território nacional.</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 100}>
              <div className="p-6 rounded-xl border border-gold/30 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:-translate-y-1 transition-all">
                <it.icon className="w-8 h-8 text-gold mb-3" />
                <div className="font-bold text-gold mb-1">{it.title}</div>
                <div className="text-sm text-white/85">{it.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <div className="inline-block px-8 py-4 rounded-lg border-2 border-gold/40 bg-white/5 text-sm">
            <div className="text-gold font-bold mb-1">Allan Ribeiro Oliveira Advocacia</div>
            <div className="text-white/85">ARO Advogados · Direito Bancário com atuação nacional</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Atendimento() {
  return (
    <section id="atendimento" className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-bold mb-3">Onde atendemos</div>
          <h2 className="text-3xl md:text-4xl text-gold font-bold mb-4">Escritório Digital de Alta Performance</h2>
          <p className="text-foreground/85">Sem filas, sem deslocamentos. Sua defesa contratada, assinada e protocolada do conforto da sua casa ou empresa.</p>
        </Reveal>
        <div className="grid lg:grid-cols-5 gap-8">
          <Reveal className="lg:col-span-2 space-y-5">
            <div className="p-6 bg-card rounded-xl border-2 border-gold/30 glow-hover">
              <Globe2 className="w-7 h-7 text-gold mb-3" />
              <div className="font-bold text-gold mb-2">Abrangência Nacional</div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                Atendimento em todos os estados do Brasil via tribunais eletrônicos (PJe, e-SAJ, Projudi).
              </p>
            </div>
            <div className="p-6 bg-card rounded-xl border-2 border-border glow-hover">
              <Clock className="w-7 h-7 text-gold mb-3" />
              <div className="font-bold text-gold mb-2">Horário de Atendimento</div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                Segunda a Sexta · 08h00 às 18h00 (Horário de Brasília)<br />
                <span className="text-xs text-foreground/70">Atendimentos urgentes em regime especial.</span>
              </p>
            </div>
            <CTA className="w-full" source="atendimento"><MessageCircle className="w-4 h-4" /> Agendar análise contratual</CTA>
          </Reveal>
          <Reveal delay={120} className="lg:col-span-3">
            <div className="rounded-xl overflow-hidden border-4 border-gold/30 shadow-[var(--shadow-elegant)] min-h-[400px] bg-[var(--gradient-primary)] flex items-center justify-center p-10">
              <div className="text-center">
                <Globe2 className="w-24 h-24 text-gold mx-auto mb-6 animate-pop-in" />
                <div className="text-2xl font-serif font-bold text-gold mb-2">Brasil Inteiro</div>
                <p className="text-white/85 text-sm max-w-sm mx-auto leading-relaxed">
                  Conectados a todos os tribunais do país. Onde houver banco cobrando, nossa defesa chega.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/40 text-xs text-gold uppercase tracking-[0.2em] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" /> Tribunais eletrônicos integrados
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const faqs = [
  { q: "Como funciona o atendimento online?", a: "É extremamente simples e seguro. Fazemos reuniões por vídeo e você nos envia fotos ou PDFs dos contratos pelo WhatsApp. Protocolamos sua defesa direto no sistema eletrônico do juiz de qualquer lugar do país." },
  { q: "O banco pode tomar meu único veículo ou minha casa?", a: "Bancos utilizam forte pressão, mas a lei protege bens essenciais como ferramentas de trabalho e o bem de família. Avaliamos seu caso para criar uma barreira jurídica de proteção imediatamente." },
  { q: "O que são juros abusivos e como identificá-los?", a: "São taxas cobradas acima da média de mercado estipulada pelo Banco Central. Fazemos um cálculo pericial no seu contrato para descobrir se você está pagando o dobro do que deveria." },
  { q: "Recebi uma intimação judicial de cobrança, o que fazer?", a: "O prazo para defesa costuma ser curto (muitas vezes de apenas 15 dias). Não ignore a notificação, pois a falta de resposta dá o direito ao banco de bloquear suas contas de forma imediata." },
  { q: "Quanto custa para analisar meu contrato?", a: "O contato inicial para entender a sua situação e verificar a viabilidade da defesa é rápido. Se houver direito a ser defendido, estruturamos os honorários de forma justa." },
  { q: "Vocês limpam o nome do SPC/Serasa?", a: "Nosso foco é a revisão da dívida e a defesa judicial. Em muitos casos, ao contestarmos a legalidade da cobrança em juízo, conseguimos liminares para suspender a negativação do seu nome." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24 bg-[var(--gradient-surface)]">
      <div className="max-w-3xl mx-auto px-6">
        <Reveal className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-bold mb-3">FAQ</div>
          <h2 className="text-3xl md:text-4xl text-gold font-bold">Perguntas Frequentes</h2>
        </Reveal>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <Reveal key={i} delay={i * 60}>
              <div className="border-2 border-border rounded-xl overflow-hidden bg-card">
                <button onClick={() => setOpen(open === i ? null : i)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-secondary transition-colors">
                  <span className="font-bold text-gold pr-4">{f.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gold flex-shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
                </button>
                {open === i && (
                  <div className="px-6 pb-5 text-foreground/90 leading-relaxed animate-float-in">{f.a}</div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <CTA source="faq"><MessageCircle className="w-4 h-4" /> Falar com um advogado bancário</CTA>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const [logoUrl, setLogoUrl] = useState<string>(getLogoOverride() || logo);
  useEffect(() => {
    const refresh = () => setLogoUrl(getLogoOverride() || logo);
    window.addEventListener("site-config-change", refresh);
    return () => window.removeEventListener("site-config-change", refresh);
  }, []);
  return (
    <footer className="bg-[var(--gradient-primary)] text-white pt-16 pb-8 border-t-4 border-gold">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-10 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <img src={logoUrl} alt="Logo" className="h-14 w-14 object-contain rounded" loading="lazy" width={56} height={56} />
            <div>
              <div className="font-serif text-lg font-bold text-white">Allan Ribeiro</div>
              <div className="text-xs uppercase tracking-[0.18em] text-gold font-bold">Advocacia Bancária</div>
            </div>
          </div>
          <p className="text-sm text-white/85 leading-relaxed">
            Allan Ribeiro Oliveira Advocacia (ARO Advogados)<br />
            Atendimento Digital em Todo o Brasil
          </p>
        </div>
        <div>
          <h4 className="font-serif text-gold font-bold mb-4">Atendimento</h4>
          <div className="space-y-3 text-sm text-white/85">
            <div className="flex gap-3">
              <Globe2 className="w-4 h-4 text-gold flex-shrink-0 mt-1" />
              <div><strong className="text-white">Nacional:</strong> Atuação digital unificada em todos os estados do Brasil</div>
            </div>
            <div className="flex gap-3">
              <Clock className="w-4 h-4 text-gold flex-shrink-0 mt-1" />
              <div><strong className="text-white">Horário:</strong> Seg a Sex · 08h às 18h (Brasília)</div>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-serif text-gold font-bold mb-4">Contato</h4>
          <div className="space-y-3 text-sm">
            <a href={buildWaUrl()} target="_blank" rel="noopener noreferrer" onClick={() => trackContact("footer-wa")} className="flex items-center gap-3 text-white/90 hover:text-gold transition-colors">
              <MessageCircle className="w-4 h-4 text-gold" /> WhatsApp · Falar com o Dr. Allan
            </a>
            <a href="mailto:contato@aroadvogados.com.br" onClick={() => track("Contact", { source: "footer", channel: "email" })} className="flex items-center gap-3 text-white/90 hover:text-gold transition-colors">
              <Mail className="w-4 h-4 text-gold" />contato@aroadvogados.com.br
            </a>
            <a href="https://instagram.com/allanribeiro.adv" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-md border-2 border-gold/40 text-white hover:bg-gold hover:text-gold-foreground transition-colors">
              <Instagram className="w-4 h-4" /> @allanribeiro.adv
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/15 pt-6 text-center text-xs text-white/60">
        © {new Date().getFullYear()} Allan Ribeiro Advocacia Bancária. Todos os direitos reservados.
      </div>
    </footer>
  );
}

function FloatingWhatsApp() {
  return (
    <a href={buildWaUrl()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
       onClick={() => trackContact("floating-button")}
       className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 px-5 h-14 rounded-full bg-[var(--gradient-red)] text-gold border-2 border-gold/70 shadow-2xl hover:scale-105 hover:text-white transition-all animate-pulse-cta font-semibold text-sm">
      <MessageCircle className="w-6 h-6" /> WhatsApp
    </a>
  );
}

function EditBar({ onExit }: { onExit: () => void }) {
  const [savedFlash, setSavedFlash] = useState(false);
  const save = () => {
    snapshotContent();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };
  const restore = () => {
    if (restoreContentSnapshot()) window.location.reload();
    else alert("Nenhuma versão anterior salva ainda.");
  };
  const reset = () => {
    if (confirm("Restaurar TODOS os textos originais? Esta ação não pode ser desfeita.")) {
      clearContentOverrides();
      window.location.reload();
    }
  };
  return (
    <div className="edit-bar" data-no-edit>
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-orange-500 text-white text-[11px] font-bold uppercase tracking-wide">Modo edição</span>
        <span className="opacity-80 hidden sm:inline">Clique em qualquer texto para editar. Mudanças são salvas automaticamente.</span>
        <SiteSyncPill />
      </div>
      <div className="flex items-center gap-2">
        <button className="b-primary" onClick={save}><Save className="w-3.5 h-3.5 inline mr-1" />{savedFlash ? "Snapshot salvo ✓" : "Salvar versão"}</button>
        <button className="b-ghost" onClick={restore}><RotateCcw className="w-3.5 h-3.5 inline mr-1" />Restaurar última</button>
        <button className="b-danger" onClick={reset}>Restaurar original</button>
        <button className="b-ghost" onClick={onExit}><XIcon className="w-3.5 h-3.5 inline mr-1" />Sair</button>
      </div>
    </div>
  );
}

function SiteSyncPill() {
  const [s, setS] = useState<SyncState>({ status: "idle", at: 0, version: null });
  useEffect(() => onSyncChange(setS), []);
  const label =
    s.status === "saving" ? "Salvando…" :
    s.status === "saved" ? "Salvo no banco ✓" :
    s.status === "synced" ? "Sincronizado" :
    s.status === "conflict" ? "Conflito — resolvendo" :
    s.status === "error" ? "Erro no banco" : "Aguardando";
  const color =
    s.status === "error" ? "bg-red-600" :
    s.status === "conflict" ? "bg-amber-500" :
    s.status === "saving" ? "bg-blue-500" :
    (s.status === "saved" || s.status === "synced") ? "bg-green-600" : "bg-gray-500";
  return (
    <span className={`hidden md:inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded text-[11px] font-bold text-white ${color}`} title={s.message || ""}>
      <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
      {label}{s.version !== null && <span className="opacity-80">v{s.version}</span>}
    </span>
  );
}

function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[var(--gradient-primary)] text-center">
      <div className="max-w-lg">
        <PowerOff className="w-16 h-16 text-gold mx-auto mb-6" />
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gold mb-4">Site em manutenção</h1>
        <p className="text-white/85 leading-relaxed mb-6">
          Estamos temporariamente fora do ar para manutenção. Volte em breve.
          Para urgências, entre em contato pelo WhatsApp.
        </p>
        <a href={buildWaUrl()} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[var(--gradient-red)] text-gold border-2 border-gold/60 font-bold">
          <MessageCircle className="w-5 h-5" /> Falar no WhatsApp
        </a>
      </div>
    </div>
  );
}

function Index() {
  const [editing, setEditing] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const t = getThemeOverride();
    if (t) applyThemeOverride(t);
    setEnabled(getSiteEnabled());
    const onCfg = () => setEnabled(getSiteEnabled());
    window.addEventListener("site-config-change", onCfg);
    track("PageView", { page: "home" });
    track("ViewContent", { page: "home" });
    loadPublishedSiteState()
      .catch((err) => console.error("Falha ao carregar conteúdo publicado:", err))
      .finally(() => requestAnimationFrame(() => {
        applyContentOverrides();
        setEnabled(getSiteEnabled());
      }));
    if (canEnableEdit()) {
      setEditing(true);
      setTimeout(() => enableInlineEdit(), 50);
    }
    return () => window.removeEventListener("site-config-change", onCfg);
  }, []);

  useEffect(() => {
    let rafId: number | null = null;
    const reapply = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        applyContentOverrides();
        setEnabled(getSiteEnabled());
      });
    };
    const offEdit = onSiteEdit(() => reapply());
    const offDb = subscribeToPublishedSiteState(reapply);
    const mo = new MutationObserver(reapply);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      offEdit();
      offDb();
      mo.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const exitEdit = () => {
    disableInlineEdit();
    setEditing(false);
    const u = new URL(window.location.href);
    u.searchParams.delete("edit");
    window.history.replaceState({}, "", u.toString());
  };

  if (!enabled && !isAdminAuthed()) return <OfflinePage />;

  return (
    <div className="min-h-screen">
      {editing && <EditBar onExit={exitEdit} />}
      <Header />
      <main>
        <Hero />
        <Areas />
        <Consultoria />
        <About />
        <Differentials />
        <Atendimento />
        <FAQ />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
