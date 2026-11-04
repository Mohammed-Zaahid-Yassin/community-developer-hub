"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UserRoleType } from "@/types/database";

// Guard helper to verify caller is admin
async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isAuthorized: false, user: null, supabase };

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const role = roleRow?.role;
  const isAuthorized = role === "admin" || role === "super_admin";
  return { isAuthorized, user, supabase };
}

export async function updateUserRoleAction(targetUserId: string, newRole: UserRoleType) {
  const { isAuthorized, user, supabase } = await verifyAdmin();
  if (!isAuthorized || !user) return { success: false, error: "Unauthorized access." };

  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: targetUserId, role: newRole, assigned_by: user.id }, { onConflict: "user_id" });

  if (error) return { success: false, error: error.message };

  // Log audit
  await supabase.from("admin_audit_logs").insert({
    admin_id: user.id,
    action: "update_role",
    target_type: "user",
    target_id: targetUserId,
    details: { newRole },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function toggleUserSuspendedAction(targetUserId: string, isSuspended: boolean) {
  const { isAuthorized, user, supabase } = await verifyAdmin();
  if (!isAuthorized || !user) return { success: false, error: "Unauthorized access." };

  const { error } = await supabase
    .from("profiles")
    .update({ is_suspended: isSuspended, updated_at: new Date().toISOString() })
    .eq("id", targetUserId);

  if (error) return { success: false, error: error.message };

  await supabase.from("admin_audit_logs").insert({
    admin_id: user.id,
    action: isSuspended ? "suspend_user" : "unsuspend_user",
    target_type: "user",
    target_id: targetUserId,
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function toggleProjectFeaturedAction(
  projectId: string,
  isFeatured: boolean,
  editorialNote?: string
) {
  const { isAuthorized, user, supabase } = await verifyAdmin();
  if (!isAuthorized || !user) return { success: false, error: "Unauthorized access." };

  const { data: proj, error } = await supabase
    .from("projects")
    .update({
      is_featured: isFeatured,
      featured_at: isFeatured ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select("creator_id, title, slug")
    .single();

  if (error) return { success: false, error: error.message };

  if (isFeatured) {
    // Record in featured_projects table
    await supabase.from("featured_projects").upsert(
      {
        project_id: projectId,
        featured_by: user.id,
        editorial_note: editorialNote?.trim() || null,
        featured_from: new Date().toISOString(),
      },
      { onConflict: "project_id" }
    );

    // Award featured_creator achievement & streak points
    if (proj) {
      try {
        await supabase.rpc("record_qualifying_contribution", {
          p_user_id: proj.creator_id,
          p_action_type: "community_spotlight",
          p_points: 100,
          p_reference_id: projectId,
          p_reference_type: "project",
        });

        await supabase.from("user_achievements").insert({
          user_id: proj.creator_id,
          achievement_id: "featured_creator",
        });

        // Notify creator
        await supabase.from("notifications").insert({
          user_id: proj.creator_id,
          type: "spotlight",
          title: "Community Spotlight Recognition!",
          message: `Your project "${proj.title}" was selected for the official Community Spotlight!`,
          link: `/projects/${proj.slug}`,
        });
      } catch (e) {
        console.warn("Could not record spotlight:", e);
      }
    }
  } else {
    await supabase.from("featured_projects").delete().eq("project_id", projectId);
  }

  revalidatePath("/admin");
  revalidatePath("/spotlight");
  revalidatePath("/projects");
  return { success: true };
}

export async function reviewNominationAction(
  nominationId: string,
  approve: boolean,
  editorialNote?: string
) {
  const { isAuthorized, user, supabase } = await verifyAdmin();
  if (!isAuthorized || !user) return { success: false, error: "Unauthorized access." };

  const { data: nomination } = await supabase
    .from("project_nominations")
    .select("*, project:projects(*)")
    .eq("id", nominationId)
    .single();

  if (!nomination) return { success: false, error: "Nomination not found." };

  const { error } = await supabase
    .from("project_nominations")
    .update({
      status: approve ? "approved" : "rejected",
      reviewed_by: user.id,
      editorial_notes: editorialNote?.trim() || null,
    })
    .eq("id", nominationId);

  if (error) return { success: false, error: error.message };

  if (approve && nomination.project_id) {
    await toggleProjectFeaturedAction(nomination.project_id, true, editorialNote);
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function resolveReportAction(
  reportId: string,
  actionTaken: string,
  isDismissed: boolean = false
) {
  const { isAuthorized, user, supabase } = await verifyAdmin();
  if (!isAuthorized || !user) return { success: false, error: "Unauthorized access." };

  const { error } = await supabase
    .from("reports")
    .update({
      status: isDismissed ? "dismissed" : "resolved",
      action_taken: actionTaken.trim(),
      resolved_by: user.id,
    })
    .eq("id", reportId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin");
  return { success: true };
}

export async function publishAnnouncementAction(
  title: string,
  content: string,
  isPinned: boolean = false
) {
  const { isAuthorized, user, supabase } = await verifyAdmin();
  if (!isAuthorized || !user) return { success: false, error: "Unauthorized access." };

  const { data: announcement, error } = await supabase
    .from("announcements")
    .insert({
      author_id: user.id,
      title: title.trim(),
      content: content.trim(),
      is_pinned: isPinned,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/community");
  revalidatePath("/admin");
  return { success: true, announcement };
}

