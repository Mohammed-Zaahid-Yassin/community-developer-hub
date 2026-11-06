"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { branding } from "@/config/branding";
import {
  Terminal,
  Lock,
  Mail,
  User,
  AtSign,
  Ticket,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCodeParam = searchParams.get("invite") || "";

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(inviteCodeParam);
  const [registrationMode, setRegistrationMode] = useState<"open" | "invite_only" | "admin_approved">("open");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Check platform registration mode
  useEffect(() => {
    async function checkMode() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "registration_mode")
          .maybeSingle();

        if (data?.value && typeof data.value === "object" && "mode" in data.value) {
          setRegistrationMode((data.value as { mode: "open" | "invite_only" | "admin_approved" }).mode);
        }
      } catch {
        // fallback to open
      }
    }
    checkMode();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setNeedsVerification(false);
    setResendStatus(null);

    // Validate inputs
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,24}$/.test(cleanUsername)) {
      setError("Username must be between 3 and 24 characters and only contain lowercase letters, numbers, hyphens, and underscores.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (registrationMode === "invite_only" && !inviteCode.trim()) {
      setError("This community is currently invite-only. A valid invitation code is required to register.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Check if username is already taken in profiles table
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .maybeSingle();

      if (existingUser) {
        setError("This username is already claimed by another community member. Please choose another username.");
        setLoading(false);
        return;
      }

      // If invite code provided, verify it
      let validatedRole = "member";
      if (inviteCode.trim()) {
        const { data: inv, error: invErr } = await supabase
          .from("invitations")
          .select("*")
          .eq("code", inviteCode.trim())
          .eq("is_used", false)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (invErr || !inv) {
          setError("The invitation code entered is invalid or has expired.");
          setLoading(false);
          return;
        }
        validatedRole = inv.role;
      }

      // Register with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: cleanUsername,
            full_name: fullName.trim(),
            initial_role: validatedRole,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Mark invitation as used if provided
      if (inviteCode.trim() && data?.user?.id) {
        await supabase
          .from("invitations")
          .update({ is_used: true, accepted_by: data.user.id })
          .eq("code", inviteCode.trim());
      }

      if (data?.user && !data.session) {
        // Email verification is required by Supabase
        setNeedsVerification(true);
        setSuccess(
          `Account created successfully! We sent a confirmation link to ${email.trim()}. Please verify your email before logging in.`
        );
      } else {
        // Direct session created (auto-confirm is enabled)
        setSuccess("Registration successful! Welcome to the community. Redirecting to your profile...");
        setTimeout(() => {
          router.push("/profile/edit");
        }, 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    setResending(true);
    setResendStatus(null);
    try {
      const supabase = createClient();
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (resendErr) {
        setResendStatus(`Error: ${resendErr.message}`);
      } else {
        setResendStatus("Confirmation email resent successfully. Check your inbox.");
      }
    } catch {
      setResendStatus("Failed to resend confirmation email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl">
      <div className="text-center mb-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <Terminal className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Join {branding.name}
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {registrationMode === "invite_only"
            ? "Invitation-only community registration"
            : "Create your developer profile and showcase your projects"}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>

          {needsVerification && (
            <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                <span>Resend verification email</span>
              </button>
              {resendStatus && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">{resendStatus}</p>
              )}
              <Link
                href="/auth/login"
                className="mt-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {!needsVerification && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-neutral-900 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Community Username *
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ada_dev"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-neutral-900 transition font-mono"
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">
              Your public URL: {branding.shortName.toLowerCase()}.org/profile/{username || "username"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Community Email *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@community.org"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-neutral-900 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Password (min. 8 characters) *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-neutral-900 transition"
              />
            </div>
          </div>

          {registrationMode === "invite_only" && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Invitation Code *
              </label>
              <div className="relative">
                <Ticket className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="COMMUNITY-INVITE-CODE"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating community account...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800 text-center">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Already a community member?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
