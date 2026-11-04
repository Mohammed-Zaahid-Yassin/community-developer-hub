// TypeScript Type Definitions for Community Developer Hub Schema

export type UserRoleType = 'member' | 'moderator' | 'lead' | 'admin' | 'super_admin';
export type ProjectStatusType = 'idea' | 'looking_for_collaborators' | 'in_progress' | 'completed' | 'archived';
export type CollaborationStatusType = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type TaskStatusType = 'todo' | 'in_progress' | 'under_review' | 'completed';
export type ReportStatusType = 'pending' | 'resolved' | 'dismissed';
export type AvailabilityType = 'available' | 'busy' | 'open_to_collaborate' | 'mentoring';
export type CollaborationStyleType = 'independent' | 'looking_for_collaborators' | 'open_to_join' | 'mentor' | 'seeking_mentor';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  department: string;
  github_url: string;
  linkedin_url: string;
  portfolio_url: string;
  current_availability: AvailabilityType;
  collaboration_style: CollaborationStyleType;
  preferred_categories: string[];
  skills_offered: string[];
  skills_needed: string[];
  is_public: boolean;
  is_suspended: boolean;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_contribution_date: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  role?: UserRoleType;
  projects_count?: number;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: UserRoleType;
  assigned_by: string | null;
  assigned_at: string;
}

export interface Technology {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  category: string;
  created_at: string;
}

export interface ProjectMedia {
  id: string;
  project_id: string;
  url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface Project {
  id: string;
  creator_id: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  status: ProjectStatusType;
  cover_image: string | null;
  github_url: string | null;
  live_url: string | null;
  demo_video_url: string | null;
  likes_count: number;
  bookmarks_count: number;
  comments_count: number;
  views_count: number;
  average_rating: number;
  rating_count: number;
  is_featured: boolean;
  featured_at: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  // relations
  creator?: Profile;
  technologies?: Technology[];
  media?: ProjectMedia[];
  members?: ProjectMember[];
  is_liked_by_me?: boolean;
  is_bookmarked_by_me?: boolean;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: Profile;
}

export interface CollaborationOpportunity {
  id: string;
  project_id: string;
  title: string;
  role_needed: string;
  required_skills: string[];
  positions_open: number;
  responsibilities: string;
  time_commitment: string;
  location_type: 'remote' | 'hybrid' | 'in_person';
  status: 'open' | 'filled' | 'closed';
  created_at: string;
  project?: Project;
  applications_count?: number;
}

export interface CollaborationRequest {
  id: string;
  opportunity_id: string;
  project_id: string;
  applicant_id: string;
  message: string;
  portfolio_links: string[];
  status: CollaborationStatusType;
  feedback: string | null;
  created_at: string;
  updated_at: string;
  applicant?: Profile;
  opportunity?: CollaborationOpportunity;
  project?: Project;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: TaskStatusType;
  assigned_to: string | null;
  created_by: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  author_id: string;
  title: string;
  content: string;
  version_tag: string | null;
  created_at: string;
  author?: Profile;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string;
  is_completed: boolean;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ProjectComment {
  id: string;
  project_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
  replies?: ProjectComment[];
}

export interface ProjectRating {
  id: string;
  project_id: string;
  user_id: string;
  technical_rating: number;
  innovation_rating: number;
  design_rating: number;
  documentation_rating: number;
  usefulness_rating: number;
  overall_rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface Contribution {
  id: string;
  user_id: string;
  action_type: string;
  reference_id: string | null;
  reference_type: string | null;
  points_awarded: number;
  contribution_date: string;
  created_at: string;
}

export interface StreakRecord {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_contribution_date: string | null;
  updated_at: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  badge_icon: string;
  category: string;
  points: number;
  unlocked_at?: string;
}

export interface Challenge {
  id: string;
  title: string;
  slug: string;
  description: string;
  instructions: string;
  evaluation_criteria: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  prize_info: string;
  banner_image: string | null;
  created_by: string | null;
  created_at: string;
  participants_count?: number;
  submissions_count?: number;
}

export interface ChallengeSubmission {
  id: string;
  challenge_id: string;
  user_id: string;
  project_id: string;
  summary: string;
  rank: number | null;
  score: number | null;
  feedback: string | null;
  submitted_at: string;
  user?: Profile;
  project?: Project;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  event_type: 'hackathon' | 'workshop' | 'demo_day' | 'talk';
  start_time: string;
  end_time: string;
  location: string;
  max_attendees: number | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  registrations_count?: number;
  is_registered?: boolean;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  author?: Profile;
}

export interface ProjectNomination {
  id: string;
  project_id: string;
  nominated_by: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  editorial_notes: string | null;
  created_at: string;
  project?: Project;
  nominator?: Profile;
}

export interface Report {
  id: string;
  reporter_id: string;
  content_type: 'project' | 'comment' | 'review' | 'profile' | 'collaboration_request';
  content_id: string;
  reason: string;
  details: string | null;
  status: ReportStatusType;
  action_taken: string | null;
  resolved_by: string | null;
  created_at: string;
  reporter?: Profile;
}

export interface PlatformSetting {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}
