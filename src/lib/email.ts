import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "RentalHub <noreply@rentalhub.ng>";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "https://rentalhub.ng";

export async function sendOtpEmail(to: string, name: string, otp: string) {
  // Always log in dev so you can test without a verified domain
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n📧 OTP for ${to}: ${otp}\n`);
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: "Your RentalHub verification code",
      html: `
        <p>Hi ${name},</p>
        <p>Your verification code is:</p>
        <h2 style="letter-spacing:6px;font-size:32px">${otp}</h2>
        <p>This code expires in 15 minutes. Do not share it with anyone.</p>
      `,
    });
    if (error) console.error("Resend error:", error.message);
  } catch (e) {
    console.error("Resend send failed:", e);
  }
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n🔑 Password reset link for ${to}: ${link}\n`);
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: "Reset your RentalHub password",
      html: `
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to choose a new one:</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#C0392B;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Reset password</a>
        </p>
        <p>This link expires in <strong>1 hour</strong>. If you didn't request this, you can ignore this email — your password won't change.</p>
      `,
    });
    if (error) console.error("Resend error:", error.message);
  } catch (e) {
    console.error("Resend send failed:", e);
  }
}
