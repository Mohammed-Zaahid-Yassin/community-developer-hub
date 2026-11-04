"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  Project,
  ProjectTask,
  ProjectUpdate,
  ProjectMilestone,
  CollaborationRequest,
  TaskStatusType,
} from "@/types/database";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  reviewCollaborationRequestAction,
  createProjectUpdateAction,
  createProjectTaskAction,
  updateProjectTaskStatusAction,
  createProjectMilestoneAction,
  toggleMilestoneCompletedAction,
} from "@/lib/actions/collaboration";
import {
  FolderKanban,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  Flag,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
  UserCheck,
  UserX,
  Calendar,
  Sparkles,
} from "lucide-react";
import { GithubIcon } from "@/components/icons";

function TeamWorkspaceContent() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Workspace sub-tabs
  const [workspaceTab, setWorkspaceTab] = useState<"tasks" | "updates" | "milestones" | "applications" | "team">("tasks");

  // Project data states
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<CollaborationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [submittingTask, setSubmittingTask] = useState(false);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateContent, setUpdateContent] = useState("");
  const [updateVersion, setUpdateVersion] = useState("");
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [submittingMilestone, setSubmittingMilestone] = useState(false);

  // Review Application state
  const [reviewingReqId, setReviewingReqId] = useState<string | null>(null);
  const [rejectionFeedback, setRejectionFeedback] = useState("");

  // 1. Fetch user's projects (as creator or member)
  useEffect(() => {
    async function loadUserProjects() {
      if (!user) return;
      try {
        const supabase = createClient();

        // Owned projects
        const { data: owned } = await supabase
          .from("projects")
          .select(`
            *,
            creator:profiles!projects_creator_id_fkey(*),
            project_members(role, profile:profiles(*))
          `)
          .eq("creator_id", user.id);

        // Member projects
        const { data: memberCollabs } = await supabase
          .from("project_members")
          .select(`
            project:projects(
              *,
              creator:profiles!projects_creator_id_fkey(*),
              project_members(role, profile:profiles(*))
            )
          `)
          .eq("user_id", user.id);

        const memberProjects = memberCollabs?.map((m: any) => m.project) || [];
        const combined = [...(owned || []), ...memberProjects].filter(
          (p, idx, self) => idx === self.findIndex((o) => o?.id === p?.id)
        );

        setActiveProjects(combined as unknown as Project[]);
        if (combined.length > 0 && !selectedProjectId) {
          setSelectedProjectId(combined[0].id);
        }
      } catch (err) {
        console.error("Error loading workspace projects:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUserProjects();
  }, [user, selectedProjectId]);

  // 2. Fetch selected project workspace data
  useEffect(() => {
    async function loadWorkspaceData() {
      if (!selectedProjectId) return;
      const proj = activeProjects.find((p) => p.id === selectedProjectId);
      setSelectedProject(proj || null);

      try {
        const supabase = createClient();

        const [
          { data: tList },
          { data: uList },
          { data: mList },
          { data: rList },
        ] = await Promise.all([
          supabase
            .from("project_tasks")
            .select("*, assignee:profiles!project_tasks_assigned_to_fkey(*)")
            .eq("project_id", selectedProjectId)
            .order("created_at", { ascending: false }),
          supabase
            .from("project_updates")
            .select("*, author:profiles(*)")
            .eq("project_id", selectedProjectId)
            .order("created_at", { ascending: false }),
          supabase
            .from("project_milestones")
            .select("*")
            .eq("project_id", selectedProjectId)
            .order("target_date", { ascending: true, nullsFirst: false }),
          supabase
            .from("collaboration_requests")
            .select(`
              *,
              applicant:profiles(*),
              opportunity:collaboration_opportunities(*)
            `)
            .eq("project_id", selectedProjectId)
            .eq("status", "pending"),
        ]);

        setTasks((tList as unknown as ProjectTask[]) || []);
        setUpdates((uList as unknown as ProjectUpdate[]) || []);
        setMilestones((mList as unknown as ProjectMilestone[]) || []);
        setIncomingRequests((rList as unknown as CollaborationRequest[]) || []);
      } catch (err) {
        console.error("Error loading workspace details:", err);
      }
    }

    loadWorkspaceData();
  }, [selectedProjectId, activeProjects]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    router.push("/auth/login?redirect=/workspace");
    return null;
  }

  const isOwner = selectedProject && selectedProject.creator_id === user.id;

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setSubmittingTask(true);

    const res = await createProjectTaskAction(
      selectedProjectId,
      taskTitle,
      taskDescription,
      taskAssignee || undefined,
      taskDueDate || undefined
    );

    if (res.success && res.task) {
      setTasks([res.task as ProjectTask, ...tasks]);
      setShowTaskModal(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskAssignee("");
      setTaskDueDate("");
    }
    setSubmittingTask(false);
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatusType) => {
    await updateProjectTaskStatusAction(taskId, newStatus);
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
  };

  const handleCreateUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setSubmittingUpdate(true);

    const res = await createProjectUpdateAction(
      selectedProjectId,
      updateTitle,
      updateContent,
      updateVersion || undefined
    );

    if (res.success && res.update) {
      setUpdates([res.update as ProjectUpdate, ...updates]);
      setShowUpdateModal(false);
      setUpdateTitle("");
      setUpdateContent("");
      setUpdateVersion("");
    }
    setSubmittingUpdate(false);
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setSubmittingMilestone(true);

    const res = await createProjectMilestoneAction(
      selectedProjectId,
      milestoneTitle,
      "",
      milestoneDate || undefined
    );

    if (res.success && res.milestone) {
      setMilestones([...milestones, res.milestone as ProjectMilestone]);
      setShowMilestoneModal(false);
      setMilestoneTitle("");
      setMilestoneDate("");
    }
    setSubmittingMilestone(false);
  };

  const handleToggleMilestone = async (milestoneId: string, currentVal: boolean) => {
    await toggleMilestoneCompletedAction(milestoneId, !currentVal);
    setMilestones(
      milestones.map((m) => (m.id === milestoneId ? { ...m, is_completed: !currentVal } : m))
    );
  };

  const handleReviewApplication = async (requestId: string, status: "accepted" | "rejected") => {
    await reviewCollaborationRequestAction(requestId, status, rejectionFeedback);
    setIncomingRequests(incomingRequests.filter((r) => r.id !== requestId));
    setReviewingReqId(null);
    setRejectionFeedback("");
  };

  // Group tasks by Kanban column
  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const underReviewTasks = tasks.filter((t) => t.status === "under_review");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <FolderKanban className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Team Workspace
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Collaborative task board, genuine project progress logs, milestone tracker, and team recruitment review.
          </p>
        </div>

        {/* Project Selector */}
        {activeProjects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500">Active Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            >
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeProjects.length === 0 ? (
        <div className="text-center py-24 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <FolderKanban className="w-14 h-14 mx-auto text-neutral-400 mb-4" />
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            You don&#39;t have any active project teams yet
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
            Create your own project to launch a team workspace, or join an open opportunity in the collaboration marketplace.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/projects/new"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              Showcase a Project
            </Link>
            <Link
              href="/collaborate"
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              Find Collaboration Roles
            </Link>
          </div>
        </div>
      ) : (
        selectedProject && (
          <div>
            {/* Project Overview Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {selectedProject.category}
                  </span>
                  <span className="text-xs font-bold text-neutral-500">
                    Status: {selectedProject.status.replace(/_/g, " ")}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white mt-1">
                  {selectedProject.title}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{selectedProject.tagline}</p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/projects/${selectedProject.slug}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Public Showcase</span>
                </Link>
                {isOwner && (
                  <Link
                    href={`/projects/${selectedProject.slug}/edit`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold hover:bg-neutral-200 transition"
                  >
                    Edit Project
                  </Link>
                )}
              </div>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200 dark:border-neutral-800 mb-8">
              <button
                onClick={() => setWorkspaceTab("tasks")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                  workspaceTab === "tasks"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Task Board ({tasks.length})</span>
              </button>

              <button
                onClick={() => setWorkspaceTab("updates")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                  workspaceTab === "updates"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Project Updates ({updates.length})</span>
              </button>

              <button
                onClick={() => setWorkspaceTab("milestones")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                  workspaceTab === "milestones"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Milestones ({milestones.length})</span>
              </button>

              {isOwner && (
                <button
                  onClick={() => setWorkspaceTab("applications")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                    workspaceTab === "applications"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Applicant Review</span>
                  {incomingRequests.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white">
                      {incomingRequests.length}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setWorkspaceTab("team")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                  workspaceTab === "team"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team Roster ({1 + (selectedProject.members?.length || 0)})</span>
              </button>
            </div>

            {/* TAB 1: KANBAN TASK BOARD */}
            {workspaceTab === "tasks" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-xs text-neutral-500">
                    Assign and track tasks. Completing tasks earns verified points and contributes to daily coding streaks.
                  </p>
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* To Do */}
                  <div className="p-4 rounded-2xl bg-neutral-100/70 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                        To Do ({todoTasks.length})
                      </span>
                    </div>
                    {todoTasks.map((t) => (
                      <div key={t.id} className="p-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xs space-y-2">
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white">{t.title}</h4>
                        {t.description && <p className="text-[11px] text-neutral-500 line-clamp-2">{t.description}</p>}
                        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between text-[10px]">
                          <span className="text-neutral-400">{t.assignee?.username ? `@${t.assignee.username}` : "Unassigned"}</span>
                          <button
                            onClick={() => handleTaskStatusChange(t.id, "in_progress")}
                            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                          >
                            Start &rarr;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* In Progress */}
                  <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-200 dark:border-blue-900/40">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        In Progress ({inProgressTasks.length})
                      </span>
                    </div>
                    {inProgressTasks.map((t) => (
                      <div key={t.id} className="p-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-blue-100 dark:border-blue-900/40 shadow-xs space-y-2">
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white">{t.title}</h4>
                        {t.description && <p className="text-[11px] text-neutral-500 line-clamp-2">{t.description}</p>}
                        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between text-[10px]">
                          <span className="text-neutral-400">{t.assignee?.username ? `@${t.assignee.username}` : "Unassigned"}</span>
                          <button
                            onClick={() => handleTaskStatusChange(t.id, "under_review")}
                            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                          >
                            Submit Review &rarr;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Under Review */}
                  <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-900/40">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        Under Review ({underReviewTasks.length})
                      </span>
                    </div>
                    {underReviewTasks.map((t) => (
                      <div key={t.id} className="p-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-amber-100 dark:border-amber-900/40 shadow-xs space-y-2">
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white">{t.title}</h4>
                        {t.description && <p className="text-[11px] text-neutral-500 line-clamp-2">{t.description}</p>}
                        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between text-[10px]">
                          <span className="text-neutral-400">{t.assignee?.username ? `@${t.assignee.username}` : "Unassigned"}</span>
                          <button
                            onClick={() => handleTaskStatusChange(t.id, "completed")}
                            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                          >
                            Approve (+10 pts) &check;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Completed */}
                  <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200 dark:border-emerald-900/40">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Completed ({completedTasks.length})
                      </span>
                    </div>
                    {completedTasks.map((t) => (
                      <div key={t.id} className="p-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-emerald-100 dark:border-emerald-900/40 shadow-xs space-y-1">
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white line-through opacity-75">{t.title}</h4>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                          Verified Complete &bull; Streak counted
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PROJECT UPDATES */}
            {workspaceTab === "updates" && (
              <div className="max-w-3xl space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Project Updates Feed
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Publishing genuine technical updates awards +15 points and validates your daily streak.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowUpdateModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Publish Update (+15 pts)</span>
                  </button>
                </div>

                {updates.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-8 text-center">
                    No project updates published yet.
                  </p>
                ) : (
                  updates.map((u) => (
                    <div
                      key={u.id}
                      className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                            {u.title}
                          </h4>
                          {u.version_tag && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                              {u.version_tag}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-400">
                          {formatRelativeTime(u.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
                        {u.content}
                      </p>

                      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 text-xs text-neutral-400">
                        <span>Posted by @{u.author?.username}</span>
                        <span>&bull;</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          +15 pts awarded
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: MILESTONES */}
            {workspaceTab === "milestones" && (
              <div className="max-w-3xl space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Project Milestones
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Track delivery targets and architectural release goals.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMilestoneModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Milestone</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {milestones.length === 0 ? (
                    <p className="text-xs text-neutral-400 py-8 text-center">
                      No milestones set for this project yet.
                    </p>
                  ) : (
                    milestones.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleMilestone(m.id, m.is_completed)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                              m.is_completed
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-neutral-300 dark:border-neutral-700 hover:border-indigo-500"
                            }`}
                          >
                            {m.is_completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                          <div>
                            <span
                              className={`text-xs font-semibold text-neutral-900 dark:text-white ${
                                m.is_completed ? "line-through opacity-70" : ""
                              }`}
                            >
                              {m.title}
                            </span>
                            {m.target_date && (
                              <p className="text-[10px] text-neutral-400">
                                Target Date: {formatDate(m.target_date)}
                              </p>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            m.is_completed
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                        >
                          {m.is_completed ? "Achieved" : "In Progress"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: APPLICANT REVIEW (Owner only) */}
            {workspaceTab === "applications" && isOwner && (
              <div className="max-w-4xl space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Pending Collaboration Applications ({incomingRequests.length})
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Review community member applications for open roles on this project.
                  </p>
                </div>

                {incomingRequests.length === 0 ? (
                  <div className="p-8 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <p className="text-xs text-neutral-400">No pending applications at this time.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incomingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <Link
                            href={`/profile/${req.applicant?.username}`}
                            className="flex items-center gap-3 group"
                          >
                            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                              {req.applicant?.full_name?.[0]?.toUpperCase() || "A"}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 transition">
                                {req.applicant?.full_name}
                              </h4>
                              <p className="text-[11px] text-neutral-400">
                                @{req.applicant?.username} &bull; Applied for:{" "}
                                <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                  {req.opportunity?.role_needed}
                                </strong>
                              </p>
                            </div>
                          </Link>
                          <span className="text-[10px] text-neutral-400">
                            {formatRelativeTime(req.created_at)}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-700 dark:text-neutral-300">
                          {req.message}
                        </div>

                        {req.portfolio_links && req.portfolio_links.length > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-neutral-400">Attachment:</span>
                            {req.portfolio_links.map((link, idx) => (
                              <a
                                key={idx}
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 dark:text-indigo-400 font-semibold underline truncate max-w-xs"
                              >
                                {link}
                              </a>
                            ))}
                          </div>
                        )}

                        {reviewingReqId === req.id ? (
                          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                            <input
                              type="text"
                              value={rejectionFeedback}
                              onChange={(e) => setRejectionFeedback(e.target.value)}
                              placeholder="Optional feedback note to member..."
                              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs bg-neutral-50 dark:bg-neutral-800"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setReviewingReqId(null)}
                                className="px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-500"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleReviewApplication(req.id, "rejected")}
                                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                              >
                                Confirm Rejection
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
                            <button
                              onClick={() => setReviewingReqId(req.id)}
                              className="px-3.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleReviewApplication(req.id, "accepted")}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
                            >
                              Accept to Team
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: TEAM ROSTER */}
            {workspaceTab === "team" && (
              <div className="max-w-3xl space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-2">
                  Project Team Members
                </h3>

                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
                  <Link
                    href={`/profile/${selectedProject.creator?.username}`}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {selectedProject.creator?.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                        {selectedProject.creator?.full_name}
                      </h4>
                      <p className="text-[11px] text-neutral-400">@{selectedProject.creator?.username}</p>
                    </div>
                  </Link>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    Project Lead
                  </span>
                </div>

                {selectedProject.members?.map((m: any) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between"
                  >
                    <Link
                      href={`/profile/${m.profile?.username}`}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-700 font-bold flex items-center justify-center text-xs">
                        {m.profile?.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                          {m.profile?.full_name}
                        </h4>
                        <p className="text-[11px] text-neutral-400">@{m.profile?.username}</p>
                      </div>
                    </Link>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Add Project Task
            </h3>
            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Implement OAuth login provider"
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Details, acceptance criteria, or branch names..."
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Assignee
                  </label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                  >
                    <option value="">Unassigned</option>
                    {selectedProject && (
                      <option value={selectedProject.creator_id}>
                        {selectedProject.creator?.full_name} (Lead)
                      </option>
                    )}
                    {selectedProject?.members?.map((m: any) => (
                      <option key={m.profile?.id} value={m.profile?.id}>
                        {m.profile?.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  {submittingTask ? "Adding..." : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Creation Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Publish Project Update (+15 pts)
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Genuine updates increment your daily contribution streak.
            </p>
            <form onSubmit={handleCreateUpdate} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Update Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={updateTitle}
                    onChange={(e) => setUpdateTitle(e.target.value)}
                    placeholder="e.g. Migrated database to PostgreSQL & added caching"
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Version Tag
                  </label>
                  <input
                    type="text"
                    value={updateVersion}
                    onChange={(e) => setUpdateVersion(e.target.value)}
                    placeholder="v1.2.0"
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Update Content *
                </label>
                <textarea
                  rows={4}
                  required
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  placeholder="Detail what technical achievements were unlocked, bugs solved, or features shipped..."
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUpdate}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  {submittingUpdate ? "Publishing..." : "Publish (+15 pts)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Milestone Modal */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-indigo-600" />
              Add Milestone Target
            </h3>
            <form onSubmit={handleCreateMilestone} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Milestone Title *
                </label>
                <input
                  type="text"
                  required
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. Beta Release 1.0"
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Target Date
                </label>
                <input
                  type="date"
                  value={milestoneDate}
                  onChange={(e) => setMilestoneDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMilestone}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  {submittingMilestone ? "Saving..." : "Add Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <TeamWorkspaceContent />
    </Suspense>
  );
}

