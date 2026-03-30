import { NextResponse } from "next/server";

type ReminderUser = {
  name: string;
  email: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { users?: ReminderUser[] };
    const users = (body.users || []).filter((user) => user.email);

    if (users.length === 0) {
      return NextResponse.json({ message: "No non-subscribed users found for reminders." });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
      return NextResponse.json({
        message: `SMTP is not configured. Simulated reminder run for ${users.length} users.`
      });
    }

    const dynamicRequire = eval("require") as NodeRequire;
    const nodemailer = dynamicRequire("nodemailer");
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    for (const user of users) {
      await transporter.sendMail({
        from: smtpFrom,
        to: user.email,
        subject: "Complete Your Fitness Journey 💪",
        text: `Hi ${user.name},\nYou’ve registered but haven’t started your fitness plan yet.\nSubscribe today to unlock workouts, diet plans, and expert tips.`
      });
    }

    return NextResponse.json({
      message: `Reminder emails sent to ${users.length} users.`
    });
  } catch (error) {
    console.error("Reminder email route error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to send reminders." },
      { status: 500 }
    );
  }
}
