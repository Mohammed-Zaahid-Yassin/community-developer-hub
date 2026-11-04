"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { updateProjectAction, deleteProjectAction } from "@/lib/actions/projects";
import { ProjectStatusType } from "@/types/database";
import {
  FolderEdit,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  X,
  Plus,
} from "lucide-react";
import Link from "next/link";

interface EditProjectProps {
  params: Promise<{
    slug: string;
  }>;
}

const CATEGORIES = [
  "Web Applications",
  "Mobile Apps",
  "AI / Machine Learning",
  "Developer Tools & CLIs",
  "Cloud & DevOps",
  "IoT & Embedded Systems",
  "Cybersecurity",
  "Blockchain & Web3",
  "Games & Graphics",
  "Open Source Libraries",
];

function EditProjectContent({ params }: EditProjectProps) {
  const resolvedParams = use(params);
  const slug = decodeURIComponent(resolvedParams.slug);
  const router = useRouter();
  const { user } = useAuth();

  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [status, setStatus] = useState<ProjectStatusType>("in_progress");
  const [coverImage, setCoverImage] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadProject() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !data) {
        setError("Project not found.");
        setLoading(false);
        return;
      }

      setProjectId(data.id);
      setTitle(data.title);
      setTagline(data.tagline);
      setDescription(data.description);
      setCategory(data.category);
      setStatus(data.status);
      setCoverImage(data.cover_image || "");
      setGithubUrl(data.github_url || "");
      setLiveUrl(data.live_url || "");
      setDemoVideoUrl(data.demo_video_url || "");
      setLoading(false);
    }
    loadProject();
  }, [slug]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const res = await updateProjectAction(projectId, {
      title,
      tagline,
      description,
      category,
      status,
      coverImage,
      githubUrl,
      liveUrl,
      demoVideoUrl,
    });

    if (!res.success) {
      setError(res.error || "Failed to update project.");
      setSaving(false);
      return;
    }

    setSuccess("Project updated successfully!");
    setTimeout(() => {
      router.push(`/projects/${slug}`);
    }, 1200);
  };

  const handleDelete = async () => {
    if (!confirm("Are you certain you want to permanently delete this project? This action cannot be reversed.")) {
      return;
    }
    setDeleting(true);
    const res = await deleteProjectAction(projectId);
    if (res.success) {
      router.push("/projects");
    } else {
      setError(res.error || "Failed to delete project.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <Link
          href={`/projects/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Project Showcase</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
          <FolderEdit className="w-6 h-6 text-indigo-600" />
          Edit Project: {title}
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Project Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Tagline
            </label>
            <input
              type="text"
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatusType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
              >
                <option value="in_progress">In Progress</option>
                <option value="looking_for_collaborators">Looking for Collaborators</option>
                <option value="completed">Completed & Released</option>
                <option value="idea">Idea / Concept</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Description (Markdown supported)
            </label>
            <textarea
              rows={6}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-mono"
            />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
            Media & External Links
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                GitHub Repository URL
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Live Deployment URL
              </label>
              <input
                type="url"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Cover Image URL
              </label>
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Demo Video URL
              </label>
              <input
                type="url"
                value={demoVideoUrl}
                onChange={(e) => setDemoVideoUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? "Deleting..." : "Delete Project"}</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function EditProjectPage({ params }: EditProjectProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <EditProjectContent params={params} />
    </Suspense>
  );
}
