import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Search, Check, X, Copy, ExternalLink, MessageCircle, Phone, MapPin, Briefcase, Clock, FileText, Linkedin, Globe, Calendar } from "lucide-react";

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

const AdminApplications = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [skill, setSkill] = useState<string>("all");
  const [approved, setApproved] = useState<Application | null>(null);
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
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Applications</h1>
          <p className="mt-1 text-muted-foreground">Review and approve incoming community requests.</p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3 md:gap-4">
          <Stat label="Pending" value={counts.pending} tone="warning" />
          <Stat label="Approved" value={counts.approved} tone="success" />
          <Stat label="Rejected" value={counts.rejected} tone="muted" />
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or WhatsApp number" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="md:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={skill} onValueChange={setSkill}>
            <SelectTrigger className="md:w-52"><SelectValue placeholder="Skill" /></SelectTrigger>
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
            <div className="p-12 text-center text-muted-foreground">No applications match your filters.</div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((a) => (
                <li key={a.id} className="grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-muted/30 md:grid-cols-12 md:items-center md:gap-4">
                  <button onClick={() => setViewing(a)} className="col-span-3 text-left">
                    <div className="font-medium">{a.full_name}</div>
                    <div className="text-xs text-muted-foreground">{a.whatsapp_number} · {a.experience}y</div>
                  </button>
                  <div className="col-span-2 text-sm">{a.primary_skill}</div>
                  <div className="col-span-2 text-sm text-muted-foreground">{a.city}</div>
                  <div className="col-span-2"><StatusBadge status={a.status} /></div>
                  <div className="col-span-3 flex flex-wrap justify-end gap-2">
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
        <DialogContent className="max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{viewing.full_name}</DialogTitle>
                <DialogDescription>
                  {viewing.primary_skill} · {viewing.experience}y · {viewing.city}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <Row label="WhatsApp">{viewing.whatsapp_number}</Row>
                {viewing.portfolio_url && <Row label="Portfolio"><LinkOut url={viewing.portfolio_url} /></Row>}
                {viewing.linkedin_url && <Row label="LinkedIn"><LinkOut url={viewing.linkedin_url} /></Row>}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why join</div>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">{viewing.why_join}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <StatusBadge status={viewing.status} />
                  <span className="text-xs text-muted-foreground">Applied {new Date(viewing.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval template dialog */}
      <Dialog open={!!approved} onOpenChange={(o) => !o && setApproved(null)}>
        <DialogContent className="max-w-lg">
          {approved && (
            <ApprovalTemplate app={approved} onClose={() => setApproved(null)} />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

const ApprovalTemplate = ({ app, onClose }: { app: Application; onClose: () => void }) => {
  const message = tpl(app.full_name);
  const waNumber = app.whatsapp_number.replace(/[^\d]/g, "");
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  const copy = async () => {
    await navigator.clipboard.writeText(message);
    toast({ title: "Copied to clipboard" });
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">Approved · Send welcome</DialogTitle>
        <DialogDescription>Copy the message below or open WhatsApp directly.</DialogDescription>
      </DialogHeader>
      <Textarea readOnly value={message} rows={12} className="font-mono text-sm" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={copy} variant="outline" className="flex-1">
          <Copy className="mr-2 h-4 w-4" /> Copy message
        </Button>
        <a href={waLink} target="_blank" rel="noreferrer" className="flex-1">
          <Button className="w-full bg-success text-success-foreground hover:bg-success/90">
            <MessageCircle className="mr-2 h-4 w-4" /> Open WhatsApp
          </Button>
        </a>
      </div>
      <Button variant="ghost" onClick={onClose}>Done</Button>
    </>
  );
};

const Stat = ({ label, value, tone }: { label: string; value: number; tone: "warning" | "success" | "muted" }) => {
  const dot = { warning: "bg-primary", success: "bg-success", muted: "bg-muted-foreground/40" }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft md:p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span className={`h-2 w-2 rounded-full ${dot}`} /> {label}
      </div>
      <div className="mt-2 font-display text-3xl font-bold md:text-4xl">{value}</div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: Status }) => {
  if (status === "approved") return <Badge className="bg-success/15 text-success hover:bg-success/15">Approved</Badge>;
  if (status === "rejected") return <Badge variant="secondary">Rejected</Badge>;
  return <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Pending</Badge>;
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4">
    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="text-right">{children}</span>
  </div>
);

const LinkOut = ({ url }: { url: string }) => (
  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
    {url.replace(/^https?:\/\//, "").slice(0, 30)}<ExternalLink className="h-3 w-3" />
  </a>
);

export default AdminApplications;
