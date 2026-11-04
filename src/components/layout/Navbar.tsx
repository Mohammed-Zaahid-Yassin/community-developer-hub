"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { branding } from "@/config/branding";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Terminal,
  Menu,
  X,
  Flame,
  Bell,
  PlusCircle,
  User,
  Shield,
  LogOut,
  FolderKanban,
  Trophy,
  Users,
  Compass,
  Home,
  CheckCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, role, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Fetch unread notifications count if user is authenticated
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    async function loadUnreadCount() {
      try {
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user?.id)
          .eq("is_read", false);
        setUnreadNotifications(count || 0);
      } catch {
        // quiet error
      }
    }
    loadUnreadCount();
  }, [user]);

  // Close dropdowns on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  const navItems = [
    { title: "Home", href: "/", icon: Home },
    { title: "Explore", href: "/projects", icon: Compass },
    { title: "Collaborate", href: "/collaborate", icon: Users },
    { title: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { title: "Challenges", href: "/challenges", icon: Flame },
    { title: "Community", href: "/community", icon: CheckCircle },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {branding.shortName}
              </span>
              <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 leading-none">
                {branding.communityAffiliation}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {/* Streak Badge (if user has active streak) */}
            {user && profile && (
              <Link
                href={`/profile/${profile.username}`}
                title={`Current Streak: ${profile.current_streak} days`}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100 transition"
              >
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{profile.current_streak}d streak</span>
              </Link>
            )}

            {/* Submit Project CTA */}
            {user && (
              <Link
                href="/projects/new"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Showcase Project</span>
              </Link>
            )}

            {/* Notification Bell */}
            {user && (
              <Link
                href="/notifications"
                className="relative p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile Dropdown or Auth Buttons */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-2 pr-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition"
                  aria-expanded={userDropdownOpen}
                >
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 max-w-[100px] truncate hidden sm:inline">
                    {profile?.username || user.email?.split("@")[0]}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs uppercase overflow-hidden border border-indigo-200 dark:border-indigo-800">
                    {profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt={profile.username || "Avatar"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (profile?.full_name?.[0] || user.email?.[0] || "U").toUpperCase()
                    )}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {profile?.full_name || "Community Member"}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        {role}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        href={`/profile/${profile?.username || user.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <User className="w-3.5 h-3.5" />
                        My Public Portfolio
                      </Link>
                      <Link
                        href="/workspace"
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <FolderKanban className="w-3.5 h-3.5" />
                        Team Workspace
                      </Link>
                      <Link
                        href="/profile/edit"
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <User className="w-3.5 h-3.5" />
                        Edit Profile & Skills
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Admin Console
                        </Link>
                      )}
                    </div>

                    <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
                      <button
                        onClick={async () => {
                          await signOut();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                >
                  Join Community
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 pt-2 pb-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.title}
              </Link>
            );
          })}

          {user && (
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
              <Link
                href="/projects/new"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
              >
                <PlusCircle className="w-4 h-4" />
                Showcase New Project
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                >
                  <Shield className="w-4 h-4" />
                  Admin Console
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}

