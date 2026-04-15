import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Send an email using Gmail SMTP (free, no custom domain needed).
 * Drop-in replacement for resend.emails.send().
 *
 * @param {{ from: string, to: string, subject: string, html: string }} options
 */
export async function sendMail({ from, to, subject, html }) {
  return transporter.sendMail({
    from: from || process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}
