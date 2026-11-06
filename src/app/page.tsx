import React, { Suspense } from "react";
import Link from "next/link";
import { branding } from "@/config/branding";
import { createClient } from "@/lib/supabase/server";
import {
  Compass,
  Users,
  Flame,
  Trophy,
  ArrowRight,
  Sparkles,
  Code2,
  CheckCircle2,
  FolderGit2,
  Star,
  Award,
  Layers,
  Heart,
  ChevronRight,
} from "lucide-react";
import { GithubIcon } from "@/components/icons";

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch real statistics from database
  const [
    { count: membersCount },
    { count: projectsCount },
    { count: collaborationsCount },
    { data: featuredProject },
    { data: trendingProjects },
    { data: collaborationOpps },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("is_approved", true),
    supabase.from("collaboration_opportunities").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase
      .from("projects")
      .select(`
        *,
        creator:profiles!projects_creator_id_fkey(*),
        project_technologies(technologies(*))
      `)
      .eq("is_featured", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("projects")
      .select(`
        *,
        creator:profiles!projects_creator_id_fkey(*),
        project_technologies(technologies(*))
      `)
      .eq("is_approved", true)
      .order("likes_count", { ascending: false })
      .limit(6),
    supabase
      .from("collaboration_opportunities")
      .select(`
        *,
        project:projects(title, slug, cover_image, category)
      `)
      .eq("status", "open")
      .limit(3),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Authentic Community Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-200/80 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Developer Exchange & Project Showcase for {branding.communityAffiliation}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-neutral-900 dark:text-white max-w-4xl mx-auto leading-tight">
            Build Software in Public. Collaborate Across Teams.
          </h1>

          <p className="mt-4 text-sm sm:text-base text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            {branding.description}
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/projects"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition hover:scale-[1.01]"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Projects</span>
            </Link>

            <Link
              href="/projects/new"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm font-semibold transition"
            >
              <Code2 className="w-4 h-4" />
              <span>Publish Project</span>
            </Link>

            <Link
              href="/collaborate"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm font-semibold transition"
            >
              <Users className="w-4 h-4" />
              <span>Open Roles</span>
            </Link>
          </div>

          {/* Real Live Metrics Bar - Pure Database Data */}
          <div className="mt-12 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="p-3 text-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
                {membersCount ?? 0}
              </span>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                Registered Builders
              </p>
            </div>

            <div className="p-3 text-center border-l border-neutral-100 dark:border-neutral-800">
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {projectsCount ?? 0}
              </span>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                Live Projects
              </p>
            </div>

            <div className="p-3 text-center border-l border-neutral-100 dark:border-neutral-800">
              <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
                {collaborationsCount ?? 0}
              </span>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                Open Collaborations
              </p>
            </div>

            <div className="p-3 text-center border-l border-neutral-100 dark:border-neutral-800">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                100%
              </span>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                Open Source
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Spotlight Section */}
      {featuredProject && (
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                Community Spotlight Project
              </h2>
            </div>
            <Link
              href="/spotlight"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Spotlight Archive</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-indigo-900/10 via-purple-900/5 to-neutral-900/10 border border-indigo-200 dark:border-indigo-900/60 p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl space-y-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white inline-block">
                Editor&#39;s Choice
              </span>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                <Link href={`/projects/${featuredProject.slug}`} className="hover:text-indigo-600 transition">
                  {featuredProject.title}
                </Link>
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {featuredProject.tagline}
              </p>
              <div className="flex items-center gap-4 pt-2 text-xs text-neutral-500">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  By {featuredProject.creator?.full_name}
                </span>
                <span className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {Number(featuredProject.average_rating || 5).toFixed(1)}
                </span>
                <span>{featuredProject.likes_count} appreciations</span>
              </div>
              <div className="pt-2">
                <Link
                  href={`/projects/${featuredProject.slug}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
                >
                  <span>Explore Spotlight Project</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {featuredProject.cover_image && (
              <div className="w-full md:w-80 h-52 rounded-2xl overflow-hidden shadow-lg border border-neutral-200 dark:border-neutral-800 shrink-0 bg-neutral-100 dark:bg-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featuredProject.cover_image}
                  alt={featuredProject.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Trending Projects Grid */}
      <section className="py-12 bg-neutral-100/60 dark:bg-neutral-900/40 border-y border-neutral-200/80 dark:border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Trending Showcase
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Highest community engagement and developer appreciation this week.
              </p>
            </div>
            <Link
              href="/projects"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View All Projects</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(trendingProjects || []).slice(0, 6).map((project: any) => (
              <div
                key={project.id}
                className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  <Link href={`/projects/${project.slug}`} className="block h-40 bg-neutral-100 dark:bg-neutral-800 relative overflow-hidden">
                    {project.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.cover_image}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <FolderGit2 className="w-8 h-8" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white">
                      {project.status.replace(/_/g, " ")}
                    </span>
                  </Link>

                  <div className="p-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {project.category}
                    </span>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5 tracking-tight group-hover:text-indigo-600 transition-colors">
                      <Link href={`/projects/${project.slug}`}>{project.title}</Link>
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                      {project.tagline}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    @{project.creator?.username}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-semibold text-neutral-800 dark:text-neutral-200">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {Number(project.average_rating || 0).toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <Heart className="w-3.5 h-3.5 fill-red-500" />
                      {project.likes_count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collaboration Preview */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Collaboration Marketplace
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Connect with project owners recruiting specific technical skillsets.
            </p>
          </div>
          <Link
            href="/collaborate"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>Browse All Open Roles</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(collaborationOpps || []).map((opp: any) => (
            <div
              key={opp.id}
              className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {opp.project?.category || "Project Role"}
                </span>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-2">
                  {opp.role_needed}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  For project: <strong className="text-neutral-800 dark:text-neutral-200">{opp.project?.title}</strong>
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-3 line-clamp-3 leading-relaxed">
                  {opp.responsibilities}
                </p>
                <div className="flex flex-wrap gap-1 mt-4">
                  {opp.required_skills?.map((s: string) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">{opp.time_commitment}</span>
                <Link
                  href={`/collaborate?apply=${opp.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  Apply Role
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gamification & Streaks Callout */}
      <section className="py-16 bg-neutral-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Meaningful Contribution Engine
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Authentic Streaks. Verifiable Recognition.
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                No vanity metrics. Streaks and leaderboard points are earned only by real engineering actions: publishing genuine project updates, finishing assigned team tasks, submitting substantive code evaluations, or winning community challenges.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/leaderboard"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  View Leaderboards
                </Link>
                <Link
                  href="/challenges"
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition"
                >
                  Active Challenges
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-neutral-800/60 border border-neutral-700 space-y-2">
                <Flame className="w-6 h-6 text-amber-400" />
                <h4 className="text-sm font-bold">Contribution Streaks</h4>
                <p className="text-xs text-neutral-400">
                  Daily calendar tracking with anti-gaming validations.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-800/60 border border-neutral-700 space-y-2">
                <Trophy className="w-6 h-6 text-indigo-400" />
                <h4 className="text-sm font-bold">Community Trophies</h4>
                <p className="text-xs text-neutral-400">
                  Earn verifiable badges to display on your developer portfolio.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-800/60 border border-neutral-700 space-y-2">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <h4 className="text-sm font-bold">Social Spotlight</h4>
                <p className="text-xs text-neutral-400">
                  Outstanding projects featured on community social media.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-800/60 border border-neutral-700 space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <h4 className="text-sm font-bold">Peer Code Reviews</h4>
                <p className="text-xs text-neutral-400">
                  5-dimension technical evaluations from community peers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
