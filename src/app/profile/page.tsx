"use client";

import { Suspense, useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { AppShell } from "@/components/app-shell";
import { ProfileFieldCard } from "@/components/profile-field-card";
import { useRouteProtection } from "@/hooks/use-route-protection";
import { db } from "@/lib/firebase";
import { calculateBmi, getBmiCategory } from "@/lib/bmi";
import { dismissToast, notifyError, notifyLoading, notifySuccess, notifyWarning } from "@/lib/toast";

type EditableField = "phoneNumber" | "weight" | "height";

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
    phoneNumber: "",
    weight: "",
    height: ""
  });
  const [savingField, setSavingField] = useState<EditableField | null>(null);

  // Computed Values
  const bmiValue = calculateBmi(profile?.weight || 0, profile?.height || 0);
  const bmiCategory = getBmiCategory(bmiValue);

  const profileValues = useMemo(
    () => ({
      name: profile?.name || "Member",
      email: profile?.email || user?.email || "No email",
      phoneNumber: profile?.phoneNumber || "",
      weight: profile?.weight ? String(profile.weight) : "",
      height: profile?.height ? String(profile.height) : ""
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
      
      // Auto-calculate BMI for storage if needed, but we mostly use computed frontend values
      const newBmi = calculateBmi(currentWeight, currentHeight);

      updates = {
        ...updates,
        [field]: parsedValue,
        bmi: newBmi,
        bmiCategory: getBmiCategory(newBmi)
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

  const BmiBadge = ({ category }: { category: string }) => {
    const colors: Record<string, string> = {
      underweight: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
      normal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
      overweight: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
    };

    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${colors[category] || "bg-slate-100 text-slate-700"}`}>
        {category}
      </span>
    );
  };

  if (loading || !canRender) {
    return <PageLoader label="Loading profile..." />;
  }

  return (
    <AppShell title="Profile">
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="panel-surface p-6 md:p-8">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-3xl font-bold text-white shadow-lg shadow-rose-200 dark:shadow-none">
              {profileValues.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <h2 className="heading-primary text-3xl font-extrabold">{profileValues.name}</h2>
              <p className="text-muted text-lg">{profileValues.email}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 md:justify-start">
                <span className="theme-badge">Role: {profile?.role || "User"}</span>
                <span className="theme-badge">UID: {user?.uid.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
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
            label="Computed BMI"
            value={String(bmiValue || "-")}
            readOnly
            badge={<BmiBadge category={bmiCategory} />}
          />
        </div>

        <section className="panel-muted rounded-2xl p-6 text-sm">
          <p className="font-semibold text-slate-800 dark:text-slate-100">Why can&apos;t I edit everything?</p>
          <p className="mt-2 leading-relaxed">
            Basic account details like name and email are synced with your authentication provider. 
            BMI is automatically calculated based on your weight and height to ensure accuracy.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function PageLoader({ label }: { label: string }) {
  return (
    <main className="flex min-h-[400px] w-full items-center justify-center p-6">
      <div className="loading-card mx-auto max-w-md">{label}</div>
    </main>
  );
}

function getFieldLabel(field: EditableField) {
  switch (field) {
    case "phoneNumber":
      return "Phone Number";
    case "weight":
      return "Weight";
    case "height":
      return "Height";
  }
}
