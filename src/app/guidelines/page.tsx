import React from "react";
import Link from "next/link";
import { branding } from "@/config/branding";
import { ShieldCheck, ArrowLeft, Heart, CheckCircle2, AlertTriangle, Users } from "lucide-react";

export default function GuidelinesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Hub
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
            Community Guidelines & Code of Conduct
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Fostering an inclusive, respectful, and productive builder network for {branding.communityAffiliation}.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
        <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/30">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-red-500" />
            1. Our Pledge
          </h2>
          <p>
            We are dedicated to providing a harassment-free, welcoming, and empowering environment for all community developers regardless of experience level, background, identity, or technology preferences.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/30">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            2. Expected Builder Behavior
          </h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm">
            <li><strong>Constructive Reviews:</strong> Provide thoughtful, respectful feedback on peer projects focused on engineering improvement.</li>
            <li><strong>Genuine Streaks:</strong> Earn badges and streaks through verified contributions, task updates, and genuine pull requests. Anti-gaming and farming safeguards are enforced.</li>
            <li><strong>Honest Collaboration:</strong> Clearly communicate availability, role requirements, and technical expectations when posting or applying for collaboration opportunities.</li>
            <li><strong>Open Source Integrity:</strong> Credit libraries, collaborators, and open-source foundations utilized in your project submissions.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/30">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            3. Unacceptable Conduct
          </h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm">
            <li>Harassment, offensive comments, or derogatory remarks in reviews, comments, or team chats.</li>
            <li>Submitting malicious software, phishing links, or unauthorized automated activity.</li>
            <li>Plagiarizing complete applications without attribution or misrepresenting ownership.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/30">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-indigo-500" />
            4. Reporting & Enforcement
          </h2>
          <p>
            Community moderators and administrators actively monitor submissions and reviews. Violations can be reported directly to administrators at <a href={`mailto:${branding.contactEmail}`} className="text-indigo-600 hover:underline">{branding.contactEmail}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

