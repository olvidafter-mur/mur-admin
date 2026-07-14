export type AdminView = "dashboard" | "map" | "publish" | "reports" | "posts" | "users";
export type Theme = "light" | "dark";

export type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type PostComposerCategory = {
  id: string;
  slug: string;
  name: string;
  color: string | null;
  icon: string | null;
};

export type PostComposerOptions = {
  categories: PostComposerCategory[];
  content_limit: number;
  expires_in_hours: number;
};

export type AdminCreatedPost = {
  id: string;
  share_slug: string;
  content: string;
  created_at: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  latitude: number;
  longitude: number;
  share_location: boolean;
  expires_at: string;
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

export type AnalyticsRange = 7 | 30 | 90;

export type AnalyticsOverview = {
  users_total: number;
  users_new: number;
  active_users: number;
  active_users_previous: number;
  posts: number;
  posts_previous: number;
  interactions: number;
  interactions_previous: number;
  reports: number;
  reports_previous: number;
  reports_pending: number;
  reports_reviewed: number;
  reports_resolved: number;
  median_review_hours: number | null;
  admin_actions: number;
  users_suspended: number;
  posts_moderated: number;
};

export type AnalyticsPoint = {
  date: string;
  new_users: number;
  active_users: number;
  posts: number;
  likes: number;
  comments: number;
  reports: number;
};

export type CategoryInsight = {
  slug: string;
  name: string;
  color: string | null;
  posts: number;
  interactions: number;
  reports: number;
  report_rate: number;
};

export type ActivityHistoryOverview = Pick<
  AnalyticsOverview,
  | "users_new"
  | "active_users"
  | "active_users_previous"
  | "posts"
  | "posts_previous"
  | "interactions"
  | "interactions_previous"
  | "reports"
  | "reports_previous"
>;

export type AdminActivityHistory = {
  generated_at: string;
  window_days: AnalyticsRange;
  overview: ActivityHistoryOverview;
  timeseries: AnalyticsPoint[];
  categories: CategoryInsight[];
};

export type AudienceSegment = {
  key: "core" | "creators" | "participants" | "quiet";
  label: string;
  users: number;
  description: string;
};

export type RiskSignal = {
  kind: "reports" | "burst" | "blocks";
  severity: "high" | "medium" | "low";
  user_id: string;
  user_name: string;
  value: number;
  title: string;
  detail: string;
};

export type NetworkNode = {
  id: string;
  name: string;
  score: number;
  activity: number;
  reports: number;
  segment: "signal" | "creator" | "participant";
};

export type NetworkEdge = {
  source: string;
  target: string;
  weight: number;
  likes: number;
  comments: number;
};

export type AdminAnalyticsData = {
  generated_at: string;
  window_days: AnalyticsRange;
  overview: AnalyticsOverview;
  timeseries: AnalyticsPoint[];
  categories: CategoryInsight[];
  segments: AudienceSegment[];
  signals: RiskSignal[];
  network: {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  };
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

export type UserDetailProfile = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  onboarding_completed: boolean;
  date_of_birth: string | null;
  terms_version: string | null;
  terms_accepted_at: string | null;
  adult_confirmed_at: string | null;
  responsibility_acknowledged_at: string | null;
  account_status: "active" | "suspended";
  suspension_reason: string | null;
  suspended_at: string | null;
  suspension_updated_at: string | null;
  suspension_updated_by: string | null;
  suspension_updated_by_name: string | null;
};

export type UserDetailPreferences = {
  language_preference: "system" | "en" | "es";
  theme_preference: "system" | "light" | "dark";
  nearby_radius_meters: number;
  updated_at: string | null;
};

export type UserDetailMetrics = {
  posts_total: number;
  posts_visible: number;
  posts_moderated: number;
  posts_deleted: number;
  likes_received: number;
  comments_received: number;
  likes_given: number;
  comments_given: number;
  reports_received: number;
  reports_made: number;
  blocked_by: number;
  blocks_made: number;
  unread_notifications: number;
  active_push_devices: number;
};

export type UserDetailRanking = {
  total_score: number | string;
  normalized_score: number | string;
  activity_score: number | string;
  author_quality_score: number | string;
  community_score: number | string;
  consistency_score: number | string;
  trust_score: number | string;
  monetization_score: number | string;
  moderation_penalty: number | string;
  boost_multiplier: number | string;
  components: Record<string, unknown>;
  calculated_at: string;
};

export type UserDetailPost = {
  id: string;
  share_slug: string | null;
  content: string;
  post_type: string | null;
  created_at: string;
  deleted_at: string | null;
  category_name: string | null;
  status: "visible" | "moderated" | "deleted";
  moderation_reason: string | null;
  likes_count: number;
  comments_count: number;
  report_count: number;
  preview_image_url: string | null;
};

export type UserDetailComment = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  post_id: string;
  post_share_slug: string | null;
  post_content: string;
  post_author_name: string | null;
};

export type UserDetailReport = {
  id: string;
  post_id: string;
  post_share_slug: string | null;
  post_content: string;
  reporter_id: string;
  reporter_name: string | null;
  reporter_username: string | null;
  reason: string;
  details: string | null;
  created_at: string;
  status: "pending" | "resolved" | "dismissed";
  review_notes: string | null;
  reviewed_at: string | null;
  reviewer_name: string | null;
};

export type UserDetail = {
  profile: UserDetailProfile;
  preferences: UserDetailPreferences;
  metrics: UserDetailMetrics;
  ranking: UserDetailRanking | null;
  recent_posts: UserDetailPost[];
  recent_comments: UserDetailComment[];
  reports_received: UserDetailReport[];
  activity_limit: number;
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

export type PostDetailPost = PostRow & {
  visibility: string | null;
  author_email: string | null;
  is_verified: boolean;
  is_edited: boolean;
  edited_at: string | null;
  share_location: boolean;
  latitude: number | null;
  longitude: number | null;
  moderated_by: string | null;
};

export type PostDetailMedia = {
  id: string;
  media_type: "image" | "audio";
  public_url: string;
  mime_type: string;
  size_bytes: number;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
};

export type PostDetailPollOption = {
  id: string;
  option_text: string;
  sort_order: number;
  votes_count: number;
};

export type PostDetailPoll = {
  id: string;
  question: string;
  created_at: string;
  total_votes: number;
  options: PostDetailPollOption[];
};

export type PostDetailLike = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
};

export type PostDetailComment = {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  content: string;
  created_at: string;
  updated_at: string;
};

export type PostDetailReport = {
  id: string;
  reporter_id: string;
  reporter_username: string | null;
  reporter_display_name: string | null;
  reporter_avatar_url: string | null;
  reason: string;
  details: string | null;
  created_at: string;
  status: "pending" | "resolved" | "dismissed";
  review_notes: string | null;
  reviewed_at: string | null;
  reviewer_name: string | null;
};

export type PostDetail = {
  post: PostDetailPost;
  media: PostDetailMedia[];
  poll: PostDetailPoll | null;
  likes: PostDetailLike[];
  comments: PostDetailComment[];
  reports: PostDetailReport[];
  activity_limit: number;
};

export type PostMapStatus = "all" | PostRow["status"];
export type PostMapRange = 0 | 30 | 90;

export type GlobalMapPost = {
  id: string;
  content: string;
  post_type: string | null;
  created_at: string;
  deleted_at: string | null;
  author_id: string;
  share_location: boolean;
  latitude: number;
  longitude: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  category_slug: string | null;
  category_name: string | null;
  likes_count: number;
  comments_count: number;
  report_count: number;
  status: PostRow["status"];
  moderation_reason: string | null;
};

export type GlobalPostMapData = {
  items: GlobalMapPost[];
  total: number;
  visible: number;
  moderated: number;
  deleted: number;
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
