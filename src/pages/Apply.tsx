import { useMemo, useRef, useState } from "react";
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
  Wand2,
  RefreshCw,
  Users,
  Globe,
  Clock,
  Zap,
} from "lucide-react";

const skills = ["UI/UX", "Development", "Content Writing", "Digital Marketing", "Other"] as const;
const experiences = ["0-1", "1-3", "3+"] as const;

const skillMeta: Record<typeof skills[number], { icon: typeof Palette; tag: string; color: string }> = {
  "UI/UX": { icon: Palette, tag: "Design beautiful experiences", color: "from-violet-500/20 to-purple-500/10 border-violet-500/30 hover:border-violet-500/60" },
  "Development": { icon: Code2, tag: "Build the web", color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30 hover:border-blue-500/60" },
  "Content Writing": { icon: PenLine, tag: "Words that convert", color: "from-emerald-500/20 to-green-500/10 border-emerald-500/30 hover:border-emerald-500/60" },
  "Digital Marketing": { icon: Megaphone, tag: "Grow brands online", color: "from-orange-500/20 to-amber-500/10 border-orange-500/30 hover:border-orange-500/60" },
  "Other": { icon: Layers, tag: "Something unique", color: "from-rose-500/20 to-pink-500/10 border-rose-500/30 hover:border-rose-500/60" },
};

const expMeta: Record<typeof experiences[number], { label: string; sub: string; emoji: string }> = {
  "0-1": { label: "Just starting", sub: "0 – 1 year", emoji: "🌱" },
  "1-3": { label: "Finding my groove", sub: "1 – 3 years", emoji: "🚀" },
  "3+": { label: "Seasoned pro", sub: "3+ years", emoji: "⚡" },
};

const baseSchema = z.object({
  full_name: z.string().trim().min(2, "Min 2 characters").max(100),
  whatsapp_number: z
    .string()
    .trim()
    .min(5, "Enter a valid number")
    .max(20)
    .regex(/^[+\d\s()-]+$/, "Only digits, spaces, +, -, ()"),
  primary_skill: z.enum(skills),
  other_specialization: z.string().trim().max(100).optional().or(z.literal("")),
  experience: z.enum(experiences),
  city: z.string().trim().min(2).max(100),
  portfolio_url: z.string().trim().url("Invalid URL").max(300).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url("Invalid URL").max(300).optional().or(z.literal("")),
  why_join: z.string().trim().min(10, "Tell us a bit more (min 10 chars)").max(2000),
});

const fullSchema = baseSchema.refine(
  (d) =>
    d.primary_skill !== "Other" ||
    (d.other_specialization && d.other_specialization.trim().length >= 2),
  { message: "Tell us your specialization", path: ["other_specialization"] },
);

type FormState = z.input<typeof baseSchema>;

const initial: FormState = {
  full_name: "",
  whatsapp_number: "",
  primary_skill: "UI/UX",
  other_specialization: "",
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
  1: ["primary_skill", "experience", "other_specialization"],
  2: ["portfolio_url", "linkedin_url"],
  3: ["why_join"],
};

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const Apply = () => {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0);
  const [resume, setResume] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string>("");
  const [otherDialogOpen, setOtherDialogOpen] = useState(false);
  const [otherDraft, setOtherDraft] = useState("");

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const handleResume = (file: File | null) => {
    setResumeError("");
    if (!file) { setResume(null); return; }
    if (!ALLOWED_RESUME_TYPES.includes(file.type)) { setResumeError("Only PDF or Word documents are allowed"); return; }
    if (file.size > MAX_RESUME_BYTES) { setResumeError("Max file size is 5 MB"); return; }
    setResume(file);
  };

  const openOtherDialog = () => { setOtherDraft(form.other_specialization || ""); setOtherDialogOpen(true); };

  const confirmOther = () => {
    const v = otherDraft.trim();
    if (v.length < 2) { setErrors((e) => ({ ...e, other_specialization: "Min 2 characters" })); return; }
    set("primary_skill", "Other");
    set("other_specialization", v);
    setOtherDialogOpen(false);
  };

  const validateStep = (s: number) => {
    const fields = stepFields[s];
    const partial = baseSchema.pick(Object.fromEntries(fields.map((f) => [f, true])) as never);
    const result = partial.safeParse(form);
    const fe: Record<string, string> = {};
    if (!result.success) result.error.issues.forEach((i) => { fe[i.path[0] as string] = i.message; });
    if (s === 1 && form.primary_skill === "Other" && (!form.other_specialization || form.other_specialization.trim().length < 2)) {
      fe.other_specialization = "Tell us your specialization";
    }
    if (Object.keys(fe).length) { setErrors((prev) => ({ ...prev, ...fe })); return false; }
    return true;
  };

  const next = () => { if (!validateStep(step)) return; setStep((s) => Math.min(s + 1, steps.length - 1)); };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const uploadResume = async (): Promise<string | null> => {
    if (!resume) return null;
    const ext = resume.name.split(".").pop()?.toLowerCase() || "pdf";
    const safeName = `${crypto.randomUUID()}.${ext}`;
    const path = `applications/${safeName}`;
    const { error } = await supabase.storage.from("resumes").upload(path, resume, { contentType: resume.type, upsert: false });
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    const parsed = fullSchema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { fe[i.path[0] as string] = i.message; });
      setErrors(fe);
      for (const s of [0, 1, 2, 3]) { if (stepFields[s].some((f) => fe[f])) { setStep(s); break; } }
      return;
    }
    setLoading(true);
    try {
      const resumePath = await uploadResume();
      const d = parsed.data;
      const payload = {
        full_name: d.full_name as string,
        whatsapp_number: d.whatsapp_number as string,
        primary_skill: d.primary_skill as typeof skills[number],
        other_specialization: d.primary_skill === "Other" && d.other_specialization ? d.other_specialization : null,
        experience: d.experience as typeof experiences[number],
        city: d.city as string,
        why_join: d.why_join as string,
        portfolio_url: d.portfolio_url ? d.portfolio_url : null,
        linkedin_url: d.linkedin_url ? d.linkedin_url : null,
        resume_url: resumePath,
      };
      const { error } = await supabase.from("applications").insert([payload]);
      if (error) throw error;
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Submission failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  if (done) return <SuccessScreen />;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-dark" aria-hidden />
        {/* Animated orbs */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary/25 blur-[80px]"
        />
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.8, delay: 0.2 }}
          className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-primary/15 blur-[60px]"
        />
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[100px]"
        />

        <div className="relative mx-auto max-w-5xl px-4 py-16 md:py-24">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Curated · Application only
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-5xl font-bold leading-[1.03] text-background md:text-7xl lg:text-8xl"
          >
            Find your people{" "}
            <br className="hidden sm:block" />
            in the{" "}
            <span className="bg-gradient-gold bg-clip-text text-transparent">HYVE</span>
            <span className="text-primary">.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 max-w-lg text-lg font-light leading-relaxed text-background/60 md:text-xl"
          >
            A WhatsApp community of freelance designers, developers, writers, and marketers
            shipping real work for real clients.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <StatPill icon={Users} value="136+" label="Active members" />
            <StatPill icon={Globe} value="7+" label="Cities" />
            <StatPill icon={Clock} value="2 min" label="To apply" />
          </motion.div>
        </div>
      </section>

      {/* Form Section */}
      <section id="apply" className="mx-auto max-w-2xl px-4 py-14 md:py-20">

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="mb-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>
              Step {step + 1} of {steps.length} ·{" "}
              <span className="font-semibold text-foreground">{steps[step].name}</span>
            </span>
            <span className="tabular-nums font-semibold text-primary">{Math.round(progress)}%</span>
          </div>

          {/* Progress bar */}
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border">
            <motion.div
              className="h-full rounded-full bg-gradient-gold"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>

          {/* Step tabs */}
          <div className="mt-5 hidden grid-cols-4 gap-2 sm:grid">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const complete = i < step;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  whileHover={i < step ? { scale: 1.02 } : {}}
                  whileTap={i < step ? { scale: 0.98 } : {}}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs transition-all duration-200 ${
                    active
                      ? "border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 text-foreground shadow-sm"
                      : complete
                        ? "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground cursor-pointer"
                        : "border-border/40 bg-transparent text-muted-foreground/50 cursor-default"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] transition-all ${
                      complete
                        ? "bg-primary text-primary-foreground"
                        : active
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground/60"
                    }`}
                  >
                    {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3 w-3" />}
                  </span>
                  <span className="truncate font-medium">{s.name}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative rounded-3xl border border-border bg-card shadow-soft overflow-hidden"
        >
          {/* Top accent bar */}
          <div className="h-0.5 w-full bg-gradient-gold" />

          {/* Corner glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-primary/5 blur-2xl"
          />

          <div className="relative p-6 md:p-10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (step < steps.length - 1) next();
                else submit();
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 32 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -32 }}
                  transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                  className="space-y-6"
                >
                  {step === 0 && <StepAbout form={form} set={set} errors={errors} />}
                  {step === 1 && <StepCraft form={form} set={set} errors={errors} onPickOther={openOtherDialog} />}
                  {step === 2 && <StepWork form={form} set={set} errors={errors} resume={resume} resumeError={resumeError} onResume={handleResume} />}
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
                  className="gap-1.5 text-muted-foreground hover:text-foreground disabled:opacity-0"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>

                {step < steps.length - 1 ? (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      size="lg"
                      className="gap-2 bg-foreground px-8 text-background shadow-md hover:bg-foreground/90"
                    >
                      Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={loading}
                      className="gap-2 bg-gradient-gold px-8 text-primary-foreground shadow-gold hover:opacity-95"
                    >
                      {loading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                      ) : (
                        <><Zap className="h-4 w-4" /> Submit application</>
                      )}
                    </Button>
                  </motion.div>
                )}
              </div>
            </form>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-5 text-center text-xs text-muted-foreground"
        >
          ✦ We read every application personally · Replies on WhatsApp within a few days
        </motion.p>
      </section>

      {/* Other dialog */}
      <Dialog open={otherDialogOpen} onOpenChange={setOtherDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">What's your specialization?</DialogTitle>
            <DialogDescription>Tell us in a few words — e.g. Motion design, Data engineering, Brand strategy.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="other-spec" className="text-sm font-medium">Specialization</Label>
            <Input
              id="other-spec"
              value={otherDraft}
              onChange={(e) => setOtherDraft(e.target.value)}
              placeholder="e.g. Motion design"
              maxLength={100}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmOther(); } }}
              className="h-11"
            />
            {errors.other_specialization && <p className="text-xs text-destructive">{errors.other_specialization}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOtherDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={confirmOther} className="bg-gradient-gold text-primary-foreground hover:opacity-95">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Steps ─────────────────────────────────────────────── */

type StepProps = {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
};
type CraftStepProps = StepProps & { onPickOther: () => void };
type WorkStepProps = StepProps & { resume: File | null; resumeError: string; onResume: (f: File | null) => void };

const StepAbout = ({ form, set, errors }: StepProps) => (
  <div className="space-y-5">
    <StepHeader eyebrow="01 — About you" title="Let's start with the basics" desc="Tell us who you are and where to reach you." />
    <Field label="Full name" error={errors.full_name} icon={User}>
      <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Jane Doe" maxLength={100} className="h-12 pl-10 transition-all focus:ring-2 focus:ring-primary/20" />
    </Field>
    <Field label="WhatsApp number" error={errors.whatsapp_number} hint="Indian numbers only (+91)">
      <div className="relative flex h-12 items-center">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none border-r border-border pr-2.5 text-sm font-semibold text-foreground z-10">+91</span>
        <Input
          value={form.whatsapp_number.replace(/^\+91\s?/, "")}
          onChange={(e) => set("whatsapp_number", "+91 " + e.target.value.replace(/\D/g, ""))}
          placeholder="98765 43210"
          maxLength={15}
          inputMode="numeric"
          className="h-12 pl-14 transition-all focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </Field>
    <Field label="City" error={errors.city}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          value={form.city}
          onChange={(e) => set("city", e.target.value)}
          className="h-12 w-full appearance-none rounded-md border border-input bg-background pl-10 pr-10 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
        >
          <option value="" disabled>Select your city</option>
          <option value="Bengaluru">Bengaluru</option>
          <option value="Mumbai">Mumbai</option>
          <option value="Delhi / NCR">Delhi / NCR</option>
          <option value="Hyderabad">Hyderabad</option>
          <option value="Pune">Pune</option>
          <option value="Chennai">Chennai</option>
          <option value="Ahmedabad">Ahmedabad</option>
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </div>
    </Field>
  </div>
);

const StepCraft = ({ form, set, errors, onPickOther }: CraftStepProps) => (
  <div className="space-y-8">
    <StepHeader eyebrow="02 — Your craft" title="What do you do best?" desc="Pick your primary skill — you can add more later." />
    <div>
      <Label className="mb-3 block text-sm font-semibold">Primary skill</Label>
      <div className="grid gap-3 sm:grid-cols-2">
        {skills.map((s) => {
          const Icon = skillMeta[s].icon;
          const active = form.primary_skill === s;
          const isOther = s === "Other";
          return (
            <motion.button
              key={s}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { if (isOther) { onPickOther(); } else { set("primary_skill", s); set("other_specialization", ""); } }}
              className={`group relative flex items-start gap-3 rounded-2xl border bg-gradient-to-br p-4 text-left transition-all duration-200 ${
                active
                  ? `${skillMeta[s].color} shadow-sm`
                  : `border-border bg-card hover:border-primary/30 hover:bg-primary/5`
              }`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${active ? "bg-gradient-gold text-primary-foreground shadow-gold" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1 pt-0.5">
                <span className="block text-sm font-semibold">{s}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {isOther && active && form.other_specialization ? form.other_specialization : skillMeta[s].tag}
                </span>
              </span>
              {active && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
      {form.primary_skill === "Other" && (
        <button type="button" onClick={onPickOther} className="mt-2 text-xs font-semibold text-primary hover:underline">
          {form.other_specialization ? "✎ Edit specialization" : "+ Add specialization"}
        </button>
      )}
      {errors.other_specialization && <p className="mt-2 text-xs text-destructive">{errors.other_specialization}</p>}
    </div>
    <div>
      <Label className="mb-3 block text-sm font-semibold">Years of experience</Label>
      <div className="grid gap-3 sm:grid-cols-3">
        {experiences.map((e) => {
          const active = form.experience === e;
          return (
            <motion.button
              key={e}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => set("experience", e)}
              className={`rounded-2xl border p-4 text-left transition-all duration-200 ${active ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"}`}
            >
              <div className="text-xl mb-1">{expMeta[e].emoji}</div>
              <div className="text-sm font-semibold">{expMeta[e].label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{expMeta[e].sub}</div>
            </motion.button>
          );
        })}
      </div>
      {errors.experience && <p className="mt-2 text-xs text-destructive">{errors.experience}</p>}
    </div>
  </div>
);

const StepWork = ({ form, set, errors, resume, resumeError, onResume }: WorkStepProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-6">
      <StepHeader eyebrow="03 — Your work" title="Show us what you've built" desc="Optional, but a portfolio helps us get to know you faster." />
      <Field label="Portfolio URL" optional error={errors.portfolio_url} icon={Link2}>
        <Input value={form.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://yourwork.com" maxLength={300} className="h-12 pl-10" />
      </Field>
      <Field label="LinkedIn URL" optional error={errors.linkedin_url} icon={Linkedin}>
        <Input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/you" maxLength={300} className="h-12 pl-10" />
      </Field>
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Resume <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => onResume(e.target.files?.[0] ?? null)} />
        {!resume ? (
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-7 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-gold">
              <Upload className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-foreground">Upload your resume</span>
              <span className="block text-xs text-muted-foreground mt-0.5">PDF or Word · Max 5 MB</span>
            </span>
          </motion.button>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{resume.name}</p>
              <p className="text-xs text-muted-foreground">{(resume.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => { onResume(null); if (inputRef.current) inputRef.current.value = ""; }} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {resumeError && <p className="text-xs text-destructive">{resumeError}</p>}
      </div>
      <div className="rounded-2xl border border-dashed border-border bg-gradient-to-br from-muted/60 to-muted/30 p-4 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">💡 Tip:</span> Even a Notion page, GitHub repo, or Instagram with your work counts. We care about the craft, not the polish.
      </div>
    </div>
  );
};

const StepStory = ({ form, set, errors }: StepProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string>("");

  const fetchSuggestions = async () => {
    setLoadingAi(true); setAiError("");
    try {
      const { data, error } = await supabase.functions.invoke("suggest-why-join", {
        body: { full_name: form.full_name, primary_skill: form.primary_skill, other_specialization: form.other_specialization, experience: form.experience, city: form.city, current_text: form.why_join },
      });
      if (error) throw error;
      const list = (data as { suggestions?: string[] } | null)?.suggestions ?? [];
      if (!list.length) { setAiError("No suggestions came back — try again."); } else { setSuggestions(list); }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Couldn't reach the AI");
    } finally { setLoadingAi(false); }
  };

  return (
    <div className="space-y-6">
      <StepHeader eyebrow="04 — Your story" title="Why HYVE?" desc="The most important question. Be honest, be you." />
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/8 via-background to-background p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-gold">
              <Wand2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Stuck? Let AI spark some ideas</p>
              <p className="text-xs text-muted-foreground mt-0.5">Personalised to your craft — pick one and make it yours.</p>
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={fetchSuggestions} disabled={loadingAi} className="shrink-0 border-primary/40 text-primary hover:bg-primary/10">
            {loadingAi ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Thinking</> : suggestions.length ? <><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerate</> : <><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Suggest</>}
          </Button>
        </div>
        {aiError && <p className="mt-3 text-xs text-destructive">{aiError}</p>}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="mt-4 space-y-2 overflow-hidden">
              {suggestions.map((s, i) => (
                <motion.button key={i} type="button" onClick={() => { set("why_join", s); setSuggestions([]); }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="group flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
                  <span className="flex-1 text-sm leading-relaxed">{s}</span>
                  <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground opacity-0 transition group-hover:opacity-100">Use →</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Why do you want to join?</Label>
        <Textarea value={form.why_join} onChange={(e) => set("why_join", e.target.value)} placeholder="What you'd bring to the community, what you're hoping to find, the kind of work you want to do…" rows={7} maxLength={2000} className="resize-none text-base transition-all focus:ring-2 focus:ring-primary/20" />
        <div className="flex items-center justify-between text-xs">
          <span className={errors.why_join ? "text-destructive" : "text-muted-foreground"}>{errors.why_join ?? "Min 10 characters"}</span>
          <span className="tabular-nums text-muted-foreground">{form.why_join.length}/2000</span>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-muted/40 p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Quick review
        </div>
        <dl className="grid gap-0 text-sm sm:grid-cols-2">
          <Summary label="Name" value={form.full_name || "—"} />
          <Summary label="WhatsApp" value={form.whatsapp_number || "—"} />
          <Summary label="City" value={form.city || "—"} />
          <Summary label="Skill" value={form.primary_skill} />
          <Summary label="Experience" value={`${form.experience} years`} />
        </dl>
      </div>
    </div>
  );
};

/* ─── Bits ───────────────────────────────────────────────── */

const StepHeader = ({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) => (
  <div className="space-y-1.5">
    <div className="text-xs font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</div>
    <h2 className="font-display text-2xl font-bold md:text-3xl">{title}</h2>
    <p className="text-sm text-muted-foreground md:text-base">{desc}</p>
  </div>
);

const Field = ({ label, optional, error, hint, icon: Icon, children }: { label: string; optional?: boolean; error?: string; hint?: string; icon?: typeof User; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-semibold">{label}{" "}{optional && <span className="font-normal text-muted-foreground">(optional)</span>}</Label>
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
      {children}
    </div>
    {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

const Summary = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2 last:border-0 sm:border-0">
    <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className="truncate text-sm font-semibold text-foreground">{value}</dd>
  </div>
);

const StatPill = ({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) => (
  <div className="flex items-center gap-2.5 rounded-full border border-background/20 bg-background/10 px-4 py-2 backdrop-blur">
    <Icon className="h-3.5 w-3.5 text-primary" />
    <span className="font-display text-base font-bold text-background">{value}</span>
    <span className="text-xs uppercase tracking-wider text-background/50">{label}</span>
  </div>
);

const Header = () => (
  <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
    <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
      <Link to="/">
        <img src="/logo.png" alt="Hyve" className="h-8 w-auto" />
      </Link>
    </div>
  </header>
);

const SuccessScreen = () => (
  <div className="min-h-screen bg-background">
    <Header />
    {/* Decorative background */}
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center md:py-28">
        {/* Animated check badge with rings */}
        <div className="relative mb-8">
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-primary/20"
          />
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.3, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
            className="absolute inset-0 rounded-full bg-primary/25"
          />
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-gold shadow-gold"
          >
            <CheckCircle2 className="h-14 w-14 text-primary-foreground" strokeWidth={2.5} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" /> Application received
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl"
        >
          You're on the list
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-5 max-w-md leading-relaxed text-muted-foreground md:text-lg"
        >
          Thanks for applying to HYVE. We review every application personally — you'll hear from us on WhatsApp within a few days.
        </motion.p>

        {/* What happens next */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 grid w-full gap-4 sm:grid-cols-3"
        >
          {[
            { icon: FileText, title: "Reviewed", desc: "Our team reads every application personally" },
            { icon: MessageSquareHeart, title: "Shortlisted", desc: "Selected applicants get a WhatsApp ping" },
            { icon: Sparkles, title: "Welcomed", desc: "You're invited into the Hyve community" },
          ].map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="group relative rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:border-primary/40 hover:shadow-gold"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <step.icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-1 font-display text-base font-bold text-foreground">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="mt-12 flex flex-col items-center gap-3 sm:flex-row"
        >
          <a href="https://hyvefreelance.com">
            <Button size="lg" className="gap-2 bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Button>
          </a>
          <a href="https://blog.hyvefreelance.com" target="_blank" rel="noreferrer">
            <Button variant="outline" size="lg" className="gap-2">
              Read the blog <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-10 text-xs text-muted-foreground"
        >
          Questions? Reach us at{" "}
          <a href="mailto:hello@hyvefreelance.com" className="font-semibold text-primary hover:underline">
            hello@hyvefreelance.com
          </a>
        </motion.p>
      </div>
    </div>
  </div>
);

export default Apply;
