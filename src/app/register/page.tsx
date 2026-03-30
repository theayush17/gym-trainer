"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { calculateBmi, getBmiCategory } from "@/lib/bmi";
import { auth, db } from "@/lib/firebase";
import { STORAGE_UID_KEY } from "@/lib/plans";
import { useRouteProtection } from "@/hooks/use-route-protection";
import { isTrainerEmail } from "@/lib/admin";
import { dismissToast, notifyError, notifyLoading, notifySuccess, notifyWarning } from "@/lib/toast";

type RegisterForm = {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  weight: string;
  height: string;
};

const initialForm: RegisterForm = {
  name: "",
  email: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
  weight: "",
  height: ""
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const { loading: authLoading, canRender } = useRouteProtection("guest");

  const bmiValue = calculateBmi(Number(form.weight), Number(form.height));
  const bmiCategory = getBmiCategory(bmiValue);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    if (form.password !== form.confirmPassword) {
      notifyWarning("Password and confirm password must match");
      setLoading(false);
      return;
    }

    const loadingToast = notifyLoading("Creating account...");

    try {
      const { createUserWithEmailAndPassword } = await import("firebase/auth");
      const { doc, setDoc } = await import("firebase/firestore");

      const createdUser = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = createdUser.user.uid;

      await setDoc(
        doc(db, "users", uid),
        {
          uid,
          name: form.name,
          email: form.email,
          phoneNumber: form.phoneNumber,
          weight: Number(form.weight),
          height: Number(form.height),
          bmi: bmiValue,
          bmiCategory,
          role: isTrainerEmail(form.email) ? "admin" : "user",
          subscription: {
            planId: "",
            planLevel: 0,
            status: "inactive",
            expiry: "",
            subscriptionStartDate: ""
          },
          createdAt: new Date().toISOString()
        },
        { merge: true }
      );

      localStorage.setItem(STORAGE_UID_KEY, uid);

      console.log("Registration successful for UID:", uid);
      dismissToast(loadingToast);
      notifySuccess("Registration successful. Choose a plan to continue.");
      router.replace("/plans");
    } catch (error) {
      console.error("Registration error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !canRender) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="loading-card">Checking account status...</div>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <div className="auth-card max-w-xl">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="heading-primary text-3xl font-bold">Create your account</h1>
          <p className="text-muted text-sm">Start with your body metrics and build your training plan.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="dark-input w-full"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className="dark-input w-full"
            required
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={form.phoneNumber}
            onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
            className="dark-input w-full"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            className="dark-input w-full"
            required
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            className="dark-input w-full"
            required
            minLength={6}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="number"
              placeholder="Weight (kg)"
              value={form.weight}
              onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))}
              className="dark-input w-full"
              required
              min="1"
              step="0.1"
            />
            <input
              type="number"
              placeholder="Height (cm)"
              value={form.height}
              onChange={(event) => setForm((prev) => ({ ...prev, height: event.target.value }))}
              className="dark-input w-full"
              required
              min="1"
              step="0.1"
            />
          </div>

          <div className="panel-muted border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Calculated BMI: <span className="font-semibold">{bmiValue || 0}</span> | Category:{" "}
            <span className="font-semibold capitalize">{bmiCategory}</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="dark-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="text-muted mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-rose-600 hover:text-rose-700">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
