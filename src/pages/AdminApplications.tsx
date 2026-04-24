import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Search, Check, X, Copy, ExternalLink, MessageCircle, Phone, MapPin, Briefcase, Clock, FileText, Linkedin, Globe, Calendar, Inbox, CheckCircle2, XCircle, Heart } from "lucide-react";

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
  `Hey ${name}! 🐝\n\nWelcome to Hyve — you're in!\n\nWe're a curated WhatsApp community of freelance designers, developers, writers, and marketers. Here's our group invite:\n\n[GROUP_INVITE_LINK]\n\nA few quick things:\n• Introduce yourself in the group when you join\n• Share your portfolio + what you're working on\n• Help others when you can — that's how Hyve thrives\n\nExcited to have you. 🟡\n— The Hyve team`;

const rejectTpl = (name: string) =>
  `Hey ${name},\n\nThank you so much for applying to Hyve and taking the time to share your story with us. 💛\n\nAfter careful review, we're unable to offer you a spot in the community at this moment. Hyve is a curated space, and we keep the group tightly aligned with where the community is right now — this isn't a reflection of your talent or potential.\n\nA few notes from our side:\n• Keep building your portfolio and putting your work out there\n• You're welcome to re-apply in the future as you grow\n• Follow us on hyvefreelance.com for resources and updates\n\nWishing you the very best on your journey.\n— The Hyve team`;

const AdminApplications = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [skill, setSkill] = useState<string>("all");
  const [approved, setApproved] = useState<Application | null>(null);
  const [rejected, setRejected] = useState<Application | null>(null);
  const [viewing, setViewing] = useState<Application | null>(null);

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
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  }), [apps]);

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Applications</h1>
            <p className="mt-1 text-muted-foreground">Review and approve incoming community requests.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
              <Inbox className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-foreground">{apps.length}</span> total
            </span>
          </div>
        </div>

        {/* Status tabs */}
        <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)} className="mb-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1.5 md:grid-cols-4">
            <TabTrigger value="all" icon={Inbox} label="All" count={apps.length} tone="muted" />
            <TabTrigger value="pending" icon={Clock} label="Pending" count={counts.pending} tone="warning" />
            <TabTrigger value="approved" icon={CheckCircle2} label="Approved" count={counts.approved} tone="success" />
            <TabTrigger value="rejected" icon={XCircle} label="Rejected" count={counts.rejected} tone="danger" />
          </TabsList>
        </Tabs>

        {/* Search & filter */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-11 pl-9" placeholder="Search by name or WhatsApp number" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={skill} onValueChange={setSkill}>
            <SelectTrigger className="h-11 md:w-52"><SelectValue placeholder="Skill" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All skills</SelectItem>
              {skills.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className="hidden grid-cols-12 gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid">
            <div className="col-span-3">Applicant</div>
            <div className="col-span-2">Skill</div>
            <div className="col-span-2">City</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Inbox className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No applications match your filters.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((a) => (
                <li key={a.id} className="grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-muted/30 md:grid-cols-12 md:items-center md:gap-4">
                  <button onClick={() => setViewing(a)} className="col-span-3 flex items-center gap-3 text-left">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-gold text-xs font-bold text-primary-foreground">
                      {initialsOf(a.full_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{a.full_name}</div>
                      <div className="truncate text-xs text-muted-foreground">{a.whatsapp_number} · {a.experience}y</div>
                    </div>
                  </button>
                  <div className="col-span-2 text-sm">{a.primary_skill}</div>
                  <div className="col-span-2 text-sm text-muted-foreground">{a.city}</div>
                  <div className="col-span-2"><StatusBadge status={a.status} /></div>
                  <div className="col-span-3 flex flex-wrap justify-end gap-2">
                    {a.status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => setApproved(a)}>
                        <MessageCircle className="mr-1 h-3.5 w-3.5" /> Welcome msg
                      </Button>
                    )}
                    {a.status === "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => setRejected(a)}>
                        <MessageCircle className="mr-1 h-3.5 w-3.5" /> Reject msg
                      </Button>
                    )}
                    {a.status !== "approved" && (
                      <Button size="sm" onClick={() => updateStatus(a, "approved")} className="bg-success text-success-foreground hover:bg-success/90">
                        <Check className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                    )}
                    {a.status !== "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(a, "rejected")}>
                        <X className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
          {viewing && (
            <ApplicationDetail
              app={viewing}
              onAction={updateStatus}
              onClose={() => setViewing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Approval template dialog */}
      <Dialog open={!!approved} onOpenChange={(o) => !o && setApproved(null)}>
        <DialogContent className="max-w-lg">
          {approved && (
            <MessageTemplate kind="approved" app={approved} onClose={() => setApproved(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection template dialog */}
      <Dialog open={!!rejected} onOpenChange={(o) => !o && setRejected(null)}>
        <DialogContent className="max-w-lg">
          {rejected && (
            <MessageTemplate kind="rejected" app={rejected} onClose={() => setRejected(null)} />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

const MessageTemplate = ({
  kind,
  app,
  onClose,
}: {
  kind: "approved" | "rejected";
  app: Application;
  onClose: () => void;
}) => {
  const isApproved = kind === "approved";
  const message = isApproved ? tpl(app.full_name) : rejectTpl(app.full_name);
  const waNumber = app.whatsapp_number.replace(/[^\d]/g, "");
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  const copy = async () => {
    await navigator.clipboard.writeText(message);
    toast({ title: "Copied to clipboard" });
  };
  const Icon = isApproved ? Heart : XCircle;
  return (
    <>
      <DialogHeader>
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              isApproved ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <DialogTitle className="font-display text-2xl">
            {isApproved ? "Approved · Send welcome" : "Rejected · Send a kind note"}
          </DialogTitle>
        </div>
        <DialogDescription>
          {isApproved
            ? "Copy the message below or open WhatsApp directly."
            : "Let the applicant know with care. Edit before sending if you'd like to personalize."}
        </DialogDescription>
      </DialogHeader>
      <Textarea readOnly value={message} rows={12} className="font-mono text-sm" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={copy} variant="outline" className="flex-1">
          <Copy className="mr-2 h-4 w-4" /> Copy message
        </Button>
        <a href={waLink} target="_blank" rel="noreferrer" className="flex-1">
          <Button
            className={`w-full ${
              isApproved
                ? "bg-success text-success-foreground hover:bg-success/90"
                : "bg-foreground text-background hover:bg-foreground/90"
            }`}
          >
            <MessageCircle className="mr-2 h-4 w-4" /> Open WhatsApp
          </Button>
        </a>
      </div>
      <Button variant="ghost" onClick={onClose}>Done</Button>
    </>
  );
};

const TabTrigger = ({
  value,
  icon: Icon,
  label,
  count,
  tone,
}: {
  value: string;
  icon: typeof Inbox;
  label: string;
  count: number;
  tone: "muted" | "warning" | "success" | "danger";
}) => {
  const toneClasses = {
    muted: "data-[state=active]:bg-foreground data-[state=active]:text-background",
    warning: "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
    success: "data-[state=active]:bg-success data-[state=active]:text-success-foreground",
    danger: "data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground",
  }[tone];
  const countClasses = {
    muted: "data-[state=active]:bg-background/20 bg-muted text-muted-foreground",
    warning: "data-[state=active]:bg-primary-foreground/20 bg-primary/15 text-primary",
    success: "data-[state=active]:bg-success-foreground/20 bg-success/15 text-success",
    danger: "data-[state=active]:bg-destructive-foreground/20 bg-destructive/15 text-destructive",
  }[tone];
  return (
    <TabsTrigger
      value={value}
      className={`group relative flex h-auto items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all data-[state=inactive]:hover:bg-muted/50 ${toneClasses}`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span className={`ml-1 inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${countClasses}`}>
        {count}
      </span>
    </TabsTrigger>
  );
};

const StatusBadge = ({ status }: { status: Status }) => {
  if (status === "approved") return <Badge className="bg-success/15 text-success hover:bg-success/15">Approved</Badge>;
  if (status === "rejected") return <Badge variant="secondary">Rejected</Badge>;
  return <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Pending</Badge>;
};

const LinkOut = ({ url }: { url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
  >
    {url.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 32)}
    <ExternalLink className="h-3 w-3" />
  </a>
);

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

const ApplicationDetail = ({
  app,
  onAction,
  onClose,
}: {
  app: Application;
  onAction: (a: Application, s: Status) => void;
  onClose: () => void;
}) => {
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const waNumber = app.whatsapp_number.replace(/[^\d]/g, "");

  useEffect(() => {
    let active = true;
    if (!app.resume_url) {
      setResumeUrl(null);
      return;
    }
    supabase.storage
      .from("resumes")
      .createSignedUrl(app.resume_url, 60 * 10)
      .then(({ data }) => {
        if (active) setResumeUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [app.resume_url]);

  const skillLabel =
    app.primary_skill === "Other" && app.other_specialization
      ? `Other · ${app.other_specialization}`
      : app.primary_skill;

  return (
    <div className="flex max-h-[90vh] flex-col">
      {/* Header */}
      <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-6 pb-5 pt-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-gold font-display text-xl font-bold text-primary-foreground shadow-gold">
            {initialsOf(app.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="font-display text-2xl font-bold leading-tight">
              {app.full_name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Application detail for {app.full_name}
            </DialogDescription>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Chip icon={Briefcase}>{skillLabel}</Chip>
              <Chip icon={Clock}>{app.experience}y exp</Chip>
              <Chip icon={MapPin}>{app.city}</Chip>
              <StatusBadge status={app.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
        {/* Contact */}
        <Section title="Contact">
          <InfoRow icon={Phone} label="WhatsApp">
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              {app.whatsapp_number}
            </a>
          </InfoRow>
          <InfoRow icon={Calendar} label="Applied">
            <span className="text-sm text-foreground">
              {new Date(app.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </InfoRow>
        </Section>

        {/* Links */}
        {(app.portfolio_url || app.linkedin_url || app.resume_url) && (
          <Section title="Links & files">
            {app.portfolio_url && (
              <InfoRow icon={Globe} label="Portfolio">
                <LinkOut url={app.portfolio_url} />
              </InfoRow>
            )}
            {app.linkedin_url && (
              <InfoRow icon={Linkedin} label="LinkedIn">
                <LinkOut url={app.linkedin_url} />
              </InfoRow>
            )}
            {app.resume_url && (
              <InfoRow icon={FileText} label="Resume">
                {resumeUrl ? (
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    View resume <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">Loading…</span>
                )}
              </InfoRow>
            )}
          </Section>
        )}

        {/* Why join */}
        <Section title="Why join">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {app.why_join}
            </p>
          </div>
        </Section>
      </div>

      {/* Footer actions */}
      <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
        {app.status !== "rejected" && (
          <Button
            variant="outline"
            onClick={() => {
              onAction(app, "rejected");
              onClose();
            }}
          >
            <X className="mr-1.5 h-4 w-4" /> Reject
          </Button>
        )}
        {app.status !== "approved" && (
          <Button
            onClick={() => {
              onAction(app, "approved");
              onClose();
            }}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            <Check className="mr-1.5 h-4 w-4" /> Approve
          </Button>
        )}
        {app.status === "approved" && (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {title}
    </div>
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {children}
    </div>
  </div>
);

const InfoRow = ({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0">
    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 text-primary" />
      <span className="font-medium">{label}</span>
    </div>
    <div className="min-w-0 truncate text-right">{children}</div>
  </div>
);

const Chip = ({
  icon: Icon,
  children,
}: {
  icon: typeof Briefcase;
  children: React.ReactNode;
}) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground">
    <Icon className="h-3 w-3 text-muted-foreground" /> {children}
  </span>
);

export default AdminApplications;
