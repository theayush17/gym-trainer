"use client";

import { Pencil, X } from "lucide-react";
import type { ReactNode } from "react";

type ProfileFieldCardProps = {
  label: string;
  value: string;
  inputType?: "text" | "email" | "tel" | "number";
  editing?: boolean;
  draftValue?: string;
  saving?: boolean;
  readOnly?: boolean;
  badge?: ReactNode;
  onEdit?: () => void;
  onCancel?: () => void;
  onChange?: (value: string) => void;
  onSave?: () => void;
};

export function ProfileFieldCard({
  label,
  value,
  inputType = "text",
  editing = false,
  draftValue = "",
  saving = false,
  readOnly = false,
  badge,
  onEdit,
  onCancel,
  onChange,
  onSave
}: ProfileFieldCardProps) {
  return (
    <div className="dark-card rounded-2xl p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-soft text-sm font-medium">{label}</p>
          {editing && !readOnly ? (
            <input
              type={inputType}
              value={draftValue}
              onChange={(event) => onChange?.(event.target.value)}
              className="dark-input mt-3 w-full"
              autoFocus
            />
          ) : (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <p className="heading-primary text-lg font-bold truncate">{value || "-"}</p>
              {badge}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-white"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-all hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-gray-200"
                >
                  {saving ? "..." : "Save"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-gray-800 dark:bg-gray-900 dark:text-slate-100 dark:hover:bg-gray-800"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
