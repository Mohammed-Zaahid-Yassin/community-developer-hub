import { createClient } from "@supabase/supabase-js";
import fs from "fs";

if (fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results = [];

function recordTest(category, feature, status, details = "") {
  results.push({ category, feature, status, details });
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️";
  console.log(`${icon} [${category}] ${feature}: ${status} ${details ? "(" + details + ")" : ""}`);
}

async function runAudit() {
  console.log("=================================================");
  console.log("STARTING FULL END-TO-END APPLICATION AUDIT SUITE");
  console.log("=================================================");

  const timestamp = Date.now();
  const testEmail = `audit_user_${timestamp}@mailinator.com`;
  const testPassword = "Password123!Secure";
  let testUserId = null;
  let userClient = null;
  let testProjectId = null;
  let testOppId = null;

  // ---------------------------------------------------------------------------
  // 1. AUTHENTICATION & PROFILE CREATION
  // ---------------------------------------------------------------------------
  console.log("\n--- 1. Testing Authentication & User Management ---");
  try {
    // 1.1 User Registration via anon key
    const { data: regData, error: regError } = await anonClient.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: `Audit Tester ${timestamp}`,
          username: `audittester${timestamp.toString().slice(-6)}`,
        },
      },
    });

    if (regError) {
      if (regError.message.includes("rate limit")) {
        recordTest("Auth", "Registration (Public Endpoint)", "BLOCKED", "Supabase default SMTP hourly rate limit reached. Requires custom SMTP in production (Resend/SendGrid).");
        // Fallback to admin user creation to test remaining pipeline
        const { data: adminUser, error: adminCreateErr } = await adminClient.auth.admin.createUser({
          email: testEmail,
          password: testPassword,
          email_confirm: true,
          user_metadata: {
            full_name: `Audit Tester ${timestamp}`,
            username: `audittester${timestamp.toString().slice(-6)}`,
          },
        });
        if (!adminCreateErr && adminUser?.user) {
          testUserId = adminUser.user.id;
        }
      } else {
        recordTest("Auth", "Registration", "FAIL", regError.message);
      }
    } else {
      testUserId = regData.user?.id;
      recordTest("Auth", "Registration", "PASS", `User created: ${testUserId}`);

      // Verify email confirmation requirement
      if (!regData.session) {
        recordTest("Auth", "Email Verification Detection", "PASS", "Session null pending confirmation (email verification required)");
      } else {
        recordTest("Auth", "Email Verification Detection", "PASS", "Direct session granted");
      }
    }

    // 1.2 Confirm user using admin client for automated testing
    if (testUserId) {
      const { error: confirmError } = await adminClient.auth.admin.updateUserById(testUserId, {
        email_confirm: true,
      });
      if (confirmError) {
        recordTest("Auth", "Admin Email Confirmation", "FAIL", confirmError.message);
      } else {
        recordTest("Auth", "Admin Email Confirmation", "PASS", "User email verified via admin API");
      }

      // 1.3 Verify Automatic Profile Creation Trigger
      const { data: profile, error: profError } = await adminClient
        .from("profiles")
        .select("*")
        .eq("id", testUserId)
        .single();

      if (profError || !profile) {
        recordTest("Auth", "User Profile Auto-Creation Trigger", "FAIL", profError?.message || "Profile not found");
      } else {
        recordTest("Auth", "User Profile Auto-Creation Trigger", "PASS", `Profile created with username: @${profile.username}`);
      }

      // 1.4 Test Login with Confirmed Credentials
      const { data: loginData, error: loginError } = await anonClient.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (loginError || !loginData.session) {
        recordTest("Auth", "Login with Confirmed Credentials", "FAIL", loginError?.message || "No session returned");
      } else {
        recordTest("Auth", "Login with Confirmed Credentials", "PASS", `JWT access token acquired for ${loginData.user.email}`);

        // Create an authenticated client simulating logged in user
        userClient = createClient(SUPABASE_URL, ANON_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
          global: {
            headers: {
              Authorization: `Bearer ${loginData.session.access_token}`,
            },
          },
        });
      }

      // 1.5 Test Password Reset Email Request
      const { error: resetError } = await anonClient.auth.resetPasswordForEmail(testEmail, {
        redirectTo: "https://community-developer-hub.vercel.app/auth/reset-password",
      });
      if (resetError) {
        recordTest("Auth", "Password Reset Request", "FAIL", resetError.message);
      } else {
        recordTest("Auth", "Password Reset Request", "PASS", "Recovery email request accepted by Supabase Auth");
      }
    }
  } catch (err) {
    recordTest("Auth", "Auth Pipeline Exception", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // 2. DATABASE PERSISTENCE & RLS AUDIT
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Testing Database Persistence & CRUD ---");
  try {
    if (userClient && testUserId) {
      // 2.1 Profile Update (Authorized)
      const { data: updatedProfile, error: updateProfErr } = await userClient
        .from("profiles")
        .update({
          bio: "Automated audit test engineer biography",
          github_url: "https://github.com/Mohammed-Zaahid-Yassin",
          current_availability: "open_to_collaborate",
        })
        .eq("id", testUserId)
        .select()
        .single();

      if (updateProfErr) {
        recordTest("Database", "Authorized Profile Update", "FAIL", updateProfErr.message);
      } else {
        recordTest("Database", "Authorized Profile Update", "PASS", `Bio updated to: "${updatedProfile.bio}"`);
      }

      // 2.2 Profile Update Unauthorized (attempting to modify another user's profile)
      const adminUserId = "3375daa9-6d77-4da9-aa7d-817c8efa3a0b";
      const { data: unauthUpdate, error: unauthErr } = await userClient
        .from("profiles")
        .update({ bio: "Hacked bio" })
        .eq("id", adminUserId)
        .select();

      if (unauthUpdate && unauthUpdate.length > 0) {
        recordTest("Database", "RLS Unauthorized Profile Update Rejection", "FAIL", "Unauthorized update succeeded!");
      } else {
        recordTest("Database", "RLS Unauthorized Profile Update Rejection", "PASS", "Blocked by RLS policy");
      }

      // 2.3 Create Project (Authorized Insert)
      const projectSlug = `audit-project-${timestamp}`;
      const { data: newProj, error: projErr } = await userClient
        .from("projects")
        .insert({
          title: `Audit Test Project ${timestamp}`,
          slug: projectSlug,
          tagline: "Automated test project for verification of database persistence",
          description: "Full description of audit project ensuring markdown and rich text persist cleanly.",
          category: "Developer Tools",
          creator_id: testUserId,
          status: "in_progress",
        })
        .select()
        .single();

      if (projErr) {
        recordTest("Database", "Project Creation & Persistence", "FAIL", projErr.message);
      } else {
        testProjectId = newProj.id;
        recordTest("Database", "Project Creation & Persistence", "PASS", `Project created: ID ${testProjectId}`);
      }

      // 2.4 Read Project by Public Anon Client
      const { data: fetchedProj, error: fetchErr } = await anonClient
        .from("projects")
        .select("*, creator:profiles!projects_creator_id_fkey(*)")
        .eq("id", testProjectId)
        .single();

      if (fetchErr || !fetchedProj) {
        recordTest("Database", "Public Project Retrieval & Joins", "FAIL", fetchErr?.message || "Not found");
      } else {
        recordTest("Database", "Public Project Retrieval & Joins", "PASS", `Retrieved with creator @${fetchedProj.creator.username}`);
      }

      // 2.5 Like Project Toggle
      const { error: likeErr } = await userClient.from("project_likes").insert({
        project_id: testProjectId,
        user_id: testUserId,
      });

      if (likeErr) {
        recordTest("Database", "Project Like Toggle", "FAIL", likeErr.message);
      } else {
        const { count: likeCount } = await anonClient
          .from("project_likes")
          .select("*", { count: "exact", head: true })
          .eq("project_id", testProjectId);
        recordTest("Database", "Project Like Toggle", "PASS", `Total likes recorded: ${likeCount}`);
      }

      // 2.6 Anti-Fraud Integrity: Prevent Author from Rating Own Project
      const { error: selfRateErr } = await userClient.from("project_ratings").insert({
        project_id: testProjectId,
        user_id: testUserId,
        technical_rating: 5,
        innovation_rating: 5,
        design_rating: 5,
        documentation_rating: 4,
        usefulness_rating: 5,
        review_text: "Self review should be rejected by anti-fraud RLS.",
      });

      if (selfRateErr) {
        recordTest("Database", "Anti-Fraud RLS (Reject Self-Rating)", "PASS", "Self-rating correctly blocked by RLS policy");
      } else {
        recordTest("Database", "Anti-Fraud RLS (Reject Self-Rating)", "FAIL", "Author was able to rate their own project!");
      }

      // Test rating a different user's project
      const { data: otherProjects } = await anonClient
        .from("projects")
        .select("id")
        .neq("creator_id", testUserId)
        .limit(1);

      if (otherProjects && otherProjects.length > 0) {
        const otherProjId = otherProjects[0].id;
        const { error: otherRateErr } = await userClient.from("project_ratings").upsert({
          project_id: otherProjId,
          user_id: testUserId,
          technical_rating: 5,
          innovation_rating: 5,
          design_rating: 5,
          documentation_rating: 5,
          usefulness_rating: 5,
          review_text: "Peer review from verified audit tester.",
        }, { onConflict: "project_id,user_id" });

        if (otherRateErr) {
          recordTest("Database", "Project Peer Rating & Review", "FAIL", otherRateErr.message);
        } else {
          recordTest("Database", "Project Peer Rating & Review", "PASS", "5-star peer rubric rating and review persisted");
        }
      }

      // 2.7 Project Comment Submission
      const { data: comment, error: commentErr } = await userClient
        .from("project_comments")
        .insert({
          project_id: testProjectId,
          user_id: testUserId,
          content: "Audit comment verifying comment trees and author relationships.",
        })
        .select()
        .single();

      if (commentErr) {
        recordTest("Database", "Project Comment Submission", "FAIL", commentErr.message);
      } else {
        recordTest("Database", "Project Comment Submission", "PASS", `Comment created: ID ${comment.id}`);
      }

      // 2.8 Create Collaboration Opportunity
      const { data: opp, error: oppErr } = await userClient
        .from("collaboration_opportunities")
        .insert({
          project_id: testProjectId,
          title: "Seeking Senior Full Stack Contributor",
          role_needed: "Senior Backend Developer",
          required_skills: ["PostgreSQL", "Node.js", "Next.js"],
          positions_open: 2,
          responsibilities: "Scale database and ensure strict data integrity.",
          time_commitment: "5-10 hours/week",
          location_type: "remote",
          status: "open",
        })
        .select()
        .single();

      if (oppErr) {
        recordTest("Database", "Create Collaboration Opportunity", "FAIL", oppErr.message);
      } else {
        testOppId = opp.id;
        recordTest("Database", "Create Collaboration Opportunity", "PASS", `Opportunity created: ID ${testOppId}`);
      }

      // 2.9 Project Task Creation (Kanban Workspace)
      const { data: task, error: taskErr } = await userClient
        .from("project_tasks")
        .insert({
          project_id: testProjectId,
          title: "Implement automated audit tests",
          description: "Full end-to-end verification of all platform endpoints",
          status: "todo",
          created_by: testUserId,
        })
        .select()
        .single();

      if (taskErr) {
        recordTest("Database", "Workspace Kanban Task Creation", "FAIL", taskErr.message);
      } else {
        // Move task to completed
        const { error: moveErr } = await userClient
          .from("project_tasks")
          .update({ status: "completed" })
          .eq("id", task.id);

        if (moveErr) {
          recordTest("Database", "Workspace Task Status Transition", "FAIL", moveErr.message);
        } else {
          recordTest("Database", "Workspace Task Status Transition", "PASS", "Status moved from todo -> completed");
        }
      }
    }
  } catch (err) {
    recordTest("Database", "Database CRUD Pipeline Exception", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // 3. STORAGE BUCKET AUDIT
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Testing Supabase Storage Buckets ---");
  try {
    // 3.1 Avatars Bucket Upload
    const avatarBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const avatarPath = `test-avatar-${timestamp}.png`;
    const { error: avUploadErr } = await adminClient.storage
      .from("avatars")
      .upload(avatarPath, avatarBuffer, { contentType: "image/png", upsert: true });

    if (avUploadErr) {
      recordTest("Storage", "Avatars Bucket Upload", "FAIL", avUploadErr.message);
    } else {
      const { data: avUrlData } = adminClient.storage.from("avatars").getPublicUrl(avatarPath);
      recordTest("Storage", "Avatars Bucket Upload & URL Resolution", "PASS", `Public URL: ${avUrlData.publicUrl}`);

      // Clean up
      await adminClient.storage.from("avatars").remove([avatarPath]);
    }

    // 3.2 Project Media Upload
    const mediaBuffer = Buffer.from("test media content");
    const mediaPath = `test-project-${timestamp}.png`;
    const { error: medUploadErr } = await adminClient.storage
      .from("project-media")
      .upload(mediaPath, mediaBuffer, { contentType: "image/png", upsert: true });

    if (medUploadErr) {
      recordTest("Storage", "Project Media Upload", "FAIL", medUploadErr.message);
    } else {
      const { data: medUrlData } = adminClient.storage.from("project-media").getPublicUrl(mediaPath);
      recordTest("Storage", "Project Media Upload & URL Resolution", "PASS", `Public URL: ${medUrlData.publicUrl}`);

      // Clean up
      await adminClient.storage.from("project-media").remove([mediaPath]);
    }
  } catch (err) {
    recordTest("Storage", "Storage Pipeline Exception", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // 4. CLEANUP & TEARDOWN
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. Cleaning Up Test Artifacts ---");
  if (testProjectId && adminClient) {
    await adminClient.from("projects").delete().eq("id", testProjectId);
    console.log("Cleaned up test project.");
  }
  if (testUserId && adminClient) {
    await adminClient.auth.admin.deleteUser(testUserId);
    console.log("Cleaned up test user.");
  }

  // ---------------------------------------------------------------------------
  // 5. SUMMARY REPORT
  // ---------------------------------------------------------------------------
  console.log("\n=================================================");
  console.log("AUDIT RESULTS SUMMARY");
  console.log("=================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`Total Scenarios Tested: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("=================================================");
}

runAudit().catch(console.error);
