import { useState, useRef } from "react";
import { router } from "@inertiajs/react";
import {
  Globe,
  Mail,
  Phone,
  Building,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  Plus,
  Trash2,
  HelpCircle,
  Layers,
  FileText,
  ExternalLink,
  Info,
  Image as ImageIcon,
  Video,
  Upload,
  Film,
  Eye,
  Check,
} from "lucide-react";
import type { LandingContentSettings, LandingCapability, LandingFaq } from "@/Types";

interface SuperAdminContentManagementProps {
  landingContent?: LandingContentSettings;
}

type SubTabId = "kontak" | "media" | "hero" | "intro" | "fitur" | "faq" | "cta";

const PRESET_IMAGES = [
  { label: "Aerasi Kolam", path: "/pics/aerasi.jpg" },
  { label: "Kolam Takeran", path: "/pics/takeran.jpg" },
  { label: "Probe pH & Kekeruhan", path: "/pics/ph-meter.jpg" },
  { label: "Mikrokontroler ESP32", path: "/pics/esp32.jpg" },
  { label: "Benih Lele 01", path: "/pics/lele-1.jpg" },
  { label: "Benih Lele 02", path: "/pics/lele-2.jpg" },
  { label: "Kolam Tjipanas", path: "/pics/tjipanas.jpg" },
  { label: "Kolam Lembang", path: "/pics/lembang.jpg" },
  { label: "Kolam Andir", path: "/pics/andir.jpg" },
  { label: "Aquaculture Underwater", path: "/pics/aquaculture-underwater.jpg" },
  { label: "Permukaan Air", path: "/pics/water-surface.jpg" },
];

const PRESET_VIDEOS = [
  { label: "Time-lapse Kolam WebM", path: "/pics/kolam-timelapse.webm" },
];

export function SuperAdminContentManagement({
  landingContent: initialContent,
}: SuperAdminContentManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>("media");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Hidden File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadTargetRef = useRef<{
    fieldKey: string;
    setter: (val: string) => void;
  } | null>(null);

  // Form State — Teks Hero
  const [heroTag, setHeroTag] = useState(
    initialContent?.hero_tag || "Sistem Monitoring & Otomasi Kualitas Air Kolam"
  );
  const [heroTitle, setHeroTitle] = useState(
    initialContent?.hero_title || "BANYUWENING"
  );
  const [heroSubtitle, setHeroSubtitle] = useState(
    initialContent?.hero_subtitle ||
      "Pemantauan kualitas air kolam 24/7 dengan prediksi risiko dini, otomasi aerator, dan pengaman lokal tanpa internet"
  );

  // Narasi Intro Tangga
  const [introStatement1, setIntroStatement1] = useState(
    initialContent?.intro_statement_1 || "Jaga kolam lele 500 ekor"
  );
  const [introStatement2, setIntroStatement2] = useState(
    initialContent?.intro_statement_2 || "walau tengah malam,"
  );
  const [introStatement3, setIntroStatement3] = useState(
    initialContent?.intro_statement_3 || "saat pH turun tajam"
  );
  const [introStatement4, setIntroStatement4] = useState(
    initialContent?.intro_statement_4 || "dan oksigen menipis."
  );
  const [introStatement5, setIntroStatement5] = useState(
    initialContent?.intro_statement_5 || "BanyuWening tidak tidur."
  );
  const [introDesc, setIntroDesc] = useState(
    initialContent?.intro_desc ||
      "Sistem IoT pemantauan kualitas air yang membaca pH, suhu, TDS, dan kekeruhan tiap 30 detik untuk kolam budidaya lele, patin, dan nila."
  );

  // Helper format nomor WhatsApp: +62 8566-9548-964 (tiap 4 angka otomatis dipisahkan dengan tanda '-')
  const formatWhatsAppNumber = (val: string): string => {
    if (!val || val.trim() === "") {
      return "+62 ";
    }

    // Ambil hanya digit angka
    let digits = val.replace(/\D/g, "");

    // Jika diawali 62 (kode negara), hilangkan agar tidak dobel
    if (digits.startsWith("62")) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0")) {
      // Jika diawali 0 (misal 0856...), hilangkan 0
      digits = digits.slice(1);
    }

    // Batasi hingga 13 digit nomor seluler
    digits = digits.slice(0, 13);

    if (digits.length === 0) {
      return "+62 ";
    }

    // Pisahkan tiap 4 digit: 8566-9548-964
    const chunks: string[] = [];
    for (let i = 0; i < digits.length; i += 4) {
      chunks.push(digits.slice(i, i + 4));
    }

    return `+62 ${chunks.join("-")}`;
  };

  // Kontak & Email
  const [contactEmail, setContactEmail] = useState(
    initialContent?.contact_email || "BanyuWening@example.com"
  );
  const [contactPhone, setContactPhone] = useState(
    formatWhatsAppNumber(initialContent?.contact_phone || "+62 8566-9548-964")
  );
  const [institutionName, setInstitutionName] = useState(
    initialContent?.institution_name || "Institut Teknologi dan Bisnis PalComTech"
  );
  const [institutionUrl, setInstitutionUrl] = useState(
    initialContent?.institution_url || "https://palcomtech.ac.id/"
  );

  // CTA & Footer
  const [ctaText, setCtaText] = useState(
    initialContent?.cta_text ||
      "Sistem ini dikembangkan oleh mahasiswa Institut Teknologi dan Bisnis PalComTech untuk membantu pembudidaya ikan air tawar di Indonesia."
  );
  const [ctaButtonText, setCtaButtonText] = useState(
    initialContent?.cta_button_text || "Masuk ke Versi Demo"
  );
  const [copyrightText, setCopyrightText] = useState(
    initialContent?.copyright_text ||
      "© 2026 BanyuWening · Institut Teknologi dan Bisnis PalComTech."
  );

  // Fitur List
  const [capabilities, setCapabilities] = useState<LandingCapability[]>(
    initialContent?.capabilities || [
      {
        title: "Pemantauan Kontinu 24/7",
        desc: "Sensor pH, suhu DS18B20, TDS, dan turbiditas membaca setiap 30 detik tanpa jeda melebihi 2 menit.",
        tag: "Hardware ESP32",
      },
      {
        title: "Failsafe Mandiri Tanpa Internet",
        desc: "Mikrokontroler memiliki aturan deterministik lokal. Jika pH < 6.0 atau suhu > 33°C, aerator seketika aktif walau koneksi WiFi kolam terputus.",
        tag: "Keandalan Lokal",
      },
      {
        title: "Prediksi Dini Risiko 1–3 Jam",
        desc: "Model Random Forest mengevaluasi pola laju perubahan air (dpH/dt, dTemp/dt) untuk mendeteksi potensi krisis sebelum ikan mengalami stres.",
        tag: "Machine Learning",
      },
    ]
  );

  // FAQ List
  const [faqs, setFaqs] = useState<LandingFaq[]>(
    initialContent?.faqs || [
      {
        q: "Apakah sistem tetap bekerja jika koneksi WiFi atau internet di kolam terputus?",
        a: "Ya. ESP32 dilengkapi aturan keselamatan deterministik (Failsafe Lokal). Walaupun jaringan internet atau cloud terputus, mikrokontroler secara mandiri akan langsung menyalakan relay aerator jika pH anjlok di bawah 6,0 atau suhu melewati 33°C.",
      },
      {
        q: "Mengapa BanyuWening tidak menggunakan sensor Dissolved Oxygen (DO)?",
        a: "Sensor Dissolved Oxygen (DO) industri berkualitas memerlukan kalibrasi larutan elektrolit yang rumit bagi pembudidaya kolam air tawar. BanyuWening mengombinasikan sensor pH, suhu, TDS, dan turbiditas dengan algoritma prediksi ML sebagai indikator komprehensif kesehatan ekosistem air.",
      },
    ]
  );

  // Media State (Gambar & Video)
  const [heroBgImage, setHeroBgImage] = useState(
    initialContent?.hero_bg_image || "/pics/aerasi.jpg"
  );
  const [videoUrl, setVideoUrl] = useState(
    initialContent?.video_url || "/pics/kolam-timelapse.webm"
  );
  const [videoPoster, setVideoPoster] = useState(
    initialContent?.video_poster || "/pics/kolam-timelapse-poster.jpg"
  );
  const [step1Img, setStep1Img] = useState(
    initialContent?.step_1_img || "/pics/ph-meter.jpg"
  );
  const [step2Img, setStep2Img] = useState(
    initialContent?.step_2_img || "/pics/esp32.jpg"
  );
  const [step3Img, setStep3Img] = useState(
    initialContent?.step_3_img || "/pics/lele-1.jpg"
  );
  const [step4Img, setStep4Img] = useState(
    initialContent?.step_4_img || "/pics/aerasi.jpg"
  );
  const [step5Img, setStep5Img] = useState(
    initialContent?.step_5_img || "/pics/tjipanas.jpg"
  );
  const [showcase1Img, setShowcase1Img] = useState(
    initialContent?.showcase_1_img || "/pics/takeran.jpg"
  );
  const [showcase2Img, setShowcase2Img] = useState(
    initialContent?.showcase_2_img || "/pics/esp32.jpg"
  );
  const [showcase3Img, setShowcase3Img] = useState(
    initialContent?.showcase_3_img || "/pics/aerasi.jpg"
  );
  const [showcase4Img, setShowcase4Img] = useState(
    initialContent?.showcase_4_img || "/pics/ph-meter.jpg"
  );
  const [footerBgImage, setFooterBgImage] = useState(
    initialContent?.footer_bg_image || "/pics/takeran.jpg"
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Upload handler ke backend Laravel
  const triggerUpload = (
    fieldKey: string,
    setter: (val: string) => void,
    acceptType = "image/*"
  ) => {
    currentUploadTargetRef.current = { fieldKey, setter };
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUploadTargetRef.current) return;

    const { fieldKey, setter } = currentUploadTargetRef.current;
    setUploadingField(fieldKey);

    const formData = new FormData();
    formData.append("file", file);

    const token = (
      document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement
    )?.content;

    try {
      const res = await fetch("/dashboard/landing-media/upload", {
        method: "POST",
        headers: {
          ...(token ? { "X-CSRF-TOKEN": token } : {}),
          Accept: "application/json",
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setter(data.url);
        showToast(`Media ${file.name} berhasil diunggah!`);
      } else {
        alert(
          data.error ||
            "Gagal mengunggah file. Pastikan format file sesuai dan ukuran maksimal 50MB."
        );
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Terjadi kesalahan jaringan saat mengunggah media.");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail.trim()) {
      alert("Alamat email kontak tidak boleh kosong.");
      return;
    }

    setIsSubmitting(true);
    router.post(
      "/dashboard/landing-content",
      {
        hero_tag: heroTag.trim(),
        hero_title: heroTitle.trim(),
        hero_subtitle: heroSubtitle.trim(),
        intro_statement_1: introStatement1.trim(),
        intro_statement_2: introStatement2.trim(),
        intro_statement_3: introStatement3.trim(),
        intro_statement_4: introStatement4.trim(),
        intro_statement_5: introStatement5.trim(),
        intro_desc: introDesc.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        institution_name: institutionName.trim(),
        institution_url: institutionUrl.trim(),
        cta_text: ctaText.trim(),
        cta_button_text: ctaButtonText.trim(),
        copyright_text: copyrightText.trim(),
        capabilities,
        faqs,

        // Media fields
        hero_bg_image: heroBgImage.trim(),
        video_url: videoUrl.trim(),
        video_poster: videoPoster.trim(),
        step_1_img: step1Img.trim(),
        step_2_img: step2Img.trim(),
        step_3_img: step3Img.trim(),
        step_4_img: step4Img.trim(),
        step_5_img: step5Img.trim(),
        showcase_1_img: showcase1Img.trim(),
        showcase_2_img: showcase2Img.trim(),
        showcase_3_img: showcase3Img.trim(),
        showcase_4_img: showcase4Img.trim(),
        footer_bg_image: footerBgImage.trim(),
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsSubmitting(false);
          showToast(
            "Seluruh konten, gambar, video, dan email resmi berhasil disimpan!"
          );
        },
        onError: () => {
          setIsSubmitting(false);
          alert("Gagal menyimpan konfigurasi. Periksa kelengkapan formulir.");
        },
      }
    );
  };

  const handleResetDefaults = () => {
    if (
      !confirm(
        "Kembalikan seluruh konten, gambar, video, dan narasi landing page ke setelan awal pabrik BanyuWening?"
      )
    ) {
      return;
    }

    setHeroTag("Sistem Monitoring & Otomasi Kualitas Air Kolam");
    setHeroTitle("BANYUWENING");
    setHeroSubtitle(
      "Pemantauan kualitas air kolam 24/7 dengan prediksi risiko dini, otomasi aerator, dan pengaman lokal tanpa internet"
    );
    setIntroStatement1("Jaga kolam lele 500 ekor");
    setIntroStatement2("walau tengah malam,");
    setIntroStatement3("saat pH turun tajam");
    setIntroStatement4("dan oksigen menipis.");
    setIntroStatement5("BanyuWening tidak tidur.");
    setIntroDesc(
      "Sistem IoT pemantauan kualitas air yang membaca pH, suhu, TDS, dan kekeruhan tiap 30 detik untuk kolam budidaya lele, patin, dan nila."
    );
    setContactEmail("BanyuWening@example.com");
    setContactPhone("+62 812-7890-1122");
    setInstitutionName("Institut Teknologi dan Bisnis PalComTech");
    setCtaText(
      "Sistem ini dikembangkan oleh mahasiswa Institut Teknologi dan Bisnis PalComTech untuk membantu pembudidaya ikan air tawar di Indonesia."
    );
    setCtaButtonText("Masuk ke Versi Demo");
    setCopyrightText(
      "© 2026 BanyuWening · Institut Teknologi dan Bisnis PalComTech."
    );

    // Media defaults
    setHeroBgImage("/pics/aerasi.jpg");
    setVideoUrl("/pics/kolam-timelapse.webm");
    setVideoPoster("/pics/kolam-timelapse-poster.jpg");
    setStep1Img("/pics/ph-meter.jpg");
    setStep2Img("/pics/esp32.jpg");
    setStep3Img("/pics/lele-1.jpg");
    setStep4Img("/pics/aerasi.jpg");
    setStep5Img("/pics/tjipanas.jpg");
    setShowcase1Img("/pics/takeran.jpg");
    setShowcase2Img("/pics/esp32.jpg");
    setShowcase3Img("/pics/aerasi.jpg");
    setShowcase4Img("/pics/ph-meter.jpg");
    setFooterBgImage("/pics/takeran.jpg");

    showToast("Konten telah direset di formulir. Klik 'Simpan Perubahan' untuk menerapkan.");
  };

  // Helper Capability Handlers
  const handleAddCapability = () => {
    setCapabilities([
      ...capabilities,
      {
        title: "Fitur Baru Sistem",
        desc: "Deskripsi singkat mengenai kapabilitas sistem atau sensor kolam.",
        tag: "Teknologi Kolam",
      },
    ]);
  };

  const handleUpdateCapability = (
    index: number,
    field: keyof LandingCapability,
    val: string
  ) => {
    const updated = [...capabilities];
    updated[index] = { ...updated[index], [field]: val };
    setCapabilities(updated);
  };

  const handleRemoveCapability = (index: number) => {
    setCapabilities(capabilities.filter((_, i) => i !== index));
  };

  // Helper FAQ Handlers
  const handleAddFaq = () => {
    setFaqs([
      ...faqs,
      {
        q: "Pertanyaan baru yang sering ditanyakan pembudidaya?",
        a: "Jawaban komprehensif mengenai cara kerja atau instalasi alat di kolam.",
      },
    ]);
  };

  const handleUpdateFaq = (index: number, field: keyof LandingFaq, val: string) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: val };
    setFaqs(updated);
  };

  const handleRemoveFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Hidden Master File Input for direct uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-aman/15 border border-aman text-ink rounded-[6px] flex items-center gap-2.5 text-[13px] animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-aman shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-[12px] font-semibold mb-2">
            <Globe className="w-3.5 h-3.5" />
            <span>Content Management System (CMS)</span>
          </div>
          <h1 className="text-[24px] md:text-[28px] font-display text-ink leading-tight">
            Manajemen Konten Landing Page
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Atur seluruh teks narasi, media gambar latar belakang, video ekosistem kolam,
            daftar fitur, tanya jawab (FAQ), dan alamat email kontak resmi BanyuWening.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start flex-wrap">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-3.5 border border-line bg-surface hover:bg-surface-2 text-ink rounded-[6px] text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Lihat Landing Page</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted" />
          </a>

          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="h-10 px-5 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}</span>
          </button>
        </div>
      </div>

      {/* Navigasi Sub-Tab */}
      <div className="flex border-b border-line gap-2 overflow-x-auto pb-px text-[13px]">
        <button
          onClick={() => setActiveSubTab("media")}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "media"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Gambar & Video Landing</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand/10 text-brand font-bold">
            Penting
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("kontak")}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "kontak"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email & Kontak Resmi</span>
        </button>

        <button
          onClick={() => setActiveSubTab("hero")}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "hero"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Hero & Judul Utama</span>
        </button>

        <button
          onClick={() => setActiveSubTab("intro")}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "intro"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Narasi Intro</span>
        </button>

        <button
          onClick={() => setActiveSubTab("fitur")}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "fitur"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Fitur & Keunggulan ({capabilities.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("faq")}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "faq"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Tanya Jawab / FAQ ({faqs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("cta")}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "cta"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Ajakan & Footer</span>
        </button>
      </div>

      {/* FORM BODY */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* ======================================================== */}
        {/* SUB-TAB 0: GAMBAR & VIDEO LANDING (MEDIA CMS)           */}
        {/* ======================================================== */}
        {activeSubTab === "media" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Info Banner Media */}
            <div className="p-4 rounded-[6px] bg-brand/10 border border-brand/30 flex items-start gap-3">
              <Film className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div className="text-[13px] text-ink leading-relaxed">
                <span className="font-semibold text-brand block mb-0.5">
                  Pengelolaan Media Visual Landing Page BanyuWening
                </span>
                Anda dapat mengganti foto latar belakang, video time-lapse dinamika kolam, poster video,
                5 foto tahap otomasi sistem, 4 panel showcase, hingga latar footer. Anda bisa
                <strong> mengetik path/URL</strong>, <strong>memilih preset foto kolam yang tersedia</strong>,
                atau <strong>mengunggah file langsung dari komputer</strong> Anda (otomatis disimpan ke server).
              </div>
            </div>

            {/* SECTION 1: HERO & VIDEO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hero Background Image */}
              <div className="p-5 bg-surface rounded-[6px] border border-line space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-brand" />
                    <h3 className="text-[15px] font-semibold text-ink">
                      Gambar Latar Belakang Hero Utama
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted">Layar Penuh Atas</span>
                </div>

                <div className="aspect-video w-full rounded-[6px] overflow-hidden border border-line bg-surface-2 relative group">
                  <img
                    src={heroBgImage}
                    alt="Preview Hero"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/pics/aerasi.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={heroBgImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-black/70 hover:bg-black/90 text-white rounded text-[12px] inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Resolusi Penuh</span>
                    </a>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-muted block">
                    URL atau Path File Gambar:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={heroBgImage}
                      onChange={(e) => setHeroBgImage(e.target.value)}
                      placeholder="/pics/aerasi.jpg atau https://..."
                      className="flex-1 px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                    />
                    <button
                      type="button"
                      disabled={uploadingField === "hero_bg"}
                      onClick={() => triggerUpload("hero_bg", setHeroBgImage, "image/*")}
                      className="px-3.5 py-2 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 rounded-[6px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingField === "hero_bg" ? "Mengunggah..." : "Unggah"}</span>
                    </button>
                  </div>

                  {/* Preset Choices */}
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-muted mr-1">Preset Cepat:</span>
                    {PRESET_IMAGES.slice(0, 4).map((p) => (
                      <button
                        key={p.path}
                        type="button"
                        onClick={() => setHeroBgImage(p.path)}
                        className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          heroBgImage === p.path
                            ? "bg-brand text-brand-ink border-brand"
                            : "bg-surface-2 text-ink border-line hover:border-brand/40"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Video Section */}
              <div className="p-5 bg-surface rounded-[6px] border border-line space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-brand" />
                    <h3 className="text-[15px] font-semibold text-ink">
                      Video Time-lapse Dinamika Kolam
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted">Bagian Time-lapse</span>
                </div>

                <div className="aspect-video w-full rounded-[6px] overflow-hidden border border-line bg-black relative">
                  <video
                    src={videoUrl}
                    poster={videoPoster}
                    controls
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-3">
                  {/* Video URL */}
                  <div>
                    <label className="text-[12px] font-medium text-muted block mb-1">
                      URL atau File Video (.webm / .mp4):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="/pics/kolam-timelapse.webm atau https://..."
                        className="flex-1 px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                      />
                      <button
                        type="button"
                        disabled={uploadingField === "video"}
                        onClick={() => triggerUpload("video", setVideoUrl, "video/*")}
                        className="px-3.5 py-2 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 rounded-[6px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingField === "video" ? "Mengunggah..." : "Unggah Video"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Poster Image */}
                  <div>
                    <label className="text-[12px] font-medium text-muted block mb-1">
                      Poster Thumbnail Video:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={videoPoster}
                        onChange={(e) => setVideoPoster(e.target.value)}
                        placeholder="/pics/kolam-timelapse-poster.jpg"
                        className="flex-1 px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                      />
                      <button
                        type="button"
                        disabled={uploadingField === "poster"}
                        onClick={() => triggerUpload("poster", setVideoPoster, "image/*")}
                        className="px-3.5 py-2 bg-surface-2 hover:bg-line border border-line rounded-[6px] text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Poster</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: GAMBAR 5 TAHAP ALUR KERJA (HOW IT WORKS) */}
            <div className="p-5 bg-surface rounded-[6px] border border-line space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="text-[16px] font-semibold text-ink flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand" />
                    <span>Gambar 5 Tahap Alur Kerja Sistem (How It Works)</span>
                  </h3>
                  <p className="text-[12px] text-muted mt-0.5">
                    Gambar fullscreen yang bergulir halus pada bagian "5 Tahap Otomasi BanyuWening".
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Tahap 1: Ukur */}
                <div className="p-3 bg-surface-2 rounded-[6px] border border-line space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-brand uppercase">
                    <span>Tahap 01</span>
                    <span className="text-ink">Ukur (pH Probe)</span>
                  </div>
                  <div className="h-28 rounded overflow-hidden bg-black/40 border border-line">
                    <img
                      src={step1Img}
                      alt="Tahap 1"
                      className="w-full h-full object-cover"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/pics/ph-meter.jpg")}
                    />
                  </div>
                  <input
                    type="text"
                    value={step1Img}
                    onChange={(e) => setStep1Img(e.target.value)}
                    className="w-full px-2 py-1.5 bg-surface border border-line rounded text-[11px] text-ink"
                    placeholder="/pics/ph-meter.jpg"
                  />
                  <button
                    type="button"
                    disabled={uploadingField === "step1"}
                    onClick={() => triggerUpload("step1", setStep1Img)}
                    className="w-full py-1 bg-surface hover:bg-line border border-line rounded text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-muted" />
                    <span>{uploadingField === "step1" ? "Mengunggah..." : "Unggah Gambar"}</span>
                  </button>
                </div>

                {/* Tahap 2: Kirim */}
                <div className="p-3 bg-surface-2 rounded-[6px] border border-line space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-brand uppercase">
                    <span>Tahap 02</span>
                    <span className="text-ink">Kirim (ESP32)</span>
                  </div>
                  <div className="h-28 rounded overflow-hidden bg-black/40 border border-line">
                    <img
                      src={step2Img}
                      alt="Tahap 2"
                      className="w-full h-full object-cover"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/pics/esp32.jpg")}
                    />
                  </div>
                  <input
                    type="text"
                    value={step2Img}
                    onChange={(e) => setStep2Img(e.target.value)}
                    className="w-full px-2 py-1.5 bg-surface border border-line rounded text-[11px] text-ink"
                    placeholder="/pics/esp32.jpg"
                  />
                  <button
                    type="button"
                    disabled={uploadingField === "step2"}
                    onClick={() => triggerUpload("step2", setStep2Img)}
                    className="w-full py-1 bg-surface hover:bg-line border border-line rounded text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-muted" />
                    <span>{uploadingField === "step2" ? "Mengunggah..." : "Unggah Gambar"}</span>
                  </button>
                </div>

                {/* Tahap 3: Prediksi */}
                <div className="p-3 bg-surface-2 rounded-[6px] border border-line space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-brand uppercase">
                    <span>Tahap 03</span>
                    <span className="text-ink">Prediksi (Kolam)</span>
                  </div>
                  <div className="h-28 rounded overflow-hidden bg-black/40 border border-line">
                    <img
                      src={step3Img}
                      alt="Tahap 3"
                      className="w-full h-full object-cover"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/pics/lele-1.jpg")}
                    />
                  </div>
                  <input
                    type="text"
                    value={step3Img}
                    onChange={(e) => setStep3Img(e.target.value)}
                    className="w-full px-2 py-1.5 bg-surface border border-line rounded text-[11px] text-ink"
                    placeholder="/pics/lele-1.jpg"
                  />
                  <button
                    type="button"
                    disabled={uploadingField === "step3"}
                    onClick={() => triggerUpload("step3", setStep3Img)}
                    className="w-full py-1 bg-surface hover:bg-line border border-line rounded text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-muted" />
                    <span>{uploadingField === "step3" ? "Mengunggah..." : "Unggah Gambar"}</span>
                  </button>
                </div>

                {/* Tahap 4: Nyalakan */}
                <div className="p-3 bg-surface-2 rounded-[6px] border border-line space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-brand uppercase">
                    <span>Tahap 04</span>
                    <span className="text-ink">Nyalakan (Aerasi)</span>
                  </div>
                  <div className="h-28 rounded overflow-hidden bg-black/40 border border-line">
                    <img
                      src={step4Img}
                      alt="Tahap 4"
                      className="w-full h-full object-cover"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/pics/aerasi.jpg")}
                    />
                  </div>
                  <input
                    type="text"
                    value={step4Img}
                    onChange={(e) => setStep4Img(e.target.value)}
                    className="w-full px-2 py-1.5 bg-surface border border-line rounded text-[11px] text-ink"
                    placeholder="/pics/aerasi.jpg"
                  />
                  <button
                    type="button"
                    disabled={uploadingField === "step4"}
                    onClick={() => triggerUpload("step4", setStep4Img)}
                    className="w-full py-1 bg-surface hover:bg-line border border-line rounded text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-muted" />
                    <span>{uploadingField === "step4" ? "Mengunggah..." : "Unggah Gambar"}</span>
                  </button>
                </div>

                {/* Tahap 5: Kabari */}
                <div className="p-3 bg-surface-2 rounded-[6px] border border-line space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-brand uppercase">
                    <span>Tahap 05</span>
                    <span className="text-ink">Kabari (Telegram)</span>
                  </div>
                  <div className="h-28 rounded overflow-hidden bg-black/40 border border-line">
                    <img
                      src={step5Img}
                      alt="Tahap 5"
                      className="w-full h-full object-cover"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/pics/tjipanas.jpg")}
                    />
                  </div>
                  <input
                    type="text"
                    value={step5Img}
                    onChange={(e) => setStep5Img(e.target.value)}
                    className="w-full px-2 py-1.5 bg-surface border border-line rounded text-[11px] text-ink"
                    placeholder="/pics/tjipanas.jpg"
                  />
                  <button
                    type="button"
                    disabled={uploadingField === "step5"}
                    onClick={() => triggerUpload("step5", setStep5Img)}
                    className="w-full py-1 bg-surface hover:bg-line border border-line rounded text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-muted" />
                    <span>{uploadingField === "step5" ? "Mengunggah..." : "Unggah Gambar"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 3: GALERI SHOWCASE & FOOTER */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Showcase Panels */}
              <div className="p-5 bg-surface rounded-[6px] border border-line space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-brand" />
                      <span>Galeri Kolam & Showcase (4 Kartu)</span>
                    </h3>
                    <p className="text-[12px] text-muted">
                      Gambar yang tampil pada bagian showcase panel galeri landing page.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Showcase 1 */}
                  <div className="p-2.5 bg-surface-2 rounded border border-line space-y-2">
                    <span className="text-[11px] font-semibold text-ink block truncate">
                      Panel 1: Budidaya Lele
                    </span>
                    <div className="h-20 rounded overflow-hidden bg-black/30">
                      <img src={showcase1Img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={showcase1Img}
                        onChange={(e) => setShowcase1Img(e.target.value)}
                        className="flex-1 px-2 py-1 bg-surface border border-line rounded text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => triggerUpload("sc1", setShowcase1Img)}
                        className="p-1 bg-surface border border-line rounded hover:bg-line"
                        title="Upload"
                      >
                        <Upload className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Showcase 2 */}
                  <div className="p-2.5 bg-surface-2 rounded border border-line space-y-2">
                    <span className="text-[11px] font-semibold text-ink block truncate">
                      Panel 2: Node ESP32
                    </span>
                    <div className="h-20 rounded overflow-hidden bg-black/30">
                      <img src={showcase2Img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={showcase2Img}
                        onChange={(e) => setShowcase2Img(e.target.value)}
                        className="flex-1 px-2 py-1 bg-surface border border-line rounded text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => triggerUpload("sc2", setShowcase2Img)}
                        className="p-1 bg-surface border border-line rounded hover:bg-line"
                        title="Upload"
                      >
                        <Upload className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Showcase 3 */}
                  <div className="p-2.5 bg-surface-2 rounded border border-line space-y-2">
                    <span className="text-[11px] font-semibold text-ink block truncate">
                      Panel 3: Aerasi Kolam
                    </span>
                    <div className="h-20 rounded overflow-hidden bg-black/30">
                      <img src={showcase3Img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={showcase3Img}
                        onChange={(e) => setShowcase3Img(e.target.value)}
                        className="flex-1 px-2 py-1 bg-surface border border-line rounded text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => triggerUpload("sc3", setShowcase3Img)}
                        className="p-1 bg-surface border border-line rounded hover:bg-line"
                        title="Upload"
                      >
                        <Upload className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Showcase 4 */}
                  <div className="p-2.5 bg-surface-2 rounded border border-line space-y-2">
                    <span className="text-[11px] font-semibold text-ink block truncate">
                      Panel 4: Probe pH & TDS
                    </span>
                    <div className="h-20 rounded overflow-hidden bg-black/30">
                      <img src={showcase4Img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={showcase4Img}
                        onChange={(e) => setShowcase4Img(e.target.value)}
                        className="flex-1 px-2 py-1 bg-surface border border-line rounded text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => triggerUpload("sc4", setShowcase4Img)}
                        className="p-1 bg-surface border border-line rounded hover:bg-line"
                        title="Upload"
                      >
                        <Upload className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Background Image */}
              <div className="p-5 bg-surface rounded-[6px] border border-line space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-brand" />
                      <span>Gambar Latar Belakang Footer</span>
                    </h3>
                    <p className="text-[12px] text-muted">
                      Gambar kolam yang menjadi latar belakang bagian kontak dan copyright bawah.
                    </p>
                  </div>
                </div>

                <div className="h-40 rounded-[6px] overflow-hidden bg-black/40 border border-line relative">
                  <img
                    src={footerBgImage}
                    alt="Footer Background"
                    className="w-full h-full object-cover"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/pics/takeran.jpg")}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-muted block">
                    URL atau Path Gambar Footer:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={footerBgImage}
                      onChange={(e) => setFooterBgImage(e.target.value)}
                      placeholder="/pics/takeran.jpg"
                      className="flex-1 px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                    />
                    <button
                      type="button"
                      disabled={uploadingField === "footer_bg"}
                      onClick={() => triggerUpload("footer_bg", setFooterBgImage)}
                      className="px-3.5 py-2 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 rounded-[6px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingField === "footer_bg" ? "Mengunggah..." : "Unggah"}</span>
                    </button>
                  </div>

                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-muted mr-1">Preset Cepat:</span>
                    {PRESET_IMAGES.slice(1, 5).map((p) => (
                      <button
                        key={p.path}
                        type="button"
                        onClick={() => setFooterBgImage(p.path)}
                        className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          footerBgImage === p.path
                            ? "bg-brand text-brand-ink border-brand"
                            : "bg-surface-2 text-ink border-line hover:border-brand/40"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-TAB 1: EMAIL & KONTAK RESMI                          */}
        {/* ======================================================== */}
        {activeSubTab === "kontak" && (
          <div className="p-6 bg-surface rounded-[6px] border border-line space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2">
                <Mail className="w-5 h-5 text-brand" />
                <span>Pengaturan Email & Saluran Kontak Resmi</span>
              </h2>
              <p className="text-[13px] text-muted mt-1">
                Alamat email yang diatur di sini akan otomatis tampil di seluruh tautan kontak
                landing page, footer, serta kotak bantuan di halaman login. Tautan email diatur cerdas:
                pada desktop langsung membuka web Gmail komposer, sedangkan pada smartphone memicu
                aplikasi email bawaan perangkat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-brand" />
                  <span>Alamat Email Utama Resmi</span>
                  <span className="text-bahaya">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="admin@banyuwening.id"
                  className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand font-mono"
                />
                <span className="text-[11px] text-muted block">
                  Contoh: <code>admin@banyuwening.id</code> atau <code>gofran@banyuwening.id</code>.
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-brand" />
                  <span>Nomor WhatsApp / Hotline Petambak (+62)</span>
                  <span className="text-bahaya">*</span>
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(formatWhatsAppNumber(e.target.value))}
                  onKeyDown={(e) => {
                    const input = e.currentTarget;
                    const start = input.selectionStart || 0;
                    const end = input.selectionEnd || 0;
                    // Kunci awalan "+62 ": cegah Backspace atau Delete sebelum/di dalam "+62 "
                    if (e.key === "Backspace" && start <= 4 && end <= 4) {
                      e.preventDefault();
                    }
                    if (e.key === "Delete" && start < 4) {
                      e.preventDefault();
                    }
                  }}
                  onFocus={(e) => {
                    if ((e.currentTarget.selectionStart || 0) < 4) {
                      e.currentTarget.setSelectionRange(4, 4);
                    }
                  }}
                  onClick={(e) => {
                    if ((e.currentTarget.selectionStart || 0) < 4) {
                      e.currentTarget.setSelectionRange(4, 4);
                    }
                  }}
                  placeholder="+62 8566-9548-964"
                  className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand font-mono"
                />
                <span className="text-[11px] text-muted block">
                  Format WAJIB menggunakan kode negara <code>+62</code> (contoh: <code>+62 8566-9548-964</code>).
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-brand" />
                  <span>Nama Institusi / Afiliasi Kampus</span>
                </label>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="Institut Teknologi dan Bisnis PalComTech"
                  className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand"
                />
                <span className="text-[11px] text-muted block">
                  Teks nama kampus yang ditampilkan pada bagian Kontak & Kolaborasi serta Footer.
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-brand" />
                  <span>Tautan Website Resmi Kampus (Hyperlink)</span>
                </label>
                <input
                  type="url"
                  value={institutionUrl}
                  onChange={(e) => setInstitutionUrl(e.target.value)}
                  placeholder="https://palcomtech.ac.id/"
                  className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand font-mono"
                />
                <span className="text-[11px] text-muted block">
                  URL website yang akan terbuka di tab baru saat pengunjung mengklik tulisan nama institusi di halaman muka.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-TAB 2: HERO & JUDUL UTAMA                            */}
        {/* ======================================================== */}
        {activeSubTab === "hero" && (
          <div className="p-6 bg-surface rounded-[6px] border border-line space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand" />
                <span>Hero & Judul Utama Landing Page</span>
              </h2>
              <p className="text-[13px] text-muted mt-1">
                Ubah teks tajuk dan judul raksasa yang menyambut pengunjung di bagian paling atas
                landing page.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-ink">
                  Tagline Badge Atas (Pill):
                </label>
                <input
                  type="text"
                  value={heroTag}
                  onChange={(e) => setHeroTag(e.target.value)}
                  placeholder="Sistem Monitoring & Otomasi Kualitas Air Kolam"
                  className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-ink">
                  Judul Raksasa di Tengah Hero:
                </label>
                <input
                  type="text"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  placeholder="BANYUWENING"
                  className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink font-display font-bold tracking-widest uppercase focus:outline-hidden focus:border-brand"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-ink">
                  Subjudul Penjelasan (Paragraf Hero):
                </label>
                <textarea
                  rows={3}
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  placeholder="Pemantauan kualitas air kolam 24/7 dengan prediksi risiko dini..."
                  className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-TAB 3: NARASI TANGGA (INTRO)                         */}
        {/* ======================================================== */}
        {activeSubTab === "intro" && (
          <div className="p-6 bg-surface rounded-[6px] border border-line space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand" />
                <span>Narasi Tangga Pembuka (Staircase Statements)</span>
              </h2>
              <p className="text-[13px] text-muted mt-1">
                Kustomisasi lima kalimat bertingkat yang bergeser ke kanan untuk menciptakan narasi
                dramatis komitmen BanyuWening menjaga kolam petambak.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ink">Baris 1 (Paling Kiri):</label>
                <input
                  type="text"
                  value={introStatement1}
                  onChange={(e) => setIntroStatement1(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink font-medium"
                />
              </div>

              <div className="space-y-1.5" style={{ paddingLeft: "1.5rem" }}>
                <label className="text-[12px] font-semibold text-ink">Baris 2 (Inden 1):</label>
                <input
                  type="text"
                  value={introStatement2}
                  onChange={(e) => setIntroStatement2(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink font-medium"
                />
              </div>

              <div className="space-y-1.5" style={{ paddingLeft: "3rem" }}>
                <label className="text-[12px] font-semibold text-ink">Baris 3 (Inden 2):</label>
                <input
                  type="text"
                  value={introStatement3}
                  onChange={(e) => setIntroStatement3(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink font-medium"
                />
              </div>

              <div className="space-y-1.5" style={{ paddingLeft: "4.5rem" }}>
                <label className="text-[12px] font-semibold text-ink">Baris 4 (Inden 3):</label>
                <input
                  type="text"
                  value={introStatement4}
                  onChange={(e) => setIntroStatement4(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink font-medium"
                />
              </div>

              <div className="space-y-1.5" style={{ paddingLeft: "6rem" }}>
                <label className="text-[12px] font-semibold text-ink">Baris 5 (Inden 4):</label>
                <input
                  type="text"
                  value={introStatement5}
                  onChange={(e) => setIntroStatement5(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink font-bold text-brand"
                />
              </div>

              <div className="space-y-2 pt-4 border-t border-line">
                <label className="text-[13px] font-semibold text-ink">
                  Deskripsi Ringkas di Bawah Tangga:
                </label>
                <textarea
                  rows={3}
                  value={introDesc}
                  onChange={(e) => setIntroDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-TAB 4: FITUR & KEUNGGULAN (CAPABILITIES)             */}
        {/* ======================================================== */}
        {activeSubTab === "fitur" && (
          <div className="p-6 bg-surface rounded-[6px] border border-line space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand" />
                  <span>Daftar Fitur & Keunggulan Sistem</span>
                </h2>
                <p className="text-[13px] text-muted mt-1">
                  Kelola kartu kapabilitas yang menjelaskan kelebihan teknis sistem BanyuWening
                  kepada pengunjung.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddCapability}
                className="h-9 px-3.5 bg-surface-2 hover:bg-line border border-line text-ink rounded-[6px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-brand" />
                <span>Tambah Kartu Fitur</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {capabilities.map((cap, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-surface-2 rounded-[6px] border border-line space-y-3 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-muted uppercase">
                      Kartu #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCapability(idx)}
                      className="text-muted hover:text-bahaya p-1 rounded transition-colors cursor-pointer"
                      title="Hapus kartu ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted">Judul Fitur:</label>
                    <input
                      type="text"
                      value={cap.title}
                      onChange={(e) => handleUpdateCapability(idx, "title", e.target.value)}
                      placeholder="Judul Fitur"
                      className="w-full px-2.5 py-1.5 bg-surface border border-line rounded text-[13px] font-semibold text-ink"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted">Badge Kategori:</label>
                    <input
                      type="text"
                      value={cap.tag}
                      onChange={(e) => handleUpdateCapability(idx, "tag", e.target.value)}
                      placeholder="Hardware ESP32 / Machine Learning"
                      className="w-full px-2.5 py-1.5 bg-surface border border-line rounded text-[12px] text-brand font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted">Deskripsi Lengkap:</label>
                    <textarea
                      rows={2}
                      value={cap.desc}
                      onChange={(e) => handleUpdateCapability(idx, "desc", e.target.value)}
                      placeholder="Penjelasan kapabilitas..."
                      className="w-full px-2.5 py-1.5 bg-surface border border-line rounded text-[12px] text-ink leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-TAB 5: TANYA JAWAB (FAQ)                             */}
        {/* ======================================================== */}
        {activeSubTab === "faq" && (
          <div className="p-6 bg-surface rounded-[6px] border border-line space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-brand" />
                  <span>Tanya Jawab / Frequently Asked Questions (FAQ)</span>
                </h2>
                <p className="text-[13px] text-muted mt-1">
                  Tambahkan atau ubah butir pertanyaan teknis yang sering ditanyakan oleh pembudidaya
                  lele dan mitra lapangan.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddFaq}
                className="h-9 px-3.5 bg-surface-2 hover:bg-line border border-line text-ink rounded-[6px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-brand" />
                <span>Tambah Pertanyaan FAQ</span>
              </button>
            </div>

            <div className="space-y-4 pt-2">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-surface-2 rounded-[6px] border border-line space-y-3 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-muted uppercase">
                      Pertanyaan #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(idx)}
                      className="text-muted hover:text-bahaya p-1 rounded transition-colors cursor-pointer"
                      title="Hapus FAQ ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted">Pertanyaan (Tanya):</label>
                    <input
                      type="text"
                      value={faq.q}
                      onChange={(e) => handleUpdateFaq(idx, "q", e.target.value)}
                      placeholder="Apakah sistem tetap bekerja jika WiFi terputus?"
                      className="w-full px-3 py-2 bg-surface border border-line rounded text-[13px] font-semibold text-ink"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted">Jawaban Rinci (Jawab):</label>
                    <textarea
                      rows={3}
                      value={faq.a}
                      onChange={(e) => handleUpdateFaq(idx, "a", e.target.value)}
                      placeholder="Ya, mikrokontroler memiliki failsafe mandiri..."
                      className="w-full px-3 py-2 bg-surface border border-line rounded text-[13px] text-ink leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-TAB 6: AJAKAN (CTA) & FOOTER                         */}
        {/* ======================================================== */}
        {activeSubTab === "cta" && (
          <div className="p-6 bg-surface rounded-[6px] border border-line space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2">
                <Building className="w-5 h-5 text-brand" />
                <span>Bagian Ajakan (Call to Action) & Hak Cipta Footer</span>
              </h2>
              <p className="text-[13px] text-muted mt-1">
                Atur kalimat penutup landing page, label tombol menuju simulator, serta teks
                copyright di dasar halaman.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-ink">
                  Teks Ajakan / Penutup (CTA Statement):
                </label>
                <textarea
                  rows={3}
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Sistem ini dikembangkan oleh mahasiswa Institut Teknologi dan Bisnis PalComTech..."
                  className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-ink">
                    Teks Tombol Aksi Utama (CTA Button):
                  </label>
                  <input
                    type="text"
                    value={ctaButtonText}
                    onChange={(e) => setCtaButtonText(e.target.value)}
                    placeholder="Masuk ke Versi Demo"
                    className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-ink">
                    Teks Hak Cipta (Footer Copyright):
                  </label>
                  <input
                    type="text"
                    value={copyrightText}
                    onChange={(e) => setCopyrightText(e.target.value)}
                    placeholder="© 2026 BanyuWening · Institut Teknologi dan Bisnis PalComTech."
                    className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 bg-surface rounded-[6px] border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <Info className="w-4 h-4 text-brand shrink-0" />
            <span>Perubahan yang Anda simpan akan seketika tampil di seluruh beranda publik.</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 border border-line bg-surface hover:bg-surface-2 text-muted hover:text-ink rounded-[6px] text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Setelan Awal</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
