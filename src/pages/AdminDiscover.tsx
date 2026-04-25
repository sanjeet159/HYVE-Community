import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Compass,
  RefreshCw,
  Users as UsersIcon,
  MapPin,
  ExternalLink,
  Send,
  Search,
  Sparkles,
  MessageCircle,
} from "lucide-react";

interface Community {
  id: string;
  name: string;
  platform: string;
  member_count: number | null;
  skills: string[];
  city: string | null;
  summary: string | null;
  join_link: string | null;
  discovered_at: string;
}

const SKILL_OPTIONS = ["Design", "Dev", "Writing", "Marketing"];
const PLATFORM_OPTIONS = ["WhatsApp", "Telegram", "Reddit", "LinkedIn"];

const OUTREACH_MESSAGE = `Hey! 👋 I came across your community and loved what you're building. I run HYVE — a curated WhatsApp community of freelance designers, developers, writers & marketers in India shipping real work for real clients. Would love to have talented people like you join us! hyvefreelance.com`;

const platformTone: Record<string, string> = {
  WhatsApp: "bg-success/15 text-success",
  Telegram: "bg-sky-500/15 text-sky-600",
  Reddit: "bg-orange-500/15 text-orange-600",
  LinkedIn: "bg-blue-500/15 text-blue-600",
};

const AdminDiscover = () => {
  const [items, setItems] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState<string>("all");
  const [platform, setPlatform] = useState<string>("all");
  const [city, setCity] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("discovered_communities")
      .select("*")
      .order("discovered_at", { ascending: false });
    if (error) {
      toast({ title: "Couldn't load", description: error.message, variant: "destructive" });
    } else {
      setItems((data ?? []) as Community[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    toast({ title: "Searching the web…", description: "AI is curating fresh communities. This takes ~20s." });
    const { data, error } = await supabase.functions.invoke("discover-communities", { body: {} });
    setRefreshing(false);
    if (error) {
      toast({ title: "Discovery failed", description: error.message, variant: "destructive" });
      return;
    }
    const inserted = (data as { inserted?: number })?.inserted ?? 0;
    toast({
      title: inserted > 0 ? `Found ${inserted} new` : "All caught up",
      description: inserted > 0 ? "New communities added to the list." : "No fresh results this time.",
    });
    await load();
  };

  const cities = useMemo(() => {
    const s = new Set<string>();
    items.forEach((c) => c.city && s.add(c.city));
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (skill !== "all" && !c.skills?.includes(skill)) return false;
      if (platform !== "all" && c.platform !== platform) return false;
      if (city !== "all" && c.city !== city) return false;
      if (q && !`${c.name} ${c.summary ?? ""} ${c.city ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, skill, platform, city]);

  const inviteOnWhatsApp = async () => {
    const link = `https://wa.me/?text=${encodeURIComponent(OUTREACH_MESSAGE)}`;
    const popup = window.open(link, "_blank", "noopener,noreferrer");
    if (!popup) {
      await navigator.clipboard.writeText(OUTREACH_MESSAGE);
      toast({ title: "Popup blocked", description: "Outreach message copied — paste it manually." });
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="h-7 w-7 text-primary" />
              <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Discover</h1>
            </div>
            <p className="mt-1 text-muted-foreground">AI-curated freelancer communities, refreshed daily.</p>
          </div>
          <Button onClick={refresh} disabled={refreshing} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {refreshing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {refreshing ? "Analyzing…" : "Refresh & Analyze"}
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 pl-9"
              placeholder="Search communities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={skill} onValueChange={setSkill}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Skill" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All skills</SelectItem>
              {SKILL_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {PLATFORM_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-11"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="mt-10 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState onRun={refresh} loading={refreshing} />
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-muted-foreground">No communities match these filters.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <CommunityCard key={c.id} c={c} onInvite={inviteOnWhatsApp} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const CommunityCard = ({ c, onInvite }: { c: Community; onInvite: () => void }) => {
  const tone = platformTone[c.platform] ?? "bg-secondary text-foreground";
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-tight">{c.name}</h3>
          <Badge className={`shrink-0 ${tone} hover:${tone}`}>{c.platform}</Badge>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {typeof c.member_count === "number" && (
            <span className="inline-flex items-center gap-1"><UsersIcon className="h-3.5 w-3.5" /> {c.member_count.toLocaleString()} members</span>
          )}
          {c.city && (
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {c.city}</span>
          )}
        </div>

        {c.skills?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {c.skills.map((s) => (
              <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>
            ))}
          </div>
        )}

        {c.summary && (
          <p className="mt-3 line-clamp-3 text-sm text-foreground/80">{c.summary}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2 pt-1">
          {c.join_link ? (
            <Button asChild variant="outline" size="sm" className="flex-1">
              <a href={c.join_link} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" /> Join Community
              </a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="flex-1" disabled>No public link</Button>
          )}
          <Button size="sm" onClick={onInvite} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
            <Send className="mr-1.5 h-4 w-4" /> Invite to HYVE
          </Button>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ onRun, loading }: { onRun: () => void; loading: boolean }) => (
  <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
      <Compass className="h-7 w-7" />
    </div>
    <h3 className="mt-4 font-display text-xl font-semibold">No communities yet</h3>
    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
      Run discovery to let AI search WhatsApp, Telegram, Reddit and LinkedIn for active India-focused freelance groups.
    </p>
    <Button onClick={onRun} disabled={loading} className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
      {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {loading ? "Analyzing…" : "Run Discovery"}
    </Button>
  </div>
);

export default AdminDiscover;
