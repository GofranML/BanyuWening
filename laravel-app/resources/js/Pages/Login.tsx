import { useState, useEffect } from "react";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Users,
  ShieldCheck,
  Smartphone,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { ContactEmailLink } from "@/Components/ContactEmailLink";
import type { UserRole } from "@/Types";

interface LoginPageProps {
  errors?: Record<string, string>;
  twoFactorRequired?: boolean;
  twoFactorEmail?: string;
  twoFactorName?: string;
}

export default function Login({
  errors,
  twoFactorRequired,
  twoFactorEmail,
  twoFactorName,
}: LoginPageProps) {
  const { data, setData, post, processing, reset } = useForm({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // 2FA Challenge form state
  const [otpCode, setOtpCode] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [is2faSubmitting, setIs2faSubmitting] = useState(false);

  const pageProps = usePage<any>().props;
  const contactEmail = pageProps.contactEmail || "BanyuWening@example.com";

  const is2faActive =
    twoFactorRequired ||
    pageProps.twoFactorRequired ||
    pageProps.flash?.two_factor_required;
  const targetEmail =
    twoFactorEmail || pageProps.twoFactorEmail || data.email;
  const targetName =
    twoFactorName || pageProps.twoFactorName || "Pengguna Kolam";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    post("/login", {
      onError: (err) => {
        if (err.email) {
          setLocalError(err.email);
        } else {
          setLocalError(
            "Email atau kata sandi tidak valid. Pastikan akun sudah didaftarkan."
          );
        }
      },
    });
  };

  const handleVerify2fa = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!otpCode.trim()) {
      setLocalError(
        isRecoveryMode
          ? "Harap masukkan kode pemulihan cadangan Anda."
          : "Harap masukkan 6 digit kode OTP 2FA dari aplikasi authenticator."
      );
      return;
    }

    setIs2faSubmitting(true);
    router.post(
      "/login/2fa",
      {
        code: otpCode.trim(),
        is_recovery: isRecoveryMode,
      },
      {
        preserveScroll: true,
        onError: (err) => {
          setIs2faSubmitting(false);
          setLocalError(
            err.two_factor_code ||
              "Kode verifikasi salah atau kedaluwarsa. Silakan coba lagi."
          );
        },
      }
    );
  };

  const handleCancel2fa = () => {
    router.post("/login/2fa/cancel", {}, {
      onSuccess: () => {
        setOtpCode("");
        setIsRecoveryMode(false);
        setLocalError(null);
      },
    });
  };

  const handleQuickDemo = (role: UserRole) => {
    router.visit(`/demo?role=${role}`);
  };

  const displayError =
    localError || errors?.email || errors?.two_factor_code;

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between font-sans selection:bg-brand selection:text-brand-ink">
      {/* Top Bar Header */}
      <header className="h-16 border-b border-line bg-surface px-4 md:px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/brand/logogram.svg"
            alt="BanyuWening Logo"
            width={28}
            height={34}
            className="w-auto h-7"
          />
          <div className="flex flex-col">
            <span className="font-display font-semibold text-[17px] tracking-tight text-ink leading-tight">
              BanyuWening
            </span>
            <span className="text-[10px] text-muted tracking-wide uppercase font-medium">
              Sistem Otomasi Kolam
            </span>
          </div>
        </Link>

        <Link
          href="/demo"
          className="text-[13px] text-brand hover:underline font-medium inline-flex items-center gap-1"
        >
          <span>Buka Dashboard Demo (Tanpa Login)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main Login Container */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Card Login or 2FA Challenge */}
          <div className="bg-surface border border-line rounded-[8px] p-6 md:p-8 shadow-xs">
            {/* JIKA MEMERLUKAN 2FA CHALLENGE */}
            {is2faActive ? (
              <div className="space-y-5 animate-fadeIn">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-brand/15 text-brand flex items-center justify-center mx-auto mb-3">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <h1 className="text-[22px] font-display font-semibold text-ink">
                    Verifikasi Dua Faktor (2FA)
                  </h1>
                  <p className="text-[12px] text-muted mt-1 leading-relaxed">
                    Akun <strong>{targetName}</strong> ({targetEmail}) dilindungi oleh 2FA.
                    Buka aplikasi <strong>Google Authenticator / Authy</strong> Anda:
                  </p>
                </div>

                {/* Error Message */}
                {displayError && (
                  <div className="p-3 bg-bahaya/10 border border-bahaya/30 text-bahaya rounded-[6px] text-[12px] flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{displayError}</span>
                  </div>
                )}

                <form onSubmit={handleVerify2fa} className="space-y-4">
                  {isRecoveryMode ? (
                    <div>
                      <label className="block text-[12px] font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-brand" />
                        <span>Masukkan Kode Pemulihan Cadangan:</span>
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.toUpperCase())}
                        placeholder="Contoh: A1B2-C3D4"
                        className="w-full h-11 px-3 bg-surface-2 border-2 border-brand/40 focus:border-brand rounded-[6px] text-center font-mono font-bold text-[16px] tracking-wider text-ink"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[12px] font-semibold text-ink mb-1.5 flex items-center justify-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-brand" />
                        <span>Masukkan 6-Digit Kode OTP:</span>
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                        className="w-full h-12 px-4 bg-surface-2 border-2 border-brand/50 focus:border-brand rounded-[6px] text-center font-mono font-bold text-[24px] tracking-[0.4em] text-ink"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecoveryMode(!isRecoveryMode);
                        setOtpCode("");
                        setLocalError(null);
                      }}
                      className="text-brand hover:underline font-medium cursor-pointer"
                    >
                      {isRecoveryMode
                        ? "← Gunakan Kode OTP Authenticator"
                        : "Gunakan Kode Pemulihan Cadangan"}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={is2faSubmitting || !otpCode.trim()}
                    className="w-full h-10 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {is2faSubmitting ? (
                      <span className="inline-block w-4 h-4 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verifikasi & Masuk Dashboard</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel2fa}
                    className="w-full py-1.5 text-center text-[12px] text-muted hover:text-ink transition-colors cursor-pointer block"
                  >
                    Batal & Kembali ke Form Login
                  </button>
                </form>
              </div>
            ) : (
              /* FORM LOGIN BIASA */
              <>
                <div className="text-center mb-6">
                  <h1 className="text-[24px] md:text-[28px] font-display font-semibold text-ink">
                    Masuk ke Dashboard Utama
                  </h1>
                  <p className="text-[13px] text-muted mt-1.5">
                    Silakan masukkan email dan kata sandi akun Anda untuk mengakses telemetry kolam
                    operasional.
                  </p>
                </div>

                {/* Error Message */}
                {displayError && (
                  <div className="p-3 mb-5 bg-bahaya/10 border border-bahaya/30 text-bahaya rounded-[6px] text-[13px] flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{displayError}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-ink mb-1.5">
                      Alamat Email Akun
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-muted absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={data.email}
                        onChange={(e) => setData("email", e.target.value)}
                        placeholder="nama@banyuwening.id"
                        className="w-full h-10 pl-9 pr-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-medium text-ink">
                        Kata Sandi
                      </label>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-muted absolute left-3 top-3" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={data.password}
                        onChange={(e) => setData("password", e.target.value)}
                        placeholder="Masukkan kata sandi"
                        className="w-full h-10 pl-9 pr-10 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted hover:text-ink transition-colors cursor-pointer"
                        aria-label="Toggle tampilan kata sandi"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full h-10 bg-brand text-brand-ink rounded-[6px] text-[14px] font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
                  >
                    {processing ? (
                      <span className="inline-block w-4 h-4 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Masuk ke Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Kotak Pengumuman Pendaftaran Akun */}
                <div className="mt-5 pt-4 border-t border-line text-[12px] text-muted space-y-2">
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-ink">Belum memiliki akun login?</strong>
                      <p className="mt-0.5 leading-relaxed">
                        Akses dashboard operasional BanyuWening dibatasi demi keamanan kendali relay kolam.
                        Jika Anda ingin dibuatkan akun, silakan hubungi <strong>Super Administrator</strong> melalui:
                      </p>
                      <div className="mt-2 font-medium">
                        <ContactEmailLink
                          email={contactEmail}
                          className="text-brand font-semibold hover:underline inline-flex items-center gap-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Demo Bar */}
          <div className="p-4 bg-surface border border-line rounded-[8px] space-y-3">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-ink uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>Akses Cepat Pengujian Role (Masuk ke Dashboard Demo)</span>
            </div>
            <p className="text-[12px] text-muted leading-relaxed">
              Pilih salah satu peran di bawah ini untuk langsung masuk dan menguji <strong>Dashboard Demo (Simulasi Data Dummy)</strong> tanpa login:
            </p>

            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <button
                type="button"
                onClick={() => handleQuickDemo("ADMIN")}
                className="p-2.5 bg-surface-2 hover:bg-brand/10 border border-line rounded-[6px] text-left transition-colors group cursor-pointer"
              >
                <div className="font-semibold text-purple-700 flex items-center justify-between">
                  <span>Super Administrator</span>
                  <ArrowRight className="w-3 h-3 text-muted group-hover:text-purple-700 transition-colors" />
                </div>
                <div className="text-[10px] text-muted">Demo Akses Penuh</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("OPERATOR")}
                className="p-2.5 bg-surface-2 hover:bg-brand/10 border border-line rounded-[6px] text-left transition-colors group cursor-pointer"
              >
                <div className="font-semibold text-blue-700 flex items-center justify-between">
                  <span>Operator Kolam</span>
                  <ArrowRight className="w-3 h-3 text-muted group-hover:text-blue-700 transition-colors" />
                </div>
                <div className="text-[10px] text-muted">Demo Kendali Lapangan</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("ANALIS")}
                className="p-2.5 bg-surface-2 hover:bg-brand/10 border border-line rounded-[6px] text-left transition-colors group cursor-pointer"
              >
                <div className="font-semibold text-amber-700 flex items-center justify-between">
                  <span>Analis Akuakultur</span>
                  <ArrowRight className="w-3 h-3 text-muted group-hover:text-amber-700 transition-colors" />
                </div>
                <div className="text-[10px] text-muted">Demo Analitik & Ekspor</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("PEMILIK")}
                className="p-2.5 bg-surface-2 hover:bg-brand/10 border border-line rounded-[6px] text-left transition-colors group cursor-pointer"
              >
                <div className="font-semibold text-emerald-700 flex items-center justify-between">
                  <span>Pemilik (Petambak)</span>
                  <ArrowRight className="w-3 h-3 text-muted group-hover:text-emerald-700 transition-colors" />
                </div>
                <div className="text-[10px] text-muted">Demo Data Terproses</div>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-line bg-surface px-4 md:px-8 flex items-center justify-between text-[12px] text-muted">
        <div>Institut Teknologi dan Bisnis PalComTech</div>
        <div>
          <Link href="/" className="hover:text-brand transition-colors">
            ← Kembali ke Beranda
          </Link>
        </div>
      </footer>
    </div>
  );
}
