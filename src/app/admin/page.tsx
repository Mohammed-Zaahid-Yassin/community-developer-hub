"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  Profile,
  Project,
  ProjectNomination,
  Report,
  Announcement,
  UserRoleType,
} from "@/types/database";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  updateUserRoleAction,
  toggleUserSuspendedAction,
  toggleProjectFeaturedAction,
  reviewNominationAction,
  resolveReportAction,
  publishAnnouncementAction,
} from "@/lib/actions/admin";
import {
  Shield,
  Users,
  FolderGit2,
  Sparkles,
  Flag,
  Megaphone,
  History,
  TrendingUp,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Ban,
  Award,
  Trash2,
  Send,
} from "lucide-react";

function AdminConsoleContent() {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"analytics" | "members" | "projects" | "nominations" | "reports" | "announcements" | "audit">("analytics");

  // Data states
  const [stats, setStats] = useState({
    membersCount: 0,
    projectsCount: 0,
    completedProjects: 0,
    openCollaborations: 0,
    totalContributions: 0,
    pendingReports: 0,
  });

  const [members, setMembers] = useState<Profile[]>([]);
  const [searchMember, setSearchMember] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [nominations, setNominations] = useState<ProjectNomination[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Announcement form
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceContent, setAnnounceContent] = useState("");
  const [announcePinned, setAnnouncePinned] = useState(false);
  const [submittingAnnounce, setSubmittingAnnounce] = useState(false);

  // Status/feedback
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdminData() {
      if (!user || !isAdmin) return;
      const supabase = createClient();

      try {
        // Analytics Counts
        const [
          { count: mCount },
          { count: pCount },
          { count: compCount },
          { count: cCount },
          { count: contCount },
          { count: rCount },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("projects").select("*", { count: "exact", head: true }),
          supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "completed"),
          supabase.from("collaboration_opportunities").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("contributions").select("*", { count: "exact", head: true }),
          supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        ]);

        setStats({
          membersCount: mCount || 0,
          projectsCount: pCount || 0,
          completedProjects: compCount || 0,
          openCollaborations: cCount || 0,
          totalContributions: contCount || 0,
          pendingReports: rCount || 0,
        });

        // Members
        const { data: mList } = await supabase
          .from("profiles")
          .select("*, user_roles(role)")
          .order("created_at", { ascending: false })
          .limit(50);

        if (mList) {
          const mapped = mList.map((m: any) => ({
            ...m,
            role: m.user_roles?.[0]?.role || "member",
          }));
          setMembers(mapped);
        }

        // Projects
        const { data: pList } = await supabase
          .from("projects")
          .select("*, creator:profiles!projects_creator_id_fkey(*)")
          .order("created_at", { ascending: false })
          .limit(50);
        setProjects((pList as unknown as Project[]) || []);

        // Nominations
        const { data: nList } = await supabase
          .from("project_nominations")
          .select("*, project:projects(*), nominator:profiles(*)")
          .order("created_at", { ascending: false })
          .limit(30);
        setNominations((nList as unknown as ProjectNomination[]) || []);

        // Reports
        const { data: repList } = await supabase
          .from("reports")
          .select("*, reporter:profiles(*)")
          .order("created_at", { ascending: false })
          .limit(30);
        setReports((repList as unknown as Report[]) || []);

        // Announcements
        const { data: aList } = await supabase
          .from("announcements")
          .select("*, author:profiles(*)")
          .order("created_at", { ascending: false });
        setAnnouncements((aList as unknown as Announcement[]) || []);

        // Audit Logs
        const { data: audList } = await supabase
          .from("admin_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(40);
        setAuditLogs(audList || []);
      } catch (err) {
        console.error("Admin load error:", err);
      }
    }

    loadAdminData();
  }, [user, isAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <Shield className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Admin Access Restricted</h2>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm">
          You must be an authenticated administrator or super administrator to access this area.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold"
        >
          Return Home
        </button>
      </div>
    );
  }

  const handleRoleChange = async (memberId: string, newRole: UserRoleType) => {
    const res = await updateUserRoleAction(memberId, newRole);
    if (res.success) {
      setMembers(members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
      setMsg("User role updated successfully.");
      setTimeout(() => setMsg(null), 2500);
    }
  };

  const handleSuspendToggle = async (memberId: string, currentSuspended: boolean) => {
    const res = await toggleUserSuspendedAction(memberId, !currentSuspended);
    if (res.success) {
      setMembers(
        members.map((m) => (m.id === memberId ? { ...m, is_suspended: !currentSuspended } : m))
      );
      setMsg(`User ${!currentSuspended ? "suspended" : "reactivated"} successfully.`);
      setTimeout(() => setMsg(null), 2500);
    }
  };

  const handleToggleSpotlight = async (projectId: string, currentFeatured: boolean) => {
    const res = await toggleProjectFeaturedAction(projectId, !currentFeatured);
    if (res.success) {
      setProjects(
        projects.map((p) => (p.id === projectId ? { ...p, is_featured: !currentFeatured } : p))
      );
      setMsg(`Project ${!currentFeatured ? "featured in" : "removed from"} Spotlight.`);
      setTimeout(() => setMsg(null), 2500);
    }
  };

  const handleReviewNomination = async (nominationId: string, approve: boolean) => {
    const res = await reviewNominationAction(nominationId, approve);
    if (res.success) {
      setNominations(
        nominations.map((n) => (n.id === nominationId ? { ...n, status: approve ? "approved" : "rejected" } : n))
      );
      setMsg(`Nomination ${approve ? "approved" : "rejected"}.`);
      setTimeout(() => setMsg(null), 2500);
    }
  };

  const handleResolveReport = async (reportId: string, isDismiss: boolean) => {
    const res = await resolveReportAction(reportId, isDismiss ? "Dismissed as invalid" : "Content reviewed & resolved", isDismiss);
    if (res.success) {
      setReports(
        reports.map((r) => (r.id === reportId ? { ...r, status: isDismiss ? "dismissed" : "resolved" } : r))
      );
      setMsg("Report status updated.");
      setTimeout(() => setMsg(null), 2500);
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAnnounce(true);
    const res = await publishAnnouncementAction(announceTitle, announceContent, announcePinned);
    if (res.success && res.announcement) {
      setAnnouncements([res.announcement as Announcement, ...announcements]);
      setAnnounceTitle("");
      setAnnounceContent("");
      setAnnouncePinned(false);
      setMsg("Announcement published!");
      setTimeout(() => setMsg(null), 2500);
    }
    setSubmittingAnnounce(false);
  };

  const filteredMembers = members.filter((m) => {
    if (!searchMember.trim()) return true;
    const q = searchMember.toLowerCase();
    return m.username?.toLowerCase().includes(q) || m.full_name?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-amber-500" />
            Administration Console
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time platform analytics, member roles, content moderation, spotlight nominations, and system audit logs.
          </p>
        </div>
      </div>

      {msg && (
        <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200 dark:border-neutral-800 mb-8">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "analytics" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "members" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Members ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "projects" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5" />
          <span>Projects ({projects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("nominations")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "nominations" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Spotlight Nominations</span>
          {nominations.filter((n) => n.status === "pending").length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white">
              {nominations.filter((n) => n.status === "pending").length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "reports" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Content Reports</span>
          {stats.pendingReports > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white">
              {stats.pendingReports}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("announcements")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "announcements" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>Announcements</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "audit" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* TAB 1: ANALYTICS (REAL DATABASE NUMBERS) */}
      {activeTab === "analytics" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <span className="text-xs font-semibold text-neutral-500">Registered Members</span>
              <p className="text-2xl font-extrabold text-neutral-900 dark:text-white mt-1">
                {stats.membersCount}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <span className="text-xs font-semibold text-neutral-500">Projects Published</span>
              <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                {stats.projectsCount}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <span className="text-xs font-semibold text-neutral-500">Completed Projects</span>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.completedProjects}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <span className="text-xs font-semibold text-neutral-500">Open Collaborations</span>
              <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                {stats.openCollaborations}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <span className="text-xs font-semibold text-neutral-500">Qualifying Actions</span>
              <p className="text-2xl font-extrabold text-amber-500 mt-1">
                {stats.totalContributions}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <span className="text-xs font-semibold text-neutral-500">Pending Reports</span>
              <p className="text-2xl font-extrabold text-red-500 mt-1">
                {stats.pendingReports}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Infrastructure Status (Strict Zero-Cost Guarantee)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <span className="font-semibold block text-neutral-800 dark:text-neutral-200">Database Engine</span>
                <span className="text-neutral-500">Supabase Free PostgreSQL Tier (₹0.00)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <span className="font-semibold block text-neutral-800 dark:text-neutral-200">Frontend Hosting</span>
                <span className="text-neutral-500">Vercel Hobby Edge Tier (₹0.00)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <span className="font-semibold block text-neutral-800 dark:text-neutral-200">Graphics Synthesizer</span>
                <span className="text-neutral-500">Client-Side HTML5 Canvas (₹0.00)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBERS MANAGEMENT */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="max-w-md relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="Search member by username or name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs"
            />
          </div>

          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredMembers.map((m) => (
                <div key={m.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-neutral-200 text-neutral-700 font-bold flex items-center justify-center text-xs">
                      {m.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/profile/${m.username}`} className="text-xs font-bold text-neutral-900 dark:text-white hover:underline">
                          {m.full_name}
                        </Link>
                        {m.is_suspended && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950">
                            Suspended
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400">@{m.username} &bull; Joined {formatDate(m.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {/* Role Selector */}
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as UserRoleType)}
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium"
                    >
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                      <option value="lead">Lead</option>
                      <option value="admin">Admin</option>
                    </select>

                    {/* Suspend / Reactivate */}
                    <button
                      onClick={() => handleSuspendToggle(m.id, m.is_suspended)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        m.is_suspended
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-400"
                      }`}
                    >
                      {m.is_suspended ? "Reactivate" : "Suspend"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROJECTS MANAGEMENT */}
      {activeTab === "projects" && (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {projects.map((proj) => (
              <div key={proj.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/projects/${proj.slug}`} className="text-sm font-bold text-neutral-900 dark:text-white hover:text-indigo-600">
                      {proj.title}
                    </Link>
                    {proj.is_featured && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                        Spotlight
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    By {proj.creator?.full_name} &bull; {proj.category} &bull; {proj.likes_count} likes &bull; {Number(proj.average_rating || 0).toFixed(1)} rating
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSpotlight(proj.id, proj.is_featured)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      proj.is_featured
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-amber-50 hover:text-amber-700"
                    }`}
                  >
                    {proj.is_featured ? "Remove Spotlight" : "Feature in Spotlight"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SPOTLIGHT NOMINATIONS */}
      {activeTab === "nominations" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            {nominations.length === 0 ? (
              <p className="p-8 text-center text-xs text-neutral-400">No project nominations submitted yet.</p>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {nominations.map((nom) => (
                  <div key={nom.id} className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                          Project: <Link href={`/projects/${nom.project?.slug}`} className="text-indigo-600 underline">{nom.project?.title}</Link>
                        </h4>
                        <p className="text-[11px] text-neutral-400">
                          Nominated by @{nom.nominator?.username} &bull; {formatDate(nom.created_at)}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        nom.status === "approved" ? "bg-emerald-100 text-emerald-700" : nom.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {nom.status}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl">
                      &ldquo;{nom.reason}&rdquo;
                    </p>

                    {nom.status === "pending" && (
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          onClick={() => handleReviewNomination(nom.id, false)}
                          className="px-3.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleReviewNomination(nom.id, true)}
                          className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
                        >
                          Approve & Feature in Spotlight
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CONTENT REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            {reports.length === 0 ? (
              <p className="p-8 text-center text-xs text-neutral-400">No member reports pending review.</p>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {reports.map((rep) => (
                  <div key={rep.id} className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 capitalize">
                        {rep.content_type} Report: {rep.reason}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        rep.status === "resolved" ? "bg-emerald-100 text-emerald-700" : rep.status === "dismissed" ? "bg-neutral-100 text-neutral-600" : "bg-red-100 text-red-700"
                      }`}>
                        {rep.status}
                      </span>
                    </div>

                    {rep.details && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-300">
                        Details: {rep.details}
                      </p>
                    )}

                    <span className="text-[10px] text-neutral-400 block">
                      Reported by @{rep.reporter?.username} &bull; {formatRelativeTime(rep.created_at)}
                    </span>

                    {rep.status === "pending" && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                          onClick={() => handleResolveReport(rep.id, true)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-500 hover:bg-neutral-100"
                        >
                          Dismiss Invalid
                        </button>
                        <button
                          onClick={() => handleResolveReport(rep.id, false)}
                          className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                        >
                          Resolve & Log Action
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: ANNOUNCEMENTS */}
      {activeTab === "announcements" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-500" />
              Publish Announcement
            </h3>
            <form onSubmit={handlePublishAnnouncement} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  placeholder="e.g. Community Hackathon 2026 Announced!"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Announcement Content
                </label>
                <textarea
                  rows={4}
                  required
                  value={announceContent}
                  onChange={(e) => setAnnounceContent(e.target.value)}
                  placeholder="Details for all community members..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={announcePinned}
                  onChange={(e) => setAnnouncePinned(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="pinCheck" className="text-xs text-neutral-700 dark:text-neutral-300">
                  Pin to community top banner
                </label>
              </div>

              <button
                type="submit"
                disabled={submittingAnnounce}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
              >
                {submittingAnnounce ? "Publishing..." : "Broadcast Announcement"}
              </button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Active Announcements</h3>
            {announcements.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6">No announcements published yet.</p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">{a.title}</h4>
                    {a.is_pinned && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                        Pinned
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 whitespace-pre-line">{a.content}</p>
                  <span className="text-[10px] text-neutral-400 block pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    By {a.author?.full_name} &bull; {formatDate(a.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 font-bold text-xs uppercase tracking-wider text-neutral-500">
            Administrative Action History
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {auditLogs.length === 0 ? (
              <p className="p-8 text-center text-xs text-neutral-400">No audit log records found.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-white capitalize">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-neutral-400 ml-2">Target: {log.target_type} ({log.target_id})</span>
                  </div>
                  <span className="text-[11px] text-neutral-400">{formatRelativeTime(log.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <AdminConsoleContent />
    </Suspense>
  );
}
