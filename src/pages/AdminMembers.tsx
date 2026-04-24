import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Search, Download, ExternalLink } from "lucide-react";

interface Member {
  id: string;
  full_name: string;
  whatsapp_number: string;
  primary_skill: string;
  experience: string;
  city: string;
  portfolio_url: string | null;
  linkedin_url: string | null;
  created_at: string;
}

const skills = ["UI/UX", "Development", "Content Writing", "Digital Marketing", "Other"];

const AdminMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("all");
  const [city, setCity] = useState("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("applications").select("*").eq("status", "approved").order("created_at", { ascending: false });
      if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setMembers((data ?? []) as Member[]);
      setLoading(false);
    })();
  }, []);

  const cities = useMemo(() => Array.from(new Set(members.map((m) => m.city))).sort(), [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (skill !== "all" && m.primary_skill !== skill) return false;
      if (city !== "all" && m.city !== city) return false;
      if (q && !m.full_name.toLowerCase().includes(q) && !m.whatsapp_number.toLowerCase().includes(q) && !m.city.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [members, search, skill, city]);

  const exportCsv = () => {
    const header = ["Name", "WhatsApp", "Skill", "Experience", "City", "Portfolio", "LinkedIn", "Joined"];
    const escape = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((m) => [
      m.full_name, m.whatsapp_number, m.primary_skill, m.experience + "y", m.city,
      m.portfolio_url, m.linkedin_url, new Date(m.created_at).toISOString().slice(0, 10),
    ].map(escape).join(","));
    const csv = [header.map(escape).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hyve-members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-3xl font-bold">Members</h1>
            <p className="mt-1 text-muted-foreground">{members.length} approved freelancers in the Hyve.</p>
          </div>
          <Button onClick={exportCsv} disabled={!filtered.length} className="bg-foreground text-background hover:bg-foreground/90">
            <Download className="mr-2 h-4 w-4" /> Export CSV ({filtered.length})
          </Button>
        </div>
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search name, number, city" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={skill} onValueChange={setSkill}>
            <SelectTrigger className="md:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All skills</SelectItem>
              {skills.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="md:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground shadow-soft">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground shadow-soft">No members match your filters.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <div key={m.id} className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:shadow-gold">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-base font-bold text-primary">
                      {m.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div className="font-semibold leading-tight">{m.full_name}</div>
                      <div className="text-xs text-muted-foreground">{m.city}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background">{m.primary_skill}</span>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{m.experience}y</span>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">{m.whatsapp_number}</div>
                <div className="mt-3 flex gap-3 text-xs">
                  {m.portfolio_url && <LinkOut label="Portfolio" url={m.portfolio_url} />}
                  {m.linkedin_url && <LinkOut label="LinkedIn" url={m.linkedin_url} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const LinkOut = ({ label, url }: { label: string; url: string }) => (
  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
    {label}<ExternalLink className="h-3 w-3" />
  </a>
);

export default AdminMembers;
