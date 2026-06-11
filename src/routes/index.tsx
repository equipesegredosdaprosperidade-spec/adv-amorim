import { createFileRoute } from "@tanstack/react-router";
import logoAsset from "@/assets/amorim-logo.png.asset.json";
import heroAsset from "@/assets/amorim-hero.jpg.asset.json";
import aboutAsset from "@/assets/amorim-about.jpg.asset.json";
import { Scale, Users, ShieldCheck, FileText, Mail, MessageCircle, Instagram, ChevronDown, Menu, Calendar, ClipboardCheck, Search, Handshake, Clock, ArrowRight, Save, RotateCcw, X as XIcon, PowerOff, Landmark, Gavel, Phone, Building2, MapPin, Lock } from "lucide-react";
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
      { title: "A. Amorim Advogados Associados — Direito de Família, Empresarial e Previdenciário · São Paulo" },
      { name: "description", content: "Advocacia boutique em São Paulo especializada em Direito de Família, Empresarial e Previdenciário. Atendimento presencial no Brooklin e consultoria 100% digital para todo o Brasil." },
      { property: "og:title", content: "A. Amorim · Advogados Associados" },
      { property: "og:description", content: "Estratégia, transparência e excelência jurídica em São Paulo. Dr. Adriano Amorim." },
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
        name: "A. Amorim Advogados Associados",
        description: "Advocacia boutique em São Paulo · Direito de Família, Empresarial e Previdenciário",
        email: "contato@amorimadv.com.br",
        telephone: "+551150523118",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Rua Laplace, 74 – Conjunto 113 · Condomínio Baker Square",
          addressLocality: "São Paulo",
          addressRegion: "SP",
          postalCode: "04622-000",
          addressCountry: "BR",
        },
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
    { href: "#localizacao", label: "Localização" },
    { href: "#faq", label: "FAQ" },
  ];
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/95 border-b-2 border-gold/30">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <a href="#inicio" className="flex items-center gap-3">
          <img src={logoUrl} alt="A. Amorim Advogados Associados" className="h-12 w-12 object-contain rounded bg-white/5" width={48} height={48} />
          <div className="hidden sm:block leading-tight">
            <div className="font-serif text-base font-bold text-gold">A. Amorim</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-gold/80 font-semibold">Advogados Associados</div>
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
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" /> OAB/SP Ativo
          </div>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-6 text-white">
            Protegendo seus <span className="text-gold">direitos</span> com estratégia, transparência e excelência jurídica em São Paulo.
          </h1>
          <p className="text-lg text-white/90 mb-8 max-w-xl leading-relaxed">
            Advocacia boutique especializada em Direito de Família, Empresarial e Previdenciário, liderada pelo Dr. Adriano Amorim.
          </p>
          <div className="flex flex-wrap gap-4">
            <CTA className="animate-pulse-cta" source="hero">
              <MessageCircle className="w-5 h-5" /> Agendar Consulta via WhatsApp
            </CTA>
            <a href="#areas" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-md font-semibold text-sm border-2 border-gold/60 text-gold hover:bg-gold hover:text-gold-foreground transition-all">
              Áreas de Atuação
            </a>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6 text-sm text-white/85">
            <div><div className="font-serif text-2xl text-gold font-bold">+15 anos</div>de experiência</div>
            <div><div className="font-serif text-2xl text-gold font-bold">+1.200</div>casos concluídos</div>
            <div><div className="font-serif text-2xl text-gold font-bold">98%</div>satisfação dos clientes</div>
          </div>
        </div>
        <div className="relative animate-slide-right">
          <div className="absolute -inset-4 bg-[var(--gradient-gold)] opacity-30 blur-2xl rounded-3xl animate-pulse" style={{ animationDuration: "4s" }} />
          <div className="relative rounded-2xl overflow-hidden shadow-[var(--shadow-elegant)] border-4 border-gold/50 tilt-hover">
            <img src={hero} alt="Dr. Adriano Amorim — A. Amorim Advogados Associados" width={1280} height={853} className="w-full h-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}

const areas = [
  { icon: Users, title: "Direito de Família e Sucessões", desc: "Inventários, divórcios, planejamento sucessório, união estável e filiação socioafetiva com abordagem humanizada e sob medida." },
  { icon: Building2, title: "Direito Empresarial", desc: "Assessoria jurídica corporativa completa, gestão de contratos, societário, compliance e defesa estratégica de negócios." },
  { icon: ShieldCheck, title: "Direito Previdenciário", desc: "Planejamento previdenciário, pedidos e revisões de aposentadorias e concessão de benefícios junto ao INSS." },
];

function Areas() {
  return (
    <section id="areas" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-bold mb-3">O que resolvemos</div>
          <h2 className="text-3xl md:text-4xl text-gold font-bold mb-4">Áreas de Atuação</h2>
          <p className="text-foreground/85">Atendimento técnico, estratégico e individualizado em cada especialidade.</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
    { icon: MessageCircle, title: "1. Primeiro Contato", desc: "Envie uma mensagem pelo WhatsApp ou e-mail descrevendo brevemente seu cenário ou a necessidade da sua empresa. Retornamos com total sigilo." },
    { icon: Calendar, title: "2. Agendamento", desc: "Marcamos uma reunião presencial em nossa sede em São Paulo ou por videoconferência para clientes de todo o Brasil, no horário mais conveniente." },
    { icon: Search, title: "3. Análise do Caso", desc: "Avaliamos minuciosamente seu histórico, analisamos a documentação apresentada e esclarecemos todas as suas dúvidas com clareza jurídica." },
    { icon: ClipboardCheck, title: "4. Plano Jurídico", desc: "Desenhamos estratégias customizadas, prazos realistas e apresentamos uma proposta com honorários totalmente transparentes." },
    { icon: Handshake, title: "5. Contratação", desc: "Formalizamos o contrato de prestação de serviços de forma segura. A partir daí, nossa equipe assume a condução com atualizações constantes do seu processo." },
  ];
  return (
    <section id="consultoria" className="py-24 bg-[var(--gradient-surface)]">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-bold mb-3">Consultoria Jurídica</div>
          <h2 className="text-3xl md:text-4xl text-gold font-bold mb-4">Como entrar em contato</h2>
          <p className="text-foreground/85">Entendemos que procurar auxílio jurídico exige segurança. Explicamos exatamente o que acontece desde o primeiro contato — com clareza, transparência e sem burocracia.</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <a href={buildWaUrl()} target="_blank" rel="noopener noreferrer" onClick={() => trackContact("consultoria-card-whatsapp")} className="p-6 bg-card rounded-xl border-2 border-border glow-hover group">
            <MessageCircle className="w-8 h-8 text-gold mb-3 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-gold mb-1">WhatsApp</div>
            <div className="text-sm text-foreground/85">(11) 99538-2010 · Resposta rápida</div>
          </a>
          <a href="tel:+551150523118" onClick={() => track("Contact", { source: "consultoria-card-phone", channel: "phone" })} className="p-6 bg-card rounded-xl border-2 border-border glow-hover">
            <Phone className="w-8 h-8 text-gold mb-3" />
            <div className="font-bold text-gold mb-1">Telefone</div>
            <div className="text-sm text-foreground/85">(11) 5052-3118 · Atendimento em horário comercial</div>
          </a>
          <a href="mailto:contato@amorimadv.com.br" onClick={() => track("Contact", { source: "consultoria-card-email", channel: "email" })} className="p-6 bg-card rounded-xl border-2 border-border glow-hover">
            <Mail className="w-8 h-8 text-gold mb-3" />
            <div className="font-bold text-gold mb-1">E-mail</div>
            <div className="text-sm text-foreground/85">contato@amorimadv.com.br</div>
          </a>
        </div>

        <Reveal className="mb-10">
          <div className="relative mx-auto max-w-3xl text-center px-6 py-6 rounded-xl border-2 border-gold/40 bg-card/60 backdrop-blur-sm">
            <div className="text-xs uppercase tracking-[0.25em] text-gold font-bold mb-2 flex items-center justify-center gap-2">
              <ArrowRight className="w-3.5 h-3.5" /> O que acontece em seguida
            </div>
            <p className="text-foreground/90 leading-relaxed">
              Depois que você escolhe um canal acima, seguimos um processo claro, ágil e estratégico de <strong className="text-gold">5 passos</strong>. Cada etapa garante sigilo, ética e foco total no seu resultado — sem burocracia.
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
          <CTA source="consultoria-bottom"><MessageCircle className="w-4 h-4" /> Quero falar com um especialista</CTA>
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
            <img src={aboutImg} alt="Dr. Adriano Amorim — A. Amorim Advogados Associados" loading="lazy" width={800} height={1000} className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-6 -right-6 bg-[var(--gradient-gold)] text-gold-foreground px-6 py-4 rounded-xl shadow-lg hidden md:block animate-pop-in">
            <div className="font-serif text-xl font-bold">OAB/SP</div>
            <div className="text-sm font-bold">Ativo</div>
          </div>
        </Reveal>
        <Reveal delay={120} className="lg:col-span-3">
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-bold mb-3">Quem somos</div>
          <h2 className="text-3xl md:text-4xl text-gold font-bold mb-6">Expertise Multidisciplinar e Compromisso com Resultados.</h2>
          <p className="text-foreground/90 leading-relaxed mb-5">
            O escritório <strong className="text-gold">A. Amorim Advogados Associados</strong> é uma banca boutique estruturada para oferecer assessoria jurídica de alta performance. Fundado pelo <strong className="text-gold">Dr. Adriano Amorim</strong>, o escritório consolidou sua história unindo rigor técnico à proximidade com o cliente.
          </p>
          <p className="text-foreground/85 leading-relaxed mb-8">
            Atendemos de forma personalizada tanto demandas complexas de pessoas físicas quanto os interesses estratégicos de corporações, operando com total transparência e foco em soluções definitivas.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-secondary rounded-lg border border-gold/30 glow-hover">
              <Scale className="w-5 h-5 text-gold mb-2" />
              <div className="text-xs text-foreground/80">Regulamentação</div>
              <div className="font-bold text-gold text-sm">OAB/SP</div>
            </div>
            <div className="p-4 bg-secondary rounded-lg border border-gold/30 glow-hover">
              <Clock className="w-5 h-5 text-gold mb-2" />
              <div className="text-xs text-foreground/80">Experiência</div>
              <div className="font-bold text-gold text-sm">+15 anos</div>
            </div>
            <div className="p-4 bg-secondary rounded-lg border border-gold/30 glow-hover">
              <Landmark className="w-5 h-5 text-gold mb-2" />
              <div className="text-xs text-foreground/80">Atendimento</div>
              <div className="font-bold text-gold text-sm">Nacional</div>
            </div>
          </div>
          <CTA source="about"><MessageCircle className="w-4 h-4" /> Quero falar com o especialista</CTA>
        </Reveal>
      </div>
    </section>
  );
}

function Differentials() {
  const items = [
    { icon: Users, title: "Atenção Singular", desc: "Cada cliente recebe uma estratégia desenhada sob medida para o seu caso." },
    { icon: Lock, title: "Sigilo e Confiança", desc: "Proteção absoluta de dados e informações patrimoniais ou empresariais." },
    { icon: FileText, title: "Honorários Transparentes", desc: "Alinhamento claro de custos desde a contratação, sem surpresas futuras." },
    { icon: Clock, title: "Sem Burocracia", desc: "Resolução focada na agilidade, clareza e eficiência jurídica." },
  ];
  return (
    <section className="py-20 bg-[var(--gradient-primary)] text-white relative overflow-hidden">
      <div className="absolute inset-0 shine-gold opacity-30" />
      <div className="relative max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-12">
          <Scale className="w-12 h-12 text-gold mx-auto mb-4 animate-pop-in" />
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-white">Por que escolher nosso escritório</h2>
          <p className="text-white/90">Atendimento presencial na capital paulista e consultoria 100% digital estruturada para todo o Brasil.</p>
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
            <div className="text-gold font-bold mb-1">A. Amorim Advogados Associados</div>
            <div className="text-white/85">CNPJ 23.256.957/0001-07</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Localizacao() {
  return (
    <section id="localizacao" className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-bold mb-3">Onde estamos</div>
          <h2 className="text-3xl md:text-4xl text-gold font-bold mb-4">Sede do Escritório</h2>
          <p className="text-foreground/85">Atendimento em ambiente corporativo moderno na Zona Sul de São Paulo, de fácil acesso e com estacionamento no local.</p>
        </Reveal>
        <div className="grid lg:grid-cols-5 gap-8">
          <Reveal className="lg:col-span-2 space-y-5">
            <div className="p-6 bg-card rounded-xl border-2 border-gold/30 glow-hover">
              <MapPin className="w-7 h-7 text-gold mb-3" />
              <div className="font-bold text-gold mb-2">Endereço Comercial</div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                Rua Laplace, 74 – Conjunto 113<br />
                Condomínio Baker Square<br />
                Brooklin Paulista, São Paulo - SP<br />
                CEP 04622-000
              </p>
            </div>
            <div className="p-6 bg-card rounded-xl border-2 border-border glow-hover">
              <Clock className="w-7 h-7 text-gold mb-3" />
              <div className="font-bold text-gold mb-2">Horário de Atendimento</div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                Segunda a Sexta · 09h00 às 18h00<br />
                <span className="text-xs text-foreground/70">Reuniões com hora marcada.</span>
              </p>
            </div>
            <CTA className="w-full" source="localizacao"><MessageCircle className="w-4 h-4" /> Agendar visita presencial</CTA>
          </Reveal>
          <Reveal delay={120} className="lg:col-span-3">
            <div className="rounded-xl overflow-hidden border-4 border-gold/30 shadow-[var(--shadow-elegant)] min-h-[400px]">
              <iframe
                title="Mapa - A. Amorim Advogados Associados"
                src="https://www.google.com/maps?q=Rua+Laplace,+74+Brooklin+Paulista,+S%C3%A3o+Paulo&output=embed"
                width="100%"
                height="100%"
                style={{ minHeight: 400, border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const faqs = [
  { q: "Como funciona o atendimento online?", a: "Realizamos reuniões por vídeo (Google Meet, Zoom ou WhatsApp). A análise e o envio de documentos ocorrem de forma digital e totalmente segura, atendendo clientes em qualquer lugar do Brasil com a mesma excelência do presencial." },
  { q: "Onde o escritório está localizado?", a: "Nossa sede fica no Brooklin Paulista, em São Paulo - SP. Também possuímos unidade de atendimento na Vila Gertrudes e prestamos assessoria remota para demandas de outras regiões." },
  { q: "Quais documentos preciso para dar início ao meu caso?", a: "Para Direito de Família ou Previdenciário, documentos pessoais (RG/CPF) e comprovantes específicos do caso. Para o Empresarial, o contrato social da empresa. Fornecemos um checklist exato logo após a primeira consulta." },
  { q: "Como são definidos os honorários?", a: "Os valores são calculados com base na complexidade e nos objetivos da demanda, seguindo rigorosamente os parâmetros da OAB/SP. Apresentamos propostas transparentes e com facilidades de pagamento adequadas a cada perfil." },
  { q: "Qual é o tempo de resposta do escritório?", a: "Nossos canais de atendimento retornam contatos de forma ágil, priorizando urgências empresariais ou familiares imediatamente dentro do horário comercial." },
  { q: "Vocês atendem pelo convênio da assistência judiciária gratuita da OAB?", a: "Não. Como um escritório boutique focado em atendimento corporativo e especializado de alta performance, nossas consultas e atuações são estritamente particulares." },
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
          <CTA source="faq"><MessageCircle className="w-4 h-4" /> Consultar disponibilidade</CTA>
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
            <img src={logoUrl} alt="Logo" className="h-14 w-14 object-contain rounded bg-white/5" loading="lazy" width={56} height={56} />
            <div>
              <div className="font-serif text-lg font-bold text-white">A. Amorim</div>
              <div className="text-xs uppercase tracking-[0.18em] text-gold font-bold">Advogados Associados</div>
            </div>
          </div>
          <p className="text-sm text-white/85 leading-relaxed">
            A. Amorim Advogados Associados<br />
            OAB/SP Regulamentada · CNPJ 23.256.957/0001-07
          </p>
        </div>
        <div>
          <h4 className="font-serif text-gold font-bold mb-4">Endereço</h4>
          <div className="space-y-3 text-sm text-white/85">
            <div className="flex gap-3">
              <MapPin className="w-4 h-4 text-gold flex-shrink-0 mt-1" />
              <div>
                Rua Laplace, 74 – Conjunto 113<br />
                Condomínio Baker Square<br />
                Brooklin Paulista, São Paulo - SP<br />
                CEP 04622-000
              </div>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-serif text-gold font-bold mb-4">Contato</h4>
          <div className="space-y-3 text-sm">
            <a href="tel:+551150523118" onClick={() => track("Contact", { source: "footer-phone", channel: "phone" })} className="flex items-center gap-3 text-white/90 hover:text-gold transition-colors">
              <Phone className="w-4 h-4 text-gold" /> (11) 5052-3118
            </a>
            <a href={buildWaUrl()} target="_blank" rel="noopener noreferrer" onClick={() => trackContact("footer-wa")} className="flex items-center gap-3 text-white/90 hover:text-gold transition-colors">
              <MessageCircle className="w-4 h-4 text-gold" /> WhatsApp (11) 99538-2010
            </a>
            <a href="mailto:contato@amorimadv.com.br" onClick={() => track("Contact", { source: "footer", channel: "email" })} className="flex items-center gap-3 text-white/90 hover:text-gold transition-colors">
              <Mail className="w-4 h-4 text-gold" />contato@amorimadv.com.br
            </a>
            <a href="https://instagram.com/a.amorimadv" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-md border-2 border-gold/40 text-white hover:bg-gold hover:text-gold-foreground transition-colors">
              <Instagram className="w-4 h-4" /> @a.amorimadv
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/15 pt-6 text-center text-xs text-white/60">
        © {new Date().getFullYear()} A. Amorim Advogados Associados. Todos os direitos reservados.
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
    return () => { offEdit(); offDb(); };
  }, []);

  if (!enabled && !editing) return <OfflinePage />;

  return (
    <div className="min-h-screen bg-background">
      {editing && <EditBar onExit={() => { disableInlineEdit(); setEditing(false); }} />}
      <Header />
      <main>
        <Hero />
        <Areas />
        <Consultoria />
        <About />
        <Differentials />
        <Localizacao />
        <FAQ />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
