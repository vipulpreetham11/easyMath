-- ============================================================
-- EasyMath: Production RLS Policies
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- 1. Helper function (avoids infinite recursion on users table)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- TABLE: users
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select" ON public.users FOR SELECT
  USING (auth.uid() = id OR get_my_role() = 'super_admin');

CREATE POLICY "users_insert" ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update" ON public.users FOR UPDATE
  USING (get_my_role() = 'super_admin');

CREATE POLICY "users_delete" ON public.users FOR DELETE
  USING (get_my_role() = 'super_admin');


-- ============================================================
-- TABLE: subjects
-- ============================================================
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects_select" ON public.subjects FOR SELECT
  USING (is_active = true OR get_my_role() IN ('admin','super_admin'));

CREATE POLICY "subjects_insert" ON public.subjects FOR INSERT
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "subjects_update" ON public.subjects FOR UPDATE
  USING (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "subjects_delete" ON public.subjects FOR DELETE
  USING (get_my_role() IN ('admin','super_admin'));


-- ============================================================
-- TABLE: units
-- ============================================================
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "units_select" ON public.units FOR SELECT
  USING (is_active = true OR get_my_role() IN ('admin','super_admin'));

CREATE POLICY "units_insert" ON public.units FOR INSERT
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "units_update" ON public.units FOR UPDATE
  USING (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "units_delete" ON public.units FOR DELETE
  USING (get_my_role() IN ('admin','super_admin'));


-- ============================================================
-- TABLE: chapters
-- ============================================================
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chapters_select" ON public.chapters FOR SELECT
  USING (is_active = true OR get_my_role() IN ('admin','super_admin'));

CREATE POLICY "chapters_insert" ON public.chapters FOR INSERT
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "chapters_update" ON public.chapters FOR UPDATE
  USING (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "chapters_delete" ON public.chapters FOR DELETE
  USING (get_my_role() IN ('admin','super_admin'));


-- ============================================================
-- TABLE: notes
-- ============================================================
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select" ON public.notes FOR SELECT
  USING (is_active = true OR get_my_role() IN ('admin','super_admin'));

CREATE POLICY "notes_insert" ON public.notes FOR INSERT
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "notes_update" ON public.notes FOR UPDATE
  USING (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "notes_delete" ON public.notes FOR DELETE
  USING (get_my_role() IN ('admin','super_admin'));


-- ============================================================
-- TABLE: questions
-- ============================================================
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions_select" ON public.questions FOR SELECT
  USING (is_active = true OR get_my_role() IN ('admin','super_admin'));

CREATE POLICY "questions_insert" ON public.questions FOR INSERT
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "questions_update" ON public.questions FOR UPDATE
  USING (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "questions_delete" ON public.questions FOR DELETE
  USING (get_my_role() IN ('admin','super_admin'));


-- ============================================================
-- TABLE: chapter_tests
-- ============================================================
ALTER TABLE public.chapter_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chapter_tests_select" ON public.chapter_tests FOR SELECT
  USING (is_active = true OR get_my_role() IN ('admin','super_admin'));

CREATE POLICY "chapter_tests_insert" ON public.chapter_tests FOR INSERT
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "chapter_tests_update" ON public.chapter_tests FOR UPDATE
  USING (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "chapter_tests_delete" ON public.chapter_tests FOR DELETE
  USING (get_my_role() IN ('admin','super_admin'));


-- ============================================================
-- TABLE: chapter_meta
-- ============================================================
ALTER TABLE public.chapter_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chapter_meta_select" ON public.chapter_meta FOR SELECT
  USING (true);

CREATE POLICY "chapter_meta_insert" ON public.chapter_meta FOR INSERT
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "chapter_meta_update" ON public.chapter_meta FOR UPDATE
  USING (get_my_role() IN ('admin','super_admin'));


-- ============================================================
-- TABLE: test_attempts
-- ============================================================
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_attempts_select" ON public.test_attempts FOR SELECT
  USING (user_id = auth.uid() OR get_my_role() IN ('admin','super_admin'));

CREATE POLICY "test_attempts_insert" ON public.test_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "test_attempts_update" ON public.test_attempts FOR UPDATE
  USING (get_my_role() = 'super_admin');

CREATE POLICY "test_attempts_delete" ON public.test_attempts FOR DELETE
  USING (get_my_role() = 'super_admin');


-- ============================================================
-- TABLE: progress
-- ============================================================
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_select" ON public.progress FOR SELECT
  USING (user_id = auth.uid() OR get_my_role() IN ('admin','super_admin'));

CREATE POLICY "progress_insert" ON public.progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "progress_update" ON public.progress FOR UPDATE
  USING (user_id = auth.uid());


-- ============================================================
-- TABLE: settings
-- ============================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON public.settings FOR SELECT
  USING (true);

CREATE POLICY "settings_insert" ON public.settings FOR INSERT
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "settings_update" ON public.settings FOR UPDATE
  USING (get_my_role() = 'super_admin');

CREATE POLICY "settings_delete" ON public.settings FOR DELETE
  USING (get_my_role() = 'super_admin');
