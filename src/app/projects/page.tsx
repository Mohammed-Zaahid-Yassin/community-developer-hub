"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Project, Technology } from "@/types/database";
import {
  Compass,
  Search,
  Filter,
  Flame,
  Star,
  Clock,
  Sparkles,
  Users,
  Code,
  Heart,
  ExternalLink,
  PlusCircle,
  Loader2,
  X,
} from "lucide-react";
import { GithubIcon } from "@/components/icons";

const CATEGORIES = [
  "All Categories",
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

function ProjectsExplorer() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "All Categories";
  const initialTab = searchParams.get("tab") || "trending";

  const [activeTab, setActiveTab] = useState<"trending" | "latest" | "highest_rated" | "featured" | "collaborators">(
    initialTab as any
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedTech, setSelectedTech] = useState<string>("All");
  const [technologiesList, setTechnologiesList] = useState<Technology[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch available technologies
  useEffect(() => {
    async function loadTech() {
      const supabase = createClient();
      const { data } = await supabase.from("technologies").select("*").order("name");
      if (data) setTechnologiesList(data);
    }
    loadTech();
  }, []);

  // Fetch projects with tab & filters
  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      try {
        const supabase = createClient();

        let query = supabase
          .from("projects")
          .select(`
            *,
            creator:profiles!projects_creator_id_fkey(*),
            project_technologies(technologies(*))
          `)
          .eq("is_approved", true);

        // Filter by category
        if (selectedCategory !== "All Categories") {
          query = query.eq("category", selectedCategory);
        }

        // Tab filters and ordering
        if (activeTab === "featured") {
          query = query.eq("is_featured", true).order("featured_at", { ascending: false, nullsFirst: false });
        } else if (activeTab === "collaborators") {
          query = query.eq("status", "looking_for_collaborators").order("updated_at", { ascending: false });
        } else if (activeTab === "highest_rated") {
          query = query.order("average_rating", { ascending: false }).order("rating_count", { ascending: false });
        } else if (activeTab === "latest") {
          query = query.order("created_at", { ascending: false });
        } else {
          // Trending: highest engagement
          query = query.order("likes_count", { ascending: false }).order("comments_count", { ascending: false });
        }

        // Pagination limit
        query = query.limit(24);

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching projects:", error);
          setProjects([]);
        } else if (data) {
          let mapped = data.map((p: any) => ({
            ...p,
            technologies: p.project_technologies?.map((pt: any) => pt.technologies) || [],
          }));

          // Client-side tech filter & text search if entered
          if (selectedTech !== "All") {
            mapped = mapped.filter((p: any) =>
              p.technologies?.some((t: any) => t?.slug === selectedTech || t?.name === selectedTech)
            );
          }

          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            mapped = mapped.filter(
              (p: any) =>
                p.title.toLowerCase().includes(q) ||
                p.tagline.toLowerCase().includes(q) ||
                p.creator?.full_name?.toLowerCase().includes(q) ||
                p.technologies?.some((t: any) => t?.name?.toLowerCase().includes(q))
            );
          }

          setProjects(mapped as unknown as Project[]);
        }
      } catch (err) {
        console.error("Fetch projects error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [activeTab, selectedCategory, selectedTech, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Compass className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Explore Community Projects
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Discover software, tools, and repositories created by fellow developers in our network.
          </p>
        </div>

        <Link
          href="/projects/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Showcase Project</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200 dark:border-neutral-800 mb-6">
        <button
          onClick={() => setActiveTab("trending")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "trending"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Trending</span>
        </button>

        <button
          onClick={() => setActiveTab("latest")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "latest"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Latest</span>
        </button>

        <button
          onClick={() => setActiveTab("highest_rated")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "highest_rated"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>Highest Rated</span>
        </button>

        <button
          onClick={() => setActiveTab("featured")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "featured"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Spotlight Featured</span>
        </button>

        <button
          onClick={() => setActiveTab("collaborators")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "collaborators"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Looking for Collaborators</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {/* Search Input */}
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title, tech stack, or creator..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Technology Filter */}
        <div>
          <select
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="All">All Technologies</option>
            {technologiesList.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          <p className="text-xs text-neutral-400">Discovering community projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <Code className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            No projects matched your criteria
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search terms or clearing the selected technology and category filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All Categories");
              setSelectedTech("All");
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs font-semibold transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800/90 overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Cover Image */}
                <Link href={`/projects/${project.slug}`} className="block h-44 bg-neutral-100 dark:bg-neutral-800 relative overflow-hidden">
                  {project.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.cover_image}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <Code className="w-10 h-10" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white">
                      {project.status.replace(/_/g, " ")}
                    </span>
                    {project.is_featured && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-sm flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        Spotlight
                      </span>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="p-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {project.category}
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    <Link href={`/projects/${project.slug}`}>{project.title}</Link>
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {project.tagline}
                  </p>

                  {/* Tech stack pills */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {project.technologies?.slice(0, 4).map((tech) => (
                      <span
                        key={tech.id}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                      >
                        {tech.name}
                      </span>
                    ))}
                    {(project.technologies?.length || 0) > 4 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                        +{(project.technologies?.length || 0) - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer: Creator info, rating, likes */}
              <div className="px-5 py-3.5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between text-xs text-neutral-500">
                <Link
                  href={`/profile/${project.creator?.username || project.creator_id}`}
                  className="flex items-center gap-2 hover:text-indigo-600 transition"
                >
                  <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                    {project.creator?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      project.creator?.full_name?.[0]?.toUpperCase() || "D"
                    )}
                  </div>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[100px]">
                    {project.creator?.username}
                  </span>
                </Link>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-neutral-800 dark:text-neutral-200">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    {project.average_rating ? Number(project.average_rating).toFixed(1) : "0.0"}
                  </span>
                  <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                    <Heart className="w-3.5 h-3.5 text-red-500" />
                    {project.likes_count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ProjectsExplorer />
    </Suspense>
  );
}
