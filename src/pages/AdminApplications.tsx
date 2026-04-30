import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Search, Check, X, Copy, ExternalLink, MessageCircle, Phone, MapPin, Briefcase, Clock, FileText, Linkedin, Globe, Calendar, Inbox, CheckCircle2, XCircle, Heart, ChevronRight } from "lucide-react";

type Status = "pending" | "approved" | "rejected";
interface Application {
  id: string;
  full_name: string;
  whatsapp_number: string;
  primary_skill: string;
  other_specialization: string | null;
  experience: string;
  city: string;
  portfolio_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  why_join: string;
  status: Status;
  created_at: string;
}

const skills = ["UI/UX", "Development", "Content Writing", "Digital Marketing", "Other"];

const tpl = (name: string) =>
  `Hey ${name}!\n\nYou're officially in the HYVE — welcome to the group!\n\nWe're a curated community of freelance designers, developers, writers & marketers shipping real work for real clients.\n\nJoin our community group here:\nhttps://chat.whatsapp.com/BQFm77OF85BD9MJsBTXMP6\n\nExcited to have you here. Let's build something great together!\n\n— The HYVE Team\nhyvefreelance.com`;

const rejectTpl = (name: string) =>
  `Hey ${name},\n\nThank you so much for applying to Hyve and taking the time to share your story with us. 💛\n\nAfter careful review, we're unable to offer you a spot in the community at this moment. Hyve is a curated space, and we keep the group tightly aligned with where the community is right now — this isn't a reflection of your talent or potential.\n\nA few notes from our side:\n• Keep building your portfolio and putting your work out there\n• You're welcome to re-apply in the future as you grow\n• Follow us on hyvefreelance.com for resources and updates\n\nWishing you the very best on your journey.\n— The Hyve team`;

const filterTabs: { value: "all" | Status; label: string; tone: string }[] = [
  { value: "all", label: "All", tone: "all" },
  { value: "pending", label: "Pending", tone: "pending" },
  { value: "approved", label: "Approved", tone: "approved" },
  { value: "rejected", label: "Rejected", tone: "rejected" },
];

const AdminApplications = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [skill, setSkill] = useState<string>("all");
  const [approved, setApproved] = useState<Application | null>(null);
  const [rejected, setRejected] = useState<Application | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const isAdmin = localStorage.getItem("hyve_admin");
    if (!isAdmin) navigate("/admin/login", { replace: true });
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("applications").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setApps((data ?? []) as Application[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (app: Application, s: Status) => {
    const { error } = await supabase.from("applications").update({ status: s }).eq("id", app.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setApps((prev) => prev.map((a) => a.id === app.id ? { ...a, status: s } : a));
    if (s === "approved") setApproved({ ...app, status: s });
    else if (s === "rejected") setRejected({ ...app, status: s });
    else toast({ title: `Application ${s}` });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (skill !== "all" && a.primary_skill !== skill) return false;
      if (q && !a.full_name.toLowerCase().includes(q) && !a.whatsapp_number.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [apps, search, status, skill]);

  const counts = useMemo(() => ({
    all: apps.length,
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  }), [apps]);

  const selected = useMemo(
    () => filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  );

  return (
    <AdminLayout>
      <div className="mx-auto max-w-[1500px]">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Applications</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{counts.all}</span> total ·{" "}
              <span className="font-medium text-primary">{counts.pending}</span> pending review
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { localStorage.removeItem("hyve_admin"); navigate("/admin/login"); }}
            className="text-xs text-muted-foreground"
          >
            Logout
          </Button>
        </div>

        {/* Stat tiles */}
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Total" value={counts.all} icon={Inbox} tone="muted" active={status === "all"} onClick={() => setStatus("all")} />
          <StatTile label="Pending" value={counts.pending} icon={Clock} tone="warning" active={status === "pending"} onClick={() => setStatus("pending")} />
          <StatTile label="Approved" value={counts.approved} icon={CheckCircle2} tone="success" active={status === "approved"} onClick={() => setStatus("approved")} />
          <StatTile label="Rejected" value={counts.rejected} icon={XCircle} tone="danger" active={status === "rejected"} onClick={() => setStatus("rejected")} />
        </div>

        {/* Split layout */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          {/* List panel */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {/* Filter bar */}
            <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-10 pl-9" placeholder="Search by name or WhatsApp number" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={skill} onValueChange={setSkill}>
                <SelectTrigger className="h-10 md:w-44"><SelectValue placeholder="Skill" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All skills</SelectItem>
                  {skills.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Mini status pills */}
            <div className="flex gap-1.5 overflow-x-auto border-b border-border bg-muted/30 px-4 py-2.5">
              {filterTabs.map((t) => {
                const c = counts[t.value];
                const active = status === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setStatus(t.value)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                      active
                        ? "bg-foreground text-background"
                        : "bg-background text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    {t.label}
                    <span className={`rounded-full px-1.5 text-[10px] font-semibold ${active ? "bg-background/20" : "bg-muted"}`}>{c}</span>
                  </button>
                );
              })}
            </div>

            {/* List */}
            {loading ? (
              <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Inbox className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No applications match your filters.</p>
              </div>
            ) : (
              <ul className="max-h-[calc(100vh-22rem)] divide-y divide-border overflow-y-auto">
                {filtered.map((a) => {
                  const isActive = selected?.id === a.id;
                  return (
                    <li key={a.id}>
                      <button
                        onClick={() => setSelectedId(a.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
                          isActive ? "bg-primary/5 border-l-[3px] border-l-primary pl-[13px]" : "border-l-[3px] border-l-transparent hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-gold text-xs font-bold text-primary-foreground shadow-sm">
                          {initialsOf(a.full_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{a.full_name}</span>
                            <StatusDot status={a.status} />
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {a.primary_skill} · {a.city} · {a.experience}y
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 transition ${isActive ? "text-primary" : "text-muted-foreground/40"}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Detail panel */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            {selected ? (
              <DetailPanel app={selected} onAction={updateStatus} onWelcome={() => setApproved(selected)} onReject={() => setRejected(selected)} />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
                <Inbox className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Select an applicant to see details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!approved} onOpenChange={(o) => !o && setApproved(null)}>
        <DialogContent className="max-w-lg">
          {approved && <MessageTemplate kind="approved" app={approved} onClose={() => setApproved(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejected} onOpenChange={(o) => !o && setRejected(null)}>
        <DialogContent className="max-w-lg">
          {rejected && <MessageTemplate kind="rejected" app={rejected} onClose={() => setRejected(null)} />}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

const StatTile = ({ label, value, icon: Icon, tone, active, onClick }: { label: string; value: number; icon: typeof Inbox; tone: "muted" | "warning" | "success" | "danger"; active: boolean; onClick: () => void }) => {
  const toneMap = {
    muted: { bg: "bg-foreground/5", iconBg: "bg-foreground/10 text-foreground", ring: "ring-foreground" },
    warning: { bg: "bg-primary/5", iconBg: "bg-primary/15 text-primary", ring: "ring-primary" },
    success: { bg: "bg-success/5", iconBg: "bg-success/15 text-success", ring: "ring-success" },
    danger: { bg: "bg-destructive/5", iconBg: "bg-destructive/15 text-destructive", ring: "ring-destructive" },
  }[tone];
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:shadow-soft ${active ? `ring-2 ${toneMap.ring} ring-offset-2 ring-offset-background` : ""}`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneMap.iconBg}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-display text-2xl font-bold leading-tight">{value}</div>
      </div>
    </button>
  );
};

const StatusDot = ({ status }: { status: Status }) => {
  const cls = status === "approved" ? "bg-success" : status === "rejected" ? "bg-destructive" : "bg-primary";
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${cls}`} />;
};

const StatusBadge = ({ status }: { status: Status }) => {
  if (status === "approved") return <Badge className="bg-success/15 text-success hover:bg-success/15">Approved</Badge>;
  if (status === "rejected") return <Badge variant="secondary">Rejected</Badge>;
  return <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Pending</Badge>;
};

const initialsOf = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

const DetailPanel = ({ app, onAction, onWelcome, onReject }: { app: Application; onAction: (a: Application, s: Status) => void; onWelcome: () => void; onReject: () => void }) => {
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const waNumber = app.whatsapp_number.replace(/[^\d]/g, "");
  useEffect(() => {
    let active = true;
    if (!app.resume_url) { setResumeUrl(null); return; }
    supabase.storage.from("resumes").createSignedUrl(app.resume_url, 60 * 10).then(({ data }) => { if (active) setResumeUrl(data?.signedUrl ?? null); });
    return () => { active = false; };
  }, [app.resume_url, app.id]);
  const skillLabel = app.primary_skill === "Other" && app.other_specialization ? `Other · ${app.other_specialization}` : app.primary_skill;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-6 pb-5 pt-6">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-gold font-display text-xl font-bold text-primary-foreground shadow-gold">{initialsOf(app.full_name)}</div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl font-bold leading-tight">{app.full_name}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Applied {new Date(app.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div className="mt-2"><StatusBadge status={app.status} /></div>
          </div>
        </div>
      </div>

      <div className="max-h-[calc(100vh-30rem)] space-y-4 overflow-y-auto p-5">
        <DetailRow icon={Briefcase} label="Skill" value={skillLabel} />
        <DetailRow icon={Clock} label="Experience" value={`${app.experience} years`} />
        <DetailRow icon={MapPin} label="City" value={app.city} />
        <DetailRow icon={Phone} label="WhatsApp" value={
          <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:text-primary">{app.whatsapp_number}</a>
        } />
        {app.portfolio_url && <DetailRow icon={Globe} label="Portfolio" value={<LinkOut url={app.portfolio_url} />} />}
        {app.linkedin_url && <DetailRow icon={Linkedin} label="LinkedIn" value={<LinkOut url={app.linkedin_url} />} />}
        {app.resume_url && (
          <DetailRow icon={FileText} label="Resume" value={
            resumeUrl
              ? <a href={resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">View resume <ExternalLink className="h-3 w-3" /></a>
              : <span className="text-xs text-muted-foreground">Loading…</span>
          } />
        )}

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Why join</div>
          <div className="rounded-xl border border-border bg-muted/30 p-3.5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{app.why_join}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border bg-muted/20 px-5 py-4">
        {app.status === "approved" ? (
          <Button onClick={onWelcome} className="flex-1 bg-success text-success-foreground hover:bg-success/90">
            <MessageCircle className="mr-1.5 h-4 w-4" /> Welcome message
          </Button>
        ) : (
          <Button onClick={() => onAction(app, "approved")} className="flex-1 bg-success text-success-foreground hover:bg-success/90">
            <Check className="mr-1.5 h-4 w-4" /> Approve
          </Button>
        )}
        {app.status === "rejected" ? (
          <Button variant="outline" onClick={onReject} className="flex-1">
            <MessageCircle className="mr-1.5 h-4 w-4" /> Reject message
          </Button>
        ) : (
          <Button variant="outline" onClick={() => onAction(app, "rejected")} className="flex-1">
            <X className="mr-1.5 h-4 w-4" /> Reject
          </Button>
        )}
      </div>
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
    <div className="flex items-center gap-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" /> {label}
    </div>
    <div className="min-w-0 truncate text-right text-sm text-foreground">{value}</div>
  </div>
);

const LinkOut = ({ url }: { url: string }) => (
  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
    {url.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 28)}<ExternalLink className="h-3 w-3" />
  </a>
);

const MessageTemplate = ({ kind, app, onClose }: { kind: "approved" | "rejected"; app: Application; onClose: () => void }) => {
  const isApproved = kind === "approved";
  const message = isApproved ? tpl(app.full_name) : rejectTpl(app.full_name);
  const waNumber = app.whatsapp_number.replace(/[^\d]/g, "");
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  const copy = async () => { await navigator.clipboard.writeText(message); toast({ title: "Copied to clipboard" }); };
  const openWhatsApp = async () => {
    const popup = window.open(waLink, "_blank", "noopener,noreferrer");
    if (!popup) { await navigator.clipboard.writeText(message); toast({ title: "Popup blocked", description: "Message copied — paste it into WhatsApp manually." }); return; }
    toast({ title: "Opening WhatsApp" });
  };
  const Icon = isApproved ? Heart : XCircle;
  return (
    <>
      <DialogHeader>
        <div className="mb-2 flex items-center gap-2">
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${isApproved ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
            <Icon className="h-4 w-4" />
          </span>
          <DialogTitle className="font-display text-2xl">{isApproved ? "Approved · Send welcome" : "Rejected · Send a kind note"}</DialogTitle>
        </div>
        <DialogDescription>{isApproved ? "Copy the message below or open WhatsApp directly." : "Let the applicant know with care. Edit before sending if you'd like to personalize."}</DialogDescription>
      </DialogHeader>
      <Textarea readOnly value={message} rows={12} className="font-mono text-sm" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={copy} variant="outline" className="flex-1"><Copy className="mr-2 h-4 w-4" /> Copy message</Button>
        <Button type="button" onClick={openWhatsApp} className={`flex-1 ${isApproved ? "bg-success text-success-foreground hover:bg-success/90" : "bg-foreground text-background hover:bg-foreground/90"}`}>
          <MessageCircle className="mr-2 h-4 w-4" /> Open WhatsApp
        </Button>
      </div>
      <Button variant="ghost" onClick={onClose}>Done</Button>
    </>
  );
};

export default AdminApplications;
