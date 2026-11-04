"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Profile, UserRoleType } from "@/types/database";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRoleType;
  isLoading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: "member",
  isLoading: true,
  isAdmin: false,
  isModerator: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRoleType>("member");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const supabase = createClient();

  const fetchProfileAndRole = useCallback(async (userId: string) => {
    try {
      const [{ data: prof }, { data: userRole }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);

      if (prof) {
        setProfile(prof as Profile);
      }
      if (userRole) {
        setRole(userRole.role as UserRoleType);
      } else {
        setRole("member");
      }
    } catch (err) {
      console.error("Error fetching user profile/role:", err);
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfileAndRole(user.id);
    }
  }, [user?.id, fetchProfileAndRole]);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          setUser(session.user);
          await fetchProfileAndRole(session.user.id);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfileAndRole(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setRole("member");
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfileAndRole]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole("member");
  };

  const isAdmin = role === "admin" || role === "super_admin";
  const isModerator = isAdmin || role === "moderator" || role === "lead";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        isAdmin,
        isModerator,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
