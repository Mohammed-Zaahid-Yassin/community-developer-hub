"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { NotificationItem } from "@/types/database";
import { formatRelativeTime } from "@/lib/utils";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/actions/community";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  MessageSquare,
  Users,
  Award,
  Sparkles,
  Loader2,
  Check,
} from "lucide-react";

function NotificationsContent() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      if (!user) return;
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        setNotifications((data as NotificationItem[]) || []);
      } catch (err) {
        console.error("Notifications load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    router.push("/auth/login?redirect=/notifications");
    return null;
  }

  const handleMarkRead = async (id: string) => {
    await markNotificationReadAction(id);
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
  };

  const getIcon = (type: string) => {
    if (type.includes("collaboration")) return <Users className="w-4 h-4 text-indigo-500" />;
    if (type.includes("comment")) return <MessageSquare className="w-4 h-4 text-blue-500" />;
    if (type.includes("spotlight")) return <Award className="w-4 h-4 text-amber-500" />;
    return <Sparkles className="w-4 h-4 text-purple-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600" />
            Notifications
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Updates on your collaboration requests, project reviews, discussions, and badges.
          </p>
        </div>

        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          <p className="text-xs text-neutral-400">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <Bell className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">All caught up!</h3>
          <p className="text-xs text-neutral-500 mt-1">
            You don&#39;t have any notifications right now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 rounded-2xl border transition flex items-start justify-between gap-4 ${
                !n.is_read
                  ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60"
                  : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-xs"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">{n.title}</h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5 leading-relaxed">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    {formatRelativeTime(n.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start shrink-0">
                {n.link && (
                  <Link
                    href={n.link}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-indigo-600 transition"
                    title="View linked content"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}

                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-600 transition"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}

