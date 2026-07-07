import { z } from "zod";

export const DEPARTMENTS = [
  { value: "technical", label: "Technical" },
  { value: "content_design", label: "Content & Design" },
  { value: "marketing", label: "Marketing" },
  { value: "pr", label: "PR" },
  { value: "events", label: "Events" },
] as const;

export type Department = (typeof DEPARTMENTS)[number]["value"];

export const APPLICATION_STATUS = [
  "pending",
  "under_review",
  "interview",
  "assignment",
  "accepted",
  "rejected",
  "onboarded",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS)[number];

export const APP_ROLES = [
  "super_admin",
  "technical_head",
  "content_head",
  "marketing_head",
  "pr_head",
  "event_head",
  "member",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const registrationSchema = z.object({
  full_name: z.string().trim().min(2, "Name required").max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  college: z.string().trim().max(150).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  department_applied: z.enum(["technical", "content_design", "marketing", "pr", "events"]),
  portfolio_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  github_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  resume_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  skills: z.string().trim().max(500).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  experience: z.string().trim().max(1000).optional().or(z.literal("")),
  availability: z.string().trim().max(200).optional().or(z.literal("")),
  agreed_terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const DEPT_LABEL: Record<Department, string> = {
  technical: "Technical",
  content_design: "Content & Design",
  marketing: "Marketing",
  pr: "PR",
  events: "Events",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  technical_head: "Technical Head",
  content_head: "Content & Design Head",
  marketing_head: "Marketing Head",
  pr_head: "PR Head",
  event_head: "Event Head",
  member: "Member",
};

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "Pending",
  under_review: "Under Review",
  interview: "Interview",
  assignment: "Assignment",
  accepted: "Accepted",
  rejected: "Rejected",
  onboarded: "Onboarded",
};

export const DEPT_ROLE: Record<Department, AppRole> = {
  technical: "technical_head",
  content_design: "content_head",
  marketing: "marketing_head",
  pr: "pr_head",
  events: "event_head",
};
