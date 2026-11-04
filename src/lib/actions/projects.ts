"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { ProjectStatusType } from "@/types/database";

export interface ProjectFormData {
  title: string;
  tagline: string;
  description: string;
  category: string;
  status: ProjectStatusType;
  coverImage?: string;
  githubUrl?: string;
  liveUrl?: string;
  demoVideoUrl?: string;
  technologies: string[]; // tech names or IDs
  screenshots?: string[];
}

export async function createProjectAction(data: ProjectFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required to create a project." };
  }

  // Generate unique slug
  const baseSlug = slugify(data.title);
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const slug = `${baseSlug}-${randomSuffix}`;

  try {
    // 1. Insert Project record
    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        creator_id: user.id,
        title: data.title.trim(),
        slug,
        tagline: data.tagline.trim(),
        description: data.description.trim(),
        category: data.category,
        status: data.status,
        cover_image: data.coverImage?.trim() || null,
        github_url: data.githubUrl?.trim() || null,
        live_url: data.liveUrl?.trim() || null,
        demo_video_url: data.demoVideoUrl?.trim() || null,
        is_approved: true,
      })
      .select()
      .single();

    if (insertError || !project) {
      return { success: false, error: insertError?.message || "Failed to create project." };
    }

    // 2. Insert technologies
    if (data.technologies && data.technologies.length > 0) {
      for (const techName of data.technologies) {
        const cleanName = techName.trim();
        if (!cleanName) continue;
        const techSlug = slugify(cleanName);

        // Get or insert tech
        let techId: string | null = null;
        const { data: existingTech } = await supabase
          .from("technologies")
          .select("id")
          .eq("slug", techSlug)
          .maybeSingle();

        if (existingTech) {
          techId = existingTech.id;
        } else {
          const { data: newTech } = await supabase
            .from("technologies")
            .insert({ name: cleanName, slug: techSlug, category: "other" })
            .select("id")
            .single();
          if (newTech) techId = newTech.id;
        }

        if (techId) {
          await supabase
            .from("project_technologies")
            .insert({ project_id: project.id, technology_id: techId })
            .maybeSingle();
        }
      }
    }

    // 3. Insert screenshots into project_media
    if (data.screenshots && data.screenshots.length > 0) {
      const mediaRows = data.screenshots
        .filter((url) => url.trim().length > 0)
        .map((url, index) => ({
          project_id: project.id,
          url: url.trim(),
          media_type: "image",
          sort_order: index,
        }));

      if (mediaRows.length > 0) {
        await supabase.from("project_media").insert(mediaRows);
      }
    }

    // 4. Award initial project creation points & record contribution
    try {
      await supabase.rpc("record_qualifying_contribution", {
        p_user_id: user.id,
        p_action_type: "project_create",
        p_points: 50,
        p_reference_id: project.id,
        p_reference_type: "project",
      });

      // Unlock first_project achievement
      await supabase.from("user_achievements").insert({
        user_id: user.id,
        achievement_id: "first_project",
      });
    } catch (e) {
      console.warn("Could not award contribution points:", e);
    }

    revalidatePath("/projects");
    revalidatePath(`/profile/${user.id}`);

    return { success: true, slug: project.slug, id: project.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected server error." };
  }
}

export async function updateProjectAction(projectId: string, data: Partial<ProjectFormData>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  // Verify ownership or lead/admin
  const { data: existing } = await supabase
    .from("projects")
    .select("creator_id, status")
    .eq("id", projectId)
    .single();

  if (!existing || existing.creator_id !== user.id) {
    return { success: false, error: "You do not have permission to modify this project." };
  }

  try {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.title) updatePayload.title = data.title.trim();
    if (data.tagline) updatePayload.tagline = data.tagline.trim();
    if (data.description) updatePayload.description = data.description.trim();
    if (data.category) updatePayload.category = data.category;
    if (data.status) updatePayload.status = data.status;
    if (data.coverImage !== undefined) updatePayload.cover_image = data.coverImage.trim() || null;
    if (data.githubUrl !== undefined) updatePayload.github_url = data.githubUrl.trim() || null;
    if (data.liveUrl !== undefined) updatePayload.live_url = data.liveUrl.trim() || null;
    if (data.demoVideoUrl !== undefined) updatePayload.demo_video_url = data.demoVideoUrl.trim() || null;

    const { error: updateError } = await supabase
      .from("projects")
      .update(updatePayload)
      .eq("id", projectId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // If marked as completed and wasn't completed before, award milestone achievement
    if (data.status === "completed" && existing.status !== "completed") {
      try {
        await supabase.rpc("record_qualifying_contribution", {
          p_user_id: user.id,
          p_action_type: "project_complete",
          p_points: 100,
          p_reference_id: projectId,
          p_reference_type: "project",
        });

        await supabase.from("user_achievements").insert({
          user_id: user.id,
          achievement_id: "project_finisher",
        });
      } catch (e) {
        console.warn("Could not record completion:", e);
      }
    }

    revalidatePath("/projects");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update project." };
  }
}

export async function deleteProjectAction(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Authentication required." };

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("creator_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/projects");
  return { success: true };
}

export async function toggleLikeProjectAction(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Must be signed in to appreciate projects." };

  const { data: existing } = await supabase
    .from("project_likes")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("project_likes")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user.id);
    return { success: true, liked: false };
  } else {
    await supabase.from("project_likes").insert({
      project_id: projectId,
      user_id: user.id,
    });
    return { success: true, liked: true };
  }
}

export async function toggleBookmarkProjectAction(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Must be signed in to bookmark projects." };

  const { data: existing } = await supabase
    .from("project_bookmarks")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("project_bookmarks")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user.id);
    return { success: true, bookmarked: false };
  } else {
    await supabase.from("project_bookmarks").insert({
      project_id: projectId,
      user_id: user.id,
    });
    return { success: true, bookmarked: true };
  }
}

export async function addProjectCommentAction(projectId: string, content: string, parentId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Must be signed in to comment." };

  const cleanContent = content.trim();
  if (!cleanContent) return { success: false, error: "Comment content cannot be empty." };

  const { data, error } = await supabase
    .from("project_comments")
    .insert({
      project_id: projectId,
      user_id: user.id,
      content: cleanContent,
      parent_id: parentId || null,
    })
    .select("*, author:profiles(*)")
    .single();

  if (error) return { success: false, error: error.message };

  // Notify project creator
  const { data: proj } = await supabase
    .from("projects")
    .select("creator_id, title, slug")
    .eq("id", projectId)
    .single();

  if (proj && proj.creator_id !== user.id) {
    await supabase.from("notifications").insert({
      user_id: proj.creator_id,
      type: "comment",
      title: "New Project Comment",
      message: `Someone commented on your project "${proj.title}".`,
      link: `/projects/${proj.slug}`,
    });
  }

  return { success: true, comment: data };
}

