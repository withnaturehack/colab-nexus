## CoLab Nation Workspace — Build Plan

This is a large, multi-week enterprise system. I'll build it on the Lovable stack (which differs from the tech stack you listed — see notes) in phased milestones so you get working software early and we don't blow the context on one giant unshippable dump.

### Stack reality check (important)

Your prompt specifies Node/Express/NestJS + Prisma + Postgres + Socket.IO. Lovable projects run on **TanStack Start (React 19 + Vite) + Lovable Cloud (managed Supabase: Postgres, Auth, Storage, Realtime, Edge Functions)**. I can't swap in Express/Prisma/self-hosted Postgres here.

The good news: Lovable Cloud gives you the same capabilities —
- Postgres with RLS (replaces Prisma + custom RBAC middleware)
- Managed Auth with email/password + Google + email verification + password reset
- File Storage (resumes, attachments, brand assets)
- Realtime subscriptions (replaces Socket.IO) for notifications, tasks, comments
- Server Functions (TanStack `createServerFn`) for business logic
- Role storage via a dedicated `user_roles` table + `has_role()` SECURITY DEFINER function (industry-standard pattern, prevents privilege escalation)

If you *require* Express/Prisma specifically, Lovable is the wrong platform and you should stop here. Otherwise I'll proceed on the Lovable stack, which will deliver the same product.

### Phased delivery

**Phase 1 — Foundation (this build)**
- Enable Lovable Cloud
- Design system: dark-first premium theme, semantic tokens, typography, gradients, glass surfaces, motion primitives
- Auth: email/password + Google, email verification, password reset, `/auth` and `/reset-password` routes
- DB schema + RLS + grants for: `profiles`, `app_role` enum (super_admin, technical_head, content_head, marketing_head, pr_head, event_head, member), `department` enum, `user_roles`, `applications` (pending-approval registrations with all applicant fields), `application_status_history`
- Registration = creates `application` row with status `pending`, NOT an active workspace account. Trigger blocks login for non-approved users.
- Super Admin approval flow: review applicant → assign department + role → approve/reject → email fires → user gains workspace access
- Route guards: `_authenticated` layout, role-gated `_admin` layout, per-department visibility rules
- Shell: sidebar nav, topbar, notifications bell, user menu
- Empty dashboard with widget skeletons

**Phase 2 — Recruitment & Members**
- Recruitment pipeline (Pending → Interview → Assignment → Accepted → Rejected → Onboarded) with Kanban
- Applicant profile drawer, internal notes, interview notes, status timeline
- Automated emails (Application Received / Under Review / Interview / Accepted / Rejected / Welcome) via edge function + Resend
- Member directory, member profile pages

**Phase 3 — Tasks & Projects**
- Task schema + full workflow states, Kanban / Table / Calendar / Timeline views
- Comments, mentions, attachments, checklists, activity timeline
- Projects with members, milestones, files, progress

**Phase 4 — Departments, Announcements, Knowledge Hub, Calendar**

**Phase 5 — Reports & Analytics** (Recharts), exports, audit logs

**Phase 6 — Realtime notifications, polish, performance**

### What I need from you before starting Phase 1

1. **Confirm the Lovable stack is acceptable** (Supabase-backed instead of Express/Prisma). Yes = I proceed. No = stop.
2. **Google login** — enable now or email/password only for v1?
3. **Transactional email** — Resend is the standard. OK to wire that in Phase 2? (You'll add a `RESEND_API_KEY` secret when we get there.)
4. **Seed a super admin** — give me the email you want promoted to `super_admin` on first login (I'll seed it in a migration).

Once you answer, I'll build Phase 1 end-to-end in the next turn.
