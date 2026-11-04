"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Profile, Project, Achievement, Contribution } from "@/types/database";
import { formatDate } from "@/lib/utils";
import {
  Flame,
  Trophy,
  FolderGit2,
  Users,
  Globe,
  CheckCircle2,
  Calendar,
  Sparkles,
  Edit,
  UserPlus,
  UserCheck,
  Star,
  ExternalLink,
  Code,
  Layers,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

function ProfileContent({ params }: ProfilePageProps) {
  const resolvedParams = use(params);
  const username = decodeURIComponent(resolvedParams.username);
  const { user: currentUser, profile: currentProfile } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [collaborations, setCollaborations] = useState<Project[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"projects" | "collaborations" | "achievements" | "activity">("projects");

  const isOwnProfile = currentUser && (profile?.id === currentUser.id || profile?.username === currentProfile?.username);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();

        // 1. Fetch profile by username or id
        const { data: prof, error: profError } = await supabase
          .from("profiles")
          .select("*, user_roles(role)")
          .or(`username.eq.${username},id.eq.${username}`)
          .maybeSingle();

        if (profError || !prof) {
          setLoading(false);
          return;
        }

        setProfile(prof as Profile);

        // 2. Fetch projects created by this user
        const { data: userProjects } = await supabase
          .from("projects")
          .select("*, project_technologies(technologies(*))")
          .eq("creator_id", prof.id)
          .order("created_at", { ascending: false });

        setProjects((userProjects as unknown as Project[]) || []);

        // 3. Fetch collaborations (projects where this user is a member)
        const { data: userCollabs } = await supabase
          .from("project_members")
          .select("role, project:projects(*, project_technologies(technologies(*)))")
          .eq("user_id", prof.id);

        if (userCollabs) {
          const collabProjects = userCollabs.map((c: any) => ({
            ...c.project,
            member_role: c.role,
          }));
          setCollaborations(collabProjects);
        }

        // 4. Fetch achievements
        const { data: userAch } = await supabase
          .from("user_achievements")
          .select("unlocked_at, achievements(*)")
          .eq("user_id", prof.id);

        if (userAch) {
          const mappedAchievements = userAch.map((a: any) => ({
            ...a.achievements,
            unlocked_at: a.unlocked_at,
          }));
          setAchievements(mappedAchievements);
        }

        // 5. Fetch recent contributions
        const { data: userContributions } = await supabase
          .from("contributions")
          .select("*")
          .eq("user_id", prof.id)
          .order("created_at", { ascending: false })
          .limit(15);

        setContributions((userContributions as Contribution[]) || []);

        // 6. Check follow status & count
        const { count: fCount } = await supabase
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", prof.id);

        setFollowersCount(fCount || 0);

        if (currentUser && currentUser.id !== prof.id) {
          const { data: followData } = await supabase
            .from("user_follows")
            .select("follower_id")
            .eq("follower_id", currentUser.id)
            .eq("following_id", prof.id)
            .maybeSingle();

          setIsFollowing(!!followData);
        }
      } catch (err) {
        console.error("Error loading developer profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [username, currentUser, currentProfile]);

  const toggleFollow = async () => {
    if (!currentUser || !profile) return;
    const supabase = createClient();

    if (isFollowing) {
      await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", profile.id);
      setIsFollowing(false);
      setFollowersCount((prev) => Math.max(prev - 1, 0));
    } else {
      await supabase.from("user_follows").insert({
        follower_id: currentUser.id,
        following_id: profile.id,
      });
      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!profile) {
    notFound();
  }

  const completedProjectsCount = projects.filter((p) => p.status === "completed").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Suspended Alert */}
      {profile.is_suspended && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-3 text-xs text-red-700 dark:text-red-400">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>This member account is currently suspended by administrators.</span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          {/* Avatar & Core Bio */}
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-2xl font-bold uppercase overflow-hidden shadow-inner shrink-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.full_name?.[0]?.toUpperCase() || "D"
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  {profile.full_name}
                </h1>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  @{profile.username}
                </span>

                {/* Availability Badge */}
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                  {profile.current_availability?.replace(/_/g, " ")}
                </span>
              </div>

              {profile.department && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
                  {profile.department}
                </p>
              )}

              {profile.bio && (
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 max-w-2xl leading-relaxed">
                  {profile.bio}
                </p>
              )}

              {/* Social / Portfolio links */}
              <div className="flex items-center gap-3 mt-4">
                {profile.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition"
                    title="GitHub"
                  >
                    <GithubIcon className="w-4 h-4" />
                  </a>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition"
                    title="LinkedIn"
                  >
                    <LinkedinIcon className="w-4 h-4" />
                  </a>
                )}
                {profile.portfolio_url && (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition"
                    title="Personal Portfolio"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
                <span className="text-xs text-neutral-500 ml-2">
                  <strong className="text-neutral-800 dark:text-neutral-200">{followersCount}</strong> followers
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2 self-start md:self-center">
            {isOwnProfile ? (
              <Link
                href="/profile/edit"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Profile
              </Link>
            ) : currentUser ? (
              <button
                onClick={toggleFollow}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm ${
                  isFollowing
                    ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Follow Member
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <Flame className="w-4 h-4 fill-amber-500" />
              <span>Current Streak</span>
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
              {profile.current_streak} <span className="text-xs font-normal text-neutral-500">days</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-800">
            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 text-xs font-semibold">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Best Streak</span>
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
              {profile.longest_streak} <span className="text-xs font-normal text-neutral-500">days</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/30">
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
              <Trophy className="w-4 h-4" />
              <span>Total Points</span>
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
              {profile.total_points}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-800">
            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 text-xs font-semibold">
              <FolderGit2 className="w-4 h-4 text-indigo-500" />
              <span>Projects</span>
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
              {projects.length}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Completed</span>
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
              {completedProjectsCount}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/30">
            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 text-xs font-semibold">
              <Users className="w-4 h-4" />
              <span>Collaborations</span>
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
              {collaborations.length}
            </p>
          </div>
        </div>

        {/* Skills Offered & Needed */}
        {(profile.skills_offered?.length > 0 || profile.skills_needed?.length > 0) && (
          <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.skills_offered?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                  Skills Contributed
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills_offered.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.skills_needed?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                  Looking For Help In
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills_needed.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 mb-8">
        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition -mb-px ${
            activeTab === "projects"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          <span>Projects Showcase ({projects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("collaborations")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition -mb-px ${
            activeTab === "collaborations"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Collaborations ({collaborations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("achievements")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition -mb-px ${
            activeTab === "achievements"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Achievements ({achievements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition -mb-px ${
            activeTab === "activity"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Contribution History</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "projects" && (
        <div>
          {projects.length === 0 ? (
            <div className="text-center py-16 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <FolderGit2 className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">No projects showcased yet</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                {isOwnProfile
                  ? "Showcase your software projects, repositories, and live deployments to the community."
                  : "This member hasn't published any public projects yet."}
              </p>
              {isOwnProfile && (
                <Link
                  href="/projects/new"
                  className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  Create First Project
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
                >
                  {/* Cover Image */}
                  <div className="h-40 bg-neutral-100 dark:bg-neutral-800 relative overflow-hidden">
                    {project.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.cover_image}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <Code className="w-8 h-8" />
                      </div>
                    )}
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white">
                      {project.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
                        <Link href={`/projects/${project.slug}`} className="hover:text-indigo-600 transition">
                          {project.title}
                        </Link>
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                        {project.tagline}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          {project.average_rating ? Number(project.average_rating).toFixed(1) : "0.0"}
                        </span>
                        <span>{project.likes_count} likes</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {project.github_url && (
                          <a
                            href={project.github_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-neutral-900 dark:hover:text-white"
                          >
                            <GithubIcon className="w-4 h-4" />
                          </a>
                        )}
                        {project.live_url && (
                          <a
                            href={project.live_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-neutral-900 dark:hover:text-white"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "collaborations" && (
        <div>
          {collaborations.length === 0 ? (
            <div className="text-center py-16 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <Users className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">No active collaborations</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Explore the collaboration marketplace to join existing teams and contribute.
              </p>
              <Link
                href="/collaborate"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
              >
                Browse Collaboration Roles
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {collaborations.map((collab: any) => (
                <div
                  key={collab.id}
                  className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/projects/${collab.slug}`}
                        className="text-sm font-bold text-neutral-900 dark:text-white hover:text-indigo-600 transition"
                      >
                        {collab.title}
                      </Link>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                        {collab.member_role || "Contributor"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{collab.tagline}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "achievements" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {achievements.length === 0 ? (
            <div className="col-span-full text-center py-16 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <Sparkles className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">No badges unlocked yet</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Contribute, showcase projects, and maintain streaks to unlock community achievements.
              </p>
            </div>
          ) : (
            achievements.map((ach) => (
              <div
                key={ach.id}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">{ach.title}</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{ach.description}</p>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                    +{ach.points} pts &bull; Unlocked {formatDate(ach.unlocked_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "activity" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-4">
            Recent Qualifying Contributions
          </h3>
          {contributions.length === 0 ? (
            <p className="text-xs text-neutral-500">No verified contributions recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {contributions.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white capitalize">
                        {item.action_type.replace(/_/g, " ")}
                      </p>
                      <span className="text-[10px] text-neutral-400">
                        {formatDate(item.contribution_date)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    +{item.points_awarded} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage({ params }: ProfilePageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ProfileContent params={params} />
    </Suspense>
  );
}
