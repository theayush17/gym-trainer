export type UserSubscription = {
  planId?: string;
  planLevel?: number;
  status?: string;
  expiry?: string;
  subscriptionStartDate?: string;
  renewalPlanId?: string;
  renewalPlanLevel?: number;
  renewalStartDate?: string;
  renewalExpiry?: string;
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

export const SUBSCRIPTION_DURATION_DAYS = 30;

function getValidDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function addSubscriptionDuration(startDate: Date) {
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + SUBSCRIPTION_DURATION_DAYS);
  return expiryDate;
}

export function getEffectiveSubscription(subscription?: UserSubscription) {
  if (!subscription) {
    return undefined;
  }

  const expiryDate = getValidDate(subscription.expiry);
  const renewalStartDate = getValidDate(subscription.renewalStartDate);
  const renewalExpiryDate = getValidDate(subscription.renewalExpiry);
  const hasQueuedRenewal =
    !!subscription.renewalPlanId &&
    !!renewalStartDate &&
    !!renewalExpiryDate &&
    renewalStartDate.getTime() <= Date.now() &&
    (!expiryDate || expiryDate.getTime() <= Date.now());

  if (!hasQueuedRenewal) {
    return subscription;
  }

  return {
    planId: subscription.renewalPlanId,
    planLevel: subscription.renewalPlanLevel,
    status: "active",
    expiry: renewalExpiryDate.toISOString(),
    subscriptionStartDate: renewalStartDate.toISOString()
  };
}

export function getSubscriptionState(subscription?: UserSubscription): SubscriptionState {
  const activeSubscription = getEffectiveSubscription(subscription);

  if (!activeSubscription?.planId || activeSubscription.status !== "active" || !activeSubscription.expiry) {
    return "no_plan";
  }

  const expiryTime = new Date(activeSubscription.expiry).getTime();

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
  const now = Date.now();

  if (startTime > now) {
    return 0;
  }

  const diffInDays = Math.floor((now - startTime) / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(Math.max(diffInDays, 1), SUBSCRIPTION_DURATION_DAYS);
}

export function getExpiryCountdown(subscription?: UserSubscription) {
  const activeSubscription = getEffectiveSubscription(subscription);

  if (!activeSubscription?.expiry) {
    return 0;
  }

  const expiryTime = new Date(activeSubscription.expiry).getTime();

  if (Number.isNaN(expiryTime)) {
    return 0;
  }

  const diff = expiryTime - Date.now();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
}

export function getSubscriptionStartDate(subscription?: UserSubscription) {
  const activeSubscription = getEffectiveSubscription(subscription);

  if (activeSubscription?.subscriptionStartDate) {
    const explicitStartDate = new Date(activeSubscription.subscriptionStartDate);

    if (!Number.isNaN(explicitStartDate.getTime())) {
      return explicitStartDate;
    }
  }

  if (activeSubscription?.expiry) {
    const expiryDate = new Date(activeSubscription.expiry);

    if (!Number.isNaN(expiryDate.getTime())) {
      const derivedStartDate = new Date(expiryDate);
      derivedStartDate.setDate(derivedStartDate.getDate() - (SUBSCRIPTION_DURATION_DAYS - 1));
      return derivedStartDate;
    }
  }

  return null;
}

export function getSubscriptionExpiryDate(subscription?: UserSubscription) {
  return getValidDate(getEffectiveSubscription(subscription)?.expiry);
}

export function hasPendingRenewal(subscription?: UserSubscription) {
  const renewalStartDate = getValidDate(subscription?.renewalStartDate);
  const renewalExpiryDate = getValidDate(subscription?.renewalExpiry);

  return !!subscription?.renewalPlanId && !!renewalStartDate && !!renewalExpiryDate && renewalStartDate.getTime() > Date.now();
}

export function canRenewSubscription(subscription?: UserSubscription) {
  return getSubscriptionState(subscription) === "active" && !hasPendingRenewal(subscription) && getExpiryCountdown(subscription) <= 2;
}

export function buildSubscriptionUpdate({
  currentSubscription,
  planId,
  planLevel
}: {
  currentSubscription?: UserSubscription;
  planId: string;
  planLevel: number;
}) {
  const now = new Date();
  const activeSubscription = getEffectiveSubscription(currentSubscription);
  const activeExpiryDate = getSubscriptionExpiryDate(currentSubscription);
  const activeLevel = activeSubscription?.planLevel ?? 0;
  
  const subscriptionState = getSubscriptionState(currentSubscription);
  const isExpired = subscriptionState !== "active";
  const daysRemaining = getExpiryCountdown(currentSubscription);
  const withinRenewalWindow = daysRemaining <= 2;

  // UPGRADE LOGIC (Immediate) or RENEWAL LOGIC (Immediate if within window or expired)
  // This covers Rule 1 (Upgrade), Rule 5 (Renew Same), Rule 6 (Renew Upgrade), Rule 7 (Renew Downgrade)
  if (isExpired || planLevel > activeLevel || withinRenewalWindow) {
    return {
      planId,
      planLevel,
      status: "active",
      expiry: addSubscriptionDuration(now).toISOString(),
      subscriptionStartDate: now.toISOString(),
      renewalPlanId: "",
      renewalPlanLevel: 0,
      renewalStartDate: "",
      renewalExpiry: ""
    };
  }

  // DOWNGRADE LOGIC (Deferred)
  // Rule 2: If selecting a lower plan and NOT in the renewal window
  if (planLevel < activeLevel) {
    const effectiveExpiry = activeExpiryDate || now;
    return {
      ...currentSubscription,
      renewalPlanId: planId,
      renewalPlanLevel: planLevel,
      renewalStartDate: effectiveExpiry.toISOString(),
      renewalExpiry: addSubscriptionDuration(effectiveExpiry).toISOString()
    };
  }

  // Fallback: No change needed (e.g., selecting same plan outside renewal window)
  return currentSubscription || {
    planId,
    planLevel,
    status: "active",
    expiry: addSubscriptionDuration(now).toISOString(),
    subscriptionStartDate: now.toISOString()
  };
}
