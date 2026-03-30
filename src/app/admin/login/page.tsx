"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { isTrainerEmail, TRAINER_EMAIL } from "@/lib/admin";
import { useAdminProtection } from "@/hooks/use-admin-protection";
import { dismissToast, notifyError, notifyLoading, notifySuccess, notifyWarning } from "@/lib/toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { authResolved, canRender } = useAdminProtection("guest");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const loadingToast = notifyLoading("Signing in...");

    try {
      const { signInWithEmailAndPassword, signOut } = await import("firebase/auth");
      const { doc, setDoc } = await import("firebase/firestore");
      const response = await signInWithEmailAndPassword(auth, email, password);

      if (!isTrainerEmail(response.user.email)) {
        await signOut(auth);
        dismissToast(loadingToast);
        notifyWarning("This account is not allowed to access the admin panel.");
        return;
      }

      await setDoc(
        doc(db, "users", response.user.uid),
        {
          uid: response.user.uid,
          email: response.user.email,
          name: response.user.email?.split("@")[0] || "Trainer",
          role: "admin",
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      console.log("Trainer login successful:", response.user.email);
      dismissToast(loadingToast);
      notifySuccess("Admin login successful");
      router.replace("/admin");
    } catch (error) {
      console.error("Admin login error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  if (!authResolved || !canRender) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="panel-surface text-muted px-6 py-4 text-sm">Checking admin access...</div>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <div className="auth-card max-w-md">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="heading-primary text-3xl font-bold">Trainer Admin Login</h1>
          <p className="text-muted text-sm">Use the trainer account to manage workouts, diets, and tips.</p>
        </div>

        <div className="panel-muted mb-5 px-4 py-3 text-sm">
          Allowed trainer email: <span className="heading-primary font-semibold">{TRAINER_EMAIL}</span>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Trainer email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="dark-input w-full"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="dark-input w-full"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="dark-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Login as Trainer"}
          </button>
        </form>

        <p className="text-muted mt-6 text-center text-sm">
          Back to{" "}
          <Link href="/login" className="font-semibold text-rose-600 hover:text-rose-700">
            user login
          </Link>
        </p>
      </div>
    </main>
  );
}
