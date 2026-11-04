"use client";

import React from "react";
import Link from "next/link";
import { branding } from "@/config/branding";
import { Terminal, Heart } from "lucide-react";
import { GithubIcon, LinkedinIcon, TwitterIcon } from "@/components/icons";

export function Footer() {
  return (
    <footer className="w-full border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Terminal className="w-4 h-4" />
              </div>
              <span className="font-bold text-neutral-900 dark:text-white tracking-tight">
                {branding.name}
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {branding.description}
            </p>
            <div className="flex items-center gap-3 pt-2">
              {branding.socialLinks.github && (
                <a
                  href={branding.socialLinks.github}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
                  aria-label="GitHub"
                >
                  <GithubIcon className="w-4 h-4" />
                </a>
              )}
              {branding.socialLinks.linkedin && (
                <a
                  href={branding.socialLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
                  aria-label="LinkedIn"
                >
                  <LinkedinIcon className="w-4 h-4" />
                </a>
              )}
              {branding.socialLinks.twitter && (
                <a
                  href={branding.socialLinks.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
                  aria-label="Twitter"
                >
                  <TwitterIcon className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-neutral-200 mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/projects" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                  Explore Showcase
                </Link>
              </li>
              <li>
                <Link href="/collaborate" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                  Collaboration Marketplace
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                  Community Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/challenges" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                  Challenges & Hackathons
                </Link>
              </li>
            </ul>
          </div>

          {/* Community & Growth */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-neutral-200 mb-3">
              Community
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/community" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                  Developer Network
                </Link>
              </li>
              <li>
                <Link href="/spotlight" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                  Community Spotlight
                </Link>
              </li>
              <li>
                <Link href="/workspace" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                  Team Workspaces
                </Link>
              </li>
              <li>
                <Link href="/guidelines" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                  Code of Conduct
                </Link>
              </li>
            </ul>
          </div>

          {/* Zero-Cost & Open Infrastructure */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-neutral-200 mb-3">
              Zero-Cost Architecture
            </h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Built on 100% free-tier production infrastructure: Next.js on Vercel, Supabase PostgreSQL, and client-side high-resolution social graphic synthesis with ₹0 operational cost.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
              <span>Affiliated with</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {branding.communityAffiliation}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>
            &copy; 2026 {branding.name}. Open community software platform.
          </p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> for community developers.
          </p>
        </div>
      </div>
    </footer>
  );
}
