import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Users, UserCheck, CalendarDays } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Row {
  id: string;
  status: "pending" | "approved" | "rejected";
  primary_skill: string;
  city: string;
  created_at: string;
}

const COLORS = ["#f1ab13", "#111111", "#7c5310", "#3a3a3a", "#d4d0c8"];

const AdminAnalytics = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("applications").select("id,status,primary_skill,city,created_at");
      if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: rows.length,
      approved: rows.filter((r) => r.status === "approved").length,
      week: rows.filter((r) => new Date(r.created_at).getTime() >= weekAgo).length,
    };
  }, [rows]);

  const skillData = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.primary_skill, (map.get(r.primary_skill) ?? 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [rows]);

  const cityData = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.city, (map.get(r.city) ?? 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [rows]);

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Analytics</h1>
          <p className="mt-1 text-muted-foreground">An overview of community growth and composition.</p>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard icon={Users} label="Total applications" value={stats.total} />
          <StatCard icon={UserCheck} label="Approved members" value={stats.approved} accent />
          <StatCard icon={CalendarDays} label="This week" value={stats.week} />
        </div>
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground shadow-soft">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground shadow-soft">No data yet — applications will appear here.</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Breakdown by skill">
              <div className="flex flex-col items-center gap-4 lg:flex-row">
                <div className="h-64 w-full lg:w-1/2">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={skillData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {skillData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full space-y-2 lg:w-1/2">
                  {skillData.map((s, i) => (
                    <li key={s.name} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                        {s.name}
                      </span>
                      <span className="font-semibold">{s.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
            <Card title="Top cities">
              <div className="h-72 w-full">
                <ResponsiveContainer>
                  <BarChart data={cityData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="name" type="category" width={90} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const StatCard = ({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: number; accent?: boolean }) => (
  <div className={`rounded-2xl border border-border p-6 shadow-soft ${accent ? "bg-foreground text-background" : "bg-card"}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</span>
      <Icon className="h-4 w-4 opacity-60" />
    </div>
    <div className="mt-3 font-display text-4xl font-bold">{value}</div>
  </div>
);

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
    <h3 className="mb-4 font-display text-lg font-semibold">{title}</h3>
    {children}
  </div>
);

export default AdminAnalytics;
