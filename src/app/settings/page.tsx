"use client";

import { FormEvent, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { AppShell } from "@/components/app-shell";
import { useRouteProtection } from "@/hooks/use-route-protection";
import { auth } from "@/lib/firebase";
import { useThemeContext } from "@/components/theme-provider";
import { dismissToast, notifyError, notifyLoading, notifySuccess, notifyWarning } from "@/lib/toast";

export default function SettingsPage() {
  const { user, loading, canRender } = useRouteProtection("authenticated");
  const { theme, toggleTheme } = useThemeContext();
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
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="loading-card">Loading settings...</div>
      </main>
    );
  }

  return (
    <AppShell title="Settings">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel-surface">
          <h2 className="heading-primary text-2xl font-bold">Theme</h2>
          <p className="text-muted mt-2 text-sm">Switch between light and dark mode.</p>
          <button
            type="button"
            onClick={toggleTheme}
            className="dark-button-primary mt-6 px-5 py-3 text-sm font-semibold"
          >
            Switch to {theme === "dark" ? "Light" : "Dark"} Mode
          </button>
        </section>

        <section className="panel-surface">
          <h2 className="heading-primary text-2xl font-bold">Forgot Password</h2>
          <p className="text-muted mt-2 text-sm">Send yourself a password reset email instantly.</p>
          <button
            type="button"
            onClick={() => void handleResetEmail()}
            disabled={sendingReset}
            className="dark-button-secondary mt-6 px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {sendingReset ? "Sending..." : "Send Reset Email"}
          </button>
        </section>

        <section className="panel-surface lg:col-span-2">
          <h2 className="heading-primary text-2xl font-bold">Change Password</h2>
          <p className="text-muted mt-2 text-sm">Verify your current password before setting a new one.</p>

          <form className="mt-6 grid gap-5 md:grid-cols-3" onSubmit={handleChangePassword}>
            <input
              type="password"
              placeholder="Old Password"
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
