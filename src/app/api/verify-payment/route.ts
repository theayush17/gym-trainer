import { NextResponse } from "next/server";
import crypto from "crypto";
import { firebaseAdminDb } from "@/lib/firebaseAdmin";
import { buildSubscriptionUpdate } from "@/lib/auth";
import { PLANS } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planId } = await req.json();

    console.log(`[VerifyPayment] [${requestId}] Verification started for user: ${userId}, order: ${razorpay_order_id}`);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !planId) {
      console.error(`[VerifyPayment] [${requestId}] Missing payload fields`);
      return NextResponse.json({ success: false, error: "Missing payload" }, { status: 400 });
    }

    // 1. Verify Razorpay Signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error(`[VerifyPayment] [${requestId}] RAZORPAY_KEY_SECRET missing`);
      throw new Error("Server configuration error");
    }

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const expected = hmac.digest("hex");

    if (expected !== razorpay_signature) {
      console.error(`[VerifyPayment] [${requestId}] Signature mismatch!`);
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
    }

    console.log(`[VerifyPayment] [${requestId}] Signature verified. Updating Firestore...`);

    // 2. Fetch/Create User using Admin SDK
    const userRef = firebaseAdminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      await userRef.set({
        uid: userId,
        role: "user",
        createdAt: new Date().toISOString()
      }, { merge: true });
    }

    const userData = userSnap.data();
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return NextResponse.json({ success: false, error: "Invalid plan" }, { status: 400 });

    // 3. Prepare Update
    const updatedSubscription = buildSubscriptionUpdate({
      currentSubscription: userData?.subscription,
      planId: plan.id,
      planLevel: plan.level
    });

    console.log("[VerifyPayment] Writing state to Firestore for userId:", userId);

    // 4. Atomic Write
    const batch = firebaseAdminDb.batch();
    
    batch.set(userRef, {
      subscription: updatedSubscription,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const transactionRef = firebaseAdminDb.collection("transactions").doc();
    batch.set(transactionRef, {
      userId,
      planId,
      amount: plan.numericPrice,
      paymentId: razorpay_payment_id,
      status: "success",
      createdAt: new Date().toISOString()
    });

    await batch.commit();

    console.log("[VerifyPayment] SUCCESS for userId:", userId);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[VerifyPayment] FATAL ERROR:", err);
    return NextResponse.json({ 
      success: false, 
      error: err instanceof Error ? err.message : "Internal error" 
    }, { status: 500 });
  }
}
