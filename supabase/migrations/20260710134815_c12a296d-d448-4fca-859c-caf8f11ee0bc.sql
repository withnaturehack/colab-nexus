
-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department public.department,
  status TEXT NOT NULL DEFAULT 'active',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_read_all_active ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY projects_update_owner_or_admin ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY projects_delete_owner_or_admin ON public.projects FOR DELETE TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_read_all ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = created_by OR auth.uid() = assignee_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY tasks_delete ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  department public.department,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY ann_read_all ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY ann_insert_heads ON public.announcements FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id AND (public.has_role(auth.uid(), 'super_admin') OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text LIKE '%_head')));
CREATE POLICY ann_update ON public.announcements FOR UPDATE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY ann_delete ON public.announcements FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_ann_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Knowledge articles
CREATE TABLE public.knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  department public.department,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_articles TO authenticated;
GRANT ALL ON public.knowledge_articles TO service_role;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY kn_read ON public.knowledge_articles FOR SELECT TO authenticated USING (true);
CREATE POLICY kn_insert ON public.knowledge_articles FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY kn_update ON public.knowledge_articles FOR UPDATE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY kn_delete ON public.knowledge_articles FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_kn_updated BEFORE UPDATE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Events (calendar)
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  department public.department,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ev_read ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY ev_insert ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY ev_update ON public.events FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY ev_delete ON public.events FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_ev_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.knowledge_articles REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_articles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
