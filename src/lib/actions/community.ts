"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function joinChallengeAction(challengeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Authentication required to join challenge." };

  const { error } = await supabase.from("challenge_participants").insert({
    challenge_id: challengeId,
    user_id: user.id,
  });

  if (error && error.code !== "23505") {
    return { success: false, error: error.message };
  }

  revalidatePath("/challenges");
  return { success: true };
}

export async function submitChallengeProjectAction(
  challengeId: string,
  projectId: string,
  summary: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Authentication required." };

  // Verify that user owns the project
  const { data: project } = await supabase
    .from("projects")
    .select("creator_id, title")
    .eq("id", projectId)
    .single();

  if (!project || project.creator_id !== user.id) {
    return { success: false, error: "You can only submit your own projects to challenges." };
  }

  const { data: submission, error } = await supabase
    .from("challenge_submissions")
    .upsert(
      {
        challenge_id: challengeId,
        project_id: projectId,
        user_id: user.id,
        summary: summary.trim(),
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "challenge_id,project_id" }
    )
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Submitting to an approved challenge qualifies for daily streak!
  try {
    await supabase.rpc("record_qualifying_contribution", {
      p_user_id: user.id,
      p_action_type: "challenge_submission",
      p_points: 40,
      p_reference_id: challengeId,
      p_reference_type: "challenge",
    });
  } catch (e) {
    console.warn("Could not award challenge points:", e);
  }

  revalidatePath("/challenges");
  return { success: true, submission };
}

export async function registerForEventAction(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Must be signed in to register for events." };

  const { data: existing } = await supabase
    .from("event_registrations")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Unregister
    await supabase
      .from("event_registrations")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);
    revalidatePath("/community");
    return { success: true, registered: false };
  } else {
    // Register
    await supabase.from("event_registrations").insert({
      event_id: eventId,
      user_id: user.id,
    });
    revalidatePath("/community");
    return { success: true, registered: true };
  }
}

export async function markNotificationReadAction(notificationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/notifications");
  return { success: true };
}

export async function createChallengeAction(
  title: string,
  description: string,
  instructions: string,
  startDate: string,
  endDate: string,
  prizeInfo?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Authentication required." };

  const baseSlug = title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-");
  const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

  const { data: challenge, error } = await supabase
    .from("challenges")
    .insert({
      title: title.trim(),
      slug,
      description: description.trim(),
      instructions: instructions.trim(),
      start_date: startDate,
      end_date: endDate,
      prize_info: prizeInfo?.trim() || "",
      created_by: user.id,
      is_active: true,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/challenges");
  return { success: true, challenge };
}
