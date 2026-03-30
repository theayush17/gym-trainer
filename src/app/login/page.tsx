"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { STORAGE_UID_KEY } from "@/lib/plans";
import { useRouteProtection } from "@/hooks/use-route-protection";
import { dismissToast, notifyError, notifyLoading, notifySuccess } from "@/lib/toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { loading: authLoading, canRender } = useRouteProtection("guest");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const loadingToast = notifyLoading("Logging in...");

    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");

      const response = await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem(STORAGE_UID_KEY, response.user.uid);

      console.log("Login successful for UID:", response.user.uid);
      dismissToast(loadingToast);
      notifySuccess("Login successful");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !canRender) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="loading-card">Checking login status...</div>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <div className="auth-card max-w-md">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="heading-primary text-3xl font-bold">Welcome back</h1>
          <p className="text-muted text-sm">Login to continue to your subscription plans.</p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
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
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-muted mt-6 text-center text-sm">
          Need an account?{" "}
          <Link href="/register" className="font-semibold text-rose-600 hover:text-rose-700">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
