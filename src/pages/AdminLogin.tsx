import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

// Simple hardcoded admin credentials - no database needed
const ADMIN_EMAIL = "team@hyvefreelance.com";
const ADMIN_PASSWORD = "HyveAdmin@2024";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await new Promise((r) => setTimeout(r, 600)); // small delay for UX

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Store session in localStorage
      localStorage.setItem("hyve_admin", "true");
      navigate("/admin", { replace: true });
    } else {
      toast({
        title: "Not authorized",
        description: "Incorrect email or password.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-dark">
      <header className="px-4 py-6">
        <Link to="/">
          <img src="/logo.png" alt="Hyve" className="h-8 w-auto" />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">Admin login</h1>
          <p className="mt-1 text-sm text-muted-foreground">HYVE community management.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="team@hyvefreelance.com"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
