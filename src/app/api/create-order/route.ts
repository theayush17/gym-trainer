import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[CreateOrder] [${requestId}] Request received`);

  try {
    const { amount, planId, userId } = await req.json();

    if (!amount || !planId) {
      console.error(`[CreateOrder] [${requestId}] Missing fields:`, { amount, planId });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log(`[CreateOrder] [${requestId}] Creating order for user: ${userId}, plan: ${planId}, amount: ${amount}`);

    // Initialize Razorpay inside the handler to avoid build-time errors
    // and ensure fresh credentials in serverless environment
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error(`[CreateOrder] [${requestId}] Razorpay credentials missing from env`);
      throw new Error("Razorpay configuration missing");
    }

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt: `rcpt_${userId?.substring(0, 5)}_${Date.now()}`,
      notes: {
        planId,
        userId: userId || "anonymous",
        requestId
      }
    };

    const order = await razorpay.orders.create(options);

    console.log(`[CreateOrder] [${requestId}] Order created successfully:`, order.id);

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error(`[CreateOrder] [${requestId}] FATAL ERROR:`, error);
    return NextResponse.json({ 
      error: "Failed to create Razorpay order",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
