"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { CollaborationOpportunity, CollaborationRequest, Project } from "@/types/database";
import { formatDate } from "@/lib/utils";
import {
  submitCollaborationRequestAction,
  withdrawCollaborationRequestAction,
  createOpportunityAction,
} from "@/lib/actions/collaboration";
import {
  Users,
  Search,
  Filter,
  PlusCircle,
  Clock,
  Sparkles,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  MapPin,
  FolderKanban,
  Award,
} from "lucide-react";

function CollaborateMarketplaceContent() {
  const searchParams = useSearchParams();
  const applyParam = searchParams.get("apply");

  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<"opportunities" | "my_applications">("opportunities");
  const [opportunities, setOpportunities] = useState<CollaborationOpportunity[]>([]);
  const [myApplications, setMyApplications] = useState<CollaborationRequest[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [searchSkill, setSearchSkill] = useState("");
  const [loading, setLoading] = useState(true);

  // Apply Modal state
  const [selectedOpp, setSelectedOpp] = useState<CollaborationOpportunity | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [applyPortfolioLink, setApplyPortfolioLink] = useState("");
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Post Role Modal state
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedProjectForPost, setSelectedProjectForPost] = useState("");
  const [postRoleNeeded, setPostRoleNeeded] = useState("");
  const [postSkills, setPostSkills] = useState("");
  const [postPositions, setPostPositions] = useState(1);
  const [postResponsibilities, setPostResponsibilities] = useState("");
  const [postTimeCommitment, setPostTimeCommitment] = useState("5-10 hours/week");
  const [postLocation, setPostLocation] = useState<"remote" | "hybrid" | "in_person">("remote");
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOpportunities() {
      setLoading(true);
      try {
        const supabase = createClient();

        // 1. Fetch open opportunities with project details
        const { data: opps } = await supabase
          .from("collaboration_opportunities")
          .select(`
            *,
            project:projects(id, creator_id, title, slug, category, cover_image)
          `)
          .eq("status", "open")
          .order("created_at", { ascending: false });

        setOpportunities((opps as CollaborationOpportunity[]) || []);

        // If apply query param is set, pre-select opportunity
        if (applyParam && opps) {
          const match = (opps as CollaborationOpportunity[]).find((o) => o.id === applyParam);
          if (match) setSelectedOpp(match);
        }

        // 2. If user is logged in, fetch their applications
        if (user) {
          const { data: apps } = await supabase
            .from("collaboration_requests")
            .select(`
              *,
              opportunity:collaboration_opportunities(*),
              project:projects(id, title, slug, cover_image)
            `)
            .eq("applicant_id", user.id)
            .order("created_at", { ascending: false });

          setMyApplications((apps as unknown as CollaborationRequest[]) || []);

          // Also fetch projects user owns (for posting opportunities)
          const { data: projs } = await supabase
            .from("projects")
            .select("id, title")
            .eq("creator_id", user.id);

          setUserProjects((projs as Project[]) || []);
          if (projs && projs.length > 0) {
            setSelectedProjectForPost(projs[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading collaboration marketplace:", err);
      } finally {
        setLoading(false);
      }
    }

    loadOpportunities();
  }, [user, applyParam]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp) return;
    setSubmittingApply(true);
    setApplyError(null);

    const portfolioLinks = applyPortfolioLink.trim() ? [applyPortfolioLink.trim()] : [];
    const res = await submitCollaborationRequestAction(selectedOpp.id, applyMessage, portfolioLinks);

    if (!res.success) {
      setApplyError(res.error || "Failed to submit application.");
    } else {
      setApplySuccess(true);
      setTimeout(() => {
        setSelectedOpp(null);
        setApplySuccess(false);
        setApplyMessage("");
        setApplyPortfolioLink("");
      }, 1500);
    }
    setSubmittingApply(false);
  };

  const handleWithdraw = async (requestId: string) => {
    if (!confirm("Are you sure you want to withdraw your application?")) return;
    await withdrawCollaborationRequestAction(requestId);
    setMyApplications((apps) =>
      apps.map((a) => (a.id === requestId ? { ...a, status: "withdrawn" } : a))
    );
  };

  const handlePostOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError(null);
    setSubmittingPost(true);

    const skillsArray = postSkills
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (skillsArray.length === 0) {
      setPostError("Please provide at least one required skill.");
      setSubmittingPost(false);
      return;
    }

    const res = await createOpportunityAction({
      projectId: selectedProjectForPost,
      roleNeeded: postRoleNeeded,
      requiredSkills: skillsArray,
      positionsOpen: postPositions,
      responsibilities: postResponsibilities,
      timeCommitment: postTimeCommitment,
      locationType: postLocation,
    });

    if (!res.success) {
      setPostError(res.error || "Failed to post opportunity.");
    } else {
      setShowPostModal(false);
      // reload
      const supabase = createClient();
      const { data: opps } = await supabase
        .from("collaboration_opportunities")
        .select(`
          *,
          project:projects(id, creator_id, title, slug, category, cover_image)
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      setOpportunities((opps as CollaborationOpportunity[]) || []);
    }
    setSubmittingPost(false);
  };

  // Filter opportunities by skill search
  const filteredOpps = opportunities.filter((opp) => {
    if (!searchSkill.trim()) return true;
    const q = searchSkill.toLowerCase();
    return (
      opp.role_needed.toLowerCase().includes(q) ||
      opp.responsibilities.toLowerCase().includes(q) ||
      opp.required_skills?.some((s) => s.toLowerCase().includes(q)) ||
      opp.project?.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Collaboration Marketplace
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Find projects that need your exact technical skills, or recruit teammates for your own software build.
          </p>
        </div>

        {user && userProjects.length > 0 && (
          <button
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Recruit for Your Project</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-neutral-200 dark:border-neutral-800 mb-8">
        <button
          onClick={() => setActiveTab("opportunities")}
          className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition -mb-px ${
            activeTab === "opportunities"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Open Opportunities ({opportunities.length})</span>
        </button>

        {user && (
          <button
            onClick={() => setActiveTab("my_applications")}
            className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition -mb-px ${
              activeTab === "my_applications"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>My Applications ({myApplications.length})</span>
          </button>
        )}
      </div>

      {activeTab === "opportunities" ? (
        <div>
          {/* Search Filter */}
          <div className="mb-8 relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchSkill}
              onChange={(e) => setSearchSkill(e.target.value)}
              placeholder="Filter by skill (e.g. Next.js, Rust, Docker)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              <p className="text-xs text-neutral-400">Loading opportunities...</p>
            </div>
          ) : filteredOpps.length === 0 ? (
            <div className="text-center py-20 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <Users className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                No open roles found
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                No projects are currently recruiting for the selected skill filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOpps.map((opp) => {
                // Smart Match calculation
                const userOffered = profile?.skills_offered || [];
                const matchingSkills = opp.required_skills?.filter((s) =>
                  userOffered.some((u) => u.toLowerCase() === s.toLowerCase())
                );
                const isMatch = matchingSkills && matchingSkills.length > 0;
                const isCreator = user && opp.project?.creator_id === user.id;

                return (
                  <div
                    key={opp.id}
                    className={`rounded-3xl bg-white dark:bg-neutral-900 border p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                      isMatch
                        ? "border-indigo-400/80 dark:border-indigo-600/60 ring-1 ring-indigo-500/20"
                        : "border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {opp.project?.category || "Project Role"}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="capitalize">{opp.location_type}</span>
                        </div>
                      </div>

                      {/* Smart Match Indicator */}
                      {isMatch && (
                        <div className="mb-3 px-2.5 py-1 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>
                            <strong>Smart Match:</strong> You offer {matchingSkills.length} of {opp.required_skills.length} skills!
                          </span>
                        </div>
                      )}

                      <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                        {opp.role_needed}
                      </h3>

                      <p className="text-xs text-neutral-500 mt-1">
                        For project:{" "}
                        <Link
                          href={`/projects/${opp.project?.slug}`}
                          className="font-semibold text-neutral-800 dark:text-neutral-200 hover:text-indigo-600 underline"
                        >
                          {opp.project?.title}
                        </Link>
                      </p>

                      <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-3 line-clamp-3 leading-relaxed">
                        {opp.responsibilities}
                      </p>

                      {/* Required skills */}
                      <div className="flex flex-wrap gap-1 mt-4">
                        {opp.required_skills?.map((skill) => {
                          const isSkillMatched = userOffered.some(
                            (u) => u.toLowerCase() === skill.toLowerCase()
                          );
                          return (
                            <span
                              key={skill}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                                isSkillMatched
                                  ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700"
                                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                              }`}
                            >
                              {skill}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{opp.time_commitment}</span>
                      </div>

                      {isCreator ? (
                        <span className="text-[11px] font-semibold text-neutral-400">
                          Your Project Role
                        </span>
                      ) : user ? (
                        <button
                          onClick={() => setSelectedOpp(opp)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
                        >
                          Apply to Join
                        </button>
                      ) : (
                        <Link
                          href={`/auth/login?redirect=/collaborate`}
                          className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-200 transition"
                        >
                          Sign In to Apply
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* My Applications Tab */
        <div className="space-y-4 max-w-4xl">
          {myApplications.length === 0 ? (
            <div className="text-center py-16 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <Send className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                No active applications
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Explore the open opportunities tab and apply to collaborate with fellow community developers.
              </p>
            </div>
          ) : (
            myApplications.map((app) => (
              <div
                key={app.id}
                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {app.opportunity?.role_needed}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        app.status === "accepted"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : app.status === "rejected"
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : app.status === "withdrawn"
                          ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-500 mt-0.5">
                    Project:{" "}
                    <Link
                      href={`/projects/${app.project?.slug}`}
                      className="font-semibold text-neutral-800 dark:text-neutral-200 hover:underline"
                    >
                      {app.project?.title}
                    </Link>{" "}
                    &bull; Applied {formatDate(app.created_at)}
                  </p>

                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-xl">
                    &ldquo;{app.message}&rdquo;
                  </p>

                  {app.feedback && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                      <strong>Lead Note:</strong> {app.feedback}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {app.status === "accepted" && (
                    <Link
                      href="/workspace"
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                    >
                      Open Workspace
                    </Link>
                  )}

                  {app.status === "pending" && (
                    <button
                      onClick={() => handleWithdraw(app.id)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 hover:text-red-600 text-xs text-neutral-600 dark:text-neutral-300 font-medium transition"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Apply to Join Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Apply for: {selectedOpp.role_needed}
                </h3>
                <p className="text-xs text-neutral-500">
                  Project: {selectedOpp.project?.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedOpp(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applySuccess ? (
              <div className="my-8 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Application submitted to the project creator! Check your notifications for status updates.</span>
              </div>
            ) : (
              <form onSubmit={handleApply} className="mt-4 space-y-4">
                {applyError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{applyError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Why are you a good fit for this role? (Explain relevant experience) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={applyMessage}
                    onChange={(e) => setApplyMessage(e.target.value)}
                    placeholder="Describe your background with the required technologies, past projects, and how many hours you can commit..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Portfolio or Relevant Project Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={applyPortfolioLink}
                    onChange={(e) => setApplyPortfolioLink(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOpp(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingApply}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
                  >
                    {submittingApply ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Application</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Post Role Modal (Project Owner) */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                Post Collaboration Opportunity
              </h3>
              <button
                onClick={() => setShowPostModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostOpportunity} className="mt-4 space-y-4">
              {postError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{postError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Select Project *
                </label>
                <select
                  value={selectedProjectForPost}
                  onChange={(e) => setSelectedProjectForPost(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                >
                  {userProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Role Needed *
                  </label>
                  <input
                    type="text"
                    required
                    value={postRoleNeeded}
                    onChange={(e) => setPostRoleNeeded(e.target.value)}
                    placeholder="e.g. Frontend Developer"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Positions Available
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={postPositions}
                    onChange={(e) => setPostPositions(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Required Skills (Comma separated) *
                </label>
                <input
                  type="text"
                  required
                  value={postSkills}
                  onChange={(e) => setPostSkills(e.target.value)}
                  placeholder="React, Tailwind CSS, TypeScript"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Time Commitment
                  </label>
                  <input
                    type="text"
                    value={postTimeCommitment}
                    onChange={(e) => setPostTimeCommitment(e.target.value)}
                    placeholder="e.g. 5-10 hours/week"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Location Preference
                  </label>
                  <select
                    value={postLocation}
                    onChange={(e) => setPostLocation(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="in_person">In-Person</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Responsibilities & Expectations *
                </label>
                <textarea
                  rows={3}
                  required
                  value={postResponsibilities}
                  onChange={(e) => setPostResponsibilities(e.target.value)}
                  placeholder="Explain what the collaborator will build and what part of the stack they will lead..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
                >
                  {submittingPost ? "Publishing..." : "Publish Opportunity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CollaboratePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <CollaborateMarketplaceContent />
    </Suspense>
  );
}

