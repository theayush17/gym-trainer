export type UserSubscription = {
  planId?: string;
  planLevel?: number;
  status?: string;
  expiry?: string;
  subscriptionStartDate?: string;
};

export type UserProfile = {
  uid?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  weight?: number;
  height?: number;
  bmi?: number;
  bmiCategory?: "underweight" | "normal" | "overweight";
  role?: "admin" | "user";
  subscription?: UserSubscription;
  createdAt?: string;
  updatedAt?: string;
};

export type SubscriptionState = "no_plan" | "active" | "expired";

export function getSubscriptionState(subscription?: UserSubscription): SubscriptionState {
  if (!subscription?.planId || subscription.status !== "active" || !subscription.expiry) {
    return "no_plan";
  }

  const expiryTime = new Date(subscription.expiry).getTime();

  if (Number.isNaN(expiryTime) || expiryTime <= Date.now()) {
    return "expired";
  }

  return "active";
}

export function getAuthenticatedRedirectPath(profile: UserProfile | null): string {
  return getSubscriptionState(profile?.subscription) === "active" ? "/dashboard" : "/plans";
}

export function getPlansRedirectReason(profile: UserProfile | null): string {
  return getSubscriptionState(profile?.subscription) === "expired" ? "expired" : "";
}

export function getCurrentSubscriptionDay(subscription?: UserSubscription) {
  const startDate = getSubscriptionStartDate(subscription);

  if (!startDate || getSubscriptionState(subscription) !== "active") {
    return 0;
  }

  const startTime = startDate.getTime();

  const diffInDays = Math.floor((Date.now() - startTime) / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(Math.max(diffInDays, 1), 30);
}

export function getExpiryCountdown(subscription?: UserSubscription) {
  if (!subscription?.expiry) {
    return 0;
  }

  const expiryTime = new Date(subscription.expiry).getTime();

  if (Number.isNaN(expiryTime)) {
    return 0;
  }

  const diff = expiryTime - Date.now();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
}

export function getSubscriptionStartDate(subscription?: UserSubscription) {
  if (subscription?.subscriptionStartDate) {
    const explicitStartDate = new Date(subscription.subscriptionStartDate);

    if (!Number.isNaN(explicitStartDate.getTime())) {
      return explicitStartDate;
    }
  }

  if (subscription?.expiry) {
    const expiryDate = new Date(subscription.expiry);

    if (!Number.isNaN(expiryDate.getTime())) {
      const derivedStartDate = new Date(expiryDate);
      derivedStartDate.setDate(derivedStartDate.getDate() - 29);
      return derivedStartDate;
    }
  }

  return null;
}
