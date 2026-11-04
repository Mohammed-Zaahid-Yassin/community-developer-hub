"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Profile, Announcement, Event } from "@/types/database";
import { formatDate } from "@/lib/utils";
import { registerForEventAction } from "@/lib/actions/community";
import {
  Users,
  Search,
  Megaphone,
  Calendar,
  Flame,
  Globe,
  Award,
  Layers,
  MapPin,
  CheckCircle2,
  Loader2,
  BookOpen,
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";

const LEARNING_CIRCLES = [
  {
    name: "AI & Machine Learning",
    description: "Deep learning architectures, LLMs, PyTorch fine-tuning, and computer vision models.",
    members: "38 developers",
    color: "from-purple-500 to-indigo-600",
  },
  {
    name: "Modern Web Architecture",
    description: "Full-stack Next.js, React 19, TypeScript, Edge computing, and database optimization.",
    members: "52 developers",
    color: "from-blue-500 to-cyan-600",
  },
  {
    name: "Cloud, DevOps & Rust",
    description: "Docker microservices, CI/CD pipelines, Kubernetes, and memory-safe systems programming.",
    members: "29 developers",
    color: "from-amber-500 to-orange-600",
  },
  {
    name: "IoT & Embedded Systems",
    description: "Hardware microcontrollers, ESP32, sensor telemetry, and low-latency robotics protocols.",
    members: "18 developers",
    color: "from-emerald-500 to-teal-600",
  },
];

function CommunityNetworkContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"directory" | "events" | "announcements" | "circles">("directory");

  const [developers, setDevelopers] = useState<Profile[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCommunity() {
      setLoading(true);
      try {
        const supabase = createClient();

        const [{ data: profs }, { data: annList }, { data: evList }] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("is_public", true)
            .order("total_points", { ascending: false })
            .limit(40),
          supabase
            .from("announcements")
            .select("*, author:profiles(*)")
            .order("is_pinned", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase
            .from("events")
            .select("*")
            .eq("is_published", true)
            .order("start_time", { ascending: true }),
        ]);

        setDevelopers((profs as Profile[]) || []);
        setAnnouncements((annList as unknown as Announcement[]) || []);
        setEvents((evList as Event[]) || []);

        if (user) {
          const { data: regList } = await supabase
            .from("event_registrations")
            .select("event_id")
            .eq("user_id", user.id);

          if (regList) setRegisteredEventIds(regList.map((r) => r.event_id));
        }
      } catch (err) {
        console.error("Community load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCommunity();
  }, [user]);

  const handleToggleEvent = async (eventId: string) => {
    if (!user) return;
    const res = await registerForEventAction(eventId);
    if (res.success) {
      if (res.registered) {
        setRegisteredEventIds([...registeredEventIds, eventId]);
      } else {
        setRegisteredEventIds(registeredEventIds.filter((id) => id !== eventId));
      }
    }
  };

  const filteredDevelopers = developers.filter((dev) => {
    if (selectedAvailability !== "all" && dev.current_availability !== selectedAvailability) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      dev.full_name?.toLowerCase().includes(q) ||
      dev.username?.toLowerCase().includes(q) ||
      dev.department?.toLowerCase().includes(q) ||
      dev.skills_offered?.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Developer Community Network
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
          Connect directly with engineers, discover mentors, join technical interest circles, and participate in community workshops.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200 dark:border-neutral-800 mb-8">
        <button
          onClick={() => setActiveTab("directory")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "directory" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Developer Directory</span>
        </button>

        <button
          onClick={() => setActiveTab("announcements")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "announcements" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>Announcements ({announcements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("events")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "events" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Events & Workshops ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("circles")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === "circles" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Learning Circles</span>
        </button>
      </div>

      {/* TAB 1: DEVELOPER DIRECTORY */}
      {activeTab === "directory" && (
        <div className="space-y-8">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search developers by name, skill, or affiliation..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
            </div>

            <div>
              <select
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="all">All Availability</option>
                <option value="open_to_collaborate">Open to Collaborate</option>
                <option value="available">Available</option>
                <option value="mentoring">Available to Mentor</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              <p className="text-xs text-neutral-400">Loading directory...</p>
            </div>
          ) : filteredDevelopers.length === 0 ? (
            <p className="text-xs text-neutral-400 py-12 text-center">No community developers matched.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDevelopers.map((dev) => (
                <div
                  key={dev.id}
                  className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3.5 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm overflow-hidden shrink-0">
                        {dev.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={dev.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          dev.full_name?.[0]?.toUpperCase() || "D"
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                          <Link href={`/profile/${dev.username}`} className="hover:text-indigo-600 transition">
                            {dev.full_name}
                          </Link>
                        </h3>
                        <span className="text-[11px] text-neutral-400 block">@{dev.username}</span>
                        {dev.department && (
                          <span className="text-[10px] text-neutral-500 font-medium">{dev.department}</span>
                        )}
                      </div>
                    </div>

                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 mb-2">
                      {dev.current_availability?.replace(/_/g, " ")}
                    </span>

                    {dev.bio && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                        {dev.bio}
                      </p>
                    )}

                    {/* Skills pills */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {dev.skills_offered?.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <Flame className="w-3.5 h-3.5 fill-amber-500" />
                      {dev.current_streak}d streak
                    </span>

                    <Link
                      href={`/profile/${dev.username}`}
                      className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-indigo-50 hover:text-indigo-600 text-xs font-semibold transition"
                    >
                      View Portfolio
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ANNOUNCEMENTS */}
      {activeTab === "announcements" && (
        <div className="max-w-3xl space-y-4">
          {announcements.length === 0 ? (
            <p className="text-xs text-neutral-400 py-12 text-center">No community announcements yet.</p>
          ) : (
            announcements.map((a) => (
              <div
                key={a.id}
                className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">{a.title}</h3>
                  </div>
                  {a.is_pinned && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                      Pinned
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
                  {a.content}
                </p>
                <span className="text-[11px] text-neutral-400 block pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  Broadcast by {a.author?.full_name} &bull; {formatDate(a.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: EVENTS & WORKSHOPS */}
      {activeTab === "events" && (
        <div className="max-w-4xl space-y-6">
          {events.length === 0 ? (
            <div className="text-center py-16 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <Calendar className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                No events currently scheduled
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Upcoming tech talks, workshops, and demo days are posted here by community leads.
              </p>
            </div>
          ) : (
            events.map((ev) => {
              const isRegistered = registeredEventIds.includes(ev.id);
              return (
                <div
                  key={ev.id}
                  className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
                >
                  <div className="space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {ev.event_type}
                    </span>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{ev.title}</h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300">{ev.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(ev.start_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {ev.location}
                      </span>
                    </div>
                  </div>

                  {user ? (
                    <button
                      onClick={() => handleToggleEvent(ev.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                        isRegistered
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                      }`}
                    >
                      {isRegistered ? "Registered ✓" : "Register to Attend"}
                    </button>
                  ) : (
                    <Link
                      href="/auth/login"
                      className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold"
                    >
                      Sign In to Register
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: LEARNING CIRCLES */}
      {activeTab === "circles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LEARNING_CIRCLES.map((c) => (
            <div
              key={c.name}
              className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${c.color} text-white flex items-center justify-center font-bold mb-4 shadow-sm`}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">{c.name}</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                  {c.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-medium">{c.members}</span>
                <Link
                  href="/collaborate"
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold hover:bg-neutral-200 transition"
                >
                  Explore Circle
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <CommunityNetworkContent />
    </Suspense>
  );
}

