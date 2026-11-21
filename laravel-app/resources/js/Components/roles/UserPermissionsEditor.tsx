import { RotateCcw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
  type PermissionKey,
  type PermissionMeta,
  type UserPermissions,
  type UserRole,
} from "@/Types";

const LOCKED_PRIMARY_ADMIN_KEYS: PermissionKey[] = [
  "view_summary",
  "manage_users",
  "manage_backups",
  "view_docs_api",
];

const CATEGORIES: PermissionMeta["category"][] = [
  "Monitoring & Operasional",
  "Analitik & Pelaporan",
  "Administrasi & Sistem",
];

interface UserPermissionsEditorProps {
  targetRole: UserRole;
  targetEmail?: string;
  value: UserPermissions;
  onChange: (next: UserPermissions) => void;
  onReset?: () => void;
  compact?: boolean;
}

export function countCustomOverrides(role: UserRole, value: UserPermissions): number {
  const defaults = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.OPERATOR;
  return PERMISSION_CATALOG.filter((m) => Boolean(value[m.key]) !== Boolean(defaults[m.key])).length;
}

export function UserPermissionsEditor({
  targetRole,
  targetEmail,
  value,
  onChange,
  onReset,
  compact = false,
}: UserPermissionsEditorProps) {
  const defaults = DEFAULT_ROLE_PERMISSIONS[targetRole] || DEFAULT_ROLE_PERMISSIONS.OPERATOR;
  const isPrimaryAdmin = targetEmail === "admin@banyuwening.id";
  const overrideCount = countCustomOverrides(targetRole, value);

  const toggleKey = (key: PermissionKey) => {
    if (isPrimaryAdmin && LOCKED_PRIMARY_ADMIN_KEYS.includes(key)) {
      return;
    }
    onChange({
      ...value,
      [key]: !value[key],
    });
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onChange({ ...defaults });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-[6px] bg-surface-2 border border-line text-[12px]">
        <div className="flex items-center gap-2 text-ink">
          <SlidersHorizontal className="w-4 h-4 text-brand shrink-0" />
          <span>
            Basis peran: <strong>{targetRole}</strong>{" "}
            {overrideCount > 0 ? (
              <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
                {overrideCount} hak akses dikustom
              </span>
            ) : (
              <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded bg-aman/15 text-aman font-semibold text-[11px]">
                Sesuai Default Role
              </span>
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="h-8 px-2.5 rounded-[6px] border border-line bg-surface text-[11px] font-semibold text-ink hover:border-brand/60 hover:text-brand inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset ke Default {targetRole}</span>
        </button>
      </div>

      {isPrimaryAdmin && (
        <div className="p-2.5 rounded-[6px] bg-brand/10 border border-brand/25 text-[11px] text-brand flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            Akun Super Administrator utama (<code>admin@banyuwening.id</code>) mengunci hak akses inti agar
            sistem terhindar dari penguncian akses (Zero-Lockout).
          </span>
        </div>
      )}

      <div className="space-y-4">
        {CATEGORIES.map((category) => {
          const items = PERMISSION_CATALOG.filter((item) => item.category === category);
          return (
            <div key={category} className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted px-0.5">
                {category}
              </div>
              <div
                className={`grid gap-2 ${
                  compact ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2"
                }`}
              >
                {items.map((item) => {
                  const checked = Boolean(value[item.key]);
                  const isDefault = Boolean(defaults[item.key]);
                  const isDiff = checked !== isDefault;
                  const isLocked = isPrimaryAdmin && LOCKED_PRIMARY_ADMIN_KEYS.includes(item.key);

                  return (
                    <label
                      key={item.key}
                      className={`p-3 rounded-[6px] border transition-colors flex items-start justify-between gap-3 ${
                        isLocked ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
                      } ${
                        isDiff
                          ? "bg-amber-500/5 border-amber-500/40"
                          : checked
                          ? "bg-surface border-brand/30"
                          : "bg-surface-2/60 border-line"
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[12px] font-semibold text-ink">{item.label}</span>
                          {isDiff && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              Kustom
                            </span>
                          )}
                          {isLocked && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-brand/10 text-brand">
                              Terkunci
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted leading-snug">{item.description}</p>
                      </div>

                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isLocked}
                        onChange={() => toggleKey(item.key)}
                        className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand shrink-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
