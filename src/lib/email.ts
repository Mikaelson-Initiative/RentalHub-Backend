import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "RentalHub <noreply@rentalhub.ng>";
// Must be set in production Vercel env — used in reset links, booking links, etc.
const FRONTEND_URL = process.env.FRONTEND_URL ?? "https://rentalhub.ng";

// ── Private helpers ───────────────────────────────────────────

function fmt(n: number | string): string {
  return "₦" + Number(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function wrap(body: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4ece0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px"><tr><td style="padding:0 0 20px"><span style="font-family:Georgia,serif;font-size:22px;color:#1a1614;font-weight:normal">RentalHub</span></td></tr><tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e0d9ce"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 28px">${body}</td></tr></table></td></tr><tr><td style="padding:20px 4px 0"><p style="margin:0;font-size:12px;color:#a89d94;line-height:1.5">Questions? <a href="mailto:hello@mikaelsoninitiative.org" style="color:#b87c4d">hello@mikaelsoninitiative.org</a></p></td></tr></table></td></tr></table></body></html>`;
}

function btn(text: string, href: string): string {
  return `<p style="margin:24px 0 8px"><a href="${href}" style="background:#b87c4d;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;line-height:1.4">${text}</a></p>`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) console.error("Resend error:", error.message);
  } catch (e) {
    console.error("Resend send failed:", e);
  }
}

// ── OTP ───────────────────────────────────────────────────────

export async function sendOtpEmail(to: string, name: string, otp: string) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n📧 OTP for ${to}: ${otp}\n`);
  }
  await send(to, "Your RentalHub verification code", wrap(`
    <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#1a1614">Hi ${name},</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#444">Your RentalHub verification code is:</p>
    <p style="margin:0 0 20px;letter-spacing:10px;font-size:36px;font-weight:700;color:#1a1614;font-family:monospace">${otp}</p>
    <p style="margin:0;font-size:13px;color:#9a8f82">This code expires in <strong>15 minutes</strong>. Do not share it with anyone.</p>
  `));
}

// ── Password reset ─────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n🔑 Password reset link for ${to}: ${link}\n`);
  }
  await send(to, "Reset your RentalHub password", wrap(`
    <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#1a1614">Password reset</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444">Hi ${name}, we received a request to reset your RentalHub password.</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#444">Click the button below to choose a new one:</p>
    ${btn("Reset my password", link)}
    <p style="margin:20px 0 0;font-size:13px;color:#9a8f82">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email — your password won't change.</p>
  `));
}

// ── Booking confirmed — Task 44 ───────────────────────────────

export async function sendBookingConfirmedEmail(
  to: string, studentName: string, propertyTitle: string, propertyArea: string, landlordName: string,
) {
  await send(to, "Your offer was accepted — next steps inside", wrap(`
    <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#1a1614">Great news, ${studentName.split(" ")[0]}!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444"><strong>${landlordName}</strong> has accepted your offer for:</p>
    <div style="margin:0 0 24px;padding:16px 20px;background:#f4ece0;border-radius:10px;border-left:3px solid #b87c4d">
      <p style="margin:0;font-size:16px;font-weight:600;color:#1a1614">${propertyTitle}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#7a6d62">${propertyArea}</p>
    </div>
    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1a1614">Your next steps:</p>
    <ol style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.9;color:#444">
      <li>Review and sign the tenancy agreement</li>
      <li>Make the secure payment to lock in your spot</li>
    </ol>
    ${btn("Go to my bookings", `${FRONTEND_URL}/student`)}
    <p style="margin:20px 0 0;font-size:13px;color:#9a8f82">Your payment is held securely by RentalHub until you confirm you've moved in.</p>
  `));
}

// ── Booking cancelled — Task 45 ───────────────────────────────

export async function sendBookingCancelledEmail(
  to: string, studentName: string, propertyTitle: string, propertyArea: string, landlordName: string,
) {
  await send(to, `Update on your offer for ${propertyTitle}`, wrap(`
    <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#1a1614">Hi ${studentName.split(" ")[0]},</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444">Unfortunately, <strong>${landlordName}</strong> wasn't able to accept your offer for:</p>
    <div style="margin:0 0 24px;padding:16px 20px;background:#f4ece0;border-radius:10px;border-left:3px solid #9a8f82">
      <p style="margin:0;font-size:16px;font-weight:600;color:#1a1614">${propertyTitle}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#7a6d62">${propertyArea}</p>
    </div>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#444">Don't be discouraged — there are plenty of other verified homes waiting. Browse more listings and place your next offer.</p>
    ${btn("Browse homes", `${FRONTEND_URL}/properties`)}
  `));
}

// ── Property approved — Task 46 ───────────────────────────────

export async function sendPropertyApprovedEmail(
  to: string, landlordName: string, propertyTitle: string, propertyId: string,
) {
  await send(to, "Your listing is live on RentalHub", wrap(`
    <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#1a1614">Your listing is live!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444">Hi ${landlordName.split(" ")[0]}, great news — your listing has been reviewed and approved:</p>
    <div style="margin:0 0 24px;padding:16px 20px;background:#f0faf4;border-radius:10px;border-left:3px solid #2e7d5e">
      <p style="margin:0;font-size:16px;font-weight:600;color:#1a1614">${propertyTitle}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#2e7d5e">Published and visible to students</p>
    </div>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#444">Students can now discover your property, view photos, and place booking offers. You'll receive a notification when someone makes an offer.</p>
    ${btn("View your listing", `${FRONTEND_URL}/properties/${propertyId}`)}
  `));
}

// ── Property rejected — Task 47 ───────────────────────────────

export async function sendPropertyRejectedEmail(
  to: string, landlordName: string, propertyTitle: string, reason?: string | null,
) {
  const reasonBlock = reason
    ? `<div style="margin:0 0 24px;padding:16px 20px;background:#fff5f5;border-radius:10px;border-left:3px solid #c0392b"><p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#c0392b;text-transform:uppercase;letter-spacing:.05em">Reason</p><p style="margin:0;font-size:14px;line-height:1.6;color:#444">${reason}</p></div>`
    : "";
  await send(to, `Listing update: ${propertyTitle}`, wrap(`
    <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#1a1614">Listing update</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444">Hi ${landlordName.split(" ")[0]}, your listing <strong>${propertyTitle}</strong> was reviewed and unfortunately didn't meet our current listing standards.</p>
    ${reasonBlock}
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#444">You're welcome to update your listing and resubmit it for review. Our team typically reviews within 24 hours.</p>
    ${btn("Update my listing", `${FRONTEND_URL}/landlord`)}
  `));
}

// ── Landlord verified — Task 48 ───────────────────────────────

export async function sendLandlordVerifiedEmail(to: string, landlordName: string) {
  await send(to, "Congratulations — you're a verified RentalHub landlord", wrap(`
    <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#1a1614">You&apos;re verified!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444">Hi ${landlordName.split(" ")[0]}, congratulations — your identity and property ownership have been verified by our team.</p>
    <div style="margin:0 0 24px;padding:16px 20px;background:#f0faf4;border-radius:10px">
      <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#2e7d5e">What this means for you:</p>
      <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.9;color:#444">
        <li>Your listings now show the <strong>Verified landlord</strong> badge</li>
        <li>Students trust verified landlords more — expect higher offer rates</li>
        <li>You&apos;re now eligible for direct payouts after students move in</li>
      </ul>
    </div>
    ${btn("Go to my dashboard", `${FRONTEND_URL}/landlord`)}
  `));
}

// ── Landlord verification rejected — Task 49 ─────────────────

export async function sendLandlordRejectedEmail(to: string, landlordName: string, note?: string | null) {
  const noteBlock = note
    ? `<div style="margin:0 0 24px;padding:16px 20px;background:#fff5f5;border-radius:10px;border-left:3px solid #c0392b"><p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#c0392b;text-transform:uppercase;letter-spacing:.05em">Reason</p><p style="margin:0;font-size:14px;line-height:1.6;color:#444">${note}</p></div>`
    : "";
  await send(to, "Verification update from RentalHub", wrap(`
    <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#1a1614">Verification update</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444">Hi ${landlordName.split(" ")[0]}, we reviewed your verification documents and unfortunately couldn&apos;t approve them at this time.</p>
    ${noteBlock}
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#444">Please review the feedback, update your documents, and re-submit. Our team reviews new submissions within 24–48 hours.</p>
    ${btn("Re-submit documents", `${FRONTEND_URL}/landlord`)}
  `));
}

// ── Payment receipt — Task 50 ─────────────────────────────────

export async function sendPaymentReceiptEmail(
  to: string, studentName: string, propertyTitle: string, propertyArea: string,
  bid: number, agencyFee: number, cautionFee: number, bookingId: string,
) {
  const total = bid + agencyFee + cautionFee;
  const row = (label: string, amount: number, bold = false) =>
    `<tr><td style="padding:10px 0;border-top:1px solid #e8e1d5;font-size:14px;color:${bold ? "#1a1614" : "#666"};${bold ? "font-weight:700" : ""}">${label}</td><td style="padding:10px 0;border-top:1px solid #e8e1d5;text-align:right;font-size:14px;color:${bold ? "#1a1614" : "#444"};${bold ? "font-weight:700" : ""}">${fmt(amount)}</td></tr>`;
  await send(to, `Payment confirmed — ${propertyTitle}`, wrap(`
    <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#1a1614">Payment confirmed!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444">Hi ${studentName.split(" ")[0]}, your payment has been received and confirmed for:</p>
    <div style="margin:0 0 24px;padding:16px 20px;background:#f4ece0;border-radius:10px;border-left:3px solid #b87c4d">
      <p style="margin:0;font-size:16px;font-weight:600;color:#1a1614">${propertyTitle}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#7a6d62">${propertyArea}</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      ${row("Rent", bid)}
      ${agencyFee > 0 ? row("Agency fee (5%)", agencyFee) : ""}
      ${cautionFee > 0 ? row("Caution fee (10%)", cautionFee) : ""}
      ${row("Total paid", total, true)}
    </table>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#444">Your landlord will share move-in details shortly. Once you&apos;ve moved in, confirm it in your dashboard to release payment to your landlord.</p>
    ${btn("View my booking", `${FRONTEND_URL}/student/bookings/${bookingId}/receipt`)}
    <p style="margin:20px 0 0;font-size:12px;color:#9a8f82">Keep this as your payment receipt. Reference: ${bookingId}</p>
  `));
}
