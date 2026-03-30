"use client";

import { Pencil, X } from "lucide-react";

type ProfileFieldCardProps = {
  label: string;
  value: string;
  inputType?: "text" | "email" | "tel" | "number";
  editing: boolean;
  draftValue: string;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
};

export function ProfileFieldCard({
  label,
  value,
  inputType = "text",
  editing,
  draftValue,
  saving,
  onEdit,
  onCancel,
  onChange,
  onSave
}: ProfileFieldCardProps) {
  return (
    <div className="dark-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-soft text-sm">{label}</p>
          {editing ? (
            <input
              type={inputType}
              value={draftValue}
              onChange={(event) => onChange(event.target.value)}
              className="dark-input mt-3 w-full min-w-0"
            />
          ) : (
            <p className="heading-primary mt-3 text-lg font-semibold">{value || "-"}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={editing ? onSave : onEdit}
            disabled={saving}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-gray-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editing ? (
              <span className="text-xs font-semibold">{saving ? "..." : "Save"}</span>
            ) : (
              <Pencil className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
