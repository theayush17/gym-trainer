import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ message: "Email and OTP are required" }, { status: 400 });
    }

    // Send Email
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
      console.log(`[SIMULATED OTP] To: ${email}, OTP: ${otp}`);
      return NextResponse.json({
        message: "SMTP not configured. Check server logs or this response for OTP.",
        simulated: true,
        otp: otp
      });
    }

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
      subject: "Your Verification Code - Gym Trainer",
      text: `Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.`
    });

    return NextResponse.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to send OTP" },
      { status: 500 }
    );
  }
}
