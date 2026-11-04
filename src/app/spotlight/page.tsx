"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Project } from "@/types/database";
import { SocialCardGenerator } from "@/components/SocialCardGenerator";
import {
  Award,
  Sparkles,
  Share2,
  ExternalLink,
  Star,
  Users,
  Code,
  Calendar,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

function SpotlightContent() {
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [selectedForCard, setSelectedForCard] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("projects")
          .select(`
            *,
            creator:profiles!projects_creator_id_fkey(*),
            project_technologies(technologies(*))
          `)
          .eq("is_featured", true)
          .order("featured_at", { ascending: false, nullsFirst: false });

        if (data) {
          const mapped = data.map((p: any) => ({
            ...p,
            technologies: p.project_technologies?.map((pt: any) => pt.technologies) || [],
          }));
          setFeaturedProjects(mapped as unknown as Project[]);
        }
      } catch (err) {
        console.error("Error loading spotlight projects:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFeatured();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 mb-4">
          <Award className="w-4 h-4" />
          <span>Official Community Recognition Program</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Community Spotlight
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
          Celebrating outstanding engineering projects built by our members. Spotlighted projects are promoted on official community channels and receive verified profile badges.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          <p className="text-xs text-neutral-400">Loading spotlighted projects...</p>
        </div>
      ) : featuredProjects.length === 0 ? (
        <div className="text-center py-24 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <Sparkles className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            No projects spotlighted yet
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Members can nominate outstanding projects from any project detail page for community spotlight review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {featuredProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Cover Image */}
                <div className="h-56 bg-neutral-100 dark:bg-neutral-800 relative overflow-hidden">
                  {project.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.cover_image}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <Code className="w-12 h-12" />
                    </div>
                  )}

                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-md flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      Featured
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/60 backdrop-blur-md text-white">
                      {project.category}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                    <Link href={`/projects/${project.slug}`} className="hover:text-indigo-600 transition">
                      {project.title}
                    </Link>
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {project.tagline}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-4">
                    {project.technologies?.map((tech) => (
                      <span
                        key={tech.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                      >
                        {tech.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <Link
                  href={`/profile/${project.creator?.username}`}
                  className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-indigo-600"
                >
                  <span>By {project.creator?.full_name}</span>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedForCard(project)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 text-xs font-semibold hover:bg-amber-100 transition"
                    title="Generate Instagram/LinkedIn card"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Social Card</span>
                  </button>

                  <Link
                    href={`/projects/${project.slug}`}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                  >
                    View Project
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Social Card Generator Modal */}
      {selectedForCard && (
        <SocialCardGenerator
          project={selectedForCard}
          onClose={() => setSelectedForCard(null)}
        />
      )}
    </div>
  );
}

export default function SpotlightPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <SpotlightContent />
    </Suspense>
  );
}
