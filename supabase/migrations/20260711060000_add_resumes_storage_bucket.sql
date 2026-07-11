-- Private storage bucket for applicant resumes, replacing the Lovable-connector
-- Google Drive upload (connector-gateway.lovable.dev), which only works inside
-- Lovable Cloud. All access goes through the service-role server function, so
-- no public bucket policies are needed.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;
