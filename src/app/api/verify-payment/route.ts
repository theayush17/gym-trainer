import { NextResponse } from "next/server";
import crypto from "crypto";
import { doc, getDoc, updateDoc, collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildSubscriptionUpdate } from "@/lib/auth";
import { PLANS } from "@/lib/plans";

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      planId
    } = await req.json();

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // Get user profile
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userSnap.data();
    const plan = PLANS.find((p) => p.id === planId);
    
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const updatedSubscription = buildSubscriptionUpdate({
      currentSubscription: userData.subscription,
      planId: plan.id,
      planLevel: plan.level
    });

    // Update Firestore user document
    await updateDoc(userRef, {
      subscription: updatedSubscription,
      updatedAt: new Date().toISOString()
    });

    // Record transaction
    await addDoc(collection(db, "transactions"), {
      userId,
      planId,
      amount: plan.numericPrice,
      paymentId: razorpay_payment_id,
      status: "success",
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Internal server error during verification" }, { status: 500 });
  }
}
