import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTMENTS, registrationSchema, type RegistrationInput } from "@/lib/workspace-schema";
import { uploadResumeToDrive } from "@/lib/drive.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, Upload, FileText } from "lucide-react";

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
      availability: "",
      agreed_terms: false as unknown as true,
    },
  });

  const progress = ((step + 1) / STEPS.length) * 100;

  const nextStep = async () => {
    const fields: Record<number, (keyof RegistrationInput)[]> = {
      0: ["full_name", "email", "password"],
      1: ["phone", "college", "city"],
      2: ["department_applied"],
      3: ["portfolio_url", "github_url", "linkedin_url", "resume_url", "skills", "bio", "experience", "availability"],
    };
    const valid = await form.trigger(fields[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onSubmit = async (data: RegistrationInput) => {
    setSubmitting(true);
    const { data: signUp, error: signErr } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: window.location.origin + "/auth",
        data: { full_name: data.full_name },
      },
    });
    if (signErr || !signUp.user) {
      setSubmitting(false);
      return toast.error(signErr?.message ?? "Signup failed");
    }

    const skillsArr = data.skills
      ? data.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const { error: appErr } = await supabase.from("applications").insert({
      user_id: signUp.user.id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      college: data.college || null,
      city: data.city || null,
      department_applied: data.department_applied,
      portfolio_url: data.portfolio_url || null,
      github_url: data.github_url || null,
      linkedin_url: data.linkedin_url || null,
      resume_url: data.resume_url || null,
      skills: skillsArr,
      bio: data.bio || null,
      experience: data.experience || null,
      availability: data.availability || null,
      agreed_terms: true,
      status: "pending",
    });

    setSubmitting(false);
    if (appErr) return toast.error(appErr.message);
    setDone(true);
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
              Thanks — your application is now under review. You'll get an email once an admin approves your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate({ to: "/auth" })} className="w-full">
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
                  <Field label="Phone (optional)"><Input {...form.register("phone")} placeholder="+91…" /></Field>
                  <Field label="College / Organization"><Input {...form.register("college")} /></Field>
                  <Field label="City"><Input {...form.register("city")} /></Field>
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
                    <Field label="Portfolio URL"><Input {...form.register("portfolio_url")} placeholder="https://…" /></Field>
                    <Field label="GitHub URL"><Input {...form.register("github_url")} placeholder="https://github.com/…" /></Field>
                    <Field label="LinkedIn URL"><Input {...form.register("linkedin_url")} placeholder="https://linkedin.com/…" /></Field>
                    <Field label="Resume URL"><Input {...form.register("resume_url")} placeholder="Link to PDF" /></Field>
                  </div>
                  <Field label="Skills (comma separated)"><Input {...form.register("skills")} placeholder="React, Figma, Marketing…" /></Field>
                  <Field label="Short bio"><Textarea rows={3} {...form.register("bio")} /></Field>
                  <Field label="Experience"><Textarea rows={3} {...form.register("experience")} /></Field>
                  <Field label="Availability"><Input {...form.register("availability")} placeholder="10 hrs / week" /></Field>
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
                  <Button type="submit" disabled={submitting} className="shadow-glow">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit application
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
