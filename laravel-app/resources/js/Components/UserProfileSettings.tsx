import { useState, useEffect } from "react";
import { router, usePage } from "@inertiajs/react";
import { QRCodeSVG } from "qrcode.react";
import {
  User as UserIcon,
  Mail,
  Lock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Phone,
  KeyRound,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  QrCode,
  Smartphone,
  Save,
  RotateCcw,
  Download,
} from "lucide-react";
import type { User } from "@/Types";
import { getRoleBadgeLabel } from "@/lib/formatters";

interface UserProfileSettingsProps {
  user: User;
}

type SettingsSection = "profil" | "password" | "2fa";

export function UserProfileSettings({ user }: UserProfileSettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profil");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile Form States
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [pondName, setPondName] = useState(user.pond_name || "");
  const [phone, setPhone] = useState(user.phone || "");

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // 2FA Setup States
  const [isSettingUp2fa, setIsSettingUp2fa] = useState(false);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableModal, setShowDisableModal] = useState(false);

  // Flash recovery codes from server if just enabled
  const flash = usePage<any>().props.flash;
  const initialRecoveryCodes: string[] | undefined = flash?.recovery_codes;
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(
    initialRecoveryCodes || null
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // 1. UPDATE PROFILE
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showError("Nama dan alamat email tidak boleh kosong.");
      return;
    }

    setIsSubmitting(true);
    router.post(
      "/dashboard/profile",
      {
        name: name.trim(),
        email: email.trim(),
        pond_name: pondName.trim(),
        phone: phone.trim(),
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsSubmitting(false);
          showToast("Informasi profil akun Anda berhasil disimpan!");
        },
        onError: (errs) => {
          setIsSubmitting(false);
          showError(Object.values(errs).join(" ") || "Gagal memperbarui profil.");
        },
      }
    );
  };

  // 2. UPDATE PASSWORD
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showError("Harap masukkan kata sandi saat ini.");
      return;
    }
    if (newPassword.length < 6) {
      showError("Kata sandi baru minimal harus 6 karakter.");
      return;
    }
    if (newPassword !== newPasswordConfirmation) {
      showError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setIsSubmitting(true);
    router.post(
      "/dashboard/profile/password",
      {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPasswordConfirmation,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsSubmitting(false);
          setCurrentPassword("");
          setNewPassword("");
          setNewPasswordConfirmation("");
          showToast("Kata sandi akun Anda berhasil diperbarui!");
        },
        onError: (errs) => {
          setIsSubmitting(false);
          showError(Object.values(errs).join(" ") || "Gagal memperbarui kata sandi.");
        },
      }
    );
  };

  // 3. 2FA SETUP (FETCH QR & SECRET)
  const start2faSetup = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/dashboard/profile/2fa/qr");
      const data = await res.json();
      if (res.ok && data.qr_uri && data.secret) {
        setQrUri(data.qr_uri);
        setSecretKey(data.secret);
        setIsSettingUp2fa(true);
        setOtpCode("");
      } else {
        showError("Gagal memulai pengaturan 2FA. Silakan muat ulang halaman.");
      }
    } catch (err) {
      showError("Terjadi gangguan saat memuat kunci 2FA.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. CONFIRM 2FA WITH 6-DIGIT OTP
  const handleConfirm2fa = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      showError("Masukkan 6 digit angka kode OTP dari aplikasi authenticator Anda.");
      return;
    }

    setIsSubmitting(true);
    router.post(
      "/dashboard/profile/2fa/confirm",
      { code: otpCode.trim() },
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setIsSubmitting(false);
          setIsSettingUp2fa(false);
          const newCodes = (page.props.flash as any)?.recovery_codes;
          if (newCodes) {
            setRecoveryCodes(newCodes);
          }
          showToast("Autentikasi Dua Faktor (2FA) berhasil diaktifkan!");
        },
        onError: (errs) => {
          setIsSubmitting(false);
          showError(errs.two_factor_code || "Kode OTP 2FA salah atau kedaluwarsa.");
        },
      }
    );
  };

  // 5. DISABLE 2FA
  const handleDisable2fa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) {
      showError("Masukkan kata sandi saat ini untuk menonaktifkan 2FA.");
      return;
    }

    setIsSubmitting(true);
    router.post(
      "/dashboard/profile/2fa/disable",
      { password: disablePassword },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsSubmitting(false);
          setShowDisableModal(false);
          setDisablePassword("");
          setRecoveryCodes(null);
          showToast("Autentikasi Dua Faktor (2FA) telah dinonaktifkan.");
        },
        onError: (errs) => {
          setIsSubmitting(false);
          showError(errs.password || "Kata sandi salah. 2FA tidak dapat dinonaktifkan.");
        },
      }
    );
  };

  const copyToClipboard = (text: string, type: "secret" | "codes") => {
    navigator.clipboard.writeText(text);
    if (type === "secret") {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2500);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2500);
    }
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodes) return;
    const content = `KODE PEMULIHAN CADANGAN BANYUWENING (2FA RECOVERY CODES)
Akun: ${user.name} (${user.email})
Tanggal: ${new Date().toLocaleString("id-ID")}
Simpan kode-kode ini di tempat aman. Setiap kode hanya dapat digunakan sekali untuk masuk jika Anda kehilangan akses ke aplikasi authenticator.

${recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `banyuwening-recovery-codes-${user.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Toast & Error Alerts */}
      {toastMessage && (
        <div className="p-4 bg-aman/15 border border-aman text-ink rounded-[6px] flex items-center gap-2.5 text-[13px] animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-aman shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-bahaya/15 border border-bahaya text-ink rounded-[6px] flex items-center gap-2.5 text-[13px] animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-bahaya shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="p-5 bg-surface border border-line rounded-[6px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand text-brand-ink font-bold text-[18px] flex items-center justify-center shrink-0 shadow-xs">
            {user.avatar_initials || user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] font-semibold text-ink leading-tight tracking-tight">
                {user.name}
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-brand/10 text-brand border border-brand/20">
                {getRoleBadgeLabel(user.role)}
              </span>
            </div>
            <div className="text-[12px] text-muted flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                <span>{user.email}</span>
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>{user.pond_name || "Kolam Operasional"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2FA Badge in Header */}
        <div className="self-end sm:self-auto">
          {user.two_factor_enabled ? (
            <div className="px-3 py-1.5 rounded-[6px] bg-aman/15 border border-aman text-aman text-[12px] font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>2FA Aktif & Terlindungi</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-[6px] bg-waspada/15 border border-waspada text-waspada text-[12px] font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>2FA Belum Aktif</span>
            </div>
          )}
        </div>
      </div>

      {/* Section Sub-Tabs */}
      <div className="flex border-b border-line gap-2 overflow-x-auto pb-px text-[13px]">
        <button
          onClick={() => setActiveSection("profil")}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSection === "profil"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Informasi Profil</span>
        </button>

        <button
          onClick={() => setActiveSection("password")}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSection === "password"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Keamanan & Kata Sandi</span>
        </button>

        <button
          onClick={() => setActiveSection("2fa")}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSection === "2fa"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Autentikasi Dua Faktor (2FA)</span>
          {user.two_factor_enabled ? (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-aman/15 text-aman font-bold">
              Aktif
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-waspada/15 text-waspada font-bold">
              Wajib
            </span>
          )}
        </button>
      </div>

      {/* SECTION 1: INFORMASI PROFIL */}
      {activeSection === "profil" && (
        <form
          onSubmit={handleUpdateProfile}
          className="p-6 bg-surface rounded-[6px] border border-line space-y-6 animate-fadeIn"
        >
          <div>
            <h2 className="text-[17px] font-semibold text-ink flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-brand" />
              <span>Perbarui Informasi Profil Akun</span>
            </h2>
            <p className="text-[12px] text-muted mt-0.5">
              Kelola nama lengkap, alamat email kontak, serta identitas unit kolam Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink">
                Nama Lengkap <span className="text-bahaya">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Pengguna"
                className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink">
                Alamat Email Login <span className="text-bahaya">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@banyuwening.id"
                className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink">
                Unit Kolam Tambak
              </label>
              <input
                type="text"
                value={pondName}
                onChange={(e) => setPondName(e.target.value)}
                placeholder="Kolam Terpal Sangkuriang 01"
                className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink">
                Nomor WhatsApp / Telepon
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+62 812-xxxx-xxxx"
                className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[12px] font-semibold text-muted">
                Hak Akses / Peran Akun (Dikelola oleh Administrator Sistem):
              </label>
              <div className="p-3 bg-surface-2 rounded-[6px] border border-line flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-ink">
                    {getRoleBadgeLabel(user.role)}
                  </div>
                  <div className="text-[11px] text-muted">{user.title}</div>
                </div>
                <span className="text-[11px] text-muted italic">Read-only</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-line">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Informasi Profil"}</span>
            </button>
          </div>
        </form>
      )}

      {/* SECTION 2: KEAMANAN & PASSWORD */}
      {activeSection === "password" && (
        <form
          onSubmit={handleUpdatePassword}
          className="p-6 bg-surface rounded-[6px] border border-line space-y-6 animate-fadeIn"
        >
          <div>
            <h2 className="text-[17px] font-semibold text-ink flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-brand" />
              <span>Ganti Kata Sandi Akun</span>
            </h2>
            <p className="text-[12px] text-muted mt-0.5">
              Gunakan kata sandi yang kuat dengan kombinasi huruf besar, kecil, angka, dan simbol.
            </p>
          </div>

          <div className="space-y-4 max-w-lg pt-2">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink">
                Kata Sandi Saat Ini <span className="text-bahaya">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPw ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi lama Anda"
                  className="w-full h-10 pl-3 pr-10 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink">
                Kata Sandi Baru <span className="text-bahaya">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full h-10 pl-3 pr-10 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink">
                Konfirmasi Kata Sandi Baru <span className="text-bahaya">*</span>
              </label>
              <input
                type="password"
                required
                value={newPasswordConfirmation}
                onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-line">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 shadow-xs"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? "Menyimpan..." : "Perbarui Kata Sandi"}</span>
            </button>
          </div>
        </form>
      )}

      {/* SECTION 3: TWO-FACTOR AUTHENTICATION (2FA) */}
      {activeSection === "2fa" && (
        <div className="p-6 bg-surface rounded-[6px] border border-line space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-[17px] font-semibold text-ink flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand" />
              <span>Autentikasi Dua Faktor (Two-Factor Authentication / 2FA)</span>
            </h2>
            <p className="text-[12px] text-muted mt-0.5">
              Lapisan keamanan ekstra yang mewajibkan kode 6-digit dari aplikasi authenticator ponsel
              setiap kali masuk ke sistem operasional BanyuWening.
            </p>
          </div>

          {/* 2FA Status Card */}
          <div className="p-5 bg-surface-2 rounded-[6px] border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  user.two_factor_enabled
                    ? "bg-aman/20 text-aman"
                    : "bg-waspada/20 text-waspada"
                }`}
              >
                {user.two_factor_enabled ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : (
                  <ShieldAlert className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-ink">
                  {user.two_factor_enabled
                    ? "2FA Aktif & Akun Terlindungi"
                    : "2FA Belum Diaktifkan"}
                </h3>
                <p className="text-[12px] text-muted">
                  {user.two_factor_enabled
                    ? "Setiap upaya login memerlukan password dan verifikasi kode 6-digit TOTP."
                    : "Sangat disarankan mengaktifkan 2FA demi menjaga kendali pompa aerator dan sensor kolam dari pembajakan."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {user.two_factor_enabled ? (
                <button
                  type="button"
                  onClick={() => setShowDisableModal(true)}
                  className="px-3.5 py-2 border border-bahaya/40 text-bahaya hover:bg-bahaya/10 rounded-[6px] text-[12px] font-semibold transition-colors cursor-pointer"
                >
                  Nonaktifkan 2FA
                </button>
              ) : (
                !isSettingUp2fa && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={start2faSetup}
                    className="px-4 py-2 bg-brand text-brand-ink rounded-[6px] text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Aktifkan 2FA Sekarang</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* RECOVERY CODES DISPLAY (JIKA BARU DIAKTIFKAN ATAU TERSEDIA) */}
          {recoveryCodes && recoveryCodes.length > 0 && (
            <div className="p-5 rounded-[6px] bg-aman/10 border border-aman/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-aman" />
                  <h4 className="text-[14px] font-semibold text-ink">
                    Kode Pemulihan Cadangan (Emergency Recovery Codes)
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(recoveryCodes.join("\n"), "codes")}
                    className="px-2.5 py-1 bg-surface border border-line rounded text-[11px] font-medium text-ink hover:bg-line inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCodes ? <Check className="w-3.5 h-3.5 text-aman" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodes ? "Tersalin!" : "Salin Semua"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadRecoveryCodes}
                    className="px-2.5 py-1 bg-surface border border-line rounded text-[11px] font-medium text-ink hover:bg-line inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh TXT</span>
                  </button>
                </div>
              </div>
              <p className="text-[12px] text-muted">
                Simpan kode-kode di bawah ini di tempat yang aman. Jika Anda kehilangan akses ke
                smartphone Anda, Anda dapat menggunakan salah satu kode ini untuk tetap bisa masuk.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[12px] font-bold text-ink">
                {recoveryCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-surface rounded border border-line text-center tracking-wider"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2FA SETUP WIZARD (QR CODE & OTP INPUT) */}
          {isSettingUp2fa && qrUri && secretKey && (
            <div className="p-6 bg-surface-2 rounded-[6px] border border-line space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-brand" />
                  <h3 className="text-[15px] font-semibold text-ink">
                    Langkah Aktivasi Aplikasi Authenticator
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingUp2fa(false)}
                  className="text-muted hover:text-ink text-[12px]"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* QR Code Column */}
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-[8px] border border-line w-fit mx-auto shadow-sm">
                  <QRCodeSVG value={qrUri} size={180} level="M" />
                  <span className="text-[11px] text-neutral-600 mt-2 font-medium">
                    Scan via Google / Microsoft Authenticator
                  </span>
                </div>

                {/* Instructions & Secret Key */}
                <div className="space-y-4">
                  <div className="space-y-1 text-[13px] text-ink leading-relaxed">
                    <p className="font-semibold text-brand">1. Buka aplikasi Authenticator di ponsel:</p>
                    <p className="text-muted text-[12px]">
                      Gunakan <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, atau <strong>Authy</strong>.
                    </p>

                    <p className="font-semibold text-brand pt-2">2. Pindai QR Code di samping, atau ketik kode ini:</p>
                    <div className="flex items-center gap-2 p-2 bg-surface rounded border border-line font-mono text-[13px] font-bold text-ink tracking-wider justify-between">
                      <span className="select-all">{secretKey}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(secretKey, "secret")}
                        className="p-1 hover:bg-surface-2 rounded text-muted hover:text-ink cursor-pointer"
                        title="Salin Kode Rahasia"
                      >
                        {copiedSecret ? <Check className="w-4 h-4 text-aman" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="font-semibold text-brand pt-2">3. Masukkan 6 digit kode dari aplikasi:</p>
                  </div>

                  <form onSubmit={handleConfirm2fa} className="space-y-3">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full h-12 px-4 bg-surface border-2 border-brand/50 focus:border-brand rounded-[6px] text-center font-mono font-bold text-[22px] tracking-[0.4em] text-ink"
                    />

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsSettingUp2fa(false)}
                        className="px-4 py-2 border border-line rounded-[6px] text-[12px] font-medium text-muted hover:text-ink cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || otpCode.length !== 6}
                        className="px-5 py-2 bg-brand text-brand-ink rounded-[6px] text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isSubmitting ? "Memverifikasi..." : "Konfirmasi & Aktifkan 2FA"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* MODAL KONFIRMASI NONAKTIFKAN 2FA */}
          {showDisableModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-surface border border-line rounded-[10px] shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
                <div className="flex items-center gap-2.5 text-bahaya">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <h3 className="text-[16px] font-semibold text-ink">
                    Nonaktifkan Autentikasi Dua Faktor?
                  </h3>
                </div>
                <p className="text-[12px] text-muted leading-relaxed">
                  Akun Anda tidak lagi terlindungi oleh kode OTP authenticator saat login. Masukkan
                  kata sandi akun Anda untuk mengonfirmasi tindakan ini:
                </p>

                <form onSubmit={handleDisable2fa} className="space-y-4">
                  <input
                    type="password"
                    required
                    autoFocus
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun Anda"
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDisableModal(false);
                        setDisablePassword("");
                      }}
                      className="px-4 py-2 border border-line rounded-[6px] text-[12px] font-medium text-muted hover:text-ink cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !disablePassword}
                      className="px-4 py-2 bg-[#C62F25] text-white hover:bg-[#A3221B] rounded-[6px] text-[12px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? "Memproses..." : "Ya, Nonaktifkan 2FA"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
