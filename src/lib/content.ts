import type { BmiCategory } from "@/lib/bmi";

export type ContentType = "workout" | "diet" | "tip";

export type ContentItem = {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  planLevel: number;
  dayNumber: number;
  bmiCategory: BmiCategory;
  createdAt?: string;
};

export const CONTENT_TYPES: ContentType[] = ["workout", "diet", "tip"];
export const BMI_CATEGORIES: BmiCategory[] = ["underweight", "normal", "overweight"];

export function getPlanLevelLabel(level: number) {
  if (level === 1) {
    return "Plan A";
  }

  if (level === 2) {
    return "Plan B";
  }

  if (level === 3) {
    return "Plan C";
  }

  return "Unknown Plan";
}

export function getContentTypeLabel(type: ContentType) {
  if (type === "workout") {
    return "Workouts";
  }

  if (type === "diet") {
    return "Diet Plans";
  }

  return "Tips";
}

export function getBmiCategoryLabel(category: BmiCategory) {
  if (category === "underweight") {
    return "Underweight";
  }

  if (category === "normal") {
    return "Normal";
  }

  return "Overweight";
}

export function getContentCreatedDate(createdAt?: string) {
  if (!createdAt) {
    return null;
  }

  const parsedDate = new Date(createdAt);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function isContentVisible(createdAt?: string) {
  const contentDate = getContentCreatedDate(createdAt);

  if (!contentDate) {
    return true;
  }

  const expiryDate = new Date(contentDate);
  expiryDate.setDate(expiryDate.getDate() + 30);
  return Date.now() <= expiryDate.getTime();
}

export function getPublishedDays(items: ContentItem[]) {
  return [...new Set(items.filter((item) => isContentVisible(item.createdAt)).map((item) => item.dayNumber))].sort(
    (first, second) => first - second
  );
}
