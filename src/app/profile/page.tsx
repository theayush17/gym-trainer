"use client";

import { FormEvent, useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { AppShell } from "@/components/app-shell";
import { useRouteProtection } from "@/hooks/use-route-protection";
import { db } from "@/lib/firebase";
import { dismissToast, notifyError, notifyLoading, notifySuccess } from "@/lib/toast";

type ProfileForm = {
  weight: string;
  height: string;
  phoneNumber: string;
};

export default function ProfilePage() {
  const { user, profile, loading, canRender, refreshProfile } = useRouteProtection("authenticated");
  const [form, setForm] = useState<ProfileForm>({
    weight: "",
    height: "",
    phoneNumber: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setForm({
      weight: profile.weight ? String(profile.weight) : "",
      height: profile.height ? String(profile.height) : "",
      phoneNumber: profile.phoneNumber || ""
    });
  }, [profile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.uid) {
      return;
    }

    setSaving(true);
    const loadingToast = notifyLoading("Saving profile...");

    try {
      await updateDoc(doc(db, "users", user.uid), {
        weight: Number(form.weight),
        height: Number(form.height),
        phoneNumber: form.phoneNumber,
        updatedAt: new Date().toISOString()
      });

      await refreshProfile();
      dismissToast(loadingToast);
      notifySuccess("Profile updated successfully");
    } catch (error) {
      console.error("Profile update error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !canRender) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="loading-card">Loading profile...</div>
      </main>
    );
  }

  return (
    <AppShell title="Profile">
      <div className="panel-surface mx-auto max-w-2xl">
        <h2 className="heading-primary text-2xl font-bold">Edit Your Profile</h2>
        <p className="text-muted mt-2 text-sm">Update your body stats and phone number.</p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="form-label">Weight (kg)</label>
              <input
                type="number"
                value={form.weight}
                onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))}
                className="dark-input w-full"
                required
              />
            </div>
            <div>
              <label className="form-label">Height (cm)</label>
              <input
                type="number"
                value={form.height}
                onChange={(event) => setForm((prev) => ({ ...prev, height: event.target.value }))}
                className="dark-input w-full"
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
              className="dark-input w-full"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="dark-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
