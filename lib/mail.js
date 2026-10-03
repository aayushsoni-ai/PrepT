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
 * @param {{ from: string, to: string, subject: string, html: string, inReplyTo?: string, references?: string }} options
 * @returns {Promise<import('nodemailer').SentMessageInfo>} info — info.messageId contains the Message-ID
 */
export async function sendMail({ from, to, subject, html, inReplyTo, references }) {
  return transporter.sendMail({
    from: from || process.env.EMAIL_FROM,
    to,
    subject,
    html,
    ...(inReplyTo && { inReplyTo }),
    ...(references && { references }),
  });
}
