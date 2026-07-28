import { requireSupabase } from "./supabase";
import type {
  AdminActivityHistory,
  AdminAnalyticsData,
  AdminCreatedPost,
  AdminUser,
  AnalyticsRange,
  DashboardData,
  GlobalPostMapData,
  PaginatedResult,
  PostDetail,
  PostComposerOptions,
  PostMapRange,
  PostMapStatus,
  PostRow,
  ReportRow,
  UserRow,
  UserDetail,
} from "../types";

const rpc = async <T>(
  name: string,
  args?: Record<string, unknown>,
): Promise<T> => {
  const { data, error } = await requireSupabase().rpc(name, args);

  if (error) {
    throw new Error(error.message);
  }

  return data as T;
};

export const getAdminMe = () => rpc<AdminUser>("admin_get_me");

export const getPostComposerOptions = () =>
  rpc<PostComposerOptions>("admin_get_post_composer_options");

export const createAdminPost = (input: {
  content: string;
  categoryId: string;
  latitude: number;
  longitude: number;
  shareLocation: boolean;
}) =>
  rpc<AdminCreatedPost>("admin_create_post", {
    _content: input.content,
    _category_id: input.categoryId,
    _latitude: input.latitude,
    _longitude: input.longitude,
    _share_location: input.shareLocation,
  });

export const getDashboard = () =>
  rpc<DashboardData>("admin_get_dashboard");

export const getAnalytics = async (
  days: AnalyticsRange,
): Promise<AdminAnalyticsData> => {
  const [analytics, history] = await Promise.all([
    rpc<AdminAnalyticsData>("admin_get_analytics", { _days: days }),
    rpc<AdminActivityHistory>("admin_get_activity_history", { _days: days }),
  ]);

  return {
    ...analytics,
    generated_at: history.generated_at,
    window_days: history.window_days,
    overview: {
      ...analytics.overview,
      ...history.overview,
    },
    timeseries: history.timeseries,
    categories: history.categories,
  };
};

export const listUsers = (params: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) =>
  rpc<PaginatedResult<UserRow>>("admin_list_users", {
    _search: params.search || null,
    _status: params.status ?? "all",
    _limit_count: params.limit ?? 25,
    _offset_count: params.offset ?? 0,
  });

export const getUserDetail = (userId: string, activityLimit = 50) =>
  rpc<UserDetail>("admin_get_user_detail", {
    _user_id: userId,
    _activity_limit: activityLimit,
  });

export const setUserStatus = (
  userId: string,
  status: "active" | "suspended",
  reason?: string,
) => {
  return requireSupabase()
    .functions.invoke<{ id: string; status: string; message?: string }>(
      "admin-manage-user",
      {
        body: { userId, status, reason: reason || null },
      },
    )
    .then(({ data, error }) => {
      if (error) throw new Error(data?.message || error.message);
      if (!data) throw new Error("No se recibio una respuesta valida.");
      return data;
    });
};

export const listPosts = (params: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) =>
  rpc<PaginatedResult<PostRow>>("admin_list_posts", {
    _search: params.search || null,
    _status: params.status ?? "all",
    _limit_count: params.limit ?? 25,
    _offset_count: params.offset ?? 0,
  });

export const getPostDetail = (postId: string, activityLimit = 100) =>
  rpc<PostDetail>("admin_get_post_detail", {
    _post_id: postId,
    _activity_limit: activityLimit,
  });

export const getGlobalPostMap = (
  status: PostMapStatus,
  days: PostMapRange,
) =>
  rpc<GlobalPostMapData>("admin_get_global_post_map", {
    _status: status,
    _days: days,
  });

export const setPostModeration = (
  postId: string,
  hidden: boolean,
  reason?: string,
) =>
  rpc<{ id: string; status: string }>("admin_set_post_moderation", {
    _post_id: postId,
    _hidden: hidden,
    _reason: reason || null,
  });

export const listReports = (params: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) =>
  rpc<PaginatedResult<ReportRow>>("admin_list_reports", {
    _search: params.search || null,
    _status: params.status ?? "pending",
    _limit_count: params.limit ?? 25,
    _offset_count: params.offset ?? 0,
  });

export const reviewReport = (
  reportId: string,
  status: "pending" | "resolved" | "dismissed",
  notes?: string,
  hidePost = false,
) =>
  rpc<{ id: string; status: string; post_hidden: boolean }>(
    "admin_review_report",
    {
      _report_id: reportId,
      _status: status,
      _notes: notes || null,
      _hide_post: hidePost,
    },
  );
