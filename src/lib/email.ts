import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "RentalHub <no-reply@mikaelsoninitiative.org>";

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
