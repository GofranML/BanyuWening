import { useState } from "react";
import { router } from "@inertiajs/react";
import {
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  Mail,
  Building2,
  AlertCircle,
  Pencil,
  ShieldCheck,
  ShieldAlert,
  X,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import type { User, UserRole } from "@/Types";
import { getRoleBadgeLabel } from "@/lib/formatters";

interface SuperAdminUserManagementProps {
  users: User[];
}

export function SuperAdminUserManagement({ users }: SuperAdminUserManagementProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("OPERATOR");
  const [pondName, setPondName] = useState("");
  const [phone, setPhone] = useState("");

  // Edit Modal states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("OPERATOR");
  const [editPondName, setEditPondName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editReset2fa, setEditReset2fa] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      alert("Harap lengkapi nama, email, dan kata sandi.");
      return;
    }

    const titleByRole: Record<UserRole, string> = {
      ADMIN: "Super Administrator Sistem",
      OPERATOR: "Operator Teknis Lapangan",
      ANALIS: "Pakar Akuakultur & Analisis Data",
      PEMILIK: "Pemilik Budidaya Tambak",
    };

    setIsSubmitting(true);
    router.post(
      "/dashboard/users",
      {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
        title: titleByRole[role],
        pond_name: pondName.trim() || "Kolam Terpal 01",
        phone: phone.trim() || "-",
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          showToast(`Akun berhasil dibuat untuk ${name} (${getRoleBadgeLabel(role)})!`);
          setName("");
          setEmail("");
          setPassword("");
          setRole("OPERATOR");
          setPondName("");
          setPhone("");
          setIsFormOpen(false);
          setIsSubmitting(false);
        },
        onError: (errors) => {
          setIsSubmitting(false);
          alert(Object.values(errors).join("\n") || "Gagal membuat pengguna baru.");
        },
      }
    );
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPondName(u.pond_name || "");
    setEditPhone(u.phone || "");
    setEditPassword("");
    setEditReset2fa(false);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim() || !editEmail.trim()) {
      alert("Nama dan email wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    router.post(
      `/dashboard/users/${editingUser.id}/update`,
      {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        pond_name: editPondName.trim() || "-",
        phone: editPhone.trim() || "-",
        password: editPassword.trim() || undefined,
        reset_2fa: editReset2fa,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          showToast(`Data akun ${editName} berhasil diperbarui!`);
          setEditingUser(null);
          setIsSubmitting(false);
        },
        onError: (errors) => {
          setIsSubmitting(false);
          alert(Object.values(errors).join("\n") || "Gagal memperbarui pengguna.");
        },
      }
    );
  };

  const handleDelete = (id: number | string, userName: string, userEmail?: string) => {
    const cleanId = String(id).replace("usr-", "");
    if (userEmail === "admin@banyuwening.id") {
      alert("Akun Super Administrator utama (admin@banyuwening.id) dilindungi dan tidak dapat dihapus.");
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus akun ${userName}?`)) {
      router.delete(`/dashboard/users/${cleanId}`, {
        preserveScroll: true,
        onSuccess: () => {
          showToast(`Akun ${userName} berhasil dihapus.`);
        },
        onError: () => {
          alert("Gagal menghapus pengguna.");
        },
      });
    }
  };

  return (
    <div className="space-y-6">
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 text-[12px] font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Kontrol Hak Akses & Akun</span>
          </div>
          <h1 className="text-[24px] md:text-[28px] font-display text-ink leading-tight">
            Buat & Kelola Akun Pengguna
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Khusus Super Administrator: Tambah akun baru, edit informasi profil pengguna, ubah hak akses (role),
            dan reset keamanan 2FA akun operasional.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="h-10 px-4 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2 cursor-pointer self-start shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isFormOpen ? "Tutup Formulir" : "Tambah Akun Baru"}</span>
        </button>
      </div>

      {/* Form Tambah Pengguna Baru */}
      {isFormOpen && (
        <form
          onSubmit={handleCreateUser}
          className="p-5 bg-surface rounded-[6px] border border-line space-y-4 animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-brand" />
              <span>Pendaftaran Akun Pengguna Baru</span>
            </h3>
            <span className="text-[12px] text-muted">Seluruh kolom bertanda * wajib diisi</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink">
                Nama Lengkap Pengguna <span className="text-bahaya">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
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
                Kata Sandi Awal <span className="text-bahaya">*</span>
              </label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 5 karakter"
                className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink">
                Peran / Role Pengguna <span className="text-bahaya">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand cursor-pointer"
              >
                <option value="OPERATOR">Operator Kolam (Kendali Relay & Manual)</option>
                <option value="ANALIS">Analis Akuakultur (Ekspor & Data ML)</option>
                <option value="PEMILIK">Pemilik Kolam (Laporan Eksekutif)</option>
                <option value="ADMIN">Super Administrator (Akses Penuh)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink">
                Unit Tambak / Nama Kolam
              </label>
              <input
                type="text"
                value={pondName}
                onChange={(e) => setPondName(e.target.value)}
                placeholder="Kolam Terpal 01 / Kolam Bioflok A"
                className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+62 812-xxxx-xxxx"
                className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="h-9 px-4 border border-line rounded-[6px] text-[13px] font-medium text-muted hover:text-ink transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan & Terbitkan Akun"}
            </button>
          </div>
        </form>
      )}

      {/* MODAL EDIT PENGGUNA (KHUSUS SUPER ADMIN) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-line rounded-[10px] shadow-2xl max-w-xl w-full p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand/15 text-brand flex items-center justify-center font-bold text-[13px]">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-ink">
                    Edit Akun Pengguna
                  </h3>
                  <p className="text-[12px] text-muted">
                    Memperbarui data akun <strong>{editingUser.name}</strong> (ID: #{editingUser.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-muted hover:text-ink rounded-full hover:bg-surface-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Nama Lengkap <span className="text-bahaya">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Alamat Email <span className="text-bahaya">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Peran / Role Pengguna
                  </label>
                  <select
                    value={editRole}
                    disabled={editingUser.email === "admin@banyuwening.id"}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand cursor-pointer disabled:opacity-50"
                  >
                    <option value="OPERATOR">Operator Kolam (Kendali Relay & Manual)</option>
                    <option value="ANALIS">Analis Akuakultur (Ekspor & Data ML)</option>
                    <option value="PEMILIK">Pemilik Kolam (Laporan Eksekutif)</option>
                    <option value="ADMIN">Super Administrator (Akses Penuh)</option>
                  </select>
                  {editingUser.email === "admin@banyuwening.id" && (
                    <span className="text-[10px] text-muted block">
                      Role Super Admin utama dilindungi sistem.
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Unit Tambak / Nama Kolam
                  </label>
                  <input
                    type="text"
                    value={editPondName}
                    onChange={(e) => setEditPondName(e.target.value)}
                    placeholder="Contoh: Kolam Terpal 01"
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[12px] font-semibold text-ink">
                    Nomor WhatsApp / Telepon
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+62 812-xxxx-xxxx"
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2 p-3 rounded-[6px] bg-surface-2 border border-line">
                  <label className="text-[12px] font-semibold text-ink flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-brand" />
                    <span>Reset Kata Sandi Baru (Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak ingin mengubah kata sandi akun ini"
                    className="w-full h-9 px-3 bg-surface border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                  <span className="text-[11px] text-muted block">
                    Masukkan password baru jika pengguna lupa password atau meminta reset.
                  </span>
                </div>

                {/* 2FA Management */}
                <div className="md:col-span-2 p-3 rounded-[6px] bg-surface-2 border border-line flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-[12px] font-semibold text-ink flex items-center gap-1.5">
                      {editingUser.two_factor_enabled ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-aman" />
                          <span>Status 2FA: Aktif</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 text-muted" />
                          <span>Status 2FA: Belum Aktif</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-muted">
                      {editingUser.two_factor_enabled
                        ? "Pengguna menggunakan verifikasi dua faktor saat login."
                        : "Akun login langsung tanpa OTP tambahan."}
                    </p>
                  </div>

                  {editingUser.two_factor_enabled && (
                    <label className="flex items-center gap-2 text-[12px] font-medium text-bahaya cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editReset2fa}
                        onChange={(e) => setEditReset2fa(e.target.checked)}
                        className="rounded border-line text-bahaya focus:ring-bahaya"
                      />
                      <span>Reset 2FA Akun Ini</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="h-9 px-4 border border-line rounded-[6px] text-[13px] font-medium text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-5 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <span>{isSubmitting ? "Menyimpan..." : "Simpan Perubahan Akun"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabel Daftar Pengguna */}
      <div className="bg-surface border border-line rounded-[6px] overflow-hidden">
        <div className="p-4 border-b border-line flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">
              Daftar Pengguna Aktif ({users.length} Akun)
            </h3>
            <span className="text-[12px] text-muted">
              Tersimpan di sistem basis data autentikasi Laravel BanyuWening
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-2 text-ink font-semibold border-b border-line">
              <tr>
                <th className="p-3">Pengguna</th>
                <th className="p-3">Peran / Hak Akses</th>
                <th className="p-3">Unit / Kolam</th>
                <th className="p-3">Keamanan (2FA)</th>
                <th className="p-3">Kontak</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-muted">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-2/40 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand/15 text-brand font-bold text-[12px] flex items-center justify-center shrink-0">
                        {u.avatar_initials || u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-ink">{u.name}</div>
                        <div className="text-[11px] text-muted flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{u.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        u.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                          : u.role === "OPERATOR"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                          : u.role === "ANALIS"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      }`}
                    >
                      {getRoleBadgeLabel(u.role)}
                    </span>
                    <div className="text-[11px] text-muted mt-0.5">{u.title}</div>
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-ink text-[12px]">
                      <Building2 className="w-3.5 h-3.5 text-muted shrink-0" />
                      <span>{u.pond_name || "-"}</span>
                    </div>
                  </td>

                  <td className="p-3">
                    {u.two_factor_enabled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-aman/15 text-aman border border-aman/30">
                        <ShieldCheck className="w-3 h-3" />
                        <span>2FA Aktif</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-muted bg-surface-2 border border-line">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Nonaktif</span>
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    <div className="text-[12px] text-ink">{u.phone || "-"}</div>
                    <div className="text-[11px] text-muted">ID: #{u.id}</div>
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 text-muted hover:text-brand hover:bg-brand/10 rounded transition-colors cursor-pointer"
                        title={`Edit data akun ${u.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {u.email === "admin@banyuwening.id" ? (
                        <span
                          className="inline-block p-1.5 text-muted/30 cursor-not-allowed"
                          title="Akun Super Admin utama sistem dilindungi"
                        >
                          <Trash2 className="w-4 h-4 opacity-30" />
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDelete(u.id, u.name, u.email)}
                          className="p-1.5 text-muted hover:text-bahaya hover:bg-bahaya/10 rounded transition-colors cursor-pointer"
                          title="Hapus akun pengguna ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
