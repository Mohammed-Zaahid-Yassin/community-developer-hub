"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Challenge, ChallengeSubmission, Project } from "@/types/database";
import { formatDate } from "@/lib/utils";
import {
  joinChallengeAction,
  submitChallengeProjectAction,
} from "@/lib/actions/community";
import {
  Flame,
  Trophy,
  Calendar,
  Sparkles,
  Users,
  Code2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  X,
  ExternalLink,
} from "lucide-react";

function ChallengesContent() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, ChallengeSubmission[]>>({});
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [joinedChallenges, setJoinedChallenges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit modal
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [selectedProjectToSubmit, setSelectedProjectToSubmit] = useState("");
  const [submissionSummary, setSubmissionSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChallenges() {
      setLoading(true);
      try {
        const supabase = createClient();

        // 1. Fetch active challenges
        const { data: chList } = await supabase
          .from("challenges")
          .select("*")
          .order("start_date", { ascending: false });

        setChallenges((chList as Challenge[]) || []);

        // 2. Fetch submissions for all challenges
        const { data: subList } = await supabase
          .from("challenge_submissions")
          .select(`
            *,
            user:profiles(*),
            project:projects(id, title, slug, cover_image, average_rating)
          `)
          .order("submitted_at", { ascending: false });

        if (subList) {
          const grouped: Record<string, ChallengeSubmission[]> = {};
          subList.forEach((s: any) => {
            if (!grouped[s.challenge_id]) grouped[s.challenge_id] = [];
            grouped[s.challenge_id].push(s);
          });
          setSubmissions(grouped);
        }

        // 3. If logged in, fetch user projects & participations
        if (user) {
          const [{ data: projs }, { data: parts }] = await Promise.all([
            supabase.from("projects").select("id, title").eq("creator_id", user.id),
            supabase.from("challenge_participants").select("challenge_id").eq("user_id", user.id),
          ]);

          setUserProjects((projs as Project[]) || []);
          if (projs && projs.length > 0) {
            setSelectedProjectToSubmit(projs[0].id);
          }
          if (parts) {
            setJoinedChallenges(parts.map((p) => p.challenge_id));
          }
        }
      } catch (err) {
        console.error("Error loading challenges:", err);
      } finally {
        setLoading(false);
      }
    }

    loadChallenges();
  }, [user]);

  const handleJoin = async (challengeId: string) => {
    if (!user) return;
    await joinChallengeAction(challengeId);
    setJoinedChallenges([...joinedChallenges, challengeId]);
  };

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallenge || !selectedProjectToSubmit) return;
    setSubmitting(true);
    setSubmitError(null);

    const res = await submitChallengeProjectAction(
      selectedChallenge.id,
      selectedProjectToSubmit,
      submissionSummary
    );

    if (!res.success) {
      setSubmitError(res.error || "Failed to submit project.");
    } else {
      setSubmitSuccess(true);
      setTimeout(() => {
        setSelectedChallenge(null);
        setSubmitSuccess(false);
        setSubmissionSummary("");
      }, 1500);
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 mb-4">
          <Flame className="w-4 h-4 text-orange-500" />
          <span>Official Coding Competitions & Hackathons</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Community Challenges
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
          Level up your technical skills, collaborate on focused sprint topics, earn points (+40 pts per verified submission), and win official community badges.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          <p className="text-xs text-neutral-400">Loading active challenges...</p>
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-20 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <Trophy className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            No active challenges at the moment
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Check back soon! Community hackathons and theme sprints are announced monthly.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {challenges.map((ch) => {
            const isJoined = joinedChallenges.includes(ch.id);
            const chSubmissions = submissions[ch.id] || [];

            return (
              <div
                key={ch.id}
                className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm p-6 sm:p-8 space-y-6"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {ch.is_active ? "Active Sprint" : "Concluded"}
                      </span>
                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(ch.start_date)} &ndash; {formatDate(ch.end_date)}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                      {ch.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {user ? (
                      <>
                        {!isJoined ? (
                          <button
                            onClick={() => handleJoin(ch.id)}
                            className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition"
                          >
                            Join Challenge
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            Joined
                          </span>
                        )}

                        <button
                          onClick={() => setSelectedChallenge(ch)}
                          disabled={userProjects.length === 0}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Project (+40 pts)</span>
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/auth/login"
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                      >
                        Sign In to Participate
                      </Link>
                    )}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-4xl">
                  {ch.description}
                </p>

                {ch.instructions && (
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 text-xs space-y-1">
                    <strong className="text-neutral-800 dark:text-neutral-200 block">
                      Evaluation Criteria & Instructions:
                    </strong>
                    <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {ch.instructions}
                    </p>
                  </div>
                )}

                {/* Submissions Grid */}
                <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Submissions ({chSubmissions.length})
                  </h3>

                  {chSubmissions.length === 0 ? (
                    <p className="text-xs text-neutral-400">
                      No project submissions yet. Be the first to build and submit!
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {chSubmissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 flex items-start gap-3"
                        >
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {sub.user?.full_name?.[0]?.toUpperCase() || "S"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/projects/${sub.project?.slug}`}
                              className="text-xs font-bold text-neutral-900 dark:text-white hover:text-indigo-600 transition block truncate"
                            >
                              {sub.project?.title}
                            </Link>
                            <p className="text-[11px] text-neutral-400">
                              By {sub.user?.full_name}
                            </p>
                            <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-1 line-clamp-2">
                              {sub.summary}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Modal */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Submit Project: {selectedChallenge.title}
              </h3>
              <button
                onClick={() => setSelectedChallenge(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="my-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Project submitted successfully! +40 points awarded and streak updated!</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitProject} className="mt-4 space-y-4">
                {submitError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Select Your Project *
                  </label>
                  <select
                    value={selectedProjectToSubmit}
                    onChange={(e) => setSelectedProjectToSubmit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                  >
                    {userProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Submission Summary (How does your build meet the challenge?) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={submissionSummary}
                    onChange={(e) => setSubmissionSummary(e.target.value)}
                    placeholder="Briefly highlight how your architecture addresses the challenge requirements..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedChallenge(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Entry (+40 pts)"}
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

export default function ChallengesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ChallengesContent />
    </Suspense>
  );
}

