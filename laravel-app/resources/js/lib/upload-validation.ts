export type FrontendUploadProfile = "landing_image" | "landing_video" | "firmware";

interface ValidationRule {
  extensions: string[];
  mimePrefixes: string[];
  maxBytes: number;
  maxWidth?: number;
  maxHeight?: number;
}

const RULES: Record<FrontendUploadProfile, ValidationRule> = {
  landing_image: {
    extensions: ["jpg", "jpeg", "png", "webp", "gif"],
    mimePrefixes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxBytes: 15 * 1024 * 1024,
    maxWidth: 8192,
    maxHeight: 8192,
  },
  landing_video: {
    extensions: ["mp4", "webm", "ogg"],
    mimePrefixes: ["video/mp4", "video/webm", "video/ogg", "application/ogg", "audio/ogg"],
    maxBytes: 50 * 1024 * 1024,
  },
  firmware: {
    extensions: ["bin"],
    mimePrefixes: ["application/octet-stream", "application/x-binary", ""],
    maxBytes: 16 * 1024 * 1024,
  },
};

const DANGEROUS_SEGMENTS = new Set([
  "php", "phtml", "php3", "php4", "php5", "php7", "php8", "phar", "pht",
  "shtml", "html", "htm", "svg", "svgz", "js", "mjs", "cjs", "jsx", "ts",
  "tsx", "xml", "xhtml", "exe", "dll", "bat", "cmd", "com", "msi", "sh",
  "bash", "zsh", "ps1", "vbs", "py", "rb", "pl", "cgi", "asp", "aspx", "jsp",
]);

export interface UploadValidationResult {
  ok: boolean;
  error?: string;
}

function validateImageDimensions(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<UploadValidationResult> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        resolve({ ok: false, error: "File gambar korup atau tidak memiliki dimensi valid." });
        return;
      }
      if (img.naturalWidth > maxWidth || img.naturalHeight > maxHeight) {
        resolve({
          ok: false,
          error: `Dimensi gambar (${img.naturalWidth}x${img.naturalHeight}) melebihi batas ${maxWidth}x${maxHeight} px.`,
        });
        return;
      }
      resolve({ ok: true });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ ok: false, error: "File gambar gagal didekode oleh browser (kemungkinan korup)." });
    };
    img.src = objectUrl;
  });
}

export async function validateUploadFile(
  file: File | null | undefined,
  profile: FrontendUploadProfile,
  fileCount = 1
): Promise<UploadValidationResult> {
  if (fileCount !== 1) {
    return { ok: false, error: "Hanya 1 file yang dapat diunggah dalam satu waktu." };
  }
  if (!file) {
    return { ok: false, error: "Pilih file terlebih dahulu sebelum mengunggah." };
  }

  const rule = RULES[profile];
  const name = file.name || "";

  if (
    name === "" ||
    name.includes("\0") ||
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes(":")
  ) {
    return { ok: false, error: "Nama file mengandung karakter tidak aman atau path traversal." };
  }

  const segments = name.split(".");
  if (segments.length < 2) {
    return { ok: false, error: "File wajib memiliki ekstensi yang valid." };
  }

  const ext = (segments.pop() || "").toLowerCase();
  if (!rule.extensions.includes(ext)) {
    return {
      ok: false,
      error: `Ekstensi .${ext} tidak diizinkan. Format yang diterima: ${rule.extensions.map((e) => `.${e}`).join(", ")}.`,
    };
  }

  for (const seg of segments) {
    if (DANGEROUS_SEGMENTS.has(seg.toLowerCase())) {
      return {
        ok: false,
        error: `Nama file mengandung ekstensi ganda berbahaya (.${seg.toLowerCase()}.${ext}).`,
      };
    }
  }

  if (file.size <= 0) {
    return { ok: false, error: "File kosong (0 byte) tidak dapat diunggah." };
  }
  if (file.size > rule.maxBytes) {
    const maxMb = Math.round((rule.maxBytes / (1024 * 1024)) * 10) / 10;
    return { ok: false, error: `Ukuran file melebihi batas maksimal ${maxMb} MB.` };
  }

  const mime = (file.type || "").toLowerCase();
  if (mime === "image/svg+xml" || mime === "text/html" || mime.includes("php") || mime.includes("javascript")) {
    return { ok: false, error: `Tipe MIME (${mime}) diblokir demi keamanan.` };
  }

  if (profile !== "firmware" && mime !== "" && !rule.mimePrefixes.includes(mime)) {
    return {
      ok: false,
      error: `Tipe MIME (${mime}) tidak sesuai dengan profil unggahan yang diizinkan.`,
    };
  }

  if (profile === "landing_image" && rule.maxWidth && rule.maxHeight) {
    return validateImageDimensions(file, rule.maxWidth, rule.maxHeight);
  }

  return { ok: true };
}
