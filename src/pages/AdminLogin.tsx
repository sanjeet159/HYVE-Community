import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HyveLogo } from "@/components/HyveLogo";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (data) navigate("/admin", { replace: true });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      setLoading(false);
      toast({ title: "Login failed", description: error?.message ?? "Try again", variant: "destructive" });
      return;
    }
    const { data: roleRow } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", data.session.user.id).eq("role", "admin").maybeSingle();
    setLoading(false);
    if (!roleRow) {
      await supabase.auth.signOut();
      toast({ title: "Not authorized", description: "This account is not an admin.", variant: "destructive" });
      return;
    }
    navigate("/admin", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-dark">
      <header className="px-4 py-6">
        <Link to="/" className="inline-flex"><HyveLogo /></Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">Admin login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Hyve community management.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground">
            New here? Create your account in Cloud → Users, then assign yourself the <code className="rounded bg-muted px-1">admin</code> role in the <code className="rounded bg-muted px-1">user_roles</code> table.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
