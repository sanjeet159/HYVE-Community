import { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HyveLogo } from "@/components/HyveLogo";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Palette,
  Code2,
  PenLine,
  Megaphone,
  Layers,
  User,
  Phone,
  MapPin,
  Link2,
  Linkedin,
  MessageSquareHeart,
  Briefcase,
  Loader2,
  FileText,
  Upload,
  X,
} from "lucide-react";

const skills = ["UI/UX", "Development", "Content Writing", "Digital Marketing", "Other"] as const;
const experiences = ["0-1", "1-3", "3+"] as const;

const skillMeta: Record<typeof skills[number], { icon: typeof Palette; tag: string }> = {
  "UI/UX": { icon: Palette, tag: "Design beautiful experiences" },
  "Development": { icon: Code2, tag: "Build the web" },
  "Content Writing": { icon: PenLine, tag: "Words that convert" },
  "Digital Marketing": { icon: Megaphone, tag: "Grow brands online" },
  "Other": { icon: Layers, tag: "Something unique" },
};

const expMeta: Record<typeof experiences[number], { label: string; sub: string }> = {
  "0-1": { label: "Just starting", sub: "0 – 1 year" },
  "1-3": { label: "Finding my groove", sub: "1 – 3 years" },
  "3+": { label: "Seasoned pro", sub: "3+ years" },
};

const schema = z.object({
  full_name: z.string().trim().min(2, "Min 2 characters").max(100),
  whatsapp_number: z
    .string()
    .trim()
    .min(5, "Enter a valid number")
    .max(20)
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
  full_name: "",
  whatsapp_number: "",
  primary_skill: "UI/UX",
  experience: "0-1",
  city: "",
  portfolio_url: "",
  linkedin_url: "",
  why_join: "",
};

const steps = [
  { id: 0, name: "About you", icon: User },
  { id: 1, name: "Your craft", icon: Briefcase },
  { id: 2, name: "Your work", icon: Link2 },
  { id: 3, name: "Your story", icon: MessageSquareHeart },
] as const;

const stepFields: Record<number, (keyof FormState)[]> = {
  0: ["full_name", "whatsapp_number", "city"],
  1: ["primary_skill", "experience"],
  2: ["portfolio_url", "linkedin_url"],
  3: ["why_join"],
};

const Apply = () => {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validateStep = (s: number) => {
    const fields = stepFields[s];
    const partial = schema.pick(Object.fromEntries(fields.map((f) => [f, true])) as never);
    const result = partial.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        fe[i.path[0] as string] = i.message;
      });
      setErrors((prev) => ({ ...prev, ...fe }));
      return false;
    }
    return true;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fe[i.path[0] as string] = i.message;
      });
      setErrors(fe);
      // jump back to first step with errors
      for (const s of [0, 1, 2, 3]) {
        if (stepFields[s].some((f) => fe[f])) {
          setStep(s);
          break;
        }
      }
      return;
    }
    setLoading(true);
    const d = parsed.data;
    const payload = {
      full_name: d.full_name as string,
      whatsapp_number: d.whatsapp_number as string,
      primary_skill: d.primary_skill as typeof skills[number],
      experience: d.experience as typeof experiences[number],
      city: d.city as string,
      why_join: d.why_join as string,
      portfolio_url: d.portfolio_url ? d.portfolio_url : null,
      linkedin_url: d.linkedin_url ? d.linkedin_url : null,
    };
    const { error } = await supabase.from("applications").insert([payload]);
    setLoading(false);
    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
  };

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  if (done) return <SuccessScreen />;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-dark" aria-hidden />
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-3xl"
        />
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
          className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-14 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5" /> Curated · Application only
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display text-4xl font-bold leading-[1.05] text-background md:text-6xl lg:text-7xl"
          >
            Find your people in the{" "}
            <span className="bg-gradient-gold bg-clip-text text-transparent">Hyve</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 max-w-xl text-lg text-background/70 md:text-xl"
          >
            A WhatsApp community of freelance designers, developers, writers, and marketers
            shipping real work for real clients.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center gap-6 text-sm text-background/60"
          >
            <Stat value="500+" label="Active members" />
            <Stat value="40+" label="Cities" />
            <Stat value="2 min" label="To apply" />
          </motion.div>
        </div>
      </section>

      {/* Form */}
      <section id="apply" className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        {/* Progress */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>
              Step {step + 1} of {steps.length} ·{" "}
              <span className="text-foreground">{steps[step].name}</span>
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-gradient-gold"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <div className="mt-4 hidden grid-cols-4 gap-2 sm:grid">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const complete = i < step;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                    active
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : complete
                        ? "border-border bg-card text-muted-foreground hover:text-foreground"
                        : "border-border/50 bg-transparent text-muted-foreground/60"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      complete
                        ? "bg-primary text-primary-foreground"
                        : active
                          ? "bg-primary/20 text-primary"
                          : "bg-muted"
                    }`}
                  >
                    {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="truncate font-medium">{s.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card */}
        <div className="relative rounded-3xl border border-border bg-card p-6 shadow-soft md:p-10">
          {/* gold accent corner */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-px -top-px h-24 w-24 rounded-tr-3xl bg-gradient-to-bl from-primary/25 to-transparent"
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step < steps.length - 1) next();
              else submit();
            }}
            className="relative"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-6"
              >
                {step === 0 && <StepAbout form={form} set={set} errors={errors} />}
                {step === 1 && <StepCraft form={form} set={set} errors={errors} />}
                {step === 2 && <StepWork form={form} set={set} errors={errors} />}
                {step === 3 && <StepStory form={form} set={set} errors={errors} />}
              </motion.div>
            </AnimatePresence>

            {/* Nav */}
            <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={back}
                disabled={step === 0}
                className="text-muted-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>

              {step < steps.length - 1 ? (
                <Button
                  type="submit"
                  size="lg"
                  className="bg-foreground text-background shadow-soft hover:bg-foreground/90"
                >
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-95"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>
                      Submit application <ArrowRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          We read every application personally · Replies on WhatsApp within a few days
        </p>
      </section>
    </div>
  );
};

/* ---------- Steps ---------- */

type StepProps = {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
};

const StepAbout = ({ form, set, errors }: StepProps) => (
  <div className="space-y-6">
    <StepHeader
      eyebrow="01 — About you"
      title="Let's start with the basics"
      desc="Tell us who you are and where to reach you."
    />
    <Field label="Full name" error={errors.full_name} icon={User}>
      <Input
        value={form.full_name}
        onChange={(e) => set("full_name", e.target.value)}
        placeholder="Jane Doe"
        maxLength={100}
        className="h-12 pl-10"
      />
    </Field>
    <Field
      label="WhatsApp number"
      error={errors.whatsapp_number}
      icon={Phone}
      hint="Include country code — this is how we'll reach you."
    >
      <Input
        value={form.whatsapp_number}
        onChange={(e) => set("whatsapp_number", e.target.value)}
        placeholder="+91 98765 43210"
        maxLength={20}
        inputMode="tel"
        className="h-12 pl-10"
      />
    </Field>
    <Field label="City" error={errors.city} icon={MapPin}>
      <Input
        value={form.city}
        onChange={(e) => set("city", e.target.value)}
        placeholder="Bengaluru"
        maxLength={100}
        className="h-12 pl-10"
      />
    </Field>
  </div>
);

const StepCraft = ({ form, set, errors }: StepProps) => (
  <div className="space-y-8">
    <StepHeader
      eyebrow="02 — Your craft"
      title="What do you do best?"
      desc="Pick your primary skill — you can add more later."
    />

    <div>
      <Label className="mb-3 block text-sm font-medium">Primary skill</Label>
      <div className="grid gap-3 sm:grid-cols-2">
        {skills.map((s) => {
          const Icon = skillMeta[s].icon;
          const active = form.primary_skill === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => set("primary_skill", s)}
              className={`group relative flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                active
                  ? "border-primary bg-primary/5 shadow-soft"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${
                  active ? "bg-gradient-gold text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{s}</span>
                <span className="block text-xs text-muted-foreground">{skillMeta[s].tag}</span>
              </span>
              {active && (
                <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-primary" />
              )}
            </button>
          );
        })}
      </div>
      {errors.primary_skill && (
        <p className="mt-2 text-xs text-destructive">{errors.primary_skill}</p>
      )}
    </div>

    <div>
      <Label className="mb-3 block text-sm font-medium">Years of experience</Label>
      <div className="grid gap-3 sm:grid-cols-3">
        {experiences.map((e) => {
          const active = form.experience === e;
          return (
            <button
              key={e}
              type="button"
              onClick={() => set("experience", e)}
              className={`rounded-xl border p-4 text-left transition ${
                active
                  ? "border-primary bg-primary/5 shadow-soft"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <div className="text-sm font-semibold">{expMeta[e].label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{expMeta[e].sub}</div>
            </button>
          );
        })}
      </div>
      {errors.experience && (
        <p className="mt-2 text-xs text-destructive">{errors.experience}</p>
      )}
    </div>
  </div>
);

const StepWork = ({ form, set, errors }: StepProps) => (
  <div className="space-y-6">
    <StepHeader
      eyebrow="03 — Your work"
      title="Show us what you've built"
      desc="Optional, but a portfolio helps us get to know you faster."
    />
    <Field label="Portfolio URL" optional error={errors.portfolio_url} icon={Link2}>
      <Input
        value={form.portfolio_url}
        onChange={(e) => set("portfolio_url", e.target.value)}
        placeholder="https://yourwork.com"
        maxLength={300}
        className="h-12 pl-10"
      />
    </Field>
    <Field label="LinkedIn URL" optional error={errors.linkedin_url} icon={Linkedin}>
      <Input
        value={form.linkedin_url}
        onChange={(e) => set("linkedin_url", e.target.value)}
        placeholder="https://linkedin.com/in/you"
        maxLength={300}
        className="h-12 pl-10"
      />
    </Field>

    <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Tip:</span> Even a Notion page, GitHub repo, or
      Instagram with your work counts. We care about the craft, not the polish.
    </div>
  </div>
);

const StepStory = ({ form, set, errors }: StepProps) => (
  <div className="space-y-6">
    <StepHeader
      eyebrow="04 — Your story"
      title="Why Hyve?"
      desc="The most important question. Be honest, be you."
    />
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Why do you want to join?</Label>
      <Textarea
        value={form.why_join}
        onChange={(e) => set("why_join", e.target.value)}
        placeholder="What you'd bring to the community, what you're hoping to find, the kind of work you want to do…"
        rows={7}
        maxLength={2000}
        className="resize-none text-base"
      />
      <div className="flex items-center justify-between text-xs">
        <span className={errors.why_join ? "text-destructive" : "text-muted-foreground"}>
          {errors.why_join ?? "Min 10 characters"}
        </span>
        <span className="text-muted-foreground">{form.why_join.length}/2000</span>
      </div>
    </div>

    {/* Summary */}
    <div className="rounded-2xl border border-border bg-muted/40 p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Quick review
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <Summary label="Name" value={form.full_name || "—"} />
        <Summary label="WhatsApp" value={form.whatsapp_number || "—"} />
        <Summary label="City" value={form.city || "—"} />
        <Summary label="Skill" value={form.primary_skill} />
        <Summary label="Experience" value={`${form.experience} years`} />
      </dl>
    </div>
  </div>
);

/* ---------- Bits ---------- */

const StepHeader = ({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) => (
  <div>
    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
      {eyebrow}
    </div>
    <h2 className="font-display text-2xl font-bold md:text-3xl">{title}</h2>
    <p className="mt-1.5 text-sm text-muted-foreground md:text-base">{desc}</p>
  </div>
);

const Field = ({
  label,
  optional,
  error,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  icon?: typeof User;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">
      {label}{" "}
      {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
    </Label>
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
      {children}
    </div>
    {error ? (
      <p className="text-xs text-destructive">{error}</p>
    ) : hint ? (
      <p className="text-xs text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);

const Summary = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-0 sm:border-0 sm:py-0">
    <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className="truncate text-sm font-medium text-foreground">{value}</dd>
  </div>
);

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div>
    <div className="font-display text-2xl font-bold text-background">{value}</div>
    <div className="text-xs uppercase tracking-wider text-background/50">{label}</div>
  </div>
);

const Header = () => (
  <header className="border-b border-border bg-background">
    <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
      <Link to="/">
        <HyveLogo />
      </Link>
      <Link to="/admin/login" className="text-sm text-muted-foreground hover:text-foreground">
        Admin
      </Link>
    </div>
  </header>
);

const SuccessScreen = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <div className="relative mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-gold shadow-gold"
      >
        <CheckCircle2 className="h-12 w-12 text-primary-foreground" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="font-display text-3xl font-bold md:text-5xl"
      >
        You're on the list
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 text-muted-foreground md:text-lg"
      >
        Thanks for applying to Hyve. We review every application personally — you'll hear from us
        on WhatsApp within a few days.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8"
      >
        <Link to="/">
          <Button variant="outline" size="lg">
            Back to home
          </Button>
        </Link>
      </motion.div>
    </div>
  </div>
);

export default Apply;
