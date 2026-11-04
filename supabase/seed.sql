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
