
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'technical_head',
  'content_head',
  'marketing_head',
  'pr_head',
  'event_head',
  'member'
);

CREATE TYPE public.department AS ENUM (
  'technical',
  'content_design',
  'marketing',
  'pr',
  'events'
);

CREATE TYPE public.application_status AS ENUM (
  'pending',
  'under_review',
  'interview',
  'assignment',
  'accepted',
  'rejected',
  'onboarded'
);

CREATE TYPE public.member_status AS ENUM (
  'pending_approval',
  'active',
  'rejected',
  'disabled'
);

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  college TEXT,
  city TEXT,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  department public.department,
  status public.member_status NOT NULL DEFAULT 'pending_approval',
  reporting_head_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role: SECURITY DEFINER to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Get user department (from profiles)
CREATE OR REPLACE FUNCTION public.user_department(_user_id UUID)
RETURNS public.department
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department FROM public.profiles WHERE id = _user_id;
$$;

-- Is department head of a given department
CREATE OR REPLACE FUNCTION public.is_head_of(_user_id UUID, _dept public.department)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = CASE _dept
        WHEN 'technical'      THEN 'technical_head'::public.app_role
        WHEN 'content_design' THEN 'content_head'::public.app_role
        WHEN 'marketing'      THEN 'marketing_head'::public.app_role
        WHEN 'pr'             THEN 'pr_head'::public.app_role
        WHEN 'events'         THEN 'event_head'::public.app_role
      END
  );
$$;

-- ============ APPLICATIONS ============
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  college TEXT,
  city TEXT,
  department_applied public.department NOT NULL,
  portfolio_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  skills TEXT[] DEFAULT '{}',
  bio TEXT,
  experience TEXT,
  availability TEXT,
  agreed_terms BOOLEAN NOT NULL DEFAULT false,
  status public.application_status NOT NULL DEFAULT 'pending',
  internal_notes TEXT,
  interview_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_applications_dept ON public.applications(department_applied);

-- ============ APPLICATION STATUS HISTORY ============
CREATE TABLE public.application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_status public.application_status,
  to_status public.application_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.application_status_history TO authenticated;
GRANT ALL ON public.application_status_history TO service_role;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_status_history_app ON public.application_status_history(application_id);

-- ============ RLS POLICIES : PROFILES ============
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_select_super_admin"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "profiles_select_dept_head"
ON public.profiles FOR SELECT TO authenticated
USING (
  department IS NOT NULL
  AND public.is_head_of(auth.uid(), department)
);

CREATE POLICY "profiles_select_active_members"
ON public.profiles FOR SELECT TO authenticated
USING (
  status = 'active'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'active')
);

CREATE POLICY "profiles_insert_self"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own_limited"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_super_admin"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============ RLS POLICIES : USER_ROLES ============
CREATE POLICY "user_roles_select_own"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_roles_select_super_admin"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- No client insert/update/delete — only service_role via server functions.

-- ============ RLS POLICIES : APPLICATIONS ============
CREATE POLICY "applications_insert_self"
ON public.applications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "applications_select_own"
ON public.applications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "applications_select_super_admin"
ON public.applications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "applications_select_dept_head"
ON public.applications FOR SELECT TO authenticated
USING (public.is_head_of(auth.uid(), department_applied));

CREATE POLICY "applications_update_own_draft"
ON public.applications FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "applications_update_super_admin"
ON public.applications FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "applications_update_dept_head"
ON public.applications FOR UPDATE TO authenticated
USING (public.is_head_of(auth.uid(), department_applied))
WITH CHECK (public.is_head_of(auth.uid(), department_applied));

-- ============ RLS POLICIES : STATUS HISTORY ============
CREATE POLICY "status_history_select_super_admin"
ON public.application_status_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "status_history_select_dept_head"
ON public.application_status_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = application_id
      AND public.is_head_of(auth.uid(), a.department_applied)
  )
);

CREATE POLICY "status_history_select_own"
ON public.application_status_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = application_id AND a.user_id = auth.uid()
  )
);

CREATE POLICY "status_history_insert_super_admin"
ON public.application_status_history FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "status_history_insert_dept_head"
ON public.application_status_history FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = application_id
      AND public.is_head_of(auth.uid(), a.department_applied)
  )
);

-- ============ AUTO CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'pending_approval'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
