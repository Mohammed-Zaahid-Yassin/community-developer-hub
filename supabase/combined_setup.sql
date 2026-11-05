-- Community Developer Hub: Initial Schema Migration
-- Designed for Supabase PostgreSQL with RLS, Triggers, and Functions

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
  CREATE TYPE user_role_type AS ENUM ('member', 'moderator', 'lead', 'admin', 'super_admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE project_status_type AS ENUM ('idea', 'looking_for_collaborators', 'in_progress', 'completed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE collaboration_status_type AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status_type AS ENUM ('todo', 'in_progress', 'under_review', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status_type AS ENUM ('pending', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  bio text DEFAULT '',
  department text DEFAULT '',
  github_url text DEFAULT '',
  linkedin_url text DEFAULT '',
  portfolio_url text DEFAULT '',
  current_availability text DEFAULT 'open_to_collaborate',
  collaboration_style text DEFAULT 'open_to_join',
  preferred_categories text[] DEFAULT '{}',
  skills_offered text[] DEFAULT '{}',
  skills_needed text[] DEFAULT '{}',
  is_public boolean DEFAULT true,
  is_suspended boolean DEFAULT false,
  total_points integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_contribution_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 4. USER ROLES TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role user_role_type DEFAULT 'member' NOT NULL,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now() NOT NULL
);

-- Helper function to check role safely
CREATE OR REPLACE FUNCTION public.has_role(check_user_id uuid, check_role user_role_type)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  u_role user_role_type;
BEGIN
  SELECT role INTO u_role FROM public.user_roles WHERE user_id = check_user_id;
  IF u_role IS NULL THEN
    RETURN false;
  END IF;

  IF check_role = 'member' THEN
    RETURN true;
  ELSIF check_role = 'moderator' THEN
    RETURN u_role IN ('moderator', 'lead', 'admin', 'super_admin');
  ELSIF check_role = 'lead' THEN
    RETURN u_role IN ('lead', 'admin', 'super_admin');
  ELSIF check_role = 'admin' THEN
    RETURN u_role IN ('admin', 'super_admin');
  ELSIF check_role = 'super_admin' THEN
    RETURN u_role = 'super_admin';
  END IF;
  
  RETURN false;
END;
$$;

-- 5. PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 6. INVITATIONS
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text UNIQUE NOT NULL,
  role user_role_type DEFAULT 'member' NOT NULL,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_used boolean DEFAULT false NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 7. TECHNOLOGIES
CREATE TABLE IF NOT EXISTS public.technologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  category text DEFAULT 'other',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 8. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  tagline text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  status project_status_type DEFAULT 'in_progress' NOT NULL,
  cover_image text,
  github_url text,
  live_url text,
  demo_video_url text,
  likes_count integer DEFAULT 0 NOT NULL,
  bookmarks_count integer DEFAULT 0 NOT NULL,
  comments_count integer DEFAULT 0 NOT NULL,
  views_count integer DEFAULT 0 NOT NULL,
  average_rating numeric(3,2) DEFAULT 0.00 NOT NULL,
  rating_count integer DEFAULT 0 NOT NULL,
  is_featured boolean DEFAULT false NOT NULL,
  featured_at timestamptz,
  is_approved boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 9. PROJECT MEDIA
CREATE TABLE IF NOT EXISTS public.project_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  media_type text DEFAULT 'image' NOT NULL,
  caption text,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 10. PROJECT TECHNOLOGIES
CREATE TABLE IF NOT EXISTS public.project_technologies (
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  technology_id uuid REFERENCES public.technologies(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (project_id, technology_id)
);

-- 11. PROJECT MEMBERS (COLLABORATORS)
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'Contributor' NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (project_id, user_id)
);

-- 12. COLLABORATION OPPORTUNITIES
CREATE TABLE IF NOT EXISTS public.collaboration_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  role_needed text NOT NULL,
  required_skills text[] DEFAULT '{}' NOT NULL,
  positions_open integer DEFAULT 1 NOT NULL,
  responsibilities text NOT NULL,
  time_commitment text DEFAULT '5-10 hours/week',
  location_type text DEFAULT 'remote' NOT NULL,
  status text DEFAULT 'open' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 13. COLLABORATION REQUESTS
CREATE TABLE IF NOT EXISTS public.collaboration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES public.collaboration_opportunities(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  applicant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  portfolio_links text[] DEFAULT '{}',
  status collaboration_status_type DEFAULT 'pending' NOT NULL,
  feedback text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (opportunity_id, applicant_id)
);

-- 14. PROJECT UPDATES
CREATE TABLE IF NOT EXISTS public.project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  version_tag text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 15. PROJECT TASKS
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  status task_status_type DEFAULT 'todo' NOT NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 16. PROJECT MILESTONES
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  is_completed boolean DEFAULT false NOT NULL,
  target_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 17. SOCIAL INTERACTIONS: LIKES, BOOKMARKS, COMMENTS
CREATE TABLE IF NOT EXISTS public.project_likes (
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.project_bookmarks (
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES public.project_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.project_comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reaction text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (comment_id, user_id, reaction)
);

-- 18. RATINGS & REVIEWS
CREATE TABLE IF NOT EXISTS public.project_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  technical_rating smallint NOT NULL CHECK (technical_rating BETWEEN 1 AND 5),
  innovation_rating smallint NOT NULL CHECK (innovation_rating BETWEEN 1 AND 5),
  design_rating smallint NOT NULL CHECK (design_rating BETWEEN 1 AND 5),
  documentation_rating smallint NOT NULL CHECK (documentation_rating BETWEEN 1 AND 5),
  usefulness_rating smallint NOT NULL CHECK (usefulness_rating BETWEEN 1 AND 5),
  overall_rating numeric(3,2) GENERATED ALWAYS AS (
    (technical_rating + innovation_rating + design_rating + documentation_rating + usefulness_rating)::numeric / 5.0
  ) STORED,
  review_text text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (project_id, user_id)
);

-- 19. USER FOLLOWS
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- 20. CONTRIBUTIONS & STREAKS
CREATE TABLE IF NOT EXISTS public.contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  reference_id uuid,
  reference_type text,
  points_awarded integer DEFAULT 0 NOT NULL,
  contribution_date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.streak_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak integer DEFAULT 0 NOT NULL,
  longest_streak integer DEFAULT 0 NOT NULL,
  last_contribution_date date,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 21. POINTS LEDGER
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 22. ACHIEVEMENTS & USER ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.achievements (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  badge_icon text NOT NULL,
  category text DEFAULT 'general' NOT NULL,
  points integer DEFAULT 50 NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id text REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, achievement_id)
);

-- 23. CHALLENGES & SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL,
  instructions text NOT NULL,
  evaluation_criteria text DEFAULT '',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  prize_info text DEFAULT '',
  banner_image text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  summary text NOT NULL,
  rank integer,
  score numeric(4,2),
  feedback text,
  submitted_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (challenge_id, project_id)
);

-- 24. EVENTS & REGISTRATIONS
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL,
  event_type text DEFAULT 'workshop' NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text DEFAULT 'Online' NOT NULL,
  max_attendees integer,
  is_published boolean DEFAULT true NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  registered_at timestamptz DEFAULT now() NOT NULL,
  attended boolean DEFAULT false NOT NULL,
  PRIMARY KEY (event_id, user_id)
);

-- 25. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 26. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 27. COMMUNITY SPOTLIGHT & NOMINATIONS
CREATE TABLE IF NOT EXISTS public.project_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  nominated_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  editorial_notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.featured_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  featured_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  editorial_note text,
  featured_from timestamptz DEFAULT now() NOT NULL,
  featured_until timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 28. REPORTS & MODERATION
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status report_status_type DEFAULT 'pending' NOT NULL,
  action_taken text,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 29. ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 30. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_projects_creator ON public.projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON public.projects(is_featured);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_likes ON public.projects(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_projects_ratings ON public.projects(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_project_tech_tech ON public.project_technologies(technology_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_status ON public.collaboration_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_contributions_user_date ON public.contributions(user_id, contribution_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

-- 31. TRIGGERS & FUNCTIONS

-- Trigger: Automatically create user profile and assign role upon registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_role user_role_type;
  v_username text;
  v_full_name text;
BEGIN
  -- Determine username
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4)
  );

  -- Determine full name
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Count existing profiles to make first user super_admin
  SELECT count(*) INTO v_count FROM public.profiles;
  IF v_count = 0 THEN
    v_role := 'super_admin';
  ELSE
    v_role := 'member';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    v_username,
    v_full_name,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create streak record
  INSERT INTO public.streak_records (user_id, current_streak, longest_streak)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to recalculate ratings for a project
CREATE OR REPLACE FUNCTION public.handle_project_rating_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_project_id uuid;
  v_avg numeric(3,2);
  v_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_project_id := OLD.project_id;
  ELSE
    target_project_id := NEW.project_id;
  END IF;

  SELECT COALESCE(AVG(overall_rating), 0), COUNT(*)
  INTO v_avg, v_count
  FROM public.project_ratings
  WHERE project_id = target_project_id;

  UPDATE public.projects
  SET average_rating = v_avg, rating_count = v_count
  WHERE id = target_project_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_rating_modified ON public.project_ratings;
CREATE TRIGGER on_rating_modified
  AFTER INSERT OR UPDATE OR DELETE ON public.project_ratings
  FOR EACH ROW EXECUTE FUNCTION public.handle_project_rating_change();

-- Trigger for like counts
CREATE OR REPLACE FUNCTION public.handle_project_like_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects SET likes_count = likes_count + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_like_modified ON public.project_likes;
CREATE TRIGGER on_like_modified
  AFTER INSERT OR DELETE ON public.project_likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_project_like_change();

-- Trigger for bookmark counts
CREATE OR REPLACE FUNCTION public.handle_project_bookmark_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects SET bookmarks_count = bookmarks_count + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects SET bookmarks_count = GREATEST(bookmarks_count - 1, 0) WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_bookmark_modified ON public.project_bookmarks;
CREATE TRIGGER on_bookmark_modified
  AFTER INSERT OR DELETE ON public.project_bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.handle_project_bookmark_change();

-- Trigger for comment counts
CREATE OR REPLACE FUNCTION public.handle_project_comment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects SET comments_count = comments_count + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_modified ON public.project_comments;
CREATE TRIGGER on_comment_modified
  AFTER INSERT OR DELETE ON public.project_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_project_comment_change();

-- 32. MEANINGFUL CONTRIBUTION & STREAK FUNCTION
CREATE OR REPLACE FUNCTION public.record_qualifying_contribution(
  p_user_id uuid,
  p_action_type text,
  p_points integer,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_last_date date;
  v_current_streak integer := 0;
  v_longest_streak integer := 0;
  v_streak_incremented boolean := false;
  v_new_points integer := 0;
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- 1. Insert contribution record
  INSERT INTO public.contributions (user_id, action_type, reference_id, reference_type, points_awarded, contribution_date)
  VALUES (p_user_id, p_action_type, p_reference_id, p_reference_type, p_points, v_today);

  -- 2. Insert points ledger entry if points > 0
  IF p_points > 0 THEN
    INSERT INTO public.points_ledger (user_id, amount, reason, reference_id)
    VALUES (p_user_id, p_points, p_action_type, p_reference_id);

    UPDATE public.profiles
    SET total_points = total_points + p_points
    WHERE id = p_user_id;
  END IF;

  -- 3. Calculate streak
  SELECT last_contribution_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM public.streak_records
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.streak_records (user_id, current_streak, longest_streak, last_contribution_date)
    VALUES (p_user_id, 1, 1, v_today);
    v_current_streak := 1;
    v_longest_streak := 1;
    v_streak_incremented := true;
  ELSE
    IF v_last_date IS NULL THEN
      v_current_streak := 1;
      v_longest_streak := GREATEST(v_longest_streak, 1);
      v_streak_incremented := true;
    ELSIF v_last_date = v_today THEN
      -- Already contributed today; do not increment streak again
      v_streak_incremented := false;
    ELSIF v_last_date = (v_today - 1) THEN
      -- Contributed yesterday: streak continues!
      v_current_streak := v_current_streak + 1;
      v_longest_streak := GREATEST(v_longest_streak, v_current_streak);
      v_streak_incremented := true;
    ELSE
      -- Missed more than one day: reset streak to 1
      v_current_streak := 1;
      v_streak_incremented := true;
    END IF;

    UPDATE public.streak_records
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_contribution_date = v_today,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Sync profiles streak stats
  UPDATE public.profiles
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_contribution_date = v_today
  WHERE id = p_user_id;

  -- 4. Check for streak achievements
  IF v_current_streak >= 7 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (p_user_id, 'streak_7') ON CONFLICT DO NOTHING;
  END IF;

  IF v_current_streak >= 30 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (p_user_id, 'streak_30') ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'current_streak', v_current_streak,
    'longest_streak', v_longest_streak,
    'points_awarded', p_points,
    'streak_incremented', v_streak_incremented
  );
END;
$$;

-- 33. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (is_public = true OR auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- USER ROLES
CREATE POLICY "User roles viewable by authenticated users" ON public.user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert or update user roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PLATFORM SETTINGS
CREATE POLICY "Platform settings viewable by everyone" ON public.platform_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage platform settings" ON public.platform_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- INVITATIONS
CREATE POLICY "Admins can manage invitations" ON public.invitations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view invitation by code" ON public.invitations
  FOR SELECT USING (true);

-- TECHNOLOGIES
CREATE POLICY "Technologies viewable by everyone" ON public.technologies
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can suggest/insert technologies" ON public.technologies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage technologies" ON public.technologies
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- PROJECTS
CREATE POLICY "Approved projects viewable by everyone" ON public.projects
  FOR SELECT USING (is_approved = true OR creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators and project leads can update projects" ON public.projects
  FOR UPDATE USING (
    creator_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = id AND user_id = auth.uid() AND role = 'Lead')
  );

CREATE POLICY "Creators and admins can delete projects" ON public.projects
  FOR DELETE USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- PROJECT MEDIA & TECHNOLOGIES
CREATE POLICY "Project media viewable by everyone" ON public.project_media FOR SELECT USING (true);
CREATE POLICY "Project creators can manage media" ON public.project_media
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Project technologies viewable by everyone" ON public.project_technologies FOR SELECT USING (true);
CREATE POLICY "Project creators can manage technologies" ON public.project_technologies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- PROJECT MEMBERS
CREATE POLICY "Project members viewable by everyone" ON public.project_members FOR SELECT USING (true);
CREATE POLICY "Project creators and admins can manage project members" ON public.project_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- COLLABORATION OPPORTUNITIES
CREATE POLICY "Collaboration opportunities viewable by everyone" ON public.collaboration_opportunities FOR SELECT USING (true);
CREATE POLICY "Project creators can manage opportunities" ON public.collaboration_opportunities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- COLLABORATION REQUESTS
CREATE POLICY "Applicants and project creators can view requests" ON public.collaboration_requests
  FOR SELECT USING (
    applicant_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND creator_id = auth.uid())
  );

CREATE POLICY "Authenticated users can submit collaboration requests" ON public.collaboration_requests
  FOR INSERT WITH CHECK (
    auth.uid() = applicant_id AND 
    NOT EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND creator_id = auth.uid())
  );

CREATE POLICY "Applicants can withdraw their own requests" ON public.collaboration_requests
  FOR UPDATE USING (applicant_id = auth.uid())
  WITH CHECK (status = 'withdrawn');

CREATE POLICY "Project creators and admins can accept/reject requests" ON public.collaboration_requests
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND creator_id = auth.uid())
  );

-- PROJECT UPDATES
CREATE POLICY "Project updates viewable by everyone" ON public.project_updates FOR SELECT USING (true);
CREATE POLICY "Team members can post updates" ON public.project_updates
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND creator_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_id AND user_id = auth.uid()) OR
      public.has_role(auth.uid(), 'admin')
    )
  );

-- PROJECT TASKS & MILESTONES
CREATE POLICY "Tasks viewable by project team and public" ON public.project_tasks FOR SELECT USING (true);
CREATE POLICY "Team members can manage tasks" ON public.project_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_id AND user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Milestones viewable by everyone" ON public.project_milestones FOR SELECT USING (true);
CREATE POLICY "Team members can manage milestones" ON public.project_milestones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_id AND user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

-- SOCIAL: LIKES, BOOKMARKS, COMMENTS
CREATE POLICY "Likes viewable by everyone" ON public.project_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON public.project_likes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Bookmarks viewable by owner" ON public.project_bookmarks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own bookmarks" ON public.project_bookmarks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Comments viewable by everyone" ON public.project_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can post comments" ON public.project_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update/delete own comments" ON public.project_comments
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Users can delete own comments" ON public.project_comments
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Reactions viewable by everyone" ON public.comment_reactions FOR SELECT USING (true);
CREATE POLICY "Users can manage own reactions" ON public.comment_reactions
  FOR ALL USING (auth.uid() = user_id);

-- RATINGS & REVIEWS
CREATE POLICY "Ratings viewable by everyone" ON public.project_ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can rate projects (not own)" ON public.project_ratings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    NOT EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND creator_id = auth.uid())
  );
CREATE POLICY "Users can update own rating" ON public.project_ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- USER FOLLOWS
CREATE POLICY "Follows viewable by everyone" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Users can manage own follows" ON public.user_follows
  FOR ALL USING (auth.uid() = follower_id);

-- CONTRIBUTIONS, STREAKS & POINTS
CREATE POLICY "Contributions viewable by everyone" ON public.contributions FOR SELECT USING (true);
CREATE POLICY "Streak records viewable by everyone" ON public.streak_records FOR SELECT USING (true);
CREATE POLICY "Points ledger viewable by owner or admin" ON public.points_ledger
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ACHIEVEMENTS
CREATE POLICY "Achievements viewable by everyone" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "User achievements viewable by everyone" ON public.user_achievements FOR SELECT USING (true);

-- CHALLENGES & SUBMISSIONS
CREATE POLICY "Challenges viewable by everyone" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Admins can manage challenges" ON public.challenges
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Challenge participants viewable by everyone" ON public.challenge_participants FOR SELECT USING (true);
CREATE POLICY "Users can join challenges" ON public.challenge_participants
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Submissions viewable by everyone" ON public.challenge_submissions FOR SELECT USING (true);
CREATE POLICY "Users can submit own project to challenge" ON public.challenge_submissions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND creator_id = auth.uid())
  );
CREATE POLICY "Admins can update submissions scores" ON public.challenge_submissions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- EVENTS & REGISTRATIONS
CREATE POLICY "Events viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admins can manage events" ON public.events
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Event registrations viewable by registered user and admins" ON public.event_registrations
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can register for events" ON public.event_registrations
  FOR ALL USING (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE POLICY "Users can view and manage their own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- ANNOUNCEMENTS
CREATE POLICY "Announcements viewable by everyone" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins can manage announcements" ON public.announcements
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- SPOTLIGHT & NOMINATIONS
CREATE POLICY "Nominations viewable by nominator and admins" ON public.project_nominations
  FOR SELECT USING (nominated_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members can nominate projects" ON public.project_nominations
  FOR INSERT WITH CHECK (auth.uid() = nominated_by);
CREATE POLICY "Admins can review nominations" ON public.project_nominations
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Featured projects viewable by everyone" ON public.featured_projects FOR SELECT USING (true);
CREATE POLICY "Admins can manage featured projects" ON public.featured_projects
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- REPORTS & MODERATION
CREATE POLICY "Reporters and moderators can view reports" ON public.reports
  FOR SELECT USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Authenticated users can submit reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Moderators can resolve reports" ON public.reports
  FOR UPDATE USING (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can view and create moderation actions" ON public.moderation_actions
  FOR ALL USING (public.has_role(auth.uid(), 'moderator'));

-- ADMIN AUDIT LOGS
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed Initial Technologies, Achievements, and Platform Settings

-- 1. Technologies
INSERT INTO public.technologies (name, slug, category, icon) VALUES
('Next.js', 'nextjs', 'frontend', 'Globe'),
('React', 'react', 'frontend', 'Atom'),
('TypeScript', 'typescript', 'frontend', 'Code2'),
('Tailwind CSS', 'tailwind-css', 'frontend', 'Palette'),
('Vue.js', 'vuejs', 'frontend', 'Layers'),
('Svelte', 'svelte', 'frontend', 'Flame'),
('Node.js', 'nodejs', 'backend', 'Server'),
('Python', 'python', 'backend', 'Terminal'),
('Go', 'go', 'backend', 'Cpu'),
('Rust', 'rust', 'backend', 'Shield'),
('PostgreSQL', 'postgresql', 'database', 'Database'),
('Supabase', 'supabase', 'database', 'Zap'),
('Docker', 'docker', 'devops', 'Box'),
('PyTorch', 'pytorch', 'ai', 'Brain'),
('Flutter', 'flutter', 'mobile', 'Smartphone'),
('React Native', 'react-native', 'mobile', 'Smartphone'),
('GraphQL', 'graphql', 'backend', 'Network'),
('Redis', 'redis', 'database', 'FastForward')
ON CONFLICT (slug) DO NOTHING;

-- 2. Achievements
INSERT INTO public.achievements (id, title, description, badge_icon, category, points) VALUES
('first_project', 'First Project', 'Published your very first project to the community showcase', 'Sparkles', 'creation', 50),
('first_collaboration', 'Team Player', 'Successfully joined or recruited for a project collaboration', 'Users', 'collaboration', 50),
('project_finisher', 'Project Finisher', 'Guided a project to full completion status', 'CheckCircle2', 'milestone', 100),
('consistent_contributor', 'Consistent Contributor', 'Accumulated 10 verified qualifying contributions', 'Flame', 'streak', 100),
('streak_7', '7-Day Streak', 'Maintained a meaningful contribution streak for 7 consecutive days', 'Zap', 'streak', 150),
('streak_30', 'Monthly Titan', 'Maintained a meaningful contribution streak for 30 consecutive days', 'Trophy', 'streak', 500),
('top_reviewer', 'Critical Eye', 'Submitted 5 substantive reviews evaluating fellow community projects', 'Star', 'community', 100),
('featured_creator', 'Community Spotlight', 'Had a project selected for Community Spotlight and social recognition', 'Award', 'recognition', 200),
('challenge_winner', 'Challenge Victor', 'Ranked at the top of an official community challenge', 'Crown', 'competition', 300),
('mentor', 'Community Mentor', 'Offered mentorship and guided community members through projects', 'HeartHandshake', 'community', 150)
ON CONFLICT (id) DO NOTHING;

-- 3. Platform Settings
INSERT INTO public.platform_settings (key, value, description) VALUES
('registration_mode', '{"mode": "open"}'::jsonb, 'Community onboarding mode: open, invite_only, or admin_approved'),
('branding', '{"name": "Community Developer Hub", "shortName": "DevHub", "tagline": "Showcase, Collaborate, and Elevate Together", "contactEmail": "community@devhub.internal"}'::jsonb, 'White-label community branding config'),
('points_rules', '{"project_create": 50, "project_complete": 100, "project_update": 15, "task_completed": 10, "substantive_review": 20, "accepted_contribution": 30, "challenge_submission": 40}'::jsonb, 'Configurable point values for qualifying actions'),
('streak_qualifiers', '{"actions": ["project_update", "accepted_contribution", "task_completed", "substantive_review", "challenge_submission"]}'::jsonb, 'List of activities that qualify for daily streak increments')
ON CONFLICT (key) DO NOTHING;

