"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  Project,
  ProjectRating,
  ProjectComment,
  CollaborationOpportunity,
} from "@/types/database";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  toggleLikeProjectAction,
  toggleBookmarkProjectAction,
  addProjectCommentAction,
} from "@/lib/actions/projects";
import {
  submitProjectRatingAction,
  submitProjectNominationAction,
  submitContentReportAction,
} from "@/lib/actions/ratings";
import {
  Heart,
  Bookmark,
  Share2,
  ExternalLink,
  Star,
  Users,
  MessageSquare,
  Sparkles,
  Award,
  Flag,
  FolderKanban,
  Edit,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Video,
  Layers,
} from "lucide-react";
import { GithubIcon } from "@/components/icons";

interface ProjectPageProps {
  params: Promise<{
    slug: string;
  }>;
}

function ProjectShowcaseContent({ params }: ProjectPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const slug = decodeURIComponent(resolvedParams.slug);
  const { user, profile } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [ratings, setRatings] = useState<ProjectRating[]>([]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [opportunities, setOpportunities] = useState<CollaborationOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  // Interaction states
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Review Form state
  const [technicalRating, setTechnicalRating] = useState(5);
  const [innovationRating, setInnovationRating] = useState(5);
  const [designRating, setDesignRating] = useState(5);
  const [documentationRating, setDocumentationRating] = useState(5);
  const [usefulnessRating, setUsefulnessRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Modals state
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [nominateReason, setNominateReason] = useState("");
  const [nominateSuccess, setNominateSuccess] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Inappropriate or abusive content");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadProjectDetails() {
      try {
        const supabase = createClient();

        // 1. Fetch project with creator, technologies, media, members
        const { data: proj, error } = await supabase
          .from("projects")
          .select(`
            *,
            creator:profiles!projects_creator_id_fkey(*),
            project_technologies(technologies(*)),
            project_media(*),
            project_members(role, profile:profiles(*))
          `)
          .eq("slug", slug)
          .maybeSingle();

        if (error || !proj) {
          setLoading(false);
          return;
        }

        // Map technologies
        const mappedTech = proj.project_technologies?.map((pt: any) => pt.technologies) || [];
        setProject({
          ...proj,
          technologies: mappedTech,
          media: proj.project_media || [],
          members: proj.project_members || [],
        } as unknown as Project);

        setLikesCount(proj.likes_count || 0);

        // 2. Check if current user liked / bookmarked
        if (user) {
          const [{ data: likeData }, { data: bookmarkData }] = await Promise.all([
            supabase
              .from("project_likes")
              .select("project_id")
              .eq("project_id", proj.id)
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("project_bookmarks")
              .select("project_id")
              .eq("project_id", proj.id)
              .eq("user_id", user.id)
              .maybeSingle(),
          ]);
          setIsLiked(!!likeData);
          setIsBookmarked(!!bookmarkData);
        }

        // 3. Fetch ratings & reviews
        const { data: revs } = await supabase
          .from("project_ratings")
          .select("*, author:profiles(*)")
          .eq("project_id", proj.id)
          .order("created_at", { ascending: false });

        setRatings((revs as unknown as ProjectRating[]) || []);

        // 4. Fetch comments
        const { data: comms } = await supabase
          .from("project_comments")
          .select("*, author:profiles(*)")
          .eq("project_id", proj.id)
          .order("created_at", { ascending: true });

        setComments((comms as unknown as ProjectComment[]) || []);

        // 5. Fetch open collaboration opportunities
        const { data: opps } = await supabase
          .from("collaboration_opportunities")
          .select("*")
          .eq("project_id", proj.id)
          .eq("status", "open");

        setOpportunities((opps as CollaborationOpportunity[]) || []);
      } catch (err) {
        console.error("Error loading project details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProjectDetails();
  }, [slug, user]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!project) {
    notFound();
  }

  const isOwner = user && project.creator_id === user.id;

  const handleLike = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/projects/${project.slug}`);
      return;
    }
    const prev = isLiked;
    setIsLiked(!prev);
    setLikesCount((c) => (prev ? c - 1 : c + 1));
    await toggleLikeProjectAction(project.id);
  };

  const handleBookmark = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/projects/${project.slug}`);
      return;
    }
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    await toggleBookmarkProjectAction(project.id);
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(`/auth/login?redirect=/projects/${project.slug}`);
      return;
    }
    if (!newComment.trim()) return;
    setSubmittingComment(true);

    const res = await addProjectCommentAction(project.id, newComment, replyParentId || undefined);
    if (res.success && res.comment) {
      setComments([...comments, res.comment as ProjectComment]);
      setNewComment("");
      setReplyParentId(null);
    }
    setSubmittingComment(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    setReviewSuccess(null);
    setSubmittingReview(true);

    const res = await submitProjectRatingAction({
      projectId: project.id,
      technicalRating,
      innovationRating,
      designRating,
      documentationRating,
      usefulnessRating,
      reviewText,
    });

    if (!res.success) {
      setReviewError(res.error || "Failed to submit review.");
    } else {
      setReviewSuccess("Your evaluation and review have been submitted successfully!");
      // reload ratings list
      const supabase = createClient();
      const { data: revs } = await supabase
        .from("project_ratings")
        .select("*, author:profiles(*)")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });
      setRatings((revs as unknown as ProjectRating[]) || []);
    }
    setSubmittingReview(false);
  };

  const handleNominate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await submitProjectNominationAction(project.id, nominateReason);
    if (res.success) {
      setNominateSuccess(true);
      setTimeout(() => {
        setShowNominateModal(false);
        setNominateSuccess(false);
        setNominateReason("");
      }, 1500);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await submitContentReportAction("project", project.id, reportReason, reportDetails);
    if (res.success) {
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportDetails("");
      }, 1500);
    }
  };

  // Group top-level comments and replies
  const rootComments = comments.filter((c) => !c.parent_id);
  const repliesMap = comments.reduce((acc, c) => {
    if (c.parent_id) {
      if (!acc[c.parent_id]) acc[c.parent_id] = [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {} as Record<string, ProjectComment[]>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Featured Spotlight Banner if active */}
      {project.is_featured && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Official Community Spotlight
              </span>
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                This project was selected by community leadership for outstanding craftsmanship and community utility.
              </p>
            </div>
          </div>
          <Link
            href="/spotlight"
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shrink-0 transition"
          >
            View Spotlight
          </Link>
        </div>
      )}

      {/* Main Project Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {project.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 capitalize">
                Status: {project.status.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-neutral-400">
                Published {formatDate(project.created_at)}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {project.title}
            </h1>

            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
              {project.tagline}
            </p>

            {/* Creator Attribution */}
            <div className="flex items-center gap-3 pt-2">
              <Link
                href={`/profile/${project.creator?.username || project.creator_id}`}
                className="flex items-center gap-2.5 group"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold overflow-hidden border border-indigo-200 dark:border-indigo-800">
                  {project.creator?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.creator.avatar_url}
                      alt={project.creator.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    project.creator?.full_name?.[0]?.toUpperCase() || "C"
                  )}
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {project.creator?.full_name || "Community Member"}
                  </span>
                  <span className="text-[11px] text-neutral-400 block -mt-0.5">
                    @{project.creator?.username}
                  </span>
                </div>
              </Link>

              {project.creator?.department && (
                <span className="text-xs text-neutral-400 pl-2 border-l border-neutral-200 dark:border-neutral-800">
                  {project.creator.department}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Like Button */}
            <button
              onClick={handleLike}
              disabled={!user}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                isLiked
                  ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400"
                  : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              }`}
              title={user ? "Appreciate Project" : "Sign in to like"}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
              <span>{likesCount}</span>
            </button>

            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              disabled={!user}
              className={`p-2 rounded-xl border transition ${
                isBookmarked
                  ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                  : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
              }`}
              title="Bookmark project"
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-indigo-600" : ""}`} />
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 transition"
              title="Copy share link"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? "Copied!" : "Share"}</span>
            </button>

            {/* Nominate for Spotlight */}
            {user && (
              <button
                onClick={() => setShowNominateModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100 transition"
                title="Nominate for Community Spotlight"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nominate</span>
              </button>
            )}

            {/* Report */}
            {user && !isOwner && (
              <button
                onClick={() => setShowReportModal(true)}
                className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:text-red-500 transition"
                title="Report inappropriate content"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Owner Actions */}
            {isOwner && (
              <Link
                href="/workspace"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Team Workspace</span>
              </Link>
            )}
          </div>
        </div>

        {/* Links Bar */}
        <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
          {project.github_url && (
            <a
              href={project.github_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
            >
              <GithubIcon className="w-4 h-4" />
              <span>View Repository</span>
            </a>
          )}

          {project.live_url && (
            <a
              href={project.live_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-xs font-semibold text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 hover:bg-indigo-100 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Live Deployment</span>
            </a>
          )}

          {project.demo_video_url && (
            <a
              href={project.demo_video_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 transition"
            >
              <Video className="w-4 h-4 text-red-500" />
              <span>Watch Demo</span>
            </a>
          )}

          {/* Rating Summary Indicator */}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-4 h-4 fill-amber-400" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {project.average_rating ? Number(project.average_rating).toFixed(1) : "0.0"}
              </span>
            </div>
            <span className="text-xs text-neutral-400">
              ({project.rating_count} community reviews)
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column Details & Media; Right Column Opportunities & Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Cover Media */}
          {project.cover_image && (
            <div className="rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm max-h-[440px] bg-neutral-100 dark:bg-neutral-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.cover_image}
                alt={project.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Description & Overview */}
          <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h2 className="text-base font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-4">
              Project Architecture & Overview
            </h2>
            <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-line font-sans">
              {project.description}
            </div>

            {/* Technologies */}
            <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                Technology Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {project.technologies?.map((tech) => (
                  <span
                    key={tech.id}
                    className="px-3 py-1 rounded-xl text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700"
                  >
                    {tech.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Screenshots Gallery */}
            {project.media && project.media.length > 0 && (
              <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
                  Screenshots & Diagrams
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {project.media.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={m.caption || "Screenshot"} className="w-full h-44 object-cover" />
                      {m.caption && (
                        <p className="p-2 text-[11px] text-neutral-500 text-center">{m.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Discussion Thread */}
          <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h2 className="text-base font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Community Discussion ({comments.length})
            </h2>

            {/* Comment Form */}
            {user ? (
              <form onSubmit={handleAddComment} className="mb-8 space-y-3">
                {replyParentId && (
                  <div className="flex items-center justify-between text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg">
                    <span>Replying to comment...</span>
                    <button
                      type="button"
                      onClick={() => setReplyParentId(null)}
                      className="text-red-500 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <div className="flex gap-3">
                  <textarea
                    rows={2}
                    required
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share feedback, ask architectural questions, or suggest enhancements..."
                    className="flex-1 px-3.5 py-2.5 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="self-end px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                  >
                    {submittingComment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Post</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mb-6 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 text-center text-xs text-neutral-500">
                <Link href="/auth/login" className="font-semibold text-indigo-600 dark:text-indigo-400 underline">
                  Sign In
                </Link>{" "}
                to participate in the project discussion.
              </div>
            )}

            {/* Comments List */}
            {rootComments.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-6">
                No comments yet. Be the first to share constructive feedback!
              </p>
            ) : (
              <div className="space-y-6">
                {rootComments.map((comm) => (
                  <div key={comm.id} className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold shrink-0">
                        {comm.author?.full_name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/profile/${comm.author?.username}`}
                            className="text-xs font-bold text-neutral-900 dark:text-white hover:underline"
                          >
                            {comm.author?.full_name}
                          </Link>
                          <span className="text-[10px] text-neutral-400">
                            {formatRelativeTime(comm.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1">
                          {comm.content}
                        </p>
                        {user && (
                          <button
                            onClick={() => setReplyParentId(comm.id)}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-1 inline-block"
                          >
                            Reply
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Replies */}
                    {repliesMap[comm.id]?.map((reply) => (
                      <div key={reply.id} className="ml-10 flex items-start gap-3 pt-2">
                        <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {reply.author?.full_name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/profile/${reply.author?.username}`}
                              className="text-xs font-bold text-neutral-900 dark:text-white hover:underline"
                            >
                              {reply.author?.full_name}
                            </Link>
                            <span className="text-[10px] text-neutral-400">
                              {formatRelativeTime(reply.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Collaborators, Open Roles, Ratings */}
        <div className="space-y-8">
          {/* Open Collaboration Roles */}
          {opportunities.length > 0 && (
            <div className="p-6 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Open Collaboration Roles
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                  {opportunities.length} Open
                </span>
              </div>

              <div className="space-y-3">
                {opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-indigo-100 dark:border-indigo-900/50 shadow-sm"
                  >
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                      {opp.role_needed}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-1">{opp.responsibilities}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {opp.required_skills?.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    {!isOwner && user && (
                      <Link
                        href={`/collaborate?apply=${opp.id}`}
                        className="mt-3 block text-center py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition"
                      >
                        Apply for this Role
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Roster */}
          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Project Team ({1 + (project.members?.length || 0)})
            </h3>

            {/* Creator */}
            <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
              <Link
                href={`/profile/${project.creator?.username}`}
                className="flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                  {project.creator?.full_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                    {project.creator?.full_name}
                  </span>
                  <span className="text-[10px] text-neutral-400">Project Creator</span>
                </div>
              </Link>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                Lead
              </span>
            </div>

            {/* Members */}
            {project.members?.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <Link
                  href={`/profile/${m.profile?.username}`}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-xs font-bold">
                    {m.profile?.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                      {m.profile?.full_name}
                    </span>
                    <span className="text-[10px] text-neutral-400">@{m.profile?.username}</span>
                  </div>
                </Link>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  {m.role}
                </span>
              </div>
            ))}
          </div>

          {/* Multi-Dimensional Ratings & Reviews */}
          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Community Evaluation
              </h3>
              <div className="mt-4 flex items-center gap-4">
                <div className="text-4xl font-extrabold text-neutral-900 dark:text-white">
                  {project.average_rating ? Number(project.average_rating).toFixed(1) : "0.0"}
                </div>
                <div>
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= Math.round(Number(project.average_rating || 0))
                            ? "fill-amber-400"
                            : "text-neutral-300 dark:text-neutral-700"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Based on {project.rating_count} community peer reviews
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Evaluation Form (Only if not owner and logged in) */}
            {user && !isOwner && (
              <form onSubmit={handleSubmitReview} className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                  Submit Structured Review (+20 pts)
                </h4>

                {reviewSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{reviewSuccess}</span>
                  </div>
                )}

                {reviewError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                )}

                {/* 5 Dimensions */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Technical Implementation:</span>
                    <select
                      value={technicalRating}
                      onChange={(e) => setTechnicalRating(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs bg-neutral-50 dark:bg-neutral-800"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} Stars
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Innovation & Creativity:</span>
                    <select
                      value={innovationRating}
                      onChange={(e) => setInnovationRating(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs bg-neutral-50 dark:bg-neutral-800"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} Stars
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Design & Usability:</span>
                    <select
                      value={designRating}
                      onChange={(e) => setDesignRating(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs bg-neutral-50 dark:bg-neutral-800"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} Stars
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Documentation & Clarity:</span>
                    <select
                      value={documentationRating}
                      onChange={(e) => setDocumentationRating(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs bg-neutral-50 dark:bg-neutral-800"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} Stars
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Practical Utility:</span>
                    <select
                      value={usefulnessRating}
                      onChange={(e) => setUsefulnessRating(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs bg-neutral-50 dark:bg-neutral-800"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} Stars
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Provide constructive feedback (40+ characters qualifies for daily streak & points)..."
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
                >
                  {submittingReview ? "Submitting Evaluation..." : "Submit Review"}
                </button>
              </form>
            )}

            {/* Existing Reviews List */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Recent Reviews</h4>
              {ratings.length === 0 ? (
                <p className="text-xs text-neutral-400">No written reviews yet.</p>
              ) : (
                ratings.map((rev) => (
                  <div key={rev.id} className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {rev.author?.full_name || "Community Reviewer"}
                      </span>
                      <div className="flex items-center text-amber-500 text-xs">
                        <Star className="w-3 h-3 fill-amber-400 mr-1" />
                        <span>{Number(rev.overall_rating).toFixed(1)}</span>
                      </div>
                    </div>
                    {rev.review_text && (
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                        {rev.review_text}
                      </p>
                    )}
                    <span className="text-[10px] text-neutral-400 block">
                      {formatDate(rev.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nomination Modal */}
      {showNominateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Nominate for Community Spotlight
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Outstanding nominated projects are reviewed by administrators and featured on the official community showcase and social channels.
            </p>

            {nominateSuccess ? (
              <div className="my-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Nomination successfully submitted to community leads!</span>
              </div>
            ) : (
              <form onSubmit={handleNominate} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Why does this project stand out? *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={nominateReason}
                    onChange={(e) => setNominateReason(e.target.value)}
                    placeholder="Highlight technical innovation, design polish, problem relevance, or community impact..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNominateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition"
                  >
                    Submit Nomination
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              Report Inappropriate Content
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Help maintain a constructive and respectful developer environment.
            </p>

            {reportSuccess ? (
              <div className="my-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Report received. Community moderators will review shortly.</span>
              </div>
            ) : (
              <form onSubmit={handleReport} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Reason
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                  >
                    <option value="Spam or fraudulent links">Spam or fraudulent links</option>
                    <option value="Plagiarism or uncredited code">Plagiarism or uncredited code</option>
                    <option value="Harassment or offensive language">Harassment or offensive language</option>
                    <option value="Malicious or deceptive content">Malicious or deceptive content</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide additional context or links..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectShowcasePage({ params }: ProjectPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ProjectShowcaseContent params={params} />
    </Suspense>
  );
}

