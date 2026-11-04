"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TaskStatusType } from "@/types/database";

export interface CreateOpportunityData {
  projectId: string;
  roleNeeded: string;
  requiredSkills: string[];
  positionsOpen: number;
  responsibilities: string;
  timeCommitment: string;
  locationType: "remote" | "hybrid" | "in_person";
}

export async function createOpportunityAction(data: CreateOpportunityData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Authentication required." };

  // Check that user is the owner of this project
  const { data: project } = await supabase
    .from("projects")
    .select("creator_id, title, slug")
    .eq("id", data.projectId)
    .single();

  if (!project || project.creator_id !== user.id) {
    return { success: false, error: "Only the project creator can publish collaboration opportunities." };
  }

  const { data: opp, error } = await supabase
    .from("collaboration_opportunities")
    .insert({
      project_id: data.projectId,
      title: `${data.roleNeeded} for ${project.title}`,
      role_needed: data.roleNeeded.trim(),
      required_skills: data.requiredSkills,
      positions_open: data.positionsOpen,
      responsibilities: data.responsibilities.trim(),
      time_commitment: data.timeCommitment.trim(),
      location_type: data.locationType,
      status: "open",
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Update project status to looking_for_collaborators if it's currently idea or in_progress
  await supabase
    .from("projects")
    .update({ status: "looking_for_collaborators" })
    .eq("id", data.projectId);

  revalidatePath("/collaborate");
  revalidatePath(`/projects/${project.slug}`);

  return { success: true, opportunity: opp };
}

export async function submitCollaborationRequestAction(
  opportunityId: string,
  message: string,
  portfolioLinks: string[] = []
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Must be signed in to apply for collaboration." };

  const cleanMessage = message.trim();
  if (cleanMessage.length < 20) {
    return { success: false, error: "Please write a substantive message explaining your experience and how you can contribute (at least 20 characters)." };
  }

  // Get opportunity and project
  const { data: opp } = await supabase
    .from("collaboration_opportunities")
    .select("*, project:projects(id, creator_id, title, slug)")
    .eq("id", opportunityId)
    .single();

  if (!opp || !opp.project) {
    return { success: false, error: "Opportunity not found." };
  }

  // Prevent creator from applying to their own project
  if (opp.project.creator_id === user.id) {
    return { success: false, error: "You cannot apply to your own project." };
  }

  // Check for duplicate application
  const { data: existing } = await supabase
    .from("collaboration_requests")
    .select("id, status")
    .eq("opportunity_id", opportunityId)
    .eq("applicant_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "withdrawn") {
      // Reopen request
      const { error: reopenErr } = await supabase
        .from("collaboration_requests")
        .update({
          message: cleanMessage,
          portfolio_links: portfolioLinks,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (reopenErr) return { success: false, error: reopenErr.message };
      return { success: true };
    }
    return { success: false, error: "You have already submitted an application for this role." };
  }

  const { error: insertError } = await supabase.from("collaboration_requests").insert({
    opportunity_id: opportunityId,
    project_id: opp.project_id,
    applicant_id: user.id,
    message: cleanMessage,
    portfolio_links: portfolioLinks,
    status: "pending",
  });

  if (insertError) return { success: false, error: insertError.message };

  // Notify project creator
  await supabase.from("notifications").insert({
    user_id: opp.project.creator_id,
    type: "collaboration_request",
    title: "New Collaboration Application",
    message: `A member applied for the role "${opp.role_needed}" on your project "${opp.project.title}".`,
    link: `/workspace`,
  });

  revalidatePath("/collaborate");
  return { success: true };
}

export async function withdrawCollaborationRequestAction(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Authentication required." };

  const { error } = await supabase
    .from("collaboration_requests")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("applicant_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/collaborate");
  return { success: true };
}

export async function reviewCollaborationRequestAction(
  requestId: string,
  newStatus: "accepted" | "rejected",
  feedback?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Authentication required." };

  // Get request details
  const { data: request } = await supabase
    .from("collaboration_requests")
    .select("*, opportunity:collaboration_opportunities(*), project:projects(*)")
    .eq("id", requestId)
    .single();

  if (!request || !request.project) {
    return { success: false, error: "Collaboration request not found." };
  }

  // Verify that current user is project creator or lead
  if (request.project.creator_id !== user.id) {
    return { success: false, error: "Unauthorized. Only project leads can accept or reject applications." };
  }

  // Update request status
  const { error: updateError } = await supabase
    .from("collaboration_requests")
    .update({
      status: newStatus,
      feedback: feedback?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) return { success: false, error: updateError.message };

  if (newStatus === "accepted") {
    // 1. Add applicant to project_members
    await supabase.from("project_members").upsert(
      {
        project_id: request.project_id,
        user_id: request.applicant_id,
        role: request.opportunity?.role_needed || "Contributor",
      },
      { onConflict: "project_id,user_id" }
    );

    // 2. Award collaboration points & qualifying contribution to applicant
    try {
      await supabase.rpc("record_qualifying_contribution", {
        p_user_id: request.applicant_id,
        p_action_type: "accepted_contribution",
        p_points: 30,
        p_reference_id: request.project_id,
        p_reference_type: "project",
      });

      // Award first_collaboration achievement if not already
      await supabase.from("user_achievements").insert({
        user_id: request.applicant_id,
        achievement_id: "first_collaboration",
      });

      await supabase.from("user_achievements").insert({
        user_id: user.id,
        achievement_id: "first_collaboration",
      });
    } catch (e) {
      console.warn("Could not award collaboration achievement:", e);
    }

    // 3. Notify applicant
    await supabase.from("notifications").insert({
      user_id: request.applicant_id,
      type: "collaboration_accepted",
      title: "Collaboration Accepted!",
      message: `Congratulations! You have been accepted as ${request.opportunity?.role_needed} for "${request.project.title}". You now have access to the Team Workspace!`,
      link: `/workspace`,
    });
  } else {
    // Notify applicant of rejection
    await supabase.from("notifications").insert({
      user_id: request.applicant_id,
      type: "collaboration_rejected",
      title: "Application Status Update",
      message: `Your application for "${request.opportunity?.role_needed}" on "${request.project.title}" was not selected. ${feedback ? `Feedback: "${feedback}"` : ""}`,
      link: `/collaborate`,
    });
  }

  revalidatePath("/workspace");
  revalidatePath("/collaborate");
  return { success: true };
}

// Workspace Actions
export async function createProjectUpdateAction(
  projectId: string,
  title: string,
  content: string,
  versionTag?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Authentication required." };

  const cleanTitle = title.trim();
  const cleanContent = content.trim();

  if (!cleanTitle || !cleanContent) {
    return { success: false, error: "Title and content cannot be empty." };
  }

  const { data: updateRecord, error } = await supabase
    .from("project_updates")
    .insert({
      project_id: projectId,
      author_id: user.id,
      title: cleanTitle,
      content: cleanContent,
      version_tag: versionTag?.trim() || null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Publishing a genuine project update qualifies for daily streak!
  try {
    await supabase.rpc("record_qualifying_contribution", {
      p_user_id: user.id,
      p_action_type: "project_update",
      p_points: 15,
      p_reference_id: projectId,
      p_reference_type: "project",
    });
  } catch (e) {
    console.warn("Streak record error:", e);
  }

  revalidatePath("/workspace");
  return { success: true, update: updateRecord };
}

export async function createProjectTaskAction(
  projectId: string,
  title: string,
  description?: string,
  assignedTo?: string,
  dueDate?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Authentication required." };

  const cleanTitle = title.trim();
  if (!cleanTitle) return { success: false, error: "Task title is required." };

  const { data: task, error } = await supabase
    .from("project_tasks")
    .insert({
      project_id: projectId,
      title: cleanTitle,
      description: description?.trim() || "",
      assigned_to: assignedTo || null,
      created_by: user.id,
      due_date: dueDate || null,
      status: "todo",
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/workspace");
  return { success: true, task };
}

export async function updateProjectTaskStatusAction(taskId: string, status: TaskStatusType) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Authentication required." };

  const { data: task, error } = await supabase
    .from("project_tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*, project:projects(*)")
    .single();

  if (error || !task) return { success: false, error: error?.message || "Task not found." };

  // If completed, record qualifying contribution for user
  if (status === "completed") {
    const creditedUserId = task.assigned_to || user.id;
    try {
      await supabase.rpc("record_qualifying_contribution", {
        p_user_id: creditedUserId,
        p_action_type: "task_completed",
        p_points: 10,
        p_reference_id: task.project_id,
        p_reference_type: "project",
      });
    } catch (e) {
      console.warn("Could not award task completion points:", e);
    }
  }

  revalidatePath("/workspace");
  return { success: true };
}

export async function createProjectMilestoneAction(
  projectId: string,
  title: string,
  description?: string,
  targetDate?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Authentication required." };

  const { data: milestone, error } = await supabase
    .from("project_milestones")
    .insert({
      project_id: projectId,
      title: title.trim(),
      description: description?.trim() || "",
      target_date: targetDate || null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/workspace");
  return { success: true, milestone };
}

export async function toggleMilestoneCompletedAction(milestoneId: string, isCompleted: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Authentication required." };

  const { error } = await supabase
    .from("project_milestones")
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", milestoneId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/workspace");
  return { success: true };
}

