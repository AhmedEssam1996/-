/**
 * Canonical domain types for Hadiya.
 *
 * These mirror the SQL schema in supabase/migrations/0001_initial_schema.sql.
 * `Database` is written by hand (rather than generated) so the project builds
 * without a live Supabase project — but the shapes match the migrations exactly.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'DISABLED';
export type GiftStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED';
export type GiftType = 'experience' | 'message' | 'image' | 'story' | 'video' | 'quiz' | 'generic';
export type GiftVisibility = 'public' | 'unlisted';
export type AiFeature = 'gift_suggestions' | 'message' | 'gift_experience' | 'story' | 'vibe' | 'chat';
export type AiGenerationStatus = 'success' | 'error' | 'rate_limited' | 'invalid_output';

export const USER_ROLES: readonly UserRole[] = ['USER', 'ADMIN'];
export const GIFT_STATUSES: readonly GiftStatus[] = ['DRAFT', 'PUBLISHED', 'DISABLED'];

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: UserStatus;
  disabled_at: string | null;
  last_seen_at: string | null;
  signup_source: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRow {
  user_id: string;
  role: UserRole;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettingsRow {
  id: number;
  site_name: string;
  site_name_en: string;
  ai_model: string | null;
  ai_daily_limit: number;
  ai_monthly_limit: number;
  default_gift_visibility: GiftVisibility;
  maintenance_mode: boolean;
  feature_flags: Record<string, boolean>;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GiftTemplate {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  category: string;
  emoji: string | null;
  gradient: string | null;
  accent: string | null;
  type: GiftType;
  is_active: boolean;
  is_demo: boolean;
  default_sections: GiftSectionDraft[];
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Gift {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  category: string;
  template_id: string | null;
  type: GiftType;
  status: GiftStatus;
  visibility: GiftVisibility;
  content_json: GiftContent;
  cover_image: string | null;
  theme_json: GiftTheme;
  recipient_name: string | null;
  occasion: string | null;
  source: string;
  is_demo: boolean;
  disabled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GiftSectionRow {
  id: string;
  gift_id: string;
  type: string;
  position: number;
  content_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AiGenerationRow {
  id: string;
  user_id: string | null;
  session_id: string | null;
  feature: AiFeature;
  model: string;
  provider: string;
  status: AiGenerationStatus;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  latency_ms: number | null;
  gift_id: string | null;
  error_code: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface AnalyticsEventRow {
  id: number;
  user_id: string | null;
  session_id: string;
  event_name: string;
  page: string | null;
  referrer: string | null;
  source: string | null;
  device: string | null;
  browser: string | null;
  country: string | null;
  metadata_json: Record<string, unknown>;
  is_demo: boolean;
  created_at: string;
}

export interface GiftOpenRow {
  id: string;
  gift_id: string;
  session_id: string;
  opened_at: string;
  duration_seconds: number;
  device: string | null;
  browser: string | null;
  is_demo: boolean;
}

export interface AdminLogRow {
  id: string;
  admin_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Gift content (the JSON stored in gifts.content_json / gift_sections.content_json)
// ---------------------------------------------------------------------------
export type GiftSectionType =
  | 'cover'
  | 'message'
  | 'image'
  | 'story'
  | 'memory'
  | 'quote'
  | 'button'
  | 'countdown'
  | 'quiz'
  | 'final';

export interface GiftSectionDraft {
  id?: string;
  type: GiftSectionType;
  title?: string;
  content?: string;
  /** image url */
  url?: string;
  /** button */
  label?: string;
  href?: string;
  /** countdown */
  targetDate?: string;
  /** quiz */
  question?: string;
  options?: string[];
  answerIndex?: number;
}

export interface GiftContent {
  intro?: string;
  final_message?: string;
  theme?: string;
  [key: string]: unknown;
}

export interface GiftTheme {
  background?: string;
  accent?: string;
  font?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Composite / view models used by the UI
// ---------------------------------------------------------------------------
export interface GiftWithSections extends Gift {
  sections: GiftSectionRow[];
}

export interface GiftWithOwner extends Gift {
  owner: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
}

export interface GiftAnalytics {
  opens: number;
  uniqueOpens: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  avgDurationSeconds: number;
  sectionsCompletionRate: number;
  opensByDay: TimeSeriesPoint[];
  devices: DistributionSlice[];
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface DistributionSlice {
  label: string;
  value: number;
}

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
}

export interface AdminOverview {
  total_users: number;
  new_users_today: number;
  new_users_week: number;
  new_users_month: number;
  total_gifts: number;
  published_gifts: number;
  draft_gifts: number;
  gifts_today: number;
  total_opens: number;
  unique_opens: number;
  total_ai: number;
  ai_today: number;
  total_visitors: number;
  visitors_today: number;
  visitors_week: number;
  visitors_month: number;
  page_views: number;
  page_views_today: number;
  total_sessions: number;
  events_in_range: number;
  active_users_7d: number;
  active_users_30d: number;
}

export interface AdminTimeSeries {
  visitors: TimeSeriesPoint[];
  new_users: TimeSeriesPoint[];
  gifts_created: TimeSeriesPoint[];
  gifts_opened: TimeSeriesPoint[];
  ai_generations: TimeSeriesPoint[];
}

export interface AdminDistributions {
  top_categories: DistributionSlice[];
  ai_features: DistributionSlice[];
  devices: DistributionSlice[];
  browsers: DistributionSlice[];
  top_pages: DistributionSlice[];
  traffic_sources: DistributionSlice[];
  recent_events: Array<{
    event_name: string;
    page: string | null;
    created_at: string;
    session_id: string;
    device: string | null;
  }>;
}

export interface AdminFunnel {
  visitors: number;
  registered: number;
  created_gift: number;
  used_ai: number;
  published_gift: number;
  gift_opened: number;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: UserStatus;
  role: UserRole;
  is_demo: boolean;
  created_at: string;
  last_seen_at: string | null;
  gift_count: number;
  published_count: number;
  ai_count: number;
}

export interface AdminGiftRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  type: GiftType;
  status: GiftStatus;
  visibility: GiftVisibility;
  is_demo: boolean;
  created_at: string;
  published_at: string | null;
  disabled_at: string | null;
  opens: number;
  last_opened_at: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_id: string;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Commerce — products, Stripe orders, free digital claims
// (schema: supabase/migrations/0004_commerce.sql)
// ---------------------------------------------------------------------------
export type ProductKind = 'physical' | 'digital';
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'shipped';
export type ClaimItemType = 'product' | 'gift';
export type ChatRole = 'user' | 'assistant' | 'system';

export interface Product {
  id: string;
  slug: string;
  kind: ProductKind;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  category: string;
  price_cents: number;
  currency: string;
  images: string[];
  /** Optional .glb path under /public/models for the 3D viewer. */
  model_url: string | null;
  emoji: string | null;
  gradient: string | null;
  accent: string | null;
  /** null = unlimited (digital items). */
  stock: number | null;
  max_per_user: number;
  weight_grams: number | null;
  shipping_note_ar: string | null;
  is_active: boolean;
  is_claimable: boolean;
  is_demo: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

/** Frozen copy of the product stored on the order at purchase time. */
export interface OrderProductSnapshot {
  id: string;
  slug: string;
  kind: ProductKind;
  title_ar: string;
  title_en: string | null;
  price_cents: number;
  currency: string;
  emoji: string | null;
  gradient: string | null;
}

export interface OrderRow {
  id: string;
  user_id: string | null;
  email: string | null;
  product_id: string;
  product_snapshot: OrderProductSnapshot;
  quantity: number;
  amount_total: number;
  currency: string;
  status: OrderStatus;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  stripe_event_id: string | null;
  shipping_address: Record<string, unknown> | null;
  metadata_json: Record<string, unknown>;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClaimRow {
  id: string;
  item_type: ClaimItemType;
  item_id: string;
  user_id: string | null;
  email: string | null;
  visitor_hash: string;
  claim_ip_hash: string | null;
  metadata_json: Record<string, unknown>;
  is_demo: boolean;
  created_at: string;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  user_id: string | null;
  role: ChatRole;
  content: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  is_demo: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Commerce admin view models (return shapes of the 0004 SQL functions)
// ---------------------------------------------------------------------------
export interface AdminSalesOverview {
  revenue_total: number;
  revenue_range: number;
  orders_total: number;
  orders_paid: number;
  orders_pending: number;
  orders_range: number;
  units_sold: number;
  claims_total: number;
  claims_range: number;
  active_products: number;
  low_stock_products: number;
  avg_order_value: number;
}

export interface AdminSalesTimeSeries {
  revenue: TimeSeriesPoint[];
  orders: TimeSeriesPoint[];
  claims: TimeSeriesPoint[];
}

export interface AdminOrderRow {
  id: string;
  email: string | null;
  status: OrderStatus;
  quantity: number;
  amount_total: number;
  currency: string;
  product_title: string | null;
  product_kind: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  created_at: string;
}

export interface AdminClaimRow {
  id: string;
  item_type: ClaimItemType;
  item_id: string;
  email: string | null;
  user_id: string | null;
  created_at: string;
  item_title: string | null;
}

// ---------------------------------------------------------------------------
// Feature flags (admin-controlled, stored in app_settings.feature_flags)
// ---------------------------------------------------------------------------
export interface FeatureFlags {
  ai_gift_finder: boolean;
  ai_message_generator: boolean;
  ai_story_generator: boolean;
  video_gifts: boolean;
  ai_image_generation: boolean;
  gift_analytics: boolean;
  public_gifts: boolean;
  /** Floating, context-aware OpenRouter chatbot. */
  ai_chatbot: boolean;
  /** Shop (physical products via Stripe + free digital claims). */
  commerce: boolean;
  [key: string]: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  ai_gift_finder: true,
  ai_message_generator: true,
  ai_story_generator: true,
  video_gifts: false,
  ai_image_generation: false,
  gift_analytics: true,
  public_gifts: true,
  ai_chatbot: true,
  commerce: true,
};

export const FEATURE_FLAG_LABELS: Record<keyof FeatureFlags, string> = {
  ai_gift_finder: 'مكتشف الهدايا بالذكاء الاصطناعي',
  ai_message_generator: 'مولّد الرسائل',
  ai_story_generator: 'مولّد القصص',
  video_gifts: 'هدايا الفيديو',
  ai_image_generation: 'توليد الصور بالذكاء الاصطناعي',
  gift_analytics: 'تحليلات الهدايا',
  public_gifts: 'الهدايا العامة',
  ai_chatbot: 'مساعد الذكاء الاصطناعي (الشات)',
  commerce: 'المتجر والمدفوعات',
};

// ---------------------------------------------------------------------------
// Session / auth view
// ---------------------------------------------------------------------------
export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
}

/**
 * Minimal hand-written Supabase schema typing.
 *
 * `Relationships` is required on every table by the supabase-js v2 generic
 * signature; omitting it makes the client fall back to `never` for insert
 * payloads. `Relationships: []` is the documented "no foreign keys declared"
 * value for a hand-written schema.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      user_roles: {
        Row: UserRoleRow;
        Insert: Partial<UserRoleRow> & { user_id: string };
        Update: Partial<UserRoleRow>;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettingsRow;
        Insert: Partial<AppSettingsRow>;
        Update: Partial<AppSettingsRow>;
        Relationships: [];
      };
      gift_templates: {
        Row: GiftTemplate;
        Insert: Partial<GiftTemplate> & { slug: string; title_ar: string; title_en: string; category: string };
        Update: Partial<GiftTemplate>;
        Relationships: [];
      };
      gifts: {
        Row: Gift;
        Insert: Partial<Gift> & { user_id: string; slug: string };
        Update: Partial<Gift>;
        Relationships: [];
      };
      gift_sections: {
        Row: GiftSectionRow;
        Insert: Partial<GiftSectionRow> & { gift_id: string; type: string };
        Update: Partial<GiftSectionRow>;
        Relationships: [];
      };
      ai_generations: {
        Row: AiGenerationRow;
        Insert: Partial<AiGenerationRow> & { feature: AiFeature; model: string };
        Update: Partial<AiGenerationRow>;
        Relationships: [];
      };
      analytics_events: {
        Row: AnalyticsEventRow;
        Insert: Partial<AnalyticsEventRow> & { session_id: string; event_name: string };
        Update: Partial<AnalyticsEventRow>;
        Relationships: [];
      };
      gift_opens: {
        Row: GiftOpenRow;
        Insert: Partial<GiftOpenRow> & { gift_id: string; session_id: string };
        Update: Partial<GiftOpenRow>;
        Relationships: [];
      };
      admin_logs: {
        Row: AdminLogRow;
        Insert: Partial<AdminLogRow> & { action: string };
        Update: Partial<AdminLogRow>;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: Partial<Product> & { slug: string; title_ar: string };
        Update: Partial<Product>;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        Insert: Partial<OrderRow> & { product_id: string; product_snapshot: OrderProductSnapshot; amount_total: number };
        Update: Partial<OrderRow>;
        Relationships: [];
      };
      claims: {
        Row: ClaimRow;
        Insert: Partial<ClaimRow> & { item_type: ClaimItemType; item_id: string; visitor_hash: string };
        Update: Partial<ClaimRow>;
        Relationships: [];
      };
      stripe_events: {
        Row: { id: string; type: string; payload: Record<string, unknown>; processed_at: string };
        Insert: { id: string; type: string; payload?: Record<string, unknown> };
        Update: Partial<{ id: string; type: string; payload: Record<string, unknown>; processed_at: string }>;
        Relationships: [];
      };
      chat_messages: {
        Row: ChatMessageRow;
        Insert: Partial<ChatMessageRow> & { session_id: string; role: ChatRole; content: string };
        Update: Partial<ChatMessageRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      admin_overview: { Args: { p_since: string }; Returns: AdminOverview };
      admin_time_series: { Args: { p_since: string }; Returns: AdminTimeSeries };
      admin_distributions: { Args: Record<string, never>; Returns: AdminDistributions };
      admin_funnel: { Args: Record<string, never>; Returns: AdminFunnel };
      admin_sales_overview: { Args: { p_since: string }; Returns: AdminSalesOverview };
      admin_sales_time_series: { Args: { p_since: string }; Returns: AdminSalesTimeSeries };
      admin_orders: { Args: { p_limit?: number; p_offset?: number; p_status?: string | null }; Returns: { total: number; rows: AdminOrderRow[] } };
      admin_claims: { Args: { p_limit?: number; p_offset?: number }; Returns: { total: number; rows: AdminClaimRow[] } };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      current_role_name: { Args: Record<string, never>; Returns: string };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      gift_status: GiftStatus;
      gift_type: GiftType;
      ai_feature: AiFeature;
      ai_generation_status: AiGenerationStatus;
    };
    CompositeTypes: Record<never, never>;
  };
}

/**
 * Supabase's generic signature expects a `Database` with a `__InternalSupabase`
 * marker to enable the strict postgrest-js inference path. Declaring it is what
 * makes `.insert({...})` type as `Insert` rather than collapsing to `never` in
 * the `@supabase/ssr` client. See supabase-js v2.49+ typing changes.
 */
export type TypedDatabase = Database & {
  __InternalSupabase: { PostgrestVersion: '12' };
};