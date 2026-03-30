import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Send Email Confirmation
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
      console.log(`[SIMULATED EMAIL] Unsubscription confirmed for ${email}`);
    } else {
      const dynamicRequire = eval("require") as NodeRequire;
      const nodemailer = dynamicRequire("nodemailer");
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: email,
        subject: "Subscription Cancelled",
        text: `Your subscription has been cancelled successfully. You no longer have access to premium content.`
      });
    }

    return NextResponse.json({ message: "Unsubscribed successfully" });
  } catch (error) {
    console.error("Unsubscribe email error:", error);
    return NextResponse.json(
      { message: "Code verified but failed to send email." },
      { status: 200 } // Don't block unsubscription if email fails
    );
  }
}
