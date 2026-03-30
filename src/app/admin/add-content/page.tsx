"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { useAdminProtection } from "@/hooks/use-admin-protection";
import { AdminContentForm, type AdminContentFormValues } from "@/components/admin-content-form";
import { AppShell } from "@/components/app-shell";
import { dismissToast, notifyError, notifyLoading, notifySuccess } from "@/lib/toast";

const initialForm: AdminContentFormValues = {
  title: "",
  description: "",
  type: "workout",
  planLevel: "1",
  dayNumber: "1",
  bmiCategory: "normal"
};

export default function AddContentPage() {
  const router = useRouter();
  const [form, setForm] = useState<AdminContentFormValues>(initialForm);
  const [saving, setSaving] = useState(false);
  const { authResolved, canRender } = useAdminProtection("protected");

  const saveContent = async () => {
    setSaving(true);
    const loadingToast = notifyLoading("Saving content...");

    try {
      const { addDoc, collection } = await import("firebase/firestore");

      await addDoc(collection(db, "content"), {
        title: form.title,
        description: form.description,
        type: form.type,
        planLevel: Number(form.planLevel),
        dayNumber: Number(form.dayNumber),
        bmiCategory: form.bmiCategory,
        createdAt: new Date().toISOString()
      });

      console.log("Admin content created:", form.title);
      dismissToast(loadingToast);
      notifySuccess("Content added successfully");
      router.replace("/admin/manage-content");
    } catch (error) {
      console.error("Add content error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Failed to add content");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveContent();
  };

  if (!authResolved || !canRender) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="loading-card">Checking admin access...</div>
      </main>
    );
  }

  return (
    <AppShell title="Add Content">
      <div className="panel-surface mx-auto w-full max-w-2xl md:p-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="heading-primary text-3xl font-bold">Add Content</h1>
            <p className="text-muted text-sm">Create workouts, diet plans, and tips and assign them to Plan A, B, or C.</p>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-rose-600 hover:text-rose-700">
            Back to dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <AdminContentForm
            values={form}
            onChange={setForm}
            onSubmit={() => void saveContent()}
            submitting={saving}
            submitLabel="Save Content"
          />
        </form>
      </div>
    </AppShell>
  );
}
