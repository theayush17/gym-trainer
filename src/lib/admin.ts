export const TRAINER_EMAIL = process.env.NEXT_PUBLIC_TRAINER_EMAIL || "trainer@gmail.com";

export function isTrainerEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return email.toLowerCase() === TRAINER_EMAIL.toLowerCase();
}

export function isAdminRole(role?: string | null) {
  return role === "admin";
}
