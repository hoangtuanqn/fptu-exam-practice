import nodemailer from "nodemailer";
import { env } from "./env";

export const isMailConfigured = Boolean(env.SMTP_USER && env.SMTP_PASS);

// Cổng 465 dùng TLS ngay từ đầu (secure), các cổng khác (587...) nâng cấp bằng STARTTLS
export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: isMailConfigured ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export const mailFrom = env.MAIL_FROM ?? `MST Software <${env.SMTP_USER}>`;
