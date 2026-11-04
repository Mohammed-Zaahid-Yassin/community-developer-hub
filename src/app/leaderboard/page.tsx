"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Profile, Project, Achievement } from "@/types/database";
import {
  Trophy,
  Flame,
  Star,
  Users,
  Code2,
  Award,
  Sparkles,
  HelpCircle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

function LeaderboardContent() {
  const [activeCategory, setActiveCategory] = useState<"points" | "streaks" | "creators" | "ratings" | "badges">("points");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [topProjects, setTopProjects] = useState<Project[]>([]);
  const [achievementsList, setAchievementsList] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    async function loadLeaderboards() {
      setLoading(true);
      try {
        const supabase = createClient();

        if (activeCategory === "points") {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("is_public", true)
            .order("total_points", { ascending: false })
            .limit(30);
          setProfiles((data as Profile[]) || []);
        } else if (activeCategory === "streaks") {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("is_public", true)
            .order("current_streak", { ascending: false })
            .order("longest_streak", { ascending: false })
            .limit(30);
          setProfiles((data as Profile[]) || []);
        } else if (activeCategory === "creators") {
          const { data } = await supabase
            .from("profiles")
            .select(`
              *,
              projects:projects(count)
            `)
            .eq("is_public", true)
            .order("total_points", { ascending: false })
            .limit(30);
          setProfiles((data as unknown as Profile[]) || []);
        } else if (activeCategory === "ratings") {
          const { data } = await supabase
            .from("projects")
            .select(`
              *,
              creator:profiles!projects_creator_id_fkey(*)
            `)
            .eq("is_approved", true)
            .gt("rating_count", 0)
            .order("average_rating", { ascending: false })
            .order("rating_count", { ascending: false })
            .limit(30);
          setTopProjects((data as unknown as Project[]) || []);
        } else if (activeCategory === "badges") {
          const { data } = await supabase
            .from("achievements")
            .select("*")
            .order("points", { ascending: false });
          setAchievementsList((data as Achievement[]) || []);
        }
      } catch (err) {
        console.error("Error loading leaderboards:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboards();
  }, [activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-amber-500" />
            Community Leaderboards & Badges
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Honoring consistent builders, active collaborators, top code reviewers, and outstanding projects.
          </p>
        </div>

        <button
          onClick={() => setShowRules(!showRules)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 transition shadow-sm"
        >
          <HelpCircle className="w-4 h-4 text-indigo-500" />
          <span>Scoring & Streak Rules</span>
        </button>
      </div>

      {/* Rules Explainer Callout */}
      {showRules && (
        <div className="mb-8 p-6 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Transparent Point & Streak Rules
            </h3>
            <button onClick={() => setShowRules(false)} className="text-neutral-400 hover:text-neutral-600">
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs text-neutral-700 dark:text-neutral-300">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-indigo-100 dark:border-indigo-950">
              <strong className="text-indigo-600 dark:text-indigo-400 block mb-1">Project Publication</strong>
              <p>+50 points upon creating and publishing a verified project showcase.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-indigo-100 dark:border-indigo-950">
              <strong className="text-indigo-600 dark:text-indigo-400 block mb-1">Meaningful Updates</strong>
              <p>+15 points & daily streak increment when posting technical project updates.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-indigo-100 dark:border-indigo-950">
              <strong className="text-indigo-600 dark:text-indigo-400 block mb-1">Substantive Peer Reviews</strong>
              <p>+20 points & streak increment for structured evaluations (40+ chars).</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-indigo-100 dark:border-indigo-950">
              <strong className="text-indigo-600 dark:text-indigo-400 block mb-1">Task Completion</strong>
              <p>+10 points when an assigned team workspace task is moved to Completed.</p>
            </div>
          </div>
          <p className="text-[11px] text-neutral-500">
            * Anti-gaming safeguard: Merely signing in, loading pages, or repeated clicking does not count toward streaks.
          </p>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200 dark:border-neutral-800 mb-8">
        <button
          onClick={() => setActiveCategory("points")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeCategory === "points"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Top Contributors</span>
        </button>

        <button
          onClick={() => setActiveCategory("streaks")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeCategory === "streaks"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Active Streaks</span>
        </button>

        <button
          onClick={() => setActiveCategory("creators")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeCategory === "creators"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Top Creators</span>
        </button>

        <button
          onClick={() => setActiveCategory("ratings")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeCategory === "ratings"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>Best-Rated Projects</span>
        </button>

        <button
          onClick={() => setActiveCategory("badges")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeCategory === "badges"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Achievements Directory</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          <p className="text-xs text-neutral-400">Compiling leaderboard standings...</p>
        </div>
      ) : activeCategory === "ratings" ? (
        /* Top Projects Table */
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 font-bold text-xs uppercase tracking-wider text-neutral-500">
            Best-Rated Community Projects
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {topProjects.length === 0 ? (
              <p className="p-8 text-center text-xs text-neutral-400">No rated projects recorded yet.</p>
            ) : (
              topProjects.map((p, idx) => (
                <div key={p.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-8 text-center font-bold text-sm">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </div>
                    <div>
                      <Link href={`/projects/${p.slug}`} className="text-sm font-bold text-neutral-900 dark:text-white hover:text-indigo-600 transition">
                        {p.title}
                      </Link>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        By {p.creator?.full_name} &bull; {p.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span>{Number(p.average_rating).toFixed(1)}</span>
                      <span className="text-xs text-neutral-400 font-normal">({p.rating_count} reviews)</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeCategory === "badges" ? (
        /* Achievements Directory */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {achievementsList.map((ach) => (
            <div
              key={ach.id}
              className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{ach.title}</h3>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    +{ach.points} pts
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  {ach.description}
                </p>
                <span className="inline-block mt-3 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  {ach.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Profiles Leaderboard */
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 p-4 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            <span className="col-span-1 text-center">Rank</span>
            <span className="col-span-6 sm:col-span-5">Developer Member</span>
            <span className="col-span-3 text-center sm:text-left">Streak</span>
            <span className="col-span-2 sm:col-span-3 text-right">Points</span>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {profiles.length === 0 ? (
              <p className="p-8 text-center text-xs text-neutral-400">No member rankings yet.</p>
            ) : (
              profiles.map((p, idx) => (
                <div
                  key={p.id}
                  className="grid grid-cols-12 items-center p-4 sm:p-5 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition"
                >
                  {/* Rank */}
                  <div className="col-span-1 text-center font-bold text-sm">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                  </div>

                  {/* Profile info */}
                  <div className="col-span-6 sm:col-span-5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                      {p.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        p.full_name?.[0]?.toUpperCase() || "D"
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/profile/${p.username}`}
                        className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white hover:text-indigo-600 transition"
                      >
                        {p.full_name}
                      </Link>
                      <span className="text-[11px] text-neutral-400 block -mt-0.5">
                        @{p.username}
                      </span>
                    </div>
                  </div>

                  {/* Streak */}
                  <div className="col-span-3 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <Flame className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
                    <span>{p.current_streak} days</span>
                  </div>

                  {/* Points */}
                  <div className="col-span-2 sm:col-span-3 text-right font-extrabold text-sm sm:text-base text-neutral-900 dark:text-white">
                    {p.total_points}{" "}
                    <span className="text-xs font-normal text-neutral-400 hidden sm:inline">pts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
