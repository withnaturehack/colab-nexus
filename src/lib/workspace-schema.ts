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
  phone: z.string().trim().min(1, "Phone number required").max(30),
  college: z.string().trim().min(1, "College/University required").max(150),
  city: z.string().trim().min(1, "City required").max(100),
  department_applied: z.enum(["technical", "content_design", "marketing", "pr", "events"]),
  portfolio_url: z.string().trim().url("Portfolio URL must be valid").max(500),
  github_url: z.string().trim().url("GitHub URL must be valid").max(500).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url("LinkedIn URL must be valid").max(500).optional().or(z.literal("")),
  resume_url: z.string().trim().url("Resume URL must be valid").max(500).optional().or(z.literal("")),
  skills: z.string().trim().min(3, "Tell us at least 3 skills").max(500),
  bio: z.string().trim().min(20, "Bio must be at least 20 characters").max(1000),
  experience: z.string().trim().min(20, "Describe your experience").max(1000),
  availability: z.string().trim().min(1, "Availability is required").max(200),
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
