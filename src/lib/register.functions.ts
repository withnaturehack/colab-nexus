import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const submitApplicationInput = z.object({
  userId: z.string().uuid(),
  full_name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  college: z.string().nullable(),
  city: z.string().nullable(),
  department_applied: z.enum(["technical", "content_design", "marketing", "pr", "events"]),
  portfolio_url: z.string().nullable(),
  github_url: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  resume_url: z.string().nullable(),
  skills: z.array(z.string()),
  bio: z.string().nullable(),
  experience: z.string().nullable(),
  availability: z.string().nullable(),
});

/**
 * Inserts the application using supabaseAdmin (service_role) so it bypasses
 * RLS. This is required because the user has no active session immediately
 * after signUp when email verification is pending — auth.uid() would be NULL
 * inside a client-side insert, causing the RLS policy to block it.
 */
export const submitApplication = createServerFn({ method: "POST" })
  .validator((raw: unknown) => submitApplicationInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("applications").insert({
      user_id: data.userId,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      college: data.college,
      city: data.city,
      department_applied: data.department_applied,
      portfolio_url: data.portfolio_url,
      github_url: data.github_url,
      linkedin_url: data.linkedin_url,
      resume_url: data.resume_url,
      skills: data.skills,
      bio: data.bio,
      experience: data.experience,
      availability: data.availability,
      agreed_terms: true,
      status: "pending",
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });
