import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerFn } from "@tanstack/react-start";
import { DEPARTMENTS, registrationSchema, type RegistrationInput } from "@/lib/workspace-schema";
import { uploadResume } from "@/lib/resume.functions";
import { submitApplication } from "@/lib/bootstrap.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, Upload, FileText, Clock, Calendar } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Apply to CoLab Nation" },
      { name: "description", content: "Apply to join the CoLab Nation workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterPage,
});

const STEPS = [
  { key: "account", label: "Account" },
  { key: "personal", label: "Personal" },
  { key: "department", label: "Department" },
  { key: "profile", label: "Profile" },
  { key: "review", label: "Review" },
] as const;

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadResumeFn = useServerFn(uploadResume);
  const submitApp = useServerFn(submitApplication);

  const [timeLeft, setTimeLeft] = useState(() => {
    const deadline = new Date("2026-07-13T23:59:59").getTime();
    const now = new Date().getTime();
    const diff = deadline - now;
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const deadline = new Date("2026-07-13T23:59:59").getTime();
      const now = new Date().getTime();
      const diff = deadline - now;
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (ms: number) => {
    if (ms <= 0) return "Closed";
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    }
    return `${hours}h ${mins}m ${secs}s`;
  };

  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    mode: "onTouched",
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      phone: "",
      college: "",
      city: "",
      department_applied: "technical",
      portfolio_url: "",
      github_url: "",
      linkedin_url: "",
      resume_url: "",
      skills: "",
      bio: "",
      experience: "",
      availability: "Flexible",
      agreed_terms: false as unknown as true,
    },
  });

  const progress = ((step + 1) / STEPS.length) * 100;

  const nextStep = async () => {
    const fields: Record<number, (keyof RegistrationInput)[]> = {
      0: ["full_name", "email", "password"],
      1: ["phone", "college", "city"],
      2: ["department_applied"],
      3: ["portfolio_url", "skills", "bio", "experience", "availability"],
    };
    const valid = await form.trigger(fields[step]);
    console.log("[v0] Step", step, "validation:", valid, "Fields:", fields[step]);
    if (valid) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const onSubmit = async (data: RegistrationInput) => {
    console.log("[v0] Form submitted with data:", data);
    setSubmitting(true);

    // Validate all required fields are present
    if (!data.full_name || !data.email || !data.password || !data.phone || !data.college || !data.city || !data.skills || !data.bio || !data.experience || !data.availability) {
      setSubmitting(false);
      console.log("[v0] Validation failed: missing required fields");
      toast.error("Please fill in all required fields");
      return;
    }

    // Upload resume to Supabase Storage if provided
    let resumeLink = data.resume_url || null;
    if (resumeFile) {
      try {
        setUploading(true);
        console.log("[v0] Uploading resume:", resumeFile.name);
        const buf = await resumeFile.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const up = await uploadResumeFn({
          data: {
            email: data.email,
            filename: resumeFile.name,
            mimeType: resumeFile.type || "application/octet-stream",
            contentBase64: b64,
          },
        });
        resumeLink = up.webViewLink;
        console.log("[v0] Resume uploaded successfully");
        toast.success("Resume uploaded");
      } catch (e) {
        console.error("[v0] Resume upload error:", e);
        toast.error(e instanceof Error ? e.message : "Resume upload failed — you can add a link instead");
      } finally {
        setUploading(false);
      }
    }

    const skillsArr = data.skills
      ? data.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      console.log("[v0] Submitting application with skills:", skillsArr);
      const res = await submitApp({
        data: {
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          phone: data.phone,
          college: data.college,
          city: data.city,
          department_applied: data.department_applied,
          portfolio_url: data.portfolio_url,
          github_url: data.github_url || null,
          linkedin_url: data.linkedin_url || null,
          resume_url: resumeLink,
          skills: skillsArr,
          bio: data.bio,
          experience: data.experience,
          availability: data.availability,
          agreed_terms: true,
        },
      });
      setSubmitting(false);
      console.log("[v0] Application response:", res);
      if (!res.ok) {
        console.error("[v0] Application submission failed:", res.message);
        return toast.error(res.message ?? "Could not submit application");
      }
      console.log("[v0] Application submitted successfully");
      setDone(true);
    } catch (e) {
      setSubmitting(false);
      console.error("[v0] Application error:", e);
      return toast.error(e instanceof Error ? e.message : "Could not submit application");
    }
  };

  if (done) {
    return (
      <div className="min-h-screen hero-bg flex items-center justify-center px-4">
        <Card className="glass max-w-md text-center animate-scale-in shadow-elegant">
          <CardHeader>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/20 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle className="mt-4 font-display text-2xl">Application received</CardTitle>
            <CardDescription>
              Your account is ready — no email verification needed. Our team will review your application and notify you once it's approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => navigate({ to: "/auth" })} className="w-full shadow-glow">
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-bg py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Deadline Alert Banner */}
        <div className="mb-6 glass rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-warning/20 shadow-glow relative overflow-hidden animate-fade-in gap-4">
          <div className="absolute inset-0 bg-warning/5 opacity-30 pointer-events-none" />
          <div className="flex items-start sm:items-center gap-3 relative z-10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display font-bold text-foreground text-sm sm:text-base flex items-center gap-2">
                Application Deadline: <span className="text-warning">July 13th, 2026</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete and submit your registration before the cutoff date to join.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto text-left sm:text-right shrink-0 relative z-10 border-t border-border/50 sm:border-0 pt-3 sm:pt-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Closing In</span>
            <span className="text-sm font-semibold text-warning font-display flex items-center gap-1.5 bg-warning/10 px-2.5 py-1 rounded-lg">
              <Clock className="h-3.5 w-3.5" /> {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <Card className="glass shadow-elegant animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-2xl">Apply to CoLab Nation</CardTitle>
                <CardDescription>Step {step + 1} of {STEPS.length} · {STEPS[step].label}</CardDescription>
              </div>
              <div className="text-xs text-muted-foreground">{Math.round(progress)}%</div>
            </div>
            <Progress value={progress} className="mt-3" />
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {step === 0 && (
                <div className="space-y-4 animate-fade-in">
                  <Field label="Full name" error={form.formState.errors.full_name?.message}>
                    <Input {...form.register("full_name")} placeholder="Ada Lovelace" />
                  </Field>
                  <Field label="Email" error={form.formState.errors.email?.message}>
                    <Input type="email" {...form.register("email")} placeholder="you@email.com" />
                  </Field>
                  <Field label="Password" error={form.formState.errors.password?.message}>
                    <Input type="password" {...form.register("password")} placeholder="Min 8 characters" />
                  </Field>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <Field label="Phone" error={form.formState.errors.phone?.message}><Input {...form.register("phone")} placeholder="+91…" /></Field>
                  <Field label="College / Organization" error={form.formState.errors.college?.message}><Input {...form.register("college")} placeholder="Your institution" /></Field>
                  <Field label="City" error={form.formState.errors.city?.message}><Input {...form.register("city")} placeholder="Your city" /></Field>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <Field label="Department applying for" error={form.formState.errors.department_applied?.message}>
                    <Select value={form.watch("department_applied")} onValueChange={(v) => form.setValue("department_applied", v as RegistrationInput["department_applied"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Portfolio URL" error={form.formState.errors.portfolio_url?.message}><Input {...form.register("portfolio_url")} placeholder="https://…" /></Field>
                    <Field label="GitHub URL (optional)" error={form.formState.errors.github_url?.message}><Input {...form.register("github_url")} placeholder="https://github.com/…" /></Field>
                    <Field label="LinkedIn URL (optional)" error={form.formState.errors.linkedin_url?.message}><Input {...form.register("linkedin_url")} placeholder="https://linkedin.com/…" /></Field>
                    <Field label="Resume URL (optional)" error={form.formState.errors.resume_url?.message}><Input {...form.register("resume_url")} placeholder="Link to PDF" /></Field>
                  </div>
                  <Field label="Skills (comma-separated)" error={form.formState.errors.skills?.message}><Textarea {...form.register("skills")} placeholder="e.g., React, Node.js, UI Design" className="h-20" /></Field>
                  <Field label="Tell us about yourself" error={form.formState.errors.bio?.message}><Textarea {...form.register("bio")} placeholder="Your background and interests…" className="h-24" /></Field>
                  <Field label="Experience & Projects" error={form.formState.errors.experience?.message}><Textarea {...form.register("experience")} placeholder="What projects have you worked on?" className="h-24" /></Field>
                  <Field label="Your availability" error={form.formState.errors.availability?.message}><Input {...form.register("availability")} placeholder="e.g., Flexible, Weekends only, etc." /></Field>
                  <Field label="Upload resume (PDF/DOC · optional)">
                    <label className="group relative flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-surface/50 px-4 py-3 text-sm hover:border-primary/50 transition">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                      />
                      {resumeFile ? (
                        <>
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="truncate">{resumeFile.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{Math.round(resumeFile.size / 1024)} KB</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Click to upload — saved securely to our storage</span>
                        </>
                      )}
                    </label>
                  </Field>
                </div>
              )}
              {step === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="rounded-lg border border-border bg-surface p-4 text-sm">
                    <div className="grid gap-1 sm:grid-cols-2">
                      <ReviewRow label="Name" value={form.getValues("full_name")} />
                      <ReviewRow label="Email" value={form.getValues("email")} />
                      <ReviewRow label="Department" value={DEPARTMENTS.find(d => d.value === form.getValues("department_applied"))?.label ?? ""} />
                      <ReviewRow label="City" value={form.getValues("city")} />
                      <ReviewRow label="College" value={form.getValues("college")} />
                    </div>
                  </div>
                  <label className="flex items-start gap-3 text-sm">
                    <Checkbox
                      checked={form.watch("agreed_terms") as unknown as boolean}
                      onCheckedChange={(v) => form.setValue("agreed_terms", (v === true) as unknown as true, { shouldValidate: true })}
                    />
                    <span className="text-muted-foreground">
                      I confirm the information is accurate and agree to CoLab Nation's member terms and code of conduct.
                    </span>
                  </label>
                  {form.formState.errors.agreed_terms && (
                    <p className="text-xs text-destructive">{form.formState.errors.agreed_terms.message}</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                  Back
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button type="button" onClick={nextStep}>
                    Continue <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting || uploading} className="shadow-glow">
                    {(submitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {uploading ? "Uploading resume…" : submitting ? "Submitting…" : "Submit application"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}
