import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HyveLogo } from "@/components/HyveLogo";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

const skills = ["UI/UX", "Development", "Content Writing", "Digital Marketing", "Other"] as const;
const experiences = ["0-1", "1-3", "3+"] as const;

const schema = z.object({
  full_name: z.string().trim().min(2, "Min 2 characters").max(100),
  whatsapp_number: z.string().trim().min(5, "Enter a valid number").max(20)
    .regex(/^[+\d\s()-]+$/, "Only digits, spaces, +, -, ()"),
  primary_skill: z.enum(skills),
  experience: z.enum(experiences),
  city: z.string().trim().min(2).max(100),
  portfolio_url: z.string().trim().url("Invalid URL").max(300).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url("Invalid URL").max(300).optional().or(z.literal("")),
  why_join: z.string().trim().min(10, "Tell us a bit more (min 10 chars)").max(2000),
});

type FormState = z.input<typeof schema>;

const initial: FormState = {
  full_name: "", whatsapp_number: "", primary_skill: "UI/UX",
  experience: "0-1", city: "", portfolio_url: "", linkedin_url: "", why_join: "",
};

const Apply = () => {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { fe[i.path[0] as string] = i.message; });
      setErrors(fe);
      return;
    }
    setLoading(true);
    const payload = {
      ...parsed.data,
      portfolio_url: parsed.data.portfolio_url || null,
      linkedin_url: parsed.data.linkedin_url || null,
    };
    const { error } = await supabase.from("applications").insert([payload]);
    setLoading(false);
    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">You're on the list</h1>
          <p className="mt-3 text-muted-foreground">
            Thanks for applying to Hyve. We review every application personally — you'll hear from us on WhatsApp within a few days.
          </p>
          <Link to="/" className="mt-8">
            <Button variant="outline">Back to home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-dark" aria-hidden />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 py-16 md:py-24">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Curated · Application only
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.1] text-background md:text-6xl">
            Join the <span className="text-primary">Hyve</span>.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-background/70">
            A WhatsApp community of freelance designers, developers, writers, and marketers shipping real work for real clients.
          </p>
          <a href="#apply" className="mt-8 inline-block">
            <Button size="lg" className="bg-primary text-primary-foreground shadow-gold hover:bg-primary/90">
              Apply now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* Form */}
      <section id="apply" className="mx-auto max-w-2xl px-4 py-12 md:py-20">
        <div className="mb-8">
          <h2 className="font-display text-2xl font-bold md:text-3xl">Apply to join</h2>
          <p className="mt-1 text-muted-foreground">Takes about 2 minutes. Be honest — we read everything.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
          <Field label="Full name" error={errors.full_name}>
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Jane Doe" maxLength={100} />
          </Field>

          <Field label="WhatsApp number" error={errors.whatsapp_number}>
            <Input value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="+91 98765 43210" maxLength={20} />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Primary skill" error={errors.primary_skill}>
              <Select value={form.primary_skill} onValueChange={(v) => set("primary_skill", v as FormState["primary_skill"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {skills.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Years of experience" error={errors.experience}>
              <Select value={form.experience} onValueChange={(v) => set("experience", v as FormState["experience"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {experiences.map((s) => <SelectItem key={s} value={s}>{s} years</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="City" error={errors.city}>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Bengaluru" maxLength={100} />
          </Field>

          <Field label="Portfolio URL" optional error={errors.portfolio_url}>
            <Input value={form.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://..." maxLength={300} />
          </Field>

          <Field label="LinkedIn URL" optional error={errors.linkedin_url}>
            <Input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." maxLength={300} />
          </Field>

          <Field label="Why do you want to join?" error={errors.why_join}>
            <Textarea
              value={form.why_join}
              onChange={(e) => set("why_join", e.target.value)}
              placeholder="What you'd bring to the community, what you're hoping to find..."
              rows={5}
              maxLength={2000}
            />
            <p className="mt-1 text-xs text-muted-foreground">{form.why_join.length}/2000</p>
          </Field>

          <Button type="submit" disabled={loading} size="lg" className="w-full bg-foreground text-background hover:bg-foreground/90">
            {loading ? "Submitting..." : "Submit application"}
          </Button>
        </form>
      </section>
    </div>
  );
};

const Header = () => (
  <header className="border-b border-border bg-background">
    <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
      <Link to="/"><HyveLogo /></Link>
      <Link to="/admin/login" className="text-sm text-muted-foreground hover:text-foreground">Admin</Link>
    </div>
  </header>
);

const Field = ({ label, optional, error, children }: { label: string; optional?: boolean; error?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">
      {label} {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
    </Label>
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

export default Apply;
