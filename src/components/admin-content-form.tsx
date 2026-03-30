"use client";

import { BMI_CATEGORIES, CONTENT_TYPES, getBmiCategoryLabel, getPlanLevelLabel, type ContentType } from "@/lib/content";
import type { BmiCategory } from "@/lib/bmi";

export type AdminContentFormValues = {
  title: string;
  description: string;
  type: ContentType;
  planLevel: string;
  dayNumber: string;
  bmiCategory: BmiCategory;
};

type AdminContentFormProps = {
  values: AdminContentFormValues;
  onChange: (values: AdminContentFormValues) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
};

export function AdminContentForm({
  values,
  onChange,
  onSubmit,
  submitting,
  submitLabel
}: AdminContentFormProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="form-label">Title</label>
        <input
          type="text"
          value={values.title}
          onChange={(event) => onChange({ ...values, title: event.target.value })}
          className="dark-input w-full"
          placeholder="Chest Workout Day 1"
          required
        />
      </div>

      <div>
        <label className="form-label">Description</label>
        <textarea
          value={values.description}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
          className="dark-input min-h-32 w-full"
          placeholder="Describe the workout, diet guidance, or tip in a beginner-friendly way."
          required
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="form-label">Type</label>
          <select
            value={values.type}
            onChange={(event) => onChange({ ...values, type: event.target.value as ContentType })}
            className="dark-input w-full"
          >
            {CONTENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Plan Level</label>
          <select
            value={values.planLevel}
            onChange={(event) => onChange({ ...values, planLevel: event.target.value })}
            className="dark-input w-full"
          >
            {[1, 2, 3].map((level) => (
              <option key={level} value={String(level)}>
                {getPlanLevelLabel(level)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Day Number</label>
          <select
            value={values.dayNumber}
            onChange={(event) => onChange({ ...values, dayNumber: event.target.value })}
            className="dark-input w-full"
          >
            {Array.from({ length: 30 }, (_, index) => index + 1).map((day) => (
              <option key={day} value={String(day)}>
                Day {day}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">BMI Category</label>
          <select
            value={values.bmiCategory}
            onChange={(event) => onChange({ ...values, bmiCategory: event.target.value as BmiCategory })}
            className="dark-input w-full"
          >
            {BMI_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {getBmiCategoryLabel(category)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel-muted px-4 py-3 text-sm">
        This item will unlock on <span className="heading-primary font-semibold">Day {values.dayNumber}</span> for users
        with <span className="heading-primary font-semibold"> {getPlanLevelLabel(Number(values.planLevel))}</span> and BMI
        category <span className="heading-primary font-semibold"> {getBmiCategoryLabel(values.bmiCategory)}</span>.
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="dark-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}
