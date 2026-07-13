export type AdminView = "dashboard" | "reports" | "posts" | "users";

export type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type DashboardMetrics = {
  users_total: number;
  users_new_7d: number;
  users_suspended: number;
  posts_visible: number;
  posts_24h: number;
  posts_moderated: number;
  reports_pending: number;
  reports_7d: number;
};

export type RecentReport = {
  id: string;
  reason: string;
  details: string | null;
  created_at: string;
  post_id: string;
  post_content: string | null;
  author_name: string;
  reporter_name: string;
};

export type DashboardData = {
  generated_at: string;
  metrics: DashboardMetrics;
  recent_reports: RecentReport[];
};

export type UserRow = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  account_status: "active" | "suspended";
  suspension_reason: string | null;
  suspended_at: string | null;
  posts_count: number;
  likes_received_count: number;
  rank_score: number | string | null;
  reports_received_count: number;
  is_admin: boolean;
};

export type PostRow = {
  id: string;
  content: string;
  post_type: string | null;
  created_at: string;
  deleted_at: string | null;
  author_id: string;
  share_slug: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  category_slug: string | null;
  category_name: string | null;
  likes_count: number;
  comments_count: number;
  report_count: number;
  status: "visible" | "moderated" | "deleted";
  moderation_reason: string | null;
  moderated_at: string | null;
};

export type ReportRow = {
  id: string;
  post_id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reason: string;
  details: string | null;
  created_at: string;
  status: "pending" | "resolved" | "dismissed";
  review_notes: string | null;
  reviewed_at: string | null;
  post_content: string | null;
  post_deleted_at: string | null;
  author_id: string | null;
  author_name: string;
  author_avatar_url: string | null;
  reporter_name: string;
  reviewer_name: string | null;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
};
