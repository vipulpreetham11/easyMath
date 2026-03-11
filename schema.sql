-- users table extends auth.users
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  role text DEFAULT 'student' CHECK (role IN ('student', 'admin', 'super_admin')),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- subjects
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  is_active boolean DEFAULT true,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- units
CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- chapters
CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- notes
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text CHECK (type IN ('html', 'pdf')),
  html_content text,
  pdf_url text,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- questions
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  source text CHECK (source IN ('practice', 'pyq')),
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option text CHECK (correct_option IN ('a', 'b', 'c', 'd')),
  explanation text,
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  exam_name text,
  exam_year integer,
  exam_shift text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- chapter_tests
CREATE TABLE public.chapter_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  duration_minutes integer NOT NULL,
  total_questions integer NOT NULL,
  practice_count integer NOT NULL,
  pyq_count integer NOT NULL,
  marks_per_question integer DEFAULT 1,
  negative_marking boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- chapter_meta
CREATE TABLE public.chapter_meta (
  chapter_id uuid PRIMARY KEY REFERENCES public.chapters(id) ON DELETE CASCADE,
  notes_count integer DEFAULT 0,
  practice_count integer DEFAULT 0,
  pyq_count integer DEFAULT 0,
  has_test boolean DEFAULT false,
  last_updated timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- test_attempts
CREATE TABLE public.test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  test_id uuid REFERENCES public.chapter_tests(id) ON DELETE CASCADE,
  score integer,
  total_marks integer,
  correct_count integer,
  wrong_count integer,
  unattempted_count integer,
  accuracy double precision,
  answers jsonb,
  submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- progress
CREATE TABLE public.progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  last_opened_at timestamp with time zone,
  notes_completed boolean DEFAULT false,
  notes_opened_ids uuid[] DEFAULT '{}',
  practice_attempts integer DEFAULT 0,
  best_score double precision DEFAULT 0,
  last_score double precision,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, chapter_id)
);

-- settings
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Auto-create user profile from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'student');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- chapter_meta trigger function
CREATE OR REPLACE FUNCTION public.update_chapter_meta()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update counts based on the table modified
    IF TG_TABLE_NAME = 'notes' THEN
      UPDATE public.chapter_meta SET notes_count = (SELECT count(*) FROM public.notes WHERE chapter_id = NEW.chapter_id AND is_active = true), last_updated = now() WHERE chapter_id = NEW.chapter_id;
    ELSIF TG_TABLE_NAME = 'questions' THEN
      UPDATE public.chapter_meta SET practice_count = (SELECT count(*) FROM public.questions WHERE chapter_id = NEW.chapter_id AND source = 'practice' AND is_active = true), pyq_count = (SELECT count(*) FROM public.questions WHERE chapter_id = NEW.chapter_id AND source = 'pyq' AND is_active = true), last_updated = now() WHERE chapter_id = NEW.chapter_id;
    ELSIF TG_TABLE_NAME = 'chapter_tests' THEN
      UPDATE public.chapter_meta SET has_test = EXISTS(SELECT 1 FROM public.chapter_tests WHERE chapter_id = NEW.chapter_id AND is_active = true), last_updated = now() WHERE chapter_id = NEW.chapter_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'notes' THEN
      UPDATE public.chapter_meta SET notes_count = (SELECT count(*) FROM public.notes WHERE chapter_id = OLD.chapter_id AND is_active = true), last_updated = now() WHERE chapter_id = OLD.chapter_id;
    ELSIF TG_TABLE_NAME = 'questions' THEN
      UPDATE public.chapter_meta SET practice_count = (SELECT count(*) FROM public.questions WHERE chapter_id = OLD.chapter_id AND source = 'practice' AND is_active = true), pyq_count = (SELECT count(*) FROM public.questions WHERE chapter_id = OLD.chapter_id AND source = 'pyq' AND is_active = true), last_updated = now() WHERE chapter_id = OLD.chapter_id;
    ELSIF TG_TABLE_NAME = 'chapter_tests' THEN
      UPDATE public.chapter_meta SET has_test = EXISTS(SELECT 1 FROM public.chapter_tests WHERE chapter_id = OLD.chapter_id AND is_active = true), last_updated = now() WHERE chapter_id = OLD.chapter_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- create chapter meta on chapter insert
CREATE OR REPLACE FUNCTION public.create_chapter_meta()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.chapter_meta (chapter_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_chapter_created
  AFTER INSERT ON public.chapters
  FOR EACH ROW EXECUTE PROCEDURE public.create_chapter_meta();

-- trigger for notes
CREATE TRIGGER on_note_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.notes
  FOR EACH ROW EXECUTE PROCEDURE public.update_chapter_meta();

-- trigger for questions
CREATE TRIGGER on_question_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.questions
  FOR EACH ROW EXECUTE PROCEDURE public.update_chapter_meta();

-- trigger for tests
CREATE TRIGGER on_test_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.chapter_tests
  FOR EACH ROW EXECUTE PROCEDURE public.update_chapter_meta();

-- RLS RULES
-- users table RLS disabled for now
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- simple content policies
CREATE POLICY "anyone_read_subjects" ON subjects FOR SELECT USING (is_active = true);
CREATE POLICY "anyone_read_units" ON units FOR SELECT USING (is_active = true);
CREATE POLICY "anyone_read_chapters" ON chapters FOR SELECT USING (is_active = true);

-- notes: active read, admin/super full
CREATE POLICY "Anyone can read active notes" ON public.notes FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can do everything on notes" ON public.notes FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- questions: active read, admin/super full
CREATE POLICY "Anyone can read active questions" ON public.questions FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can do everything on questions" ON public.questions FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- chapter_tests: active read, admin/super full
CREATE POLICY "Anyone can read active chapter_tests" ON public.chapter_tests FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can do everything on chapter_tests" ON public.chapter_tests FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- chapter_meta: active read, admin/super full
CREATE POLICY "Anyone can read chapter_meta" ON public.chapter_meta FOR SELECT USING (true);
CREATE POLICY "Admins can do everything on chapter_meta" ON public.chapter_meta FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- test_attempts: read own, admin read all, write server-only (Edge Function)
CREATE POLICY "Students can read own test attempts" ON public.test_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all test attempts" ON public.test_attempts FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- progress: read own, admin read all, write server-only (Edge Function)
CREATE POLICY "Students can read own progress" ON public.progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all progress" ON public.progress FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- settings: anyone read, super admin write
CREATE POLICY "Anyone can read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Super admins can do everything on settings" ON public.settings FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));
