"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { AvailabilityType, CollaborationStyleType } from "@/types/database";
import {
  User,
  AtSign,
  Globe,
  Briefcase,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, profile, refreshProfile, isLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [department, setDepartment] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [availability, setAvailability] = useState<AvailabilityType>("open_to_collaborate");
  const [collaborationStyle, setCollaborationStyle] = useState<CollaborationStyleType>("open_to_join");
  const [isPublic, setIsPublic] = useState(true);

  // Tags
  const [skillsOffered, setSkillsOffered] = useState<string[]>([]);
  const [newSkillOffered, setNewSkillOffered] = useState("");
  const [skillsNeeded, setSkillsNeeded] = useState<string[]>([]);
  const [newSkillNeeded, setNewSkillNeeded] = useState("");
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");

  // Sync profile data into form once loaded
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setUsername(profile.username || "");
      setAvatarUrl(profile.avatar_url || "");
      setBio(profile.bio || "");
      setDepartment(profile.department || "");
      setGithubUrl(profile.github_url || "");
      setLinkedinUrl(profile.linkedin_url || "");
      setPortfolioUrl(profile.portfolio_url || "");
      setAvailability(profile.current_availability || "open_to_collaborate");
      setCollaborationStyle(profile.collaboration_style || "open_to_join");
      setIsPublic(profile.is_public ?? true);
      setSkillsOffered(profile.skills_offered || []);
      setSkillsNeeded(profile.skills_needed || []);
      setPreferredCategories(profile.preferred_categories || []);
    }
  }, [profile]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    router.push("/auth/login?redirect=/profile/edit");
    return null;
  }

  const addSkillOffered = () => {
    const s = newSkillOffered.trim();
    if (s && !skillsOffered.includes(s)) {
      setSkillsOffered([...skillsOffered, s]);
      setNewSkillOffered("");
    }
  };

  const removeSkillOffered = (tag: string) => {
    setSkillsOffered(skillsOffered.filter((item) => item !== tag));
  };

  const addSkillNeeded = () => {
    const s = newSkillNeeded.trim();
    if (s && !skillsNeeded.includes(s)) {
      setSkillsNeeded([...skillsNeeded, s]);
      setNewSkillNeeded("");
    }
  };

  const removeSkillNeeded = (tag: string) => {
    setSkillsNeeded(skillsNeeded.filter((item) => item !== tag));
  };

  const addCategory = () => {
    const c = newCategory.trim();
    if (c && !preferredCategories.includes(c)) {
      setPreferredCategories([...preferredCategories, c]);
      setNewCategory("");
    }
  };

  const removeCategory = (cat: string) => {
    setPreferredCategories(preferredCategories.filter((item) => item !== cat));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,24}$/.test(cleanUsername)) {
      setError("Username must be between 3 and 24 characters and only contain letters, numbers, hyphens, and underscores.");
      setSaving(false);
      return;
    }

    try {
      const supabase = createClient();

      // Check if username changed and is taken
      if (profile && profile.username !== cleanUsername) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", cleanUsername)
          .neq("id", user.id)
          .maybeSingle();

        if (existing) {
          setError("This username is already taken by another community member.");
          setSaving(false);
          return;
        }
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          username: cleanUsername,
          avatar_url: avatarUrl.trim() || null,
          bio: bio.trim(),
          department: department.trim(),
          github_url: githubUrl.trim(),
          linkedin_url: linkedinUrl.trim(),
          portfolio_url: portfolioUrl.trim(),
          current_availability: availability,
          collaboration_style: collaborationStyle,
          skills_offered: skillsOffered,
          skills_needed: skillsNeeded,
          preferred_categories: preferredCategories,
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      await refreshProfile();
      setSuccess("Profile updated successfully!");
      setTimeout(() => {
        router.push(`/profile/${cleanUsername}`);
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Edit Developer Profile
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Customize your public developer portfolio, collaboration availability, and technical skills.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Basic Info Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            General Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Grace Hopper"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="gracehopper"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Profile Avatar URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-neutral-500 mt-1">Direct image URL (e.g., GitHub avatar or Cloud storage)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Department / Community Affiliation
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science / Robotics Club"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Short Biography
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other community developers about your background, what you enjoy building, and your current coding goals..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Social & Portfolio Links */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Social & Portfolio Links
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                GitHub Profile
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <GithubIcon className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                LinkedIn Profile
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <LinkedinIcon className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Personal Website / Portfolio
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://yourportfolio.dev"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Collaboration Preferences */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Collaboration Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Current Availability
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as AvailabilityType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="open_to_collaborate">Open to Collaborate (Looking for projects)</option>
                <option value="available">Available for New Initiatives</option>
                <option value="mentoring">Available to Mentor Other Members</option>
                <option value="busy">Currently Busy / Not Available</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Preferred Collaboration Style
              </label>
              <select
                value={collaborationStyle}
                onChange={(e) => setCollaborationStyle(e.target.value as CollaborationStyleType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="open_to_join">Open to joining existing teams</option>
                <option value="looking_for_collaborators">Building projects & seeking collaborators</option>
                <option value="independent">Working independently</option>
                <option value="mentor">Available as a technical mentor</option>
                <option value="seeking_mentor">Seeking a mentor to guide me</option>
              </select>
            </div>
          </div>
        </div>

        {/* Skills & Tech Matching */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Skills & Matchmaking
          </h2>

          {/* Skills Offered */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Skills You Can Contribute (e.g. Next.js, FastAPI, UI/UX, Docker)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newSkillOffered}
                onChange={(e) => setNewSkillOffered(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkillOffered();
                  }
                }}
                placeholder="Type a skill and press Enter"
                className="flex-1 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={addSkillOffered}
                className="px-3.5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skillsOffered.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-800"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkillOffered(skill)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Skills Needed */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Skills You Need Help With (for your projects)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newSkillNeeded}
                onChange={(e) => setNewSkillNeeded(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkillNeeded();
                  }
                }}
                placeholder="e.g. Mobile Design, DevOps, Solidity"
                className="flex-1 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={addSkillNeeded}
                className="px-3.5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skillsNeeded.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-200 dark:border-amber-800"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkillNeeded(skill)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Preferred Project Categories */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Preferred Project Categories (e.g. AI/ML, Web Apps, IoT, Open Source Tools)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
                placeholder="Add a category and press Enter"
                className="flex-1 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={addCategory}
                className="px-3.5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {preferredCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium border border-neutral-200 dark:border-neutral-700"
                >
                  {cat}
                  <button
                    type="button"
                    onClick={() => removeCategory(cat)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Visibility Setting */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
              {isPublic ? <Eye className="w-5 h-5 text-emerald-500" /> : <EyeOff className="w-5 h-5 text-neutral-400" />}
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                Public Community Portfolio
              </h3>
              <p className="text-[11px] text-neutral-500">
                {isPublic
                  ? "Your portfolio is visible to other community members and prospective collaborators."
                  : "Your portfolio is private and hidden from the public community roster."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              isPublic
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {isPublic ? "Public" : "Private"}
          </button>
        </div>

        {/* Submit Actions */}
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
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
