"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouteProtection } from "@/hooks/use-route-protection";
import { AppShell } from "@/components/app-shell";
import { getPlanById } from "@/lib/plans";
import { dismissToast, notifyError, notifyLoading, notifySuccess, notifyWarning } from "@/lib/toast";
import { AlertTriangle, RotateCw } from "lucide-react";

type Transaction = {
  id: string;
  planId: string;
  amount: number;
  status: string;
  createdAt: string;
};

export default function HistoryPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading history..." />}>
      <HistoryPageContent />
    </Suspense>
  );
}

function HistoryPageContent() {
  const router = useRouter();
  const { user, profile, loading, canRender, refreshProfile, subscriptionState } = useRouteProtection("authenticated");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchHistory = useCallback(async (isManual = false) => {
    if (!user?.uid) return;
    
    if (isManual) setLoadingHistory(true);

    try {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      // Ensure query is scoped to userId to satisfy security rules
      const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      
      const allTransactions: Transaction[] = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...(d.data() as Omit<Transaction, "id">)
      }));

      // Sort manually to avoid index requirement
      allTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Auto Cleanup older than 60 days
      for (const t of allTransactions) {
        if (new Date(t.createdAt) < sixtyDaysAgo) {
          await deleteDoc(doc(db, "transactions", t.id));
        }
      }

      setTransactions(allTransactions.filter(t => new Date(t.createdAt) >= sixtyDaysAgo));
      if (isManual) notifySuccess("Transaction history updated.");
    } catch (error) {
      console.error("History fetch error:", error);
      if (isManual) notifyError("Failed to refresh history.");
    } finally {
      setLoadingHistory(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (canRender && user?.uid) {
      void fetchHistory();
    }
  }, [canRender, user?.uid, fetchHistory]);

  const handleStartUnsubscribe = () => {
    if (subscriptionState !== "active") {
      notifyWarning("No active subscription to cancel.");
      return;
    }
    setShowUnsubscribeModal(true);
  };

  const handleSendOtp = async () => {
    if (!user?.uid || !user?.email) return notifyError("User session not found.");
    
    setProcessing(true);
    const toastId = notifyLoading("Generating security code...");
    
    try {
      const securityOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Clear existing OTPs for this user
      const q = query(collection(db, "otp_verifications"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      for (const d of snapshot.docs) {
        await deleteDoc(doc(db, "otp_verifications", d.id));
      }

      // Create new OTP document (Authenticated client satisfies rule)
      await addDoc(collection(db, "otp_verifications"), {
        userId: user.uid,
        otp: securityOtp,
        expiresAt,
        verified: false
      });

      // Trigger Email API
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, otp: securityOtp })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send email");
      }

      dismissToast(toastId);
      notifySuccess("Code sent! Check your email (or terminal).");
      setShowUnsubscribeModal(false);
      setShowOtpModal(true);
    } catch (error) {
      console.error("OTP generation error:", error);
      dismissToast(toastId);
      notifyError(error instanceof Error ? error.message : "Failed to initiate unsubscription.");
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyAndUnsubscribe = async () => {
    if (!otp || otp.length < 6) return notifyWarning("Enter 6-digit code.");

    setProcessing(true);
    const toastId = notifyLoading("Verifying code...");
    try {
      // 1. Verify OTP from Firestore (Authenticated client satisfies rule)
      const q = query(
        collection(db, "otp_verifications"),
        where("userId", "==", user!.uid),
        where("otp", "==", otp)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) throw new Error("Invalid verification code.");
      
      const verification = snapshot.docs[0].data();
      if (new Date(verification.expiresAt) < new Date()) throw new Error("Code has expired.");

      // 2. Perform Unsubscribe Update (Surgical update satisfies ownership rules)
      await updateDoc(doc(db, "users", user!.uid), {
        subscription: {
          planId: null,
          planLevel: 0,
          status: "cancelled",
          expiry: null,
          subscriptionStartDate: null,
          renewalPlanId: null,
          renewalPlanLevel: 0,
          renewalStartDate: null,
          renewalExpiry: null
        },
        updatedAt: new Date().toISOString()
      });

      // 3. Cleanup used OTP
      await deleteDoc(doc(db, "otp_verifications", snapshot.docs[0].id));

      // 4. Send email notification (API route handles email delivery)
      void fetch("/api/auth/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email })
      });

      dismissToast(toastId);
      notifySuccess("Subscription successfully cancelled.");
      await refreshProfile();
      router.replace("/plans");
    } catch (error) {
      console.error("Verification error:", error);
      dismissToast(toastId);
      notifyError(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !canRender) return <PageLoader label="Loading history..." />;

  return (
    <AppShell title="History & Transactions">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="heading-primary text-2xl font-bold">Transaction History</h1>
            <p className="text-muted text-sm">Last 60 days activity.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void fetchHistory(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            >
              <RotateCw className={`h-4 w-4 ${loadingHistory ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {subscriptionState === "active" && (
              <button
                onClick={handleStartUnsubscribe}
                className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                <AlertTriangle className="h-4 w-4" /> Unsubscribe
              </button>
            )}
          </div>
        </div>

        <div className="panel-surface overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-semibold">Plan</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {loadingHistory ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-muted">Loading history...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-muted">No transactions found.</td></tr>
                ) : (
                  transactions.map((t) => {
                    const plan = getPlanById(t.planId);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/50">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{plan?.name || "Standard Plan"}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-bold">₹{t.amount}</td>
                        <td className="px-6 py-4 uppercase text-[10px] font-bold tracking-wider">
                          <span className={t.status === "active" ? "text-emerald-500" : "text-slate-400"}>{t.status}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Warning Modal */}
      {showUnsubscribeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !processing && setShowUnsubscribeModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center">Cancel Subscription?</h2>
            <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/20 dark:text-rose-300">
              <p className="font-bold text-center">FINAL WARNING</p>
              <p className="mt-1 text-center italic">Immediate loss of all premium workouts and tips. No refunds will be issued.</p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <button disabled={processing} onClick={handleSendOtp} className="w-full rounded-xl bg-rose-600 py-3 font-bold text-white transition hover:bg-rose-500 disabled:opacity-50">Confirm & Send OTP</button>
              <button disabled={processing} onClick={() => setShowUnsubscribeModal(false)} className="w-full rounded-xl bg-slate-100 py-3 font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Go Back (Keep Plan)</button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !processing && setShowOtpModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
            <h2 className="text-center text-2xl font-bold">Enter OTP Code</h2>
            <p className="text-center text-sm text-slate-400 mt-2">Check your email for the 6-digit verification code.</p>
            <input
              type="text" maxLength={6} placeholder="000000" value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
              className="mt-8 w-full rounded-2xl border bg-slate-50 py-4 text-center text-3xl font-bold tracking-[0.5em] dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="mt-8 flex flex-col gap-3">
              <button disabled={processing || otp.length < 6} onClick={handleVerifyAndUnsubscribe} className="w-full rounded-xl bg-blue-600 py-4 font-bold text-white shadow-lg disabled:opacity-50">{processing ? "Processing..." : "Verify & Cancel"}</button>
              <button disabled={processing} onClick={() => setShowOtpModal(false)} className="w-full text-slate-400 text-sm font-medium py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function PageLoader({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="panel-surface text-muted px-6 py-4 text-sm">{label}</div>
    </main>
  );
}
