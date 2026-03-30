"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { AppShell } from "@/components/app-shell";
import { useRouteProtection } from "@/hooks/use-route-protection";
import { auth } from "@/lib/firebase";
import { dismissToast, notifyError, notifyLoading, notifySuccess, notifyWarning } from "@/lib/toast";

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading settings..." />}>
      <SettingsPageContent />
    </Suspense>
  );
}

function SettingsPageContent() {
  const { user, loading, canRender } = useRouteProtection("authenticated");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.email) {
      return;
    }

    if (newPassword !== confirmNewPassword) {
      notifyWarning("New password and confirm password do not match");
      return;
    }

    setSavingPassword(true);
    const loadingToast = notifyLoading("Updating password...");

    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      dismissToast(loadingToast);
      notifySuccess("Password updated successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.error("Change password error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleResetEmail = async () => {
    if (!user?.email) {
      return;
    }

    setSendingReset(true);
    const loadingToast = notifyLoading("Sending reset email...");

    try {
      await sendPasswordResetEmail(auth, user.email);
      dismissToast(loadingToast);
      notifySuccess("Password reset email sent");
    } catch (error) {
      console.error("Reset email error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Failed to send reset email");
    } finally {
      setSendingReset(false);
    }
  };

  if (loading || !canRender) {
    return <PageLoader label="Loading settings..." />;
  }

  return (
    <AppShell title="Settings">
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="panel-surface">
          <h2 className="heading-primary text-2xl font-bold">Forgot Password</h2>
          <p className="text-muted mt-2 text-sm">Send a reset link to {user?.email || "your email"}.</p>
          <button
            type="button"
            onClick={() => void handleResetEmail()}
            disabled={sendingReset}
            className="dark-button-secondary mt-6 w-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {sendingReset ? "Sending..." : "Send Reset Email"}
          </button>
        </section>

        <section className="panel-surface">
          <h2 className="heading-primary text-2xl font-bold">Help / Feedback</h2>
          <p className="text-muted mt-2 text-sm">
            For issues with plans, profile data, workouts, or reminders, reach out through your support channel or review the guidance page.
          </p>
          <Link
            href="/help"
            className="dark-button-secondary mt-6 inline-flex w-full items-center justify-center px-5 py-3 text-sm font-semibold"
          >
            Open Help Details
          </Link>
        </section>

        <section className="panel-surface xl:col-span-2">
          <h2 className="heading-primary text-2xl font-bold">Change Password</h2>
          <p className="text-muted mt-2 text-sm">Verify your current password before setting a new one.</p>

          <form className="mt-6 grid gap-5 md:grid-cols-3" onSubmit={handleChangePassword}>
            <input
              type="password"
              placeholder="Current Password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              className="dark-input"
              required
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="dark-input"
              required
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              className="dark-input"
              required
            />

            <button
              type="submit"
              disabled={savingPassword}
              className="dark-button-primary md:col-span-3"
            >
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

function PageLoader({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="loading-card">{label}</div>
    </main>
  );
}
