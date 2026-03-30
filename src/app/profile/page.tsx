"use client";

import { Suspense, useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { AppShell } from "@/components/app-shell";
import { ProfileFieldCard } from "@/components/profile-field-card";
import { useRouteProtection } from "@/hooks/use-route-protection";
import { db } from "@/lib/firebase";
import { calculateBmi, getBmiCategory } from "@/lib/bmi";
import { dismissToast, notifyError, notifyLoading, notifySuccess, notifyWarning } from "@/lib/toast";

type EditableField = "name" | "email" | "phoneNumber" | "weight" | "height" | "bmi";

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageLoader label="Loading profile..." />}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const { user, profile, loading, canRender, refreshProfile } = useRouteProtection("authenticated");
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [drafts, setDrafts] = useState<Record<EditableField, string>>({
    name: "",
    email: "",
    phoneNumber: "",
    weight: "",
    height: "",
    bmi: ""
  });
  const [savingField, setSavingField] = useState<EditableField | null>(null);

  const profileValues = useMemo(
    () => ({
      name: profile?.name || "",
      email: profile?.email || user?.email || "",
      phoneNumber: profile?.phoneNumber || "",
      weight: profile?.weight ? String(profile.weight) : "",
      height: profile?.height ? String(profile.height) : "",
      bmi: profile?.bmi ? String(profile.bmi) : ""
    }),
    [profile, user?.email]
  );

  const beginEdit = (field: EditableField) => {
    setEditingField(field);
    setDrafts((current) => ({ ...current, [field]: profileValues[field] }));
  };

  const cancelEdit = () => {
    setEditingField(null);
  };

  const saveField = async (field: EditableField) => {
    if (!user?.uid) {
      return;
    }

    const nextValue = drafts[field].trim();
    if (!nextValue) {
      notifyWarning(`${getFieldLabel(field)} cannot be empty`);
      return;
    }

    let updates: Record<string, string | number> = {
      updatedAt: new Date().toISOString()
    };

    if (field === "weight" || field === "height") {
      const parsedValue = Number(nextValue);
      if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        notifyWarning(`${getFieldLabel(field)} must be a valid number`);
        return;
      }

      const currentWeight = field === "weight" ? parsedValue : Number(profileValues.weight || 0);
      const currentHeight = field === "height" ? parsedValue : Number(profileValues.height || 0);
      const bmi = calculateBmi(currentWeight, currentHeight);

      updates = {
        ...updates,
        [field]: parsedValue
      };

      if (bmi > 0) {
        updates.bmi = bmi;
        updates.bmiCategory = getBmiCategory(bmi);
      }
    } else if (field === "bmi") {
      const parsedValue = Number(nextValue);
      if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        notifyWarning("BMI must be a valid number");
        return;
      }

      updates = {
        ...updates,
        bmi: parsedValue,
        bmiCategory: getBmiCategory(parsedValue)
      };
    } else {
      updates = {
        ...updates,
        [field]: nextValue
      };
    }

    setSavingField(field);
    const loadingToast = notifyLoading(`Saving ${getFieldLabel(field).toLowerCase()}...`);

    try {
      await updateDoc(doc(db, "users", user.uid), updates);
      await refreshProfile();
      dismissToast(loadingToast);
      notifySuccess(`${getFieldLabel(field)} updated successfully`);
      setEditingField(null);
    } catch (error) {
      console.error("Profile update error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setSavingField(null);
    }
  };

  if (loading || !canRender) {
    return <PageLoader label="Loading profile..." />;
  }

  return (
    <AppShell title="Profile">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="panel-surface">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-semibold text-white">
              {(profile?.name?.charAt(0) || "U").toUpperCase()}
            </div>
            <div>
              <h2 className="heading-primary text-2xl font-bold">Your Profile</h2>
              <p className="text-muted mt-1 text-sm">View and update the details stored in Firestore.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <ProfileFieldCard
            label="Name"
            value={profileValues.name}
            editing={editingField === "name"}
            draftValue={drafts.name}
            saving={savingField === "name"}
            onEdit={() => beginEdit("name")}
            onCancel={cancelEdit}
            onChange={(value) => setDrafts((current) => ({ ...current, name: value }))}
            onSave={() => void saveField("name")}
          />
          <ProfileFieldCard
            label="Email"
            value={profileValues.email}
            inputType="email"
            editing={editingField === "email"}
            draftValue={drafts.email}
            saving={savingField === "email"}
            onEdit={() => beginEdit("email")}
            onCancel={cancelEdit}
            onChange={(value) => setDrafts((current) => ({ ...current, email: value }))}
            onSave={() => void saveField("email")}
          />
          <ProfileFieldCard
            label="Phone Number"
            value={profileValues.phoneNumber}
            inputType="tel"
            editing={editingField === "phoneNumber"}
            draftValue={drafts.phoneNumber}
            saving={savingField === "phoneNumber"}
            onEdit={() => beginEdit("phoneNumber")}
            onCancel={cancelEdit}
            onChange={(value) => setDrafts((current) => ({ ...current, phoneNumber: value }))}
            onSave={() => void saveField("phoneNumber")}
          />
          <ProfileFieldCard
            label="Weight"
            value={profileValues.weight ? `${profileValues.weight} kg` : ""}
            inputType="number"
            editing={editingField === "weight"}
            draftValue={drafts.weight}
            saving={savingField === "weight"}
            onEdit={() => beginEdit("weight")}
            onCancel={cancelEdit}
            onChange={(value) => setDrafts((current) => ({ ...current, weight: value }))}
            onSave={() => void saveField("weight")}
          />
          <ProfileFieldCard
            label="Height"
            value={profileValues.height ? `${profileValues.height} cm` : ""}
            inputType="number"
            editing={editingField === "height"}
            draftValue={drafts.height}
            saving={savingField === "height"}
            onEdit={() => beginEdit("height")}
            onCancel={cancelEdit}
            onChange={(value) => setDrafts((current) => ({ ...current, height: value }))}
            onSave={() => void saveField("height")}
          />
          <ProfileFieldCard
            label="BMI"
            value={profileValues.bmi}
            inputType="number"
            editing={editingField === "bmi"}
            draftValue={drafts.bmi}
            saving={savingField === "bmi"}
            onEdit={() => beginEdit("bmi")}
            onCancel={cancelEdit}
            onChange={(value) => setDrafts((current) => ({ ...current, bmi: value }))}
            onSave={() => void saveField("bmi")}
          />
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

function getFieldLabel(field: EditableField) {
  switch (field) {
    case "name":
      return "Name";
    case "email":
      return "Email";
    case "phoneNumber":
      return "Phone Number";
    case "weight":
      return "Weight";
    case "height":
      return "Height";
    case "bmi":
      return "BMI";
  }
}
