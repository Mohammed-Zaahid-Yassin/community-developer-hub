"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createProjectAction, ProjectFormData } from "@/lib/actions/projects";
import { ProjectStatusType } from "@/types/database";
import {
  FolderPlus,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Video,
  Image as ImageIcon,
  Plus,
  X,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { GithubIcon } from "@/components/icons";

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

const POPULAR_TECH = [
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "Node.js",
  "Python",
  "PostgreSQL",
  "Supabase",
  "Docker",
  "PyTorch",
  "Rust",
  "Go",
  "GraphQL",
];

export default function NewProjectPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [status, setStatus] = useState<ProjectStatusType>("in_progress");
  const [coverImage, setCoverImage] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");

  // Technologies
  const [technologies, setTechnologies] = useState<string[]>(["Next.js", "TypeScript"]);
  const [newTech, setNewTech] = useState("");

  // Screenshots
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [newScreenshot, setNewScreenshot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    router.push("/auth/login?redirect=/projects/new");
    return null;
  }

  const addTech = (t?: string) => {
    const val = (t || newTech).trim();
    if (val && !technologies.includes(val)) {
      setTechnologies([...technologies, val]);
      setNewTech("");
    }
  };

  const removeTech = (t: string) => {
    setTechnologies(technologies.filter((item) => item !== t));
  };

  const addScreenshot = () => {
    const s = newScreenshot.trim();
    if (s && !screenshots.includes(s)) {
      setScreenshots([...screenshots, s]);
      setNewScreenshot("");
    }
  };

  const removeScreenshot = (url: string) => {
    setScreenshots(screenshots.filter((item) => item !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (technologies.length === 0) {
      setError("Please add at least one technology used in this project.");
      return;
    }

    setSubmitting(true);

    const payload: ProjectFormData = {
      title,
      tagline,
      description,
      category,
      status,
      coverImage: coverImage || undefined,
      githubUrl: githubUrl || undefined,
      liveUrl: liveUrl || undefined,
      demoVideoUrl: demoVideoUrl || undefined,
      technologies,
      screenshots,
    };

    const res = await createProjectAction(payload);

    if (!res.success) {
      setError(res.error || "Failed to create project.");
      setSubmitting(false);
      return;
    }

    router.push(`/projects/${res.slug}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Showcase a New Project
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Publish your software project, share live deployments, attract collaborators, and earn community points.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Project Info */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Project Details
          </h2>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SentinelAI — Autonomous Security Log Auditor"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Tagline (One-sentence summary) *
            </label>
            <input
              type="text"
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A high-performance Rust service that inspects distributed logs in real-time."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                Project Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatusType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="in_progress">In Progress</option>
                <option value="looking_for_collaborators">Looking for Collaborators</option>
                <option value="completed">Completed & Released</option>
                <option value="idea">Concept / Prototype Idea</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Detailed Description & Problem Statement (Markdown supported) *
            </label>
            <textarea
              rows={6}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the background problem, architectural design, technologies involved, challenges solved, and how other members can run or contribute to it..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Technologies Used */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Technology Stack *
          </h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTech}
              onChange={(e) => setNewTech(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTech();
                }
              }}
              placeholder="Type technology name (e.g. FastAPI, Tailwind, PyTorch) and press Enter"
              className="flex-1 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => addTech()}
              className="px-3.5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-neutral-400 mr-1">Popular:</span>
            {POPULAR_TECH.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => addTech(p)}
                className="px-2 py-0.5 rounded-md text-[11px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                + {p}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {technologies.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-800"
              >
                {tech}
                <button
                  type="button"
                  onClick={() => removeTech(tech)}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Media & Links */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Media & Repository Links
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                GitHub Repository URL
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <GithubIcon className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/user/project"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Live Deployment URL
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="url"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  placeholder="https://mycoolapp.vercel.app"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Cover Image URL
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Demo Video URL (YouTube, Vimeo, Loom)
              </label>
              <div className="relative">
                <Video className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="url"
                  value={demoVideoUrl}
                  onChange={(e) => setDemoVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Screenshots list */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Additional Screenshots / Architecture Diagrams
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={newScreenshot}
                onChange={(e) => setNewScreenshot(e.target.value)}
                placeholder="https://example.com/screenshot.png"
                className="flex-1 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={addScreenshot}
                className="px-3.5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {screenshots.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300"
                >
                  <span className="truncate max-w-[200px]">{s}</span>
                  <button
                    type="button"
                    onClick={() => removeScreenshot(s)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing Project...</span>
              </>
            ) : (
              <>
                <span>Publish Project (+50 pts)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

