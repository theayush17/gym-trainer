"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { useAdminProtection } from "@/hooks/use-admin-protection";
import type { ContentItem, ContentType } from "@/lib/content";
import { getBmiCategoryLabel, getContentTypeLabel, getPlanLevelLabel, getPublishedDays, isContentVisible } from "@/lib/content";
import { AdminContentForm, type AdminContentFormValues } from "@/components/admin-content-form";
import { AppShell } from "@/components/app-shell";
import { dismissToast, notifyError, notifyLoading, notifySuccess } from "@/lib/toast";

type FilterState = {
  type: "all" | ContentType;
  dayNumber: string;
  planLevel: string;
};

const initialFilters: FilterState = {
  type: "all",
  dayNumber: "all",
  planLevel: "all"
};

const emptyEditor: AdminContentFormValues = {
  title: "",
  description: "",
  content: "",
  type: "workout",
  planLevel: "1",
  dayNumber: "1",
  bmiCategory: "normal"
};

export default function ManageContentPage() {
  const { authResolved, canRender } = useAdminProtection("protected");
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedId, setSelectedId] = useState("");
  const [editor, setEditor] = useState<AdminContentFormValues>(emptyEditor);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const loadContent = async () => {
    setLoading(true);

    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const snapshot = await getDocs(collection(db, "content"));
      const items = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<ContentItem, "id">)
        }))
        .filter((item) => isContentVisible(item.createdAt))
        .sort((first, second) => {
          if (first.dayNumber !== second.dayNumber) {
            return first.dayNumber - second.dayNumber;
          }

          return first.title.localeCompare(second.title);
        });

      setContentItems(items);
    } catch (error) {
      console.error("Manage content load error:", error);
      notifyError(error instanceof Error ? error.message : "Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authResolved || !canRender) {
      return;
    }

    void loadContent();
  }, [authResolved, canRender]);

  const filteredItems = useMemo(
    () =>
      contentItems.filter((item) => {
        if (filters.type !== "all" && item.type !== filters.type) {
          return false;
        }

        if (filters.dayNumber !== "all" && item.dayNumber !== Number(filters.dayNumber)) {
          return false;
        }

        if (filters.planLevel !== "all" && item.planLevel !== Number(filters.planLevel)) {
          return false;
        }

        return true;
      }),
    [contentItems, filters]
  );
  const publishedDays = useMemo(() => getPublishedDays(contentItems), [contentItems]);

  const startEdit = (item: ContentItem) => {
    setSelectedId(item.id);
    setEditor({
      title: item.title,
      description: item.description,
      content: item.content || "",
      type: item.type,
      planLevel: String(item.planLevel),
      dayNumber: String(item.dayNumber),
      bmiCategory: item.bmiCategory
    });
  };

  const handleSave = async () => {
    if (!selectedId) {
      return;
    }

    setSaving(true);
    const loadingToast = notifyLoading("Updating content...");

    try {
      const { doc, setDoc } = await import("firebase/firestore");

      await setDoc(
        doc(db, "content", selectedId),
        {
          title: editor.title,
          description: editor.description,
          content: editor.content,
          type: editor.type,
          planLevel: Number(editor.planLevel),
          dayNumber: Number(editor.dayNumber),
          bmiCategory: editor.bmiCategory,
          createdAt: new Date().toISOString()
        },
        { merge: true }
      );

      dismissToast(loadingToast);
      notifySuccess("Content updated successfully");
      setSelectedId("");
      setEditor(emptyEditor);
      await loadContent();
    } catch (error) {
      console.error("Content update error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Failed to update content");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const loadingToast = notifyLoading("Deleting content...");

    try {
      const { deleteDoc, doc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "content", id));
      dismissToast(loadingToast);
      notifySuccess("Content deleted");

      if (selectedId === id) {
        setSelectedId("");
        setEditor(emptyEditor);
      }

      await loadContent();
    } catch (error) {
      console.error("Content delete error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Failed to delete content");
    } finally {
      setDeletingId("");
    }
  };

  const handleCancelEdit = () => {
    setSelectedId("");
    setEditor(emptyEditor);
  };

  if (!authResolved || !canRender) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="panel-surface text-muted px-6 py-4 text-sm">Checking admin access...</div>
      </main>
    );
  }

  return (
    <AppShell title="Manage Content">
      <div className="flex flex-col gap-6">
        <header className="panel-surface">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-rose-500">Manage Content</p>
              <h1 className="heading-primary text-3xl font-bold">Edit Day-wise Fitness Content</h1>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/admin" className="dark-button-secondary px-5 py-3 text-sm font-semibold">
                Admin Home
              </Link>
              <Link href="/admin/add-content" className="dark-button-primary px-5 py-3 text-sm font-semibold">
                Add Content
              </Link>
            </div>
          </div>
        </header>

        <section className="panel-surface">
          <div>
            <div className="grid gap-4 md:grid-cols-3">
              <select
                value={filters.type}
                onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value as FilterState["type"] }))}
                className="dark-input"
              >
                <option value="all">All types</option>
                <option value="workout">Workout</option>
                <option value="diet">Diet</option>
                <option value="tip">Tip</option>
              </select>
              <select
                value={filters.dayNumber}
                onChange={(event) => setFilters((prev) => ({ ...prev, dayNumber: event.target.value }))}
                className="dark-input"
              >
                <option value="all">All days</option>
                {publishedDays.map((day) => (
                  <option key={day} value={String(day)}>
                    Day {day}
                  </option>
                ))}
              </select>
              <select
                value={filters.planLevel}
                onChange={(event) => setFilters((prev) => ({ ...prev, planLevel: event.target.value }))}
                className="dark-input"
              >
                <option value="all">All plans</option>
                {[1, 2, 3].map((level) => (
                  <option key={level} value={String(level)}>
                    {getPlanLevelLabel(level)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 space-y-4">
              {loading ? (
                <div className="panel-muted px-4 py-3 text-sm">Loading content...</div>
              ) : filteredItems.length === 0 ? (
                <div className="panel-muted px-4 py-3 text-sm">No content matches the selected filters.</div>
              ) : (
                filteredItems.map((item) => (
                  <article key={item.id} className="dark-card p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-faint text-xs font-semibold uppercase tracking-[0.18em]">
                          {getContentTypeLabel(item.type)}
                        </p>
                        <h3 className="heading-primary mt-2 text-lg font-bold">{item.title}</h3>
                        <p className="text-muted mt-3 text-sm leading-6">{item.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="theme-badge">
                          Day {item.dayNumber}
                        </span>
                        <span className="theme-badge">
                          {getPlanLevelLabel(item.planLevel)}
                        </span>
                        <span className="theme-badge">
                          {getBmiCategoryLabel(item.bmiCategory)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="dark-button-primary px-4 py-2 text-sm font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-70 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                      >
                        {deletingId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>

                    {selectedId === item.id ? (
                      <div className="mt-5 rounded-3xl border border-slate-200 bg-white/80 p-5 dark:border-gray-800 dark:bg-gray-950/70">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="heading-primary text-lg font-bold">Edit Content</h4>
                            <p className="text-muted mt-1 text-sm">Update this day item directly here.</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="dark-button-secondary px-4 py-2 text-sm font-semibold"
                          >
                            Close
                          </button>
                        </div>

                        <AdminContentForm
                          values={editor}
                          onChange={setEditor}
                          onSubmit={() => void handleSave()}
                          submitting={saving}
                          submitLabel="Update Content"
                        />
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
