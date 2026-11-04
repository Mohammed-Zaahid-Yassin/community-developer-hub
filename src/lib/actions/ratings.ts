"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SubmitRatingPayload {
  projectId: string;
  technicalRating: number;
  innovationRating: number;
  designRating: number;
  documentationRating: number;
  usefulnessRating: number;
  reviewText?: string;
}

export async function submitProjectRatingAction(payload: SubmitRatingPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Must be signed in to submit a review." };
  }

  // Prevent creator from rating their own project
  const { data: project } = await supabase
    .from("projects")
    .select("creator_id, slug")
    .eq("id", payload.projectId)
    .single();

  if (!project) {
    return { success: false, error: "Project not found." };
  }

  if (project.creator_id === user.id) {
    return { success: false, error: "You cannot review your own project." };
  }

  // Validate range 1-5
  const ratings = [
    payload.technicalRating,
    payload.innovationRating,
    payload.designRating,
    payload.documentationRating,
    payload.usefulnessRating,
  ];

  if (ratings.some((r) => !Number.isInteger(r) || r < 1 || r > 5)) {
    return { success: false, error: "Ratings must be whole numbers between 1 and 5." };
  }

  try {
    const { error: upsertError } = await supabase.from("project_ratings").upsert(
      {
        project_id: payload.projectId,
        user_id: user.id,
        technical_rating: payload.technicalRating,
        innovation_rating: payload.innovationRating,
        design_rating: payload.designRating,
        documentation_rating: payload.documentationRating,
        usefulness_rating: payload.usefulnessRating,
        review_text: payload.reviewText?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,user_id" }
    );

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    // If substantive review provided (>= 40 characters), record qualifying contribution for streak!
    if (payload.reviewText && payload.reviewText.trim().length >= 40) {
      try {
        await supabase.rpc("record_qualifying_contribution", {
          p_user_id: user.id,
          p_action_type: "substantive_review",
          p_points: 20,
          p_reference_id: payload.projectId,
          p_reference_type: "project",
        });
      } catch (e) {
        console.warn("Could not award review points:", e);
      }
    }

    revalidatePath(`/projects/${project.slug}`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to record review." };
  }
}

export async function submitProjectNominationAction(projectId: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Must be signed in to nominate projects." };

  const cleanReason = reason.trim();
  if (cleanReason.length < 10) {
    return { success: false, error: "Please provide a reason explaining why this project deserves Community Spotlight." };
  }

  const { error } = await supabase.from("project_nominations").insert({
    project_id: projectId,
    nominated_by: user.id,
    reason: cleanReason,
  });

  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function submitContentReportAction(
  contentType: "project" | "comment" | "review" | "profile" | "collaboration_request",
  contentId: string,
  reason: string,
  details?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Must be signed in to submit a report." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    content_type: contentType,
    content_id: contentId,
    reason: reason.trim(),
    details: details?.trim() || null,
  });

  if (error) return { success: false, error: error.message };

  return { success: true };
}

