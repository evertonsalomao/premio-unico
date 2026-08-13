import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  FileSpreadsheet,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const formatCurrency = (value: string | number | null | undefined) =>
  Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (value: Date | string | number) =>
  new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const toLocalDateTimeInput = (value: Date = new Date()) => {
  const timezoneOffset = value.getTimezoneOffset();
  return new Date(value.getTime() - timezoneOffset * 60_000).toISOString().slice(0, 16);
};

const periodLabel: Record<string, string> = { day: "Hoje", week: "Esta semana", month: "Este mês", custom: "Período personalizado" };

const toLocalDateInput = (value: Date = new Date()) => {
  const timezoneOffset = value.getTimezoneOffset();
  return new Date(value.getTime() - timezoneOffset * 60_000).toISOString().slice(0, 10);
};

type AuthMode = "login" | "register" | "recover";
type SessionUser = NonNullable<ReturnType<typeof useAuth>["user"]>;
type Tab = "overview" | "launch" | "lenses" | "team";

type LensForm = { category: string; name: string; rewardValue: string; notes: string };
const emptyLens: LensForm = { category: "", name: "", rewardValue: "", notes: "" };
type EditableSale = { id: number; osNumber: string; lensId: number; lensName: string; quantity: number; saleAmount: string | number; saleDate: Date | string | number; storeName?: string | null; observation?: string | null };

function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryUser, setRecoveryUser] = useState("");
  const [recoveryQuestion, setRecoveryQuestion] = useState("");
  const [form, setForm] = useState({ username: "", password: "", name: "", storeUnit: "", email: "", securityQuestion: "", securityAnswer: "", newPassword: "" });
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({
    onSuccess: async () => { await utils.auth.me.invalidate(); toast.success("Acesso liberado."); },
    onError: err => toast.error(err.message),
  });
  const register = trpc.auth.register.useMutation({
    onSuccess: async ({ firstUserIsMaster }) => { await utils.auth.me.invalidate(); toast.success(firstUserIsMaster ? "Cadastro criado. Você é o primeiro Master." : "Cadastro criado como Vendedor."); },
    onError: err => toast.error(err.message),
  });
  const recovery = trpc.auth.recoveryQuestion.useQuery({ username: recoveryUser.trim().toLowerCase() }, { enabled: false, retry: false });
  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: async () => { await utils.auth.me.invalidate(); toast.success("Senha redefinida com sucesso."); setMode("login"); setRecoveryStep(1); },
    onError: err => toast.error(err.message),
  });

  const setField = (field: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [field]: value }));
  const goRecover = async () => {
    if (!recoveryUser.trim()) return toast.error("Informe seu usuário.");
    const result = await recovery.refetch();
    if (!result.data?.found) return toast.error("Usuário não encontrado ou sem pergunta-chave cadastrada.");
    setRecoveryQuestion(result.data.question ?? "");
    setRecoveryStep(2);
  };

  return (
    <main className="industrial-shell flex min-h-screen items-center py-6 sm:py-10">
      <div className="container relative grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
        <section className="ink-block hard-shadow relative flex min-h-[530px] flex-col justify-between overflow-hidden p-7 sm:p-12">
          <div className="absolute -right-16 -top-20 h-64 w-64 border-[34px] border-white/10" />
          <div className="relative">
            <div className="mono-label mb-7 text-white/50">SISTEMA INTERNO / 2026</div>
            <div className="mb-6 max-w-[360px] bg-[#fff200] p-2">
              <img src="/logo-oticas-unico.png" alt="Óticas Único" className="block h-auto w-full" />
            </div>
            <h1 className="max-w-xl text-5xl font-bold leading-[.93] tracking-[-.07em] sm:text-7xl">FOLHA<br /><span className="text-white/55">DE PRÊMIO</span></h1>
            <p className="mt-8 max-w-md text-sm leading-6 text-white/60">Controle diário de vendas elegíveis, lentes premiadas e resultados da equipe em um só lugar.</p>
          </div>
          <div className="relative grid grid-cols-2 gap-3 border-t border-white/20 pt-5 sm:grid-cols-3">
            <div><div className="mono-label text-white/40">LANÇAMENTO</div><div className="mt-2 text-sm">RÁPIDO</div></div>
            <div><div className="mono-label text-white/40">PRÊMIO</div><div className="mt-2 text-sm">AUTOMÁTICO</div></div>
            <div className="hidden sm:block"><div className="mono-label text-white/40">RELATÓRIO</div><div className="mt-2 text-sm">IMEDIATO</div></div>
          </div>
        </section>

        <section className="paper-block hard-shadow flex items-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="section-mark mb-5 text-muted-foreground">ACESSO RESTRITO</div>
            {mode === "login" && (
              <>
                <h2 className="text-3xl font-bold tracking-[-.05em]">Entrar no sistema</h2>
                <p className="mt-2 text-sm text-muted-foreground">Use seu usuário e senha para acessar a folha.</p>
                <form className="mt-8 space-y-5" onSubmit={event => { event.preventDefault(); login.mutate({ username: form.username, password: form.password }); }}>
                  <div><Label htmlFor="login-user" className="mono-label">USUÁRIO</Label><Input id="login-user" className="field-industrial mt-2 h-12" autoComplete="username" value={form.username} onChange={event => setField("username", event.target.value)} /></div>
                  <div><Label htmlFor="login-password" className="mono-label">SENHA</Label><Input id="login-password" className="field-industrial mt-2 h-12" type="password" autoComplete="current-password" value={form.password} onChange={event => setField("password", event.target.value)} /></div>
                  <Button className="h-12 w-full rounded-none bg-[#ed1c24] text-[#fff200] hover:bg-[#c9151c]" disabled={login.isPending}>{login.isPending ? "VALIDANDO..." : "ENTRAR"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
                </form>
                <div className="mt-6 text-center text-xs"><button className="underline underline-offset-4" onClick={() => setMode("recover")}>Esqueci minha senha</button></div>
              </>
            )}
            {mode === "register" && (
              <>
                <h2 className="text-3xl font-bold tracking-[-.05em]">Criar acesso</h2>
                <p className="mt-2 text-sm text-muted-foreground">A pergunta-chave será usada para recuperar sua senha.</p>
                <form className="mt-7 space-y-4" onSubmit={event => { event.preventDefault(); register.mutate(form); }}>
                  <div className="grid gap-4 sm:grid-cols-2"><div><Label className="mono-label">NOME</Label><Input className="field-industrial mt-2" value={form.name} onChange={event => setField("name", event.target.value)} /></div><div><Label className="mono-label">USUÁRIO</Label><Input className="field-industrial mt-2" autoComplete="username" value={form.username} onChange={event => setField("username", event.target.value)} /></div></div>
                  <div><Label className="mono-label">UNIDADE</Label><Input className="field-industrial mt-2" placeholder="Ex.: Unidade Centro" value={form.storeUnit} onChange={event => setField("storeUnit", event.target.value)} required /></div>
                  <div><Label className="mono-label">E-MAIL <span className="normal-case tracking-normal text-muted-foreground">(opcional)</span></Label><Input className="field-industrial mt-2" type="email" value={form.email} onChange={event => setField("email", event.target.value)} /></div>
                  <div><Label className="mono-label">SENHA</Label><Input className="field-industrial mt-2" type="password" autoComplete="new-password" value={form.password} onChange={event => setField("password", event.target.value)} /></div>
                  <div><Label className="mono-label">PERGUNTA-CHAVE</Label><Input className="field-industrial mt-2" placeholder="Ex.: Qual era o nome do seu primeiro pet?" value={form.securityQuestion} onChange={event => setField("securityQuestion", event.target.value)} /></div>
                  <div><Label className="mono-label">RESPOSTA DA PERGUNTA</Label><Input className="field-industrial mt-2" value={form.securityAnswer} onChange={event => setField("securityAnswer", event.target.value)} /></div>
                  <Button className="h-12 w-full rounded-none bg-[#ed1c24] text-[#fff200] hover:bg-[#c9151c]" disabled={register.isPending}>{register.isPending ? "CRIANDO..." : "CRIAR ACESSO"}<UserPlus className="ml-2 h-4 w-4" /></Button>
                </form>
                <button className="mt-5 w-full text-center text-xs underline underline-offset-4" onClick={() => setMode("login")}>Voltar para o login</button>
              </>
            )}
            {mode === "recover" && (
              <>
                <h2 className="text-3xl font-bold tracking-[-.05em]">Recuperar acesso</h2>
                <p className="mt-2 text-sm text-muted-foreground">Confirme sua pergunta-chave para criar uma nova senha.</p>
                {recoveryStep === 1 ? <div className="mt-8 space-y-5"><div><Label className="mono-label">USUÁRIO</Label><Input className="field-industrial mt-2 h-12" value={recoveryUser} onChange={event => setRecoveryUser(event.target.value)} /></div><Button className="h-12 w-full rounded-none bg-[#ed1c24] text-[#fff200] hover:bg-[#c9151c]" onClick={goRecover} disabled={recovery.isFetching}>CONTINUAR <ArrowRight className="ml-2 h-4 w-4" /></Button></div> : <form className="mt-8 space-y-5" onSubmit={event => { event.preventDefault(); reset.mutate({ username: recoveryUser, securityAnswer: form.securityAnswer, newPassword: form.newPassword }); }}><div className="border-l-4 border-[#242424] bg-[#e3e2df] p-4"><div className="mono-label mb-2 text-muted-foreground">PERGUNTA-CHAVE</div><p className="text-sm font-semibold">{recoveryQuestion}</p></div><div><Label className="mono-label">RESPOSTA</Label><Input className="field-industrial mt-2 h-12" value={form.securityAnswer} onChange={event => setField("securityAnswer", event.target.value)} /></div><div><Label className="mono-label">NOVA SENHA</Label><Input className="field-industrial mt-2 h-12" type="password" value={form.newPassword} onChange={event => setField("newPassword", event.target.value)} /></div><Button className="h-12 w-full rounded-none bg-[#ed1c24] text-[#fff200] hover:bg-[#c9151c]" disabled={reset.isPending}>REDEFINIR SENHA <KeyRound className="ml-2 h-4 w-4" /></Button></form>}
                <button className="mt-5 w-full text-center text-xs underline underline-offset-4" onClick={() => { setMode("login"); setRecoveryStep(1); }}>Voltar para o login</button>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Sidebar({ tab, setTab, user, onLogout, isMaster }: { tab: Tab; setTab: (tab: Tab) => void; user: SessionUser; onLogout: () => void; isMaster: boolean }) {
  const items: { tab: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { tab: "overview", label: "Resumo", icon: LayoutDashboard },
    { tab: "launch", label: "Lançar venda", icon: ReceiptText },
    ...(isMaster ? [{ tab: "lenses" as Tab, label: "Tabela de lentes", icon: PackagePlus }, { tab: "team" as Tab, label: "Vendedores", icon: Users }] : []),
  ];
  return <aside className="hidden min-h-screen w-[250px] shrink-0 flex-col bg-[#ed1c24] text-[#fff200] lg:flex"><div className="border-b border-white/20 p-4"><div className="bg-[#fff200] p-1.5"><img src="/logo-oticas-unico.png" alt="Óticas Único" className="block h-auto w-full" /></div><div className="mono-label mt-4 text-white/65">FOLHA DE PRÊMIO</div></div><nav className="flex-1 space-y-1 p-4">{items.map(item => { const Icon = item.icon; return <button key={item.tab} onClick={() => setTab(item.tab)} className={`flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left text-sm transition ${tab === item.tab ? "border-white bg-white/10" : "border-transparent text-white/55 hover:bg-white/5 hover:text-white"}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</nav><div className="border-t border-white/15 p-4"><div className="mb-4 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center bg-white/15 text-sm font-bold">{(user.name ?? "?").slice(0, 1).toUpperCase()}</div><div className="min-w-0"><div className="truncate text-sm font-semibold">{user.name}</div><div className="mono-label mt-1 text-white/40">{isMaster ? "MASTER" : "VENDEDOR"}</div></div></div><button onClick={onLogout} className="flex w-full items-center gap-2 border border-white/15 px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white"><LogOut className="h-3.5 w-3.5" />SAIR DO SISTEMA</button></div></aside>;
}

function MobileNav({ tab, setTab, isMaster }: { tab: Tab; setTab: (tab: Tab) => void; isMaster: boolean }) {
  const items: { tab: Tab; label: string; icon: typeof LayoutDashboard }[] = [{ tab: "overview", label: "Resumo", icon: LayoutDashboard }, { tab: "launch", label: "Lançar", icon: ReceiptText }, ...(isMaster ? [{ tab: "lenses" as Tab, label: "Lentes", icon: PackagePlus }, { tab: "team" as Tab, label: "Equipe", icon: Users }] : [])];
  return <div className="sticky top-0 z-30 flex overflow-x-auto border-b border-[#c9151c] bg-[#ed1c24] text-[#fff200] lg:hidden">{items.map(item => { const Icon = item.icon; return <button key={item.tab} onClick={() => setTab(item.tab)} className={`flex min-w-[100px] flex-1 flex-col items-center gap-1 border-b-2 px-3 py-3 text-[10px] ${tab === item.tab ? "border-white" : "border-transparent text-white/50"}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</div>;
}

function StatCard({ label, value, detail, dark = false }: { label: string; value: string; detail: string; dark?: boolean }) {
  return <div className={`hard-shadow-sm p-5 ${dark ? "ink-block" : "paper-block"}`}><div className={`mono-label ${dark ? "text-white/50" : "text-muted-foreground"}`}>{label}</div><div className="mt-4 text-3xl font-bold tracking-[-.06em]">{value}</div><div className={`mt-2 text-xs ${dark ? "text-white/55" : "text-muted-foreground"}`}>{detail}</div></div>;
}

function Dashboard({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [reportSellerId, setReportSellerId] = useState<number | undefined>();
  const isMaster = user.role === "master" || user.role === "admin";
  return <div className="flex min-h-screen bg-[#fffbea]"><Sidebar tab={tab} setTab={setTab} user={user} onLogout={onLogout} isMaster={isMaster} /><div className="min-w-0 flex-1"><MobileNav tab={tab} setTab={setTab} isMaster={isMaster} /><main className="container py-6 sm:py-9"><DashboardHeader tab={tab} user={user} onLogout={onLogout} />{tab === "overview" && <Overview user={user} isMaster={isMaster} setTab={setTab} initialSellerId={reportSellerId} />}{tab === "launch" && <LaunchSale user={user} />}{tab === "lenses" && isMaster && <LensManager />}{tab === "team" && isMaster && <TeamManager onViewReport={sellerId => { setReportSellerId(sellerId); setTab("overview"); }} />}</main></div></div>;
}

function DashboardHeader({ tab, user, onLogout }: { tab: Tab; user: SessionUser; onLogout: () => void }) {
  const title = { overview: "Resumo de premiação", launch: "Lançar nova venda", lenses: "Tabela de lentes premiadas", team: "Gestão de vendedores" }[tab];
  return <header className="mb-8 flex items-start justify-between gap-4"><div><div className="section-mark text-muted-foreground">FOLHA DE PRÊMIO / {new Date().getFullYear()}</div><h1 className="mt-3 text-3xl font-bold tracking-[-.06em] sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-muted-foreground">Olá, {user.name?.split(" ")[0] ?? "vendedor"}. Acompanhe seus lançamentos com clareza.</p></div><div className="flex items-center gap-2 lg:hidden"><button onClick={onLogout} className="border border-[#aaa] bg-white p-2" aria-label="Sair"><LogOut className="h-4 w-4" /></button><Menu className="hidden h-5 w-5" /></div></header>;
}

function useReportInput(selectedSeller?: number, period = "month", customFrom = "", customTo = "") {
  return useMemo(() => {
    const now = new Date();
    const from = new Date(now);
    const to = new Date(now);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    if (period === "week") { const day = from.getDay() || 7; from.setDate(from.getDate() - day + 1); }
    if (period === "month") from.setDate(1);
    if (period === "custom" && customFrom && customTo) {
      const [fromYear, fromMonth, fromDay] = customFrom.split("-").map(Number);
      const [toYear, toMonth, toDay] = customTo.split("-").map(Number);
      from.setFullYear(fromYear, fromMonth - 1, fromDay);
      from.setHours(0, 0, 0, 0);
      to.setFullYear(toYear, toMonth - 1, toDay);
      to.setHours(23, 59, 59, 999);
    }
    return { from: from.toISOString(), to: to.toISOString(), sellerId: selectedSeller };
  }, [period, selectedSeller, customFrom, customTo]);
}

function Overview({ user, isMaster, setTab, initialSellerId }: { user: SessionUser; isMaster: boolean; setTab: (tab: Tab) => void; initialSellerId?: number }) {
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState(() => toLocalDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customTo, setCustomTo] = useState(() => toLocalDateInput());
  const [customRangeApplied, setCustomRangeApplied] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<number | undefined>(initialSellerId);
  const customRangeValid = Boolean(customFrom) && Boolean(customTo) && customFrom <= customTo;
  const reportInput = useReportInput(isMaster ? selectedSeller : undefined, period, customRangeApplied ? customFrom : "", customRangeApplied ? customTo : "");
  const reportQueryEnabled = period !== "custom" || customRangeApplied;
  const report = trpc.sales.report.useQuery(reportInput, { enabled: reportQueryEnabled });
  const utils = trpc.useUtils();
  const sellers = trpc.users.list.useQuery(undefined, { enabled: isMaster });
  const removeSale = trpc.sales.delete.useMutation({ onSuccess: async () => { await utils.sales.report.invalidate(); setEditingSale(null); toast.success("Lançamento excluído."); } });
  const data = report.data;
  const rows = data?.rows ?? [];
  const [editingSale, setEditingSale] = useState<EditableSale | null>(null);
  const openEditSale = (sale: EditableSale) => { setEditingSale(sale); window.setTimeout(() => document.getElementById("edit-sale-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };

  const selectedSellerObj = (sellers.data ?? []).find(s => s.id === selectedSeller);
  const sellerFilterLabel = selectedSellerObj ? `${selectedSellerObj.name} (${selectedSellerObj.username})` : (isMaster ? "Todos os vendedores" : (user.name ?? user.username));
  const storeFilterLabel = rows.length > 0 ? Array.from(new Set(rows.map(r => r.storeName || "Óticas Único"))).join(", ") : "Óticas Único";
  const reportPeriodLabel = period === "custom" ? (customRangeApplied ? `${formatDate(`${customFrom}T00:00:00`)} até ${formatDate(`${customTo}T00:00:00`)}` : "Aguardando pesquisa") : periodLabel[period];
  const applyCustomPeriod = () => {
    if (!customRangeValid) return toast.error("Informe um intervalo válido: a data inicial deve ser anterior ou igual à data final.");
    setCustomRangeApplied(true);
    toast.success("Pesquisando o período informado.");
  };

  const exportXlsx = () => {
    const headerData = [
      ["FOLHA DE PRÊMIO ÓTICAS ÚNICO"],
      [`Período: ${reportPeriodLabel} | Gerado em: ${new Date().toLocaleString("pt-BR")}`],
      [`Vendedor(a): ${sellerFilterLabel}`],
      [`Loja(s): ${storeFilterLabel}`],
      [],
    ];
    const sheetData = rows.map(row => ({
      Data: formatDate(row.saleDate),
      OS: row.osNumber,
      Vendedor: row.sellerName,
      Loja: row.storeName || "Óticas Único",
      Lente: row.lensName,
      Quantidade: row.quantity,
      "Valor da venda": Number(row.saleAmount),
      "Prêmio": Number(row.rewardAmount),
      Observação: row.observation ?? "",
    }));
    const sheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(sheet, headerData, { origin: "A1" });
    XLSX.utils.sheet_add_json(sheet, sheetData, { origin: "A6" });
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Premiação");
    XLSX.writeFile(book, `folha-premio-${period}.xlsx`);
    toast.success("Excel gerado com cabeçalho de vendedor e loja.");
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("FOLHA DE PRÊMIO ÓTICAS ÚNICO", 14, 15);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${reportPeriodLabel} | Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 22);
    doc.text(`Vendedor(a): ${sellerFilterLabel}`, 14, 28);
    doc.text(`Loja(s): ${storeFilterLabel}`, 14, 34);
    doc.text(`Total de Vendas: ${formatCurrency(data?.totalSales)} | Prêmio Total: ${formatCurrency(data?.totalReward)}`, 14, 40);

    let y = 50;
    doc.setFont("helvetica", "bold");
    doc.text("Data", 14, y);
    doc.text("OS", 34, y);
    doc.text("Vendedor", 52, y);
    doc.text("Lente", 90, y);
    doc.text("Prêmio", 175, y, { align: "right" });
    y += 3;
    doc.setLineWidth(0.3);
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    rows.slice(0, 20).forEach(row => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(formatDate(row.saleDate), 14, y);
      doc.text(row.osNumber, 34, y);
      doc.text((row.sellerName || "").slice(0, 18), 52, y);
      // Exibe o nome completo da lente exatamente como na tabela, quebrando linha se necessário
      const splitLens = doc.splitTextToSize(row.lensName, 78);
      doc.text(splitLens, 90, y);
      doc.text(formatCurrency(row.rewardAmount), 196, y, { align: "right" });
      y += Math.max(7, splitLens.length * 5);
    });

    doc.save(`folha-premio-${period}.pdf`);
    toast.success("PDF gerado com o nome completo da lente.");
  };
  const printReport = () => { window.print(); };
  const shareWhatsApp = () => { const text = `*FOLHA DE PRÊMIO ÓTICAS ÚNICO*\nPeríodo: ${reportPeriodLabel}\nVendas: ${data?.totalQuantity ?? 0}\nValor vendido: ${formatCurrency(data?.totalSales)}\nPrêmio total: ${formatCurrency(data?.totalReward)}`; window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"); };

  return <div className="space-y-7"><div id="edit-sale-panel"><EditSalePanel key={editingSale?.id ?? "empty"} sale={editingSale} onClose={() => setEditingSale(null)} /></div><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-1 border border-[#aaa] bg-white p-1">{["day", "week", "month", "custom"].map(value => <button type="button" key={value} onClick={() => { setPeriod(value); if (value === "custom") setCustomRangeApplied(false); }} className={`px-3 py-2 text-xs font-semibold sm:px-4 ${period === value ? "bg-[#ed1c24] text-[#fff200]" : "text-muted-foreground hover:bg-[#efefed]"}`}>{value === "custom" ? "Personalizado" : periodLabel[value]}</button>)}</div>{period === "custom" && <div className="flex flex-wrap items-center gap-2 border border-[#aaa] bg-white p-2"><Label htmlFor="custom-from" className="mono-label text-muted-foreground">DE</Label><Input id="custom-from" type="date" className="field-industrial h-9 w-[135px] px-2 text-xs" value={customFrom} onChange={event => { setCustomFrom(event.target.value); setCustomRangeApplied(false); }} /><Label htmlFor="custom-to" className="mono-label text-muted-foreground">ATÉ</Label><Input id="custom-to" type="date" className="field-industrial h-9 w-[135px] px-2 text-xs" value={customTo} onChange={event => { setCustomTo(event.target.value); setCustomRangeApplied(false); }} /><Button type="button" className="h-9 rounded-none bg-[#ed1c24] px-3 text-xs text-[#fff200] hover:bg-[#c9151c]" onClick={applyCustomPeriod} disabled={!customRangeValid}>PESQUISAR</Button></div>}</div>{period === "custom" && !customRangeValid && <p className="w-full text-xs font-semibold text-[#a62b20]">A data inicial deve ser igual ou anterior à data final.</p>}<div className="flex flex-wrap gap-2"><Button variant="outline" className="rounded-none bg-white" onClick={exportXlsx} disabled={period === "custom" && !customRangeApplied}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button><Button variant="outline" className="rounded-none bg-white" onClick={exportPdf} disabled={period === "custom" && !customRangeApplied}><FileText className="mr-2 h-4 w-4" />PDF</Button><Button variant="outline" className="rounded-none bg-white" onClick={() => report.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button><Button variant="outline" className="rounded-none bg-white" onClick={printReport}><Printer className="mr-2 h-4 w-4" />Imprimir</Button><Button className="rounded-none bg-[#ed1c24] text-[#fff200] hover:bg-[#c9151c]" onClick={shareWhatsApp} disabled={period === "custom" && !customRangeApplied}><span className="mr-2 text-sm font-bold">WA</span>WhatsApp</Button></div></div>{isMaster ? <div className="flex flex-wrap items-center gap-3"><span className="mono-label text-muted-foreground">FILTRAR VENDEDOR</span><select aria-label="Filtrar vendedor" className="field-industrial h-10 min-w-[220px] px-3 text-sm" value={selectedSeller ?? ""} onChange={event => setSelectedSeller(event.target.value ? Number(event.target.value) : undefined)}><option value="">Todos os vendedores</option>{(sellers.data ?? []).map(seller => <option key={seller.id} value={seller.id}>{seller.name} — {seller.username}{seller.storeUnit ? ` · ${seller.storeUnit}` : ""}</option>)}</select></div> : <div className="flex items-center gap-3 border-l-4 border-[#ed1c24] bg-white px-4 py-3"><span className="mono-label text-muted-foreground">SUA UNIDADE</span><strong className="text-sm">{user.storeUnit?.trim() || "Óticas Único"}</strong></div>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="PRÊMIO ACUMULADO" value={formatCurrency(data?.totalReward)} detail={reportPeriodLabel} dark /><StatCard label="VALOR EM VENDAS" value={formatCurrency(data?.totalSales)} detail={`${data?.rows.length ?? 0} lançamentos`} /><StatCard label="LENTES LANÇADAS" value={String(data?.totalQuantity ?? 0).padStart(2, "0")} detail="Quantidade total" /><StatCard label="TICKET DE PRÊMIO" value={formatCurrency(data?.totalQuantity ? Number(data?.totalReward ?? 0) / data.totalQuantity : 0)} detail="Média por lente" /></div><div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><section className="paper-block hard-shadow-sm overflow-hidden"><div className="flex items-center justify-between border-b border-[#deddd8] p-5"><div><div className="section-mark text-muted-foreground">LANÇAMENTOS RECENTES</div><h2 className="mt-2 text-lg font-bold">Movimentações do período</h2></div><button onClick={() => setTab("launch")} className="text-xs font-semibold underline underline-offset-4">Novo lançamento</button></div>{rows.length === 0 ? <div className="flex min-h-[220px] flex-col items-center justify-center p-6 text-center"><ReceiptText className="mb-3 h-8 w-8 text-muted-foreground" /><p className="font-semibold">Nenhum lançamento ainda</p><p className="mt-1 text-sm text-muted-foreground">Comece registrando uma venda elegível.</p></div> : <div className="max-h-[620px] overflow-auto"><table className="table-industrial w-full text-left text-sm"><thead><tr><th className="px-5 py-4">Data</th><th className="px-5 py-4">Vendedor</th><th className="px-5 py-4">Lente / OS</th><th className="px-5 py-4 text-right">Prêmio</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{formatDate(row.saleDate)}</td><td className="px-5 py-4 font-medium">{row.sellerName}</td><td className="px-5 py-4"><div className="max-w-[280px] truncate font-medium">{row.lensName}</div><div className="mono-label mt-1 text-muted-foreground">OS {row.osNumber} · {row.quantity} UN.</div>{row.observation && <div className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground">Obs.: {row.observation}</div>}</td><td className="px-5 py-4"><div className="flex items-center justify-end gap-3"><span className="font-bold">{formatCurrency(row.rewardAmount)}</span><button type="button" onClick={() => openEditSale(row)} className="inline-flex min-h-9 items-center gap-1 border border-[#ed1c24] px-2 py-1 text-[10px] font-bold text-[#c9151c] hover:bg-[#fff200]" aria-label={`Alterar lançamento da OS ${row.osNumber}`} title="Alterar lançamento"><Pencil className="h-3 w-3" />ALTERAR</button><button type="button" onClick={() => { if (window.confirm(`Excluir a OS ${row.osNumber}? Esta ação não pode ser desfeita.`)) removeSale.mutate({ id: row.id }); }} className="inline-flex min-h-9 items-center gap-1 border border-[#a62b20] px-2 py-1 text-[10px] font-bold text-[#a62b20] hover:bg-[#f8d8d2]" aria-label={`Excluir lançamento da OS ${row.osNumber}`} title="Excluir lançamento"><Trash2 className="h-3 w-3" />EXCLUIR</button></div></td></tr>)}</tbody></table></div>}</section><section className="ink-block hard-shadow-sm p-5 sm:p-6"><div className="section-mark text-white/50">FONTE DOS DADOS</div><h2 className="mt-4 text-2xl font-bold tracking-[-.05em]">Prêmio de lentes<br /><span className="text-white/45">sem retrabalho.</span></h2><p className="mt-5 text-sm leading-6 text-white/60">O valor do prêmio é puxado automaticamente da tabela vigente no momento do lançamento.</p><div className="mt-8 space-y-3 border-t border-white/15 pt-5 text-xs text-white/65"><div className="flex items-center justify-between"><span>Perfil atual</span><strong className="text-white">{isMaster ? "MASTER" : "VENDEDOR"}</strong></div><div className="flex items-center justify-between"><span>Período</span><strong className="text-white">{reportPeriodLabel.toUpperCase()}</strong></div></div><button onClick={() => setTab("launch")} className="mt-8 flex w-full items-center justify-between bg-white px-4 py-3 text-left text-xs font-bold text-[#242424] hover:bg-white/85">IR PARA LANÇAMENTO <ArrowRight className="h-4 w-4" /></button></section></div></div>;
}

function EditSalePanel({ sale, onClose }: { sale: EditableSale | null; onClose: () => void }) {
  const lenses = trpc.lenses.list.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState(() => sale ? { osNumber: sale.osNumber, lensId: String(sale.lensId), quantity: String(sale.quantity), saleAmount: String(sale.saleAmount ?? ""), saleDate: toLocalDateTimeInput(new Date(sale.saleDate)), storeName: sale.storeName ?? "Óticas Único", observation: sale.observation ?? "" } : { osNumber: "", lensId: "", quantity: "1", saleAmount: "", saleDate: toLocalDateTimeInput(), storeName: "Óticas Único", observation: "" });
  const update = trpc.sales.update.useMutation({ onSuccess: async () => { await utils.sales.report.invalidate(); toast.success("Lançamento atualizado e prêmio recalculado."); onClose(); } });
  if (!sale) return null;
  const selected = (lenses.data ?? []).find(lens => lens.id === Number(form.lensId));
  const previewReward = Number(selected?.rewardValue ?? 0) * Number(form.quantity || 0);
  const setField = (field: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [field]: value }));
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Alterar lançamento" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="max-h-[94vh] w-full max-w-5xl overflow-y-auto border-t-4 border-[#ed1c24] bg-[#fffbea] p-5 shadow-2xl sm:max-h-[90vh] sm:border-4 sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="section-mark text-muted-foreground">CORREÇÃO DE LANÇAMENTO / OS {sale.osNumber}</div><h2 className="mt-2 text-xl font-bold tracking-[-.05em]">Editar venda e recalcular prêmio</h2><p className="mt-1 text-sm text-muted-foreground">Corrija os campos necessários e salve novamente.</p></div><button type="button" onClick={onClose} className="p-2 text-muted-foreground hover:bg-[#fff200] hover:text-[#c9151c]" aria-label="Fechar edição"><X className="h-4 w-4" /></button></div><form className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-7" onSubmit={event => { event.preventDefault(); update.mutate({ id: sale.id, osNumber: form.osNumber, lensId: Number(form.lensId), quantity: Number(form.quantity), saleAmount: Number(form.saleAmount.replace(",", ".") || 0), saleDate: new Date(form.saleDate).toISOString(), storeName: form.storeName, observation: form.observation }); }}><div><Label className="mono-label">OS</Label><Input className="field-industrial mt-2" value={form.osNumber} onChange={event => setField("osNumber", event.target.value)} /></div><div><Label className="mono-label">LENTE</Label><select className="field-industrial mt-2 h-10 w-full px-2 text-sm" value={form.lensId} onChange={event => setField("lensId", event.target.value)}>{(lenses.data ?? []).map(lens => <option key={lens.id} value={lens.id}>{lens.name}</option>)}</select></div><div><Label className="mono-label">QUANTIDADE</Label><Input className="field-industrial mt-2" type="number" min="1" value={form.quantity} onChange={event => setField("quantity", event.target.value)} /></div><div><Label className="mono-label">VALOR DA VENDA</Label><Input className="field-industrial mt-2" inputMode="decimal" value={form.saleAmount} onChange={event => setField("saleAmount", event.target.value)} /></div><div><Label className="mono-label">DATA</Label><Input className="field-industrial mt-2" type="datetime-local" value={form.saleDate} onChange={event => setField("saleDate", event.target.value)} /></div><div><Label className="mono-label">LOJA / UNIDADE</Label><Input className="field-industrial mt-2 bg-[#e9e8e4]" value={form.storeName} readOnly aria-readonly="true" /><p className="mt-1 text-xs text-muted-foreground">Unidade vinculada ao vendedor.</p></div><div className="sm:col-span-2 xl:col-span-7"><Label className="mono-label">OBSERVAÇÃO</Label><Textarea className="field-industrial mt-2 min-h-[88px]" placeholder="Digite uma observação, se necessário..." value={form.observation} onChange={event => setField("observation", event.target.value)} /></div><div className="flex items-end gap-3"><div className="min-w-0 flex-1"><div className="mono-label text-muted-foreground">PRÊMIO PREVISTO</div><div className="mt-2 truncate text-lg font-bold">{formatCurrency(previewReward)}</div></div><Button type="submit" className="h-10 rounded-none bg-[#ed1c24] px-4 text-[#fff200] hover:bg-[#c9151c]" disabled={update.isPending}>{update.isPending ? "SALVANDO" : "SALVAR"}</Button></div></form></section></div>;
}

function LaunchSale({ user }: { user: SessionUser }) {
  const lenses = trpc.lenses.list.useQuery();
  const utils = trpc.useUtils();
  const [lensId, setLensId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [osNumber, setOsNumber] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const storeName = user.storeUnit?.trim() || "Óticas Único";
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [observation, setObservation] = useState("");
  const [editingSale, setEditingSale] = useState<EditableSale | null>(null);
  const openEditSale = (sale: EditableSale) => { setEditingSale(sale); window.setTimeout(() => document.getElementById("edit-sale-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };
  const history = trpc.sales.report.useQuery({});
  const removeSale = trpc.sales.delete.useMutation({ onSuccess: async () => { await utils.sales.report.invalidate(); toast.success("Lançamento excluído."); } });
  const create = trpc.sales.create.useMutation({ onSuccess: async () => { toast.success("Venda lançada e prêmio calculado."); setOsNumber(""); setSaleAmount(""); setQuantity("1"); setObservation(""); await utils.sales.report.invalidate(); } });
  const selected = (lenses.data ?? []).find(lens => lens.id === Number(lensId));
  const reward = Number(selected?.rewardValue ?? 0) * Number(quantity || 0);
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!lensId) return toast.error("Selecione uma lente."); create.mutate({ lensId: Number(lensId), quantity: Number(quantity), osNumber, saleAmount: Number(saleAmount.replace(",", ".") || 0), storeName, saleDate: new Date(saleDate).toISOString(), observation }); };
  return <div className="space-y-6"><div id="edit-sale-panel"><EditSalePanel key={editingSale?.id ?? "launch-empty"} sale={editingSale} onClose={() => setEditingSale(null)} /></div><div className="grid gap-6 xl:grid-cols-[1fr_.72fr]"><section className="paper-block hard-shadow-sm p-5 sm:p-8"><div className="section-mark text-muted-foreground">NOVO REGISTRO / {new Date().toLocaleDateString("pt-BR")}</div><div className="mt-3 flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold tracking-[-.05em]">Lançar venda de lente</h2><p className="mt-1 text-sm text-muted-foreground">Preencha o essencial. O prêmio aparece antes de salvar.</p></div><div className="hidden border border-[#b7b6b1] p-2 sm:block"><ReceiptText className="h-5 w-5" /></div></div><form className="mt-8 space-y-5" onSubmit={submit}><div className="grid gap-5 sm:grid-cols-2"><div><Label className="mono-label">NÚMERO DA OS</Label><Input className="field-industrial mt-2 h-12" placeholder="Ex.: 10482" value={osNumber} onChange={event => setOsNumber(event.target.value)} autoFocus /></div><div><Label className="mono-label">DATA DA VENDA</Label><Input className="field-industrial mt-2 h-12" type="datetime-local" value={saleDate} onChange={event => setSaleDate(event.target.value)} /></div></div><div><Label className="mono-label">LOJA / UNIDADE</Label><Input className="field-industrial mt-2 h-12 bg-[#e9e8e4]" value={storeName} readOnly aria-readonly="true" /><p className="mt-1 text-xs text-muted-foreground">Preenchida automaticamente pelo cadastro do vendedor.</p></div><div><Label className="mono-label">OBSERVAÇÃO</Label><Textarea className="field-industrial mt-2 min-h-[88px]" placeholder="Digite uma observação, se necessário..." value={observation} onChange={event => setObservation(event.target.value)} /></div><div><Label className="mono-label">LENTE PREMIADA</Label><div className="relative mt-2"><select className="field-industrial h-12 w-full appearance-none px-3 pr-10 text-sm" value={lensId} onChange={event => setLensId(event.target.value)}><option value="">Selecione a lente da venda...</option>{Object.entries((lenses.data ?? []).reduce<Record<string, typeof lenses.data>>((groups, lens) => { (groups[lens.category] ??= []).push(lens); return groups; }, {})).map(([category, grouped]) => <optgroup key={category} label={category}>{(grouped ?? []).map(lens => <option key={lens.id} value={lens.id}>{lens.name} — {formatCurrency(lens.rewardValue)}</option>)}</optgroup>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" /></div></div><div className="grid gap-5 sm:grid-cols-2"><div><Label className="mono-label">QUANTIDADE</Label><Input className="field-industrial mt-2 h-12" type="number" min="1" value={quantity} onChange={event => setQuantity(event.target.value)} /></div><div><Label className="mono-label">VALOR DA VENDA</Label><Input className="field-industrial mt-2 h-12" inputMode="decimal" placeholder="R$ 0,00" value={saleAmount} onChange={event => setSaleAmount(event.target.value)} /></div></div><div className="flex flex-col gap-4 border-t border-[#deddd8] pt-5 sm:flex-row sm:items-end sm:justify-between"><div className="text-xs text-muted-foreground">Lançando como <strong className="text-foreground">{user.name}</strong></div><Button className="h-12 rounded-none bg-[#ed1c24] text-[#fff200] hover:bg-[#c9151c]" disabled={create.isPending}>{create.isPending ? "SALVANDO..." : "SALVAR LANÇAMENTO"}<Check className="ml-2 h-4 w-4" /></Button></div></form></section><aside className="space-y-5"><section className="ink-block hard-shadow-sm p-6 sm:p-8"><div className="section-mark text-white/50">PRÉVIA DO PRÊMIO</div><div className="mt-7 text-5xl font-bold tracking-[-.08em]">{formatCurrency(reward)}</div><p className="mt-2 text-sm text-white/55">{selected ? `${quantity} × ${formatCurrency(selected.rewardValue)}` : "Selecione uma lente para calcular"}</p><div className="mt-8 border-t border-white/15 pt-5 text-xs leading-5 text-white/55">O prêmio é calculado conforme a tabela vigente. Em caso de promoção especial, a regra deve ser conferida com o Master.</div></section><section className="paper-block hard-shadow-sm p-6"><div className="section-mark text-muted-foreground">NOTA OPERACIONAL</div><p className="mt-4 text-sm leading-6 text-muted-foreground">Use o número da OS para localizar a venda depois. Revise lente, quantidade e valor antes de salvar.</p></section></aside></div><section className="paper-block hard-shadow-sm overflow-hidden"><div className="flex items-center justify-between border-b border-[#deddd8] p-5"><div><div className="section-mark text-muted-foreground">HISTÓRICO DE LANÇAMENTOS</div><h2 className="mt-2 text-lg font-bold">Clique em ALTERAR para corrigir</h2></div><Badge variant="outline" className="rounded-none">{history.data?.rows.length ?? 0} registros</Badge></div>{(history.data?.rows ?? []).length === 0 ? <div className="p-6 text-sm text-muted-foreground">Nenhum lançamento encontrado.</div> : <div className="max-h-[420px] overflow-auto"><table className="table-industrial w-full text-left text-sm"><thead className="sticky top-0 bg-[#f9f8f5]"><tr><th className="px-5 py-4">Data</th><th className="px-5 py-4">OS / Lente</th><th className="px-5 py-4">Vendedor</th><th className="px-5 py-4 text-right">Ação</th></tr></thead><tbody>{(history.data?.rows ?? []).map(row => <tr key={row.id}><td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{formatDate(row.saleDate)}</td><td className="px-5 py-4"><div className="font-medium">OS {row.osNumber}</div><div className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground">{row.lensName} · {row.quantity} un.</div>{row.observation && <div className="mt-1 max-w-[280px] truncate text-xs text-muted-foreground">Obs.: {row.observation}</div>}</td><td className="px-5 py-4 text-muted-foreground">{row.sellerName}</td><td className="px-5 py-4 text-right"><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => openEditSale(row)} className="inline-flex min-h-10 items-center gap-1 border border-[#ed1c24] bg-white px-3 py-2 text-[10px] font-bold text-[#c9151c] hover:bg-[#fff200]"><Pencil className="h-3 w-3" />ALTERAR</button><button type="button" onClick={() => { if (window.confirm(`Excluir a OS ${row.osNumber}? Esta ação não pode ser desfeita.`)) removeSale.mutate({ id: row.id }); }} className="inline-flex min-h-10 items-center gap-1 border border-[#a62b20] bg-white px-3 py-2 text-[10px] font-bold text-[#a62b20] hover:bg-[#f8d8d2]"><Trash2 className="h-3 w-3" />EXCLUIR</button></div></td></tr>)}</tbody></table></div>}</section></div>;
}

function LensManager() {
  const lenses = trpc.lenses.list.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<LensForm>(emptyLens);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [rawCsvText, setRawCsvText] = useState("");

  const save = trpc.lenses.create.useMutation({ onSuccess: async () => { await utils.lenses.list.invalidate(); setForm(emptyLens); toast.success("Lente cadastrada."); }, onError: err => toast.error(err.message) });
  const update = trpc.lenses.update.useMutation({ onSuccess: async () => { await utils.lenses.list.invalidate(); setForm(emptyLens); setEditingId(null); toast.success("Lente atualizada."); }, onError: err => toast.error(err.message) });
  const remove = trpc.lenses.delete.useMutation({ onSuccess: async () => { await utils.lenses.list.invalidate(); toast.success("Lente removida."); }, onError: err => toast.error(err.message) });
  const batchImport = trpc.lenses.batchImport.useMutation({
    onSuccess: async (res) => {
      await utils.lenses.list.invalidate();
      setShowBatchModal(false);
      setRawCsvText("");
      toast.success(`${res.total} lentes importadas com sucesso!`);
    },
    onError: err => toast.error(err.message),
  });

  const setField = (field: keyof LensForm, value: string) => setForm(previous => ({ ...previous, [field]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); const payload = { category: form.category, name: form.name, rewardValue: Number(form.rewardValue.replace(",", ".")), notes: form.notes }; if (editingId) update.mutate({ id: editingId, ...payload }); else save.mutate(payload); };

  const handleCustomCsvImport = () => {
    if (!rawCsvText.trim()) return toast.error("Cole o conteúdo CSV para importar.");
    const lines = rawCsvText.split("\n").filter(l => l.trim().length > 0);
    const parsed: { category: string; name: string; rewardValue: number; notes?: string }[] = [];

    for (const line of lines) {
      const parts = line.split(";").map(p => p.trim());
      if (parts.length >= 4) {
        let category = parts[1];
        let name = parts[2];
        let valStr = parts[3];
        let notes = parts[4] || "";

        if (isNaN(Number(parts[0])) && parts.length === 4) {
          category = parts[0];
          name = parts[1];
          valStr = parts[2];
          notes = parts[3];
        }

        const val = Number(valStr.replace("R$", "").replace(",", ".").trim());
        if (category && name && !isNaN(val)) {
          parsed.push({ category, name, rewardValue: val, notes: notes || undefined });
        }
      }
    }

    if (parsed.length === 0) return toast.error("Formato inválido. Use a estrutura: Categoria;Nome;Prêmio;Observação");
    batchImport.mutate(parsed);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between paper-block hard-shadow-sm p-5 sm:p-7">
        <div>
          <div className="section-mark text-muted-foreground">IMPORTAÇÃO EM MASSA</div>
          <h2 className="mt-2 text-xl font-bold tracking-[-.04em]">Cadastro de Lentes via CSV</h2>
          <p className="mt-1 text-xs text-muted-foreground">Cole a lista em texto/CSV para cadastrar múltiplas lentes de uma só vez.</p>
        </div>
        <div>
          <Button
            type="button"
            className="h-11 rounded-none bg-[#ed1c24] text-[#fff200] hover:bg-[#c9151c]"
            onClick={() => setShowBatchModal(true)}
          >
            IMPORTAR CSV EM MASSA
            <FileSpreadsheet className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="paper-block hard-shadow w-full max-w-2xl p-6">
            <div className="flex items-center justify-between border-b border-[#deddd8] pb-4">
              <h3 className="text-lg font-bold">Importar Lentes via CSV / Texto</h3>
              <button type="button" onClick={() => setShowBatchModal(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Cole as linhas separadas por ponto e vírgula (<code>;</code>):<br />
                <code>ID;Categoria;Nome da lente;Premiação;Observações</code>
              </p>
              <Textarea
                className="field-industrial h-64 font-mono text-xs"
                placeholder="1;Visão Simples;EVOLUX DIGITAL – LENTES PRONTAS;5.0;"
                value={rawCsvText}
                onChange={e => setRawCsvText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-none" onClick={() => setShowBatchModal(false)}>Cancelar</Button>
                <Button
                  type="button"
                  className="rounded-none bg-[#ed1c24] text-[#fff200] hover:bg-[#c9151c]"
                  disabled={batchImport.isPending}
                  onClick={handleCustomCsvImport}
                >
                  {batchImport.isPending ? "IMPORTANDO..." : "PROCESSAR E SALVAR"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[.68fr_1.32fr]">
        <section className="paper-block hard-shadow-sm p-5 sm:p-7">
          <div className="section-mark text-muted-foreground">CONTROLE MASTER</div>
          <h2 className="mt-3 text-2xl font-bold tracking-[-.05em]">{editingId ? "Editar lente" : "Cadastrar lente"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">A tabela de prêmios é compartilhada com toda a equipe.</p>
          <form className="mt-7 space-y-4" onSubmit={submit}>
            <div><Label className="mono-label">CATEGORIA</Label><Input className="field-industrial mt-2" placeholder="Ex.: Visão Simples" value={form.category} onChange={event => setField("category", event.target.value)} /></div>
            <div><Label className="mono-label">NOME DA LENTE</Label><Input className="field-industrial mt-2" value={form.name} onChange={event => setField("name", event.target.value)} /></div>
            <div><Label className="mono-label">PRÊMIO UNITÁRIO (R$)</Label><Input className="field-industrial mt-2" inputMode="decimal" placeholder="0,00" value={form.rewardValue} onChange={event => setField("rewardValue", event.target.value)} /></div>
            <div><Label className="mono-label">OBSERVAÇÃO</Label><Textarea className="field-industrial mt-2 min-h-[90px]" value={form.notes} onChange={event => setField("notes", event.target.value)} /></div>
            <div className="flex gap-2 pt-2">
              <Button className="h-11 flex-1 rounded-none bg-[#ed1c24] text-[#fff200] hover:bg-[#c9151c]" disabled={save.isPending || update.isPending}>{editingId ? "ATUALIZAR" : "CADASTRAR"}<Plus className="ml-2 h-4 w-4" /></Button>
              {editingId && <Button type="button" variant="outline" className="h-11 rounded-none bg-white" onClick={() => { setEditingId(null); setForm(emptyLens); }}><X className="h-4 w-4" /></Button>}
            </div>
          </form>
        </section>

        <section className="paper-block hard-shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#deddd8] p-5">
            <div>
              <div className="section-mark text-muted-foreground">TABELA VIGENTE</div>
              <h2 className="mt-2 text-lg font-bold">Lentes que pagam prêmio</h2>
            </div>
            <Badge variant="outline" className="rounded-none">{lenses.data?.length ?? 0} itens</Badge>
          </div>
          <div className="max-h-[680px] overflow-auto">
            <table className="table-industrial w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#f9f8f5]">
                <tr>
                  <th className="px-5 py-4">Categoria</th>
                  <th className="px-5 py-4">Lente</th>
                  <th className="px-5 py-4 text-right">Prêmio</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(lenses.data ?? []).map(lens => (
                  <tr key={lens.id}>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{lens.category}</td>
                    <td className="px-5 py-3 font-medium">
                      <div>{lens.name}</div>
                      {lens.notes && <div className="mt-1 max-w-[320px] truncate text-xs text-muted-foreground">{lens.notes}</div>}
                    </td>
                    <td className="px-5 py-3 text-right font-bold">{formatCurrency(lens.rewardValue)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="p-2 text-muted-foreground hover:bg-[#e5e4e0] hover:text-foreground" onClick={() => { setEditingId(lens.id); setForm({ category: lens.category, name: lens.name, rewardValue: String(lens.rewardValue), notes: lens.notes ?? "" }); }} aria-label="Editar lente"><Pencil className="h-4 w-4" /></button>
                        <button className="p-2 text-muted-foreground hover:bg-[#f2d9d5] hover:text-red-700" onClick={() => { if (window.confirm("Excluir esta lente?")) remove.mutate({ id: lens.id }); }} aria-label="Excluir lente"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function TeamManager({ onViewReport }: { onViewReport: (sellerId: number) => void }) {
  const users = trpc.users.list.useQuery();
  const utils = trpc.useUtils();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", name: "", storeUnit: "", email: "", role: "seller" as "master" | "seller", securityQuestion: "Qual sua cor favorita?", securityAnswer: "azul" });
  const createSeller = trpc.users.createSeller.useMutation({ onSuccess: async () => { await utils.users.list.invalidate(); setShowAdd(false); setForm({ username: "", password: "", name: "", storeUnit: "", email: "", role: "seller", securityQuestion: "Qual sua cor favorita?", securityAnswer: "azul" }); toast.success("Vendedor cadastrado com sucesso."); } });
  const updateRole = trpc.users.updateRole.useMutation({ onSuccess: async () => { await utils.users.list.invalidate(); toast.success("Perfil atualizado."); } });
  const updateUnit = trpc.users.updateUnit.useMutation({ onSuccess: async () => { await utils.users.list.invalidate(); toast.success("Unidade atualizada."); } });
  const remove = trpc.users.delete.useMutation({ onSuccess: async () => { await utils.users.list.invalidate(); toast.success("Usuário removido."); } });

  return <div className="space-y-6"><div className="flex flex-col gap-4 paper-block hard-shadow-sm p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7"><div><div className="section-mark text-muted-foreground">CONTROLE MASTER</div><h2 className="mt-3 text-2xl font-bold tracking-[-.05em]">Equipe de vendedores</h2><p className="mt-2 text-sm text-muted-foreground">Cadastre novos vendedores e defina quem possui acesso Master.</p></div><Button className="rounded-none bg-[#ed1c24] text-[#fff200] hover:bg-[#c9151c]" onClick={() => setShowAdd(!showAdd)}><UserPlus className="mr-2 h-4 w-4" />{showAdd ? "Fechar formulário" : "Novo vendedor"}</Button></div>{showAdd && <section className="paper-block hard-shadow-sm p-6"><h3 className="text-lg font-bold">Cadastrar novo membro</h3><form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); createSeller.mutate(form); }}><div><Label className="mono-label">NOME</Label><Input className="field-industrial mt-2" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></div><div><Label className="mono-label">USUÁRIO DE LOGIN</Label><Input className="field-industrial mt-2" value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} /></div><div><Label className="mono-label">SENHA</Label><Input className="field-industrial mt-2" type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></div><div><Label className="mono-label">PERFIL</Label><select className="field-industrial mt-2 h-10 w-full px-3 text-sm" value={form.role} onChange={event => setForm({ ...form, role: event.target.value as "master" | "seller" })}><option value="seller">Vendedor</option><option value="master">Master</option></select></div><div><Label className="mono-label">UNIDADE</Label><Input className="field-industrial mt-2" placeholder="Ex.: Unidade Centro" value={form.storeUnit} onChange={event => setForm({ ...form, storeUnit: event.target.value })} required /></div><div><Label className="mono-label">PERGUNTA-CHAVE</Label><Input className="field-industrial mt-2" value={form.securityQuestion} onChange={event => setForm({ ...form, securityQuestion: event.target.value })} /></div><div><Label className="mono-label">RESPOSTA</Label><Input className="field-industrial mt-2" value={form.securityAnswer} onChange={event => setForm({ ...form, securityAnswer: event.target.value })} /></div><div className="sm:col-span-2 flex justify-end gap-2 pt-3"><Button type="submit" className="rounded-none bg-[#ed1c24] text-[#fff200] hover:bg-[#c9151c]" disabled={createSeller.isPending}>CADASTRAR MEMBRO</Button></div></form></section>}<section className="paper-block hard-shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="table-industrial w-full text-left text-sm"><thead><tr><th className="px-5 py-4 sm:px-7">Nome</th><th className="px-5 py-4">Usuário</th><th className="px-5 py-4">Unidade</th><th className="px-5 py-4">Perfil</th><th className="px-5 py-4">Último acesso</th><th className="px-5 py-4 text-right">Ações</th></tr></thead><tbody>{(users.data ?? []).map(item => { const master = item.role === "master" || item.role === "admin"; return <tr key={item.id}><td className="px-5 py-4 font-semibold sm:px-7">{item.name}</td><td className="px-5 py-4 text-muted-foreground">{item.username}</td><td className="px-5 py-4"><Input className="field-industrial h-9 min-w-[160px] px-2 text-xs" defaultValue={item.storeUnit ?? ""} placeholder="Informe a unidade" onBlur={event => { const value = event.target.value.trim(); if (value && value !== (item.storeUnit ?? "")) updateUnit.mutate({ id: item.id, storeUnit: value }); }} /></td><td className="px-5 py-4"><Badge className={`rounded-none ${master ? "bg-[#ed1c24] text-[#fff200]" : "bg-[#e3e2df] text-[#242424]"}`}>{master ? "MASTER" : "VENDEDOR"}</Badge></td><td className="px-5 py-4 text-muted-foreground">{item.lastSignedIn ? formatDate(item.lastSignedIn) : "—"}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><select className="field-industrial h-9 px-2 text-xs" value={master ? "master" : "seller"} onChange={event => updateRole.mutate({ id: item.id, role: event.target.value as "master" | "seller" })}><option value="seller">Vendedor</option><option value="master">Master</option></select><button className="p-2 text-muted-foreground hover:bg-[#fff200] hover:text-[#c9151c]" onClick={() => onViewReport(item.id)} aria-label={`Ver relatório de ${item.name}`} title="Ver relatório"><BarChart3 className="h-4 w-4" /></button><button className="p-2 text-muted-foreground hover:bg-[#f2d9d5] hover:text-red-700" onClick={() => { if (window.confirm("Excluir este usuário?")) remove.mutate({ id: item.id }); }} aria-label="Excluir usuário"><Trash2 className="h-4 w-4" /></button></div></td></tr>; })}</tbody></table></div></section></div>;
}

export default function Home() {
  const auth = useAuth();
  if (auth.loading) return <div className="flex min-h-screen items-center justify-center bg-[#deddd8]"><div className="mono-label animate-pulse">CARREGANDO FOLHA DE PRÊMIO...</div></div>;
  if (!auth.user) return <AuthScreen />;
  return <Dashboard user={auth.user} onLogout={auth.logout} />;
}
