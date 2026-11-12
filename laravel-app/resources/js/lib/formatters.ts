import { SensorReading, PredictionResult, RiskLevel, UserRole } from "../Types";

export function getParameterStatus(reading?: SensorReading | null) {
  const status = {
    ph: "normal" as "normal" | "waspada" | "bahaya",
    temperature_c: "normal" as "normal" | "waspada" | "bahaya",
    tds_ppm: "normal" as "normal" | "waspada" | "bahaya",
    turbidity_ntu: "normal" as "normal" | "waspada" | "bahaya",
    water_level: "normal" as "normal" | "waspada" | "bahaya",
  };

  if (!reading) {
    return status;
  }

  if (reading.ph !== null && reading.ph !== undefined) {
    if (reading.ph < 6.0 || reading.ph > 8.8) status.ph = "bahaya";
    else if (reading.ph < 6.5 || reading.ph > 8.5) status.ph = "waspada";
  }

  if (reading.temperature_c !== null && reading.temperature_c !== undefined) {
    if (reading.temperature_c > 33 || reading.temperature_c < 22) status.temperature_c = "bahaya";
    else if (reading.temperature_c > 32 || reading.temperature_c < 26) status.temperature_c = "waspada";
  }

  if (reading.tds_ppm !== null && reading.tds_ppm !== undefined) {
    if (reading.tds_ppm > 800) status.tds_ppm = "bahaya";
    else if (reading.tds_ppm > 600) status.tds_ppm = "waspada";
  }

  if (reading.turbidity_ntu !== null && reading.turbidity_ntu !== undefined) {
    if (reading.turbidity_ntu > 120) status.turbidity_ntu = "bahaya";
    else if (reading.turbidity_ntu > 80) status.turbidity_ntu = "waspada";
  }

  if (reading.water_level === "LOW") {
    status.water_level = "bahaya";
  }

  return status;
}

export function getOverallStatus(
  reading?: SensorReading | null,
  prediction?: PredictionResult | null
): {
  level: RiskLevel;
  title: string;
  params: string[];
} {
  if (!reading) {
    return {
      level: "AMAN",
      title: "Menunggu data sensor IoT",
      params: [],
    };
  }

  const paramStatus = getParameterStatus(reading);
  const issues: string[] = [];

  // Cek parameter kritis
  if (paramStatus.ph === "bahaya") issues.push("pH di luar batas aman");
  if (paramStatus.temperature_c === "bahaya") issues.push("Suhu ekstrem");
  if (paramStatus.water_level === "bahaya") issues.push("Level air surut");

  if (issues.length > 0 || (prediction && prediction.risk === "BAHAYA")) {
    return {
      level: "BAHAYA",
      title: issues[0] || "Risiko tinggi dalam 1-3 jam",
      params: issues,
    };
  }

  // Cek waspada
  if (paramStatus.ph === "waspada") issues.push("pH mendekati batas");
  if (paramStatus.temperature_c === "waspada") issues.push("Suhu tinggi");
  if (paramStatus.tds_ppm === "waspada") issues.push("TDS tinggi");

  if (issues.length > 0 || (prediction && prediction.risk === "WASPADA")) {
    return {
      level: "WASPADA",
      title: "Perlu diperhatikan",
      params: issues,
    };
  }

  return {
    level: "AMAN",
    title: "Air kolam aman",
    params: [],
  };
}

export function formatRelativeTime(isoTimestamp?: string | null): string {
  if (!isoTimestamp) {
    return "Menunggu sinyal";
  }
  try {
    const now = new Date();
    const then = new Date(isoTimestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Baru saja";
    if (diffMin === 1) return "1 menit lalu";
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour === 1) return "1 jam lalu";
    if (diffHour < 24) return `${diffHour} jam lalu`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return "Kemarin";
    return `${diffDay} hari lalu`;
  } catch {
    return "Baru saja";
  }
}

export function getRoleBadgeLabel(role: UserRole | string): string {
  switch (role) {
    case "ADMIN":
      return "Super Administrator";
    case "OPERATOR":
      return "Operator Kolam";
    case "ANALIS":
      return "Analis Akuakultur";
    case "PEMILIK":
      return "Pemilik (Petambak)";
    default:
      return role;
  }
}
