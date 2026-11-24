export type UserRole = "ADMIN" | "OPERATOR" | "ANALIS" | "PEMILIK";

export type PermissionKey =
  | "view_summary"
  | "view_charts"
  | "view_alerts"
  | "ack_alerts"
  | "control_aerator"
  | "view_predictions"
  | "export_csv"
  | "view_tutorial"
  | "view_analis_data"
  | "view_owner_report"
  | "update_device_firmware"
  | "manage_users"
  | "manage_landing"
  | "manage_notifications"
  | "manage_backups"
  | "view_docs_api";

export type UserPermissions = Record<PermissionKey, boolean>;

export interface PermissionMeta {
  key: PermissionKey;
  label: string;
  description: string;
  category: "Monitoring & Operasional" | "Analitik & Pelaporan" | "Administrasi & Sistem";
}

export const PERMISSION_CATALOG: PermissionMeta[] = [
  {
    key: "view_summary",
    label: "Ringkasan Realtime",
    description: "Melihat kartu status kolam, bacaan sensor terkini, dan status perangkat ESP32.",
    category: "Monitoring & Operasional",
  },
  {
    key: "view_charts",
    label: "Grafik Riwayat Multi-Parameter",
    description: "Mengakses grafik tren pH, Suhu, TDS, dan Kekeruhan (6j/24j/7h).",
    category: "Monitoring & Operasional",
  },
  {
    key: "view_alerts",
    label: "Peringatan & Log Notifikasi",
    description: "Melihat daftar log anomali kualitas air dan riwayat alert.",
    category: "Monitoring & Operasional",
  },
  {
    key: "ack_alerts",
    label: "Konfirmasi (Acknowledge) Peringatan",
    description: "Menandai peringatan bahaya/waspada sebagai sudah ditangani di lapangan.",
    category: "Monitoring & Operasional",
  },
  {
    key: "control_aerator",
    label: "Kendali Manual & Otomasi Aerator",
    description: "Menyalakan/mematikan relay aerator (ON/OFF/AUTO) dan mengatur timer durasi.",
    category: "Monitoring & Operasional",
  },
  {
    key: "view_tutorial",
    label: "Tutorial Alat & SOP Lapangan",
    description: "Membuka modul SOP lapangan, kalibrasi probe, dan perawatan sensor.",
    category: "Monitoring & Operasional",
  },
  {
    key: "view_predictions",
    label: "Prediksi Risiko Machine Learning",
    description: "Melihat detail probabilitas & faktor pemicu Random Forest 1–3 jam ke depan.",
    category: "Analitik & Pelaporan",
  },
  {
    key: "export_csv",
    label: "Ekspor Dataset CSV",
    description: "Mengunduh dataset historis pembacaan sensor dalam format CSV Indonesia (;).",
    category: "Analitik & Pelaporan",
  },
  {
    key: "view_analis_data",
    label: "Pembacaan Data Lengkap Analis",
    description: "Membuka tabel pembacaan data mentah lengkap dan analisis deviasi parameter.",
    category: "Analitik & Pelaporan",
  },
  {
    key: "view_owner_report",
    label: "Laporan Eksekutif Pemilik (WQI)",
    description: "Membuka laporan ringkas eksekutif WQI, proyeksi panen, dan efisiensi aerasi.",
    category: "Analitik & Pelaporan",
  },
  {
    key: "update_device_firmware",
    label: "Update Firmware Alat IoT (Self-OTA)",
    description: "Mengizinkan akun peternak melakukan update & uji simulasi firmware pada alat IoT yang ditugaskan kepadanya.",
    category: "Monitoring & Operasional",
  },
  {
    key: "manage_users",
    label: "Buat & Kelola Akun + Hak Akses",
    description: "Menambah, mengedit, menghapus akun serta mengkustom hak akses pengguna.",
    category: "Administrasi & Sistem",
  },
  {
    key: "manage_landing",
    label: "Manajemen Konten Landing Page",
    description: "Mengedit teks hero, video demo, galeri media, FAQ, dan kontak resmi.",
    category: "Administrasi & Sistem",
  },
  {
    key: "manage_notifications",
    label: "Konfigurasi Bot & Notifikasi",
    description: "Mengatur token Bot Telegram, WhatsApp Gateway, dan SMTP Email alert.",
    category: "Administrasi & Sistem",
  },
  {
    key: "manage_backups",
    label: "Keamanan & Backup Database",
    description: "Membuat snapshot backup SQLite/JSON, mengunduh arsip, dan audit keamanan.",
    category: "Administrasi & Sistem",
  },
  {
    key: "view_docs_api",
    label: "Dokumentasi Lengkap, OTA & RF MLOps",
    description: "Mengakses Dokumentasi Arsitektur, Protokol OTA ESP32, Performa RF & Swagger API.",
    category: "Administrasi & Sistem",
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  ADMIN: {
    view_summary: true,
    view_charts: true,
    view_alerts: true,
    ack_alerts: true,
    control_aerator: true,
    view_predictions: true,
    export_csv: true,
    view_tutorial: false,
    view_analis_data: false,
    view_owner_report: false,
    update_device_firmware: true,
    manage_users: true,
    manage_landing: true,
    manage_notifications: true,
    manage_backups: true,
    view_docs_api: true,
  },
  OPERATOR: {
    view_summary: true,
    view_charts: true,
    view_alerts: true,
    ack_alerts: true,
    control_aerator: true,
    view_predictions: false,
    export_csv: false,
    view_tutorial: true,
    view_analis_data: false,
    view_owner_report: false,
    update_device_firmware: false,
    manage_users: false,
    manage_landing: false,
    manage_notifications: false,
    manage_backups: false,
    view_docs_api: false,
  },
  ANALIS: {
    view_summary: true,
    view_charts: true,
    view_alerts: true,
    ack_alerts: true,
    control_aerator: false,
    view_predictions: true,
    export_csv: true,
    view_tutorial: false,
    view_analis_data: true,
    view_owner_report: false,
    update_device_firmware: false,
    manage_users: false,
    manage_landing: false,
    manage_notifications: false,
    manage_backups: false,
    view_docs_api: false,
  },
  PEMILIK: {
    view_summary: true,
    view_charts: false,
    view_alerts: true,
    ack_alerts: false,
    control_aerator: false,
    view_predictions: false,
    export_csv: false,
    view_tutorial: false,
    view_analis_data: false,
    view_owner_report: true,
    update_device_firmware: false,
    manage_users: false,
    manage_landing: false,
    manage_notifications: false,
    manage_backups: false,
    view_docs_api: false,
  },
};

export interface Tenant {
  id: number;
  code: string;
  name: string;
  pond_name: string;
  pic_name?: string | null;
  phone?: string | null;
  address?: string | null;
  owner_user_id?: number | null;
  owner?: {
    id: number;
    name: string;
    email: string;
    role: string;
    phone?: string | null;
  } | null;
  status: "ACTIVE" | "TRIAL" | "SUSPENDED";
  notes?: string | null;
  users_count?: number;
  devices_count?: number;
  created_at?: string;
}

export interface User {
  id: number | string;
  name: string;
  email: string;
  role: UserRole;
  title?: string;
  pond_name?: string;
  tenant_code?: string | null;
  assigned_device_ids?: number[];
  avatar_initials?: string;
  phone?: string;
  two_factor_enabled?: boolean;
  created_at?: string;
  permissions?: UserPermissions;
  custom_permissions?: Partial<UserPermissions> | null;
  has_custom_permissions?: boolean;
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
  pond_name?: string | null;
  device_code?: string | null;
  tenant_code?: string | null;
  channel_primary?: "WHATSAPP" | "TELEGRAM" | "EMAIL" | "LOCAL";
  watchdog_flag?: string | null;
}

export interface FleetDeviceSummary {
  id: number;
  device_code: string;
  name: string;
  pond_name: string;
  tenant_code?: string | null;
  tenant_name?: string | null;
  firmware_version: string;
  hardware_profile: string;
  status: string;
  transport_protocol?: string;
  mode?: DeviceMode;
  aerator_on?: boolean;
  last_heartbeat_at?: string | null;
  latest_reading?: SensorReading | null;
  latest_prediction?: Pick<
    PredictionResult,
    "risk" | "p_aman" | "p_waspada" | "p_bahaya" | "timeframe" | "recommended_action"
  > | null;
}

export interface DeviceInfo {
  device_code: string;
  name: string;
  pond_name: string;
  tenant_code?: string | null;
  firmware_version: string;
  status: string;
  transport_protocol?: string;
  mode: DeviceMode;
  aerator_on: boolean;
  hardware_variant?: "ENTRY_1K" | "STARTER_2K" | "JURAGAN_4K" | string;
  hardware_profile?: string;
  pond_count?: number;
  backup_mode?: string;
  backup_health_pct?: number;
  offline_plus_active?: boolean;
  adc_channels?: number;
  relay_channels?: number;
}

export interface ManagedDevice extends DeviceInfo {
  id: number;
  tenant_code?: string | null;
  owner_user_id?: number | null;
  owner_name?: string | null;
  assigned_user_ids?: number[];
  api_token_prefix: string | null;
  has_token: boolean;
  token_active: boolean;
  plain_token?: string | null;
  token_rotated_at: string | null;
  token_last_used_at: string | null;
  last_heartbeat_at: string | null;
  ws_connected_at: string | null;
  latest_reading?: SensorReading | null;
  latest_prediction?: Pick<
    PredictionResult,
    "risk" | "p_aman" | "p_waspada" | "p_bahaya" | "timeframe" | "recommended_action"
  > | null;
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

export type LandingCapability = {
  title: string;
  desc: string;
  tag: string;
};

export type LandingFaq = {
  q: string;
  a: string;
};

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
  admins_without_2fa?: number;
  login_throttle?: string;
  security_headers?: string;
}

export interface FirmwareReleaseItem {
  id: number;
  version: string;
  channel: "stable" | "beta" | "canary" | string;
  target_hardware: string;
  allowed_device_ids: number[];
  file_name: string;
  file_size_bytes: number;
  sha256_checksum: string;
  hmac_signature: string;
  min_previous_version: string | null;
  rollback_timeout_s: number;
  changelog: string | null;
  is_active: boolean;
  is_mandatory: boolean;
  uploaded_by: string | null;
  rollouts_count: number;
  released_at: string | null;
}

export interface FirmwareRolloutItem {
  id: number;
  firmware_release_id: number;
  device_id: number;
  device_code: string | null;
  device_name: string | null;
  pond_name: string | null;
  status: string;
  progress_pct: number;
  from_version: string | null;
  to_version: string;
  active_partition: string | null;
  transport: string;
  boot_health_ok: boolean | null;
  error_message: string | null;
  initiated_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  rolled_back_at: string | null;
}

export interface OtaOverviewDevice {
  id: number;
  device_code: string;
  name: string;
  pond_name: string;
  tenant_code?: string | null;
  owner_user_id?: number | null;
  owner_name?: string | null;
  assigned_user_ids?: number[];
  firmware_version: string;
  hardware_profile: string;
  status: string;
  transport_protocol: string;
  api_token_prefix: string | null;
  has_token: boolean;
  token_active: boolean;
  plain_token: string | null;
  allowed_release_ids: number[];
  last_heartbeat_at: string | null;
}

export interface OtaSimulationStep {
  step: string;
  status: "OK" | "BLOCKED" | "FAILED" | "ROLLED_BACK" | string;
  detail: string;
}

export interface OtaSimulationResult {
  scenario: string;
  passed: boolean;
  http_status: number;
  device_code: string;
  target_version: string;
  final_device_version: string;
  active_partition: string;
  summary: string;
  steps: OtaSimulationStep[];
}

export interface OtaOverview {
  releases: FirmwareReleaseItem[];
  rollouts: FirmwareRolloutItem[];
  devices: OtaOverviewDevice[];
  stats: {
    total_releases: number;
    active_releases: number;
    total_rollouts: number;
    in_progress_rollouts: number;
    completed_rollouts: number;
    rolled_back_rollouts: number;
  };
}

export interface MlModelVersionItem {
  id: number;
  version: string;
  algorithm: string;
  status: string;
  is_active: boolean;
  accuracy: number;
  macro_f1: number;
  weighted_f1: number | null;
  bahaya_recall: number | null;
  drift_score: number | null;
  avg_latency_ms: number | null;
  train_samples: number;
  test_samples: number;
  live_samples_included: number;
  hyperparameters: Record<string, any> | null;
  trained_by: string;
  notes: string | null;
  trained_at: string | null;
  promoted_at: string | null;
}

export interface MlAgentReasoningStep {
  step: string;
  status: string;
  detail: string;
}

export interface MlAgentModelOption {
  id: string;
  name: string;
  provider: string;
  protocol?: string;
  default_api_url?: string;
  badge: string;
  description: string;
  requires_api_key: boolean;
}

export interface MlFieldValidationItem {
  id: number;
  device_id: number | null;
  prediction_id: number | null;
  tenant_code: string | null;
  device_code: string | null;
  pond_name: string | null;
  ph: number;
  temperature_c: number;
  tds_ppm: number | null;
  turbidity_ntu: number | null;
  water_level: string;
  predicted_risk: RiskLevel;
  actual_risk: RiskLevel;
  is_match: boolean;
  model_version: string | null;
  field_notes: string | null;
  validated_by: string | null;
  validated_at: string | null;
}

export interface MlFieldValidationStats {
  total: number;
  matched: number;
  mismatched: number;
  match_rate_pct: number | null;
}

export interface MlRecentPredictionForValidation {
  prediction_id: number;
  device_id: number | null;
  device_code: string;
  pond_name: string;
  tenant_code: string | null;
  ph: number;
  temperature_c: number;
  tds_ppm: number | null;
  turbidity_ntu: number | null;
  water_level: string;
  predicted_risk: RiskLevel;
  model_version: string | null;
  predicted_at: string | null;
  already_validated: boolean;
}

export interface MlHarvestEvaluationSummary {
  total_cycles: number;
  completed_cycles: number;
  total_seeds: number;
  total_harvest_kg: number;
  avg_survival_rate_pct: number | null;
  avg_mortality_rate_pct: number | null;
  high_mortality_cycles: number;
}

export interface PondHarvestCycleItem {
  id: number;
  device_id: number | null;
  tenant_code: string | null;
  device_code: string | null;
  pond_name: string | null;
  cycle_name: string;
  stocking_date: string;
  harvest_date: string | null;
  seed_count: number;
  seed_size_cm: string | null;
  harvest_weight_kg: number | null;
  fish_per_kg: number | null;
  avg_fish_weight_g: number | null;
  estimated_harvest_count: number | null;
  estimated_mortality_count: number | null;
  survival_rate_pct: number | null;
  mortality_rate_pct: number | null;
  mortality_status: "BERJALAN" | "BAIK" | "PERLU_EVALUASI" | "TINGGI" | string;
  ai_danger_events: number;
  ai_warning_events: number;
  avg_ph_cycle: number | null;
  avg_temp_cycle: number | null;
  ai_evaluation_note: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string | null;
}

export interface MlAgentRunItem {
  id: number;
  run_type: string;
  trigger_source: string;
  agent_model_id?: string | null;
  status: string;
  decision: string | null;
  active_model_version: string | null;
  candidate_model_version: string | null;
  accuracy_before: number | null;
  macro_f1_before: number | null;
  accuracy_after: number | null;
  macro_f1_after: number | null;
  drift_score: number | null;
  live_agreement_rate: number | null;
  new_live_samples: number;
  field_validation_count?: number;
  harvest_eval_count?: number;
  duration_ms: number | null;
  reasoning_steps: MlAgentReasoningStep[];
  summary: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface MlAgentConfigItem {
  auto_learning_enabled: boolean;
  promotion_mode: "AUTO_PROMOTE" | "HITL_REVIEW" | string;
  min_f1_threshold: number;
  max_drift_threshold: number;
  min_new_samples: number;
  schedule_interval_hours: number;
  llm_advisor_enabled: boolean;
  agent_model_id?: string;
  agent_api_url?: string | null;
  has_agent_api_key?: boolean;
  last_run_at: string | null;
}

export interface MlTrafficPoint {
  ts: string;
  label: string;
  aman: number;
  waspada: number;
  bahaya: number;
  total: number;
  avg_latency_ms: number;
  avg_confidence: number;
  fallback_count: number;
}

export interface MlEvaluationPoint {
  run_id: number;
  label: string;
  run_type: string;
  decision: string | null;
  accuracy_pct: number;
  macro_f1_pct: number;
  drift_pct: number;
  duration_ms: number;
  new_live_samples: number;
}

export interface MlPerformanceOverview {
  kpi: {
    active_version: string;
    algorithm: string;
    accuracy: number;
    macro_f1: number;
    weighted_f1: number;
    bahaya_recall: number;
    drift_score: number;
    total_predictions: number;
    predictions_in_window: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    fallback_count: number;
    fallback_rate_pct: number;
    aman_count: number;
    waspada_count: number;
    bahaya_count: number;
    live_agreement_rate: number;
    last_trained_at: string | null;
    last_run_at: string | null;
  };
  traffic_series: MlTrafficPoint[];
  evaluation_trend: MlEvaluationPoint[];
  class_distribution: { name: string; count: number }[];
  confusion_matrix: number[][];
  feature_importances: Record<string, number>;
  per_class_metrics: Record<string, { precision: number; recall: number; f1: number; support: number }> | null;
  model_versions: MlModelVersionItem[];
  agent_runs: MlAgentRunItem[];
  agent_config: MlAgentConfigItem;
  available_agent_models?: MlAgentModelOption[];
  field_validations?: MlFieldValidationItem[];
  field_validation_stats?: MlFieldValidationStats;
  recent_predictions_for_validation?: MlRecentPredictionForValidation[];
  harvest_evaluation_summary?: MlHarvestEvaluationSummary;
  active_model: {
    id: number;
    version: string;
    algorithm: string;
    hyperparameters: Record<string, any> | null;
    train_samples: number;
    test_samples: number;
    promoted_at: string | null;
  };
  model_card: Record<string, any>;
}
