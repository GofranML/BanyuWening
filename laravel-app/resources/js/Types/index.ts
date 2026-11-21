export type UserRole = "ADMIN" | "OPERATOR" | "ANALIS" | "PEMILIK";

export interface User {
  id: number | string;
  name: string;
  email: string;
  role: UserRole;
  title?: string;
  pond_name?: string;
  avatar_initials?: string;
  phone?: string;
  two_factor_enabled?: boolean;
  created_at?: string;
}

export interface UserAccount {
  id: string | number;
  name: string;
  email: string;
  role: UserRole;
  title?: string;
  pondName?: string;
  avatarInitials: string;
  createdAt?: string;
  phone?: string;
  two_factor_enabled?: boolean;
}

export type RiskLevel = "AMAN" | "WASPADA" | "BAHAYA";
export type DeviceMode = "AUTO" | "MANUAL" | "FAILSAFE";

export interface SensorReading {
  id?: number;
  device_id?: string;
  pond_id?: string | number;
  ts: string;
  ph: number | null;
  temperature_c: number | null;
  tds_ppm: number | null;
  turbidity_ntu: number | null;
  water_level: "NORMAL" | "LOW";
  aerator_on: boolean;
  pump_on?: boolean;
  mode: DeviceMode;
  battery_v?: number | null;
  sensor_health?: "OK" | "SATURATED" | "FAULT";
  power_source?: "PLN" | "BACKUP_BUFFER" | string;
  transport?: string;
}

export interface PredictionResult {
  risk: RiskLevel;
  p_aman: number;
  p_waspada: number;
  p_bahaya: number;
  model_version: string;
  timeframe: string;
  triggers: string[];
  recommended_action: string;
  failsafe_active?: boolean;
  predicted_at?: string;
  pond_id?: string | number;
  is_pilot_model?: boolean;
  hitl_approved?: boolean;
}

export interface AlertItem {
  id: number;
  ts: string;
  level: "WASPADA" | "BAHAYA" | "INFO";
  param: string;
  message: string;
  value: number | null;
  telegram_sent: boolean;
  whatsapp_sent?: boolean;
  email_sent?: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  pond_name?: string;
  channel_primary?: "WHATSAPP" | "TELEGRAM" | "EMAIL" | "LOCAL";
  watchdog_flag?: string | null;
}

export interface DeviceInfo {
  device_code: string;
  name: string;
  pond_name: string;
  firmware_version: string;
  status: string;
  transport_protocol?: string;
  mode: DeviceMode;
  aerator_on: boolean;
  hardware_variant?: "ENTRY_1K" | "STARTER_2K" | "JURAGAN_4K" | string;
  pond_count?: number;
  backup_mode?: string;
  backup_health_pct?: number;
  offline_plus_active?: boolean;
  adc_channels?: number;
  relay_channels?: number;
}

export interface ManagedDevice extends DeviceInfo {
  id: number;
  api_token_prefix: string | null;
  has_token: boolean;
  token_active: boolean;
  token_rotated_at: string | null;
  token_last_used_at: string | null;
  last_heartbeat_at: string | null;
  ws_connected_at: string | null;
}

export type RealtimeTransportMode = "CONNECTING" | "WEBSOCKET" | "HTTP_FALLBACK";

export interface WebSocketProtocolSpec {
  channel: string;
  subprotocol: string;
  ws_url: string;
  direction: string;
  purpose: string;
  http_fallback: Record<string, string>;
}

export interface RealtimeConfig {
  ws_base_url: string;
  ws_stream_url: string;
  dashboard_subprotocol: string;
  dashboard_ticket: string | null;
  ws_connect_timeout_ms: number;
  http_fallback: {
    enabled: boolean;
    poll_interval_ms: number;
    base_url: string;
    endpoints: Record<string, string>;
  };
  protocols: Record<string, WebSocketProtocolSpec>;
  auth: {
    device_token_header: string;
    device_token_alt_header: string;
    device_token_ws_query: string;
  };
}

export interface AeratorState {
  isOn: boolean;
  mode: DeviceMode;
  dailyDuration: string;
}

export interface LandingCapability {
  title: string;
  desc: string;
  tag: string;
}

export interface LandingFaq {
  q: string;
  a: string;
}

export interface LandingContentSettings {
  hero_tag: string;
  hero_title: string;
  hero_subtitle: string;
  intro_statement_1: string;
  intro_statement_2: string;
  intro_statement_3: string;
  intro_statement_4: string;
  intro_statement_5: string;
  intro_desc: string;
  contact_email: string;
  contact_phone: string;
  institution_name: string;
  institution_url?: string;
  cta_text: string;
  cta_button_text: string;
  copyright_text: string;
  capabilities: LandingCapability[];
  faqs: LandingFaq[];

  // Optional Pitch Deck Metadata
  pitch_deck_version?: string;
  operational_status?: string;

  // Media (Images & Videos)
  hero_bg_image?: string;
  video_url?: string;
  video_poster?: string;
  step_1_img?: string;
  step_2_img?: string;
  step_3_img?: string;
  step_4_img?: string;
  step_5_img?: string;
  showcase_1_img?: string;
  showcase_2_img?: string;
  showcase_3_img?: string;
  showcase_4_img?: string;
  footer_bg_image?: string;
}

export interface BackupItem {
  filename: string;
  size: number;
  size_human: string;
  created_at: string;
  type: string;
}

export interface SecurityStats {
  total_users: number;
  users_with_2fa: number;
  db_driver: string;
  db_size: string;
  total_readings: number;
  total_predictions: number;
  mqtt_tls: string;
  failsafe_hardware: string;
  last_backup: string;
  csrf_protection: string;
}
