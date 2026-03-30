export type Plan = {
  id: string;
  name: string;
  price: string;
  numericPrice: number;
  benefits: string[];
  accent: string;
  description: string;
  level: number;
  label: "A" | "B" | "C";
};

export const STORAGE_UID_KEY = "gymTrainerUID";

export const PLANS: Plan[] = [
  {
    id: "plan_100",
    name: "Basic Plan",
    price: "₹100",
    numericPrice: 100,
    description: "A simple starter membership for consistent training habits.",
    level: 1,
    label: "A",
    benefits: ["Starter workout library", "General diet guidance", "Weekly motivation tips"],
    accent: "from-amber-100 to-orange-50"
  },
  {
    id: "plan_200",
    name: "Pro Plan",
    price: "₹200",
    numericPrice: 200,
    description: "A stronger plan for users who want better structure and progress.",
    level: 2,
    label: "B",
    benefits: ["Progressive training schedule", "Better meal structure", "Recovery and form tips"],
    accent: "from-emerald-100 to-teal-50"
  },
  {
    id: "plan_500",
    name: "Premium Plan",
    price: "₹500",
    numericPrice: 500,
    description: "The most complete fake test subscription for advanced training support.",
    level: 3,
    label: "C",
    benefits: ["Advanced workout split", "Premium diet recommendations", "Priority fitness guidance"],
    accent: "from-rose-100 to-pink-50"
  }
];

export function getPlanById(planId?: string) {
  return PLANS.find((plan) => plan.id === planId);
}

export function getPlanLevelFromPlanId(planId?: string) {
  return getPlanById(planId)?.level ?? 0;
}

export function getPlanLabelFromLevel(level?: number) {
  if (level === 1) {
    return "Plan A";
  }

  if (level === 2) {
    return "Plan B";
  }

  if (level === 3) {
    return "Plan C";
  }

  return "No Plan";
}
