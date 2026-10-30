import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";

export type MailAttachment = { filename: string; content: Buffer; contentType: string; cid?: string };
export type Mail = { to: string; subject: string; html: string; text: string; attachments?: MailAttachment[] };

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transport: Transporter | null = null;

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: Number(process.env.SMTP_PORT ?? 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

export function outboxDir() {
  return path.join(process.cwd(), ".outbox");
}

/**
 * Sends through SMTP (Gmail app password) when configured. Without SMTP in
 * local dev the mail is written to .outbox/ so the whole flow stays testable.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (mailConfigured()) {
    const from = process.env.MAIL_FROM ?? `Pichavaram Poster Studio <${process.env.SMTP_USER}>`;
    await getTransport().sendMail({ from, ...mail });
    return;
  }
  if (process.env.VERCEL) throw new Error("Email is not configured (set SMTP_USER and SMTP_PASS).");
  await mkdir(outboxDir(), { recursive: true });
  const file = path.join(outboxDir(), `${Date.now()}-${mail.to.replace(/[^a-z0-9@.]/gi, "_")}.json`);
  const serial = {
    ...mail,
    attachments: mail.attachments?.map((a) => ({ ...a, content: a.content.toString("base64") })),
  };
  await writeFile(file, JSON.stringify(serial, null, 2));
  console.log(`[mail:dev] → ${mail.to} | ${mail.subject} | saved ${file}`);
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function shell(inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#0A0A0C;padding:32px 12px;font-family:Helvetica,Arial,sans-serif;color:#EDE6DA">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
  <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#121216;border:1px solid #2A2620;border-radius:18px;overflow:hidden">
    <tr><td style="padding:28px 32px 8px;font-size:11px;letter-spacing:4px;color:#D9B26F">PICHAVARAM HOUSE · POSTER STUDIO</td></tr>
    ${inner}
    <tr><td style="padding:22px 32px 28px;font-size:11px;color:#7D766B;border-top:1px solid #23201B">Made by Angad Jangid, IIT Madras — Web Admin</td></tr>
  </table></td></tr></table></body></html>`;
}

export function otpMail(to: string, code: string): Mail {
  return {
    to,
    subject: `${code} is your Poster Studio code`,
    text: `Your Pichavaram Poster Studio login code is ${code}. It expires in 10 minutes. If you didn't ask for it, ignore this email.`,
    html: shell(`<tr><td style="padding:8px 32px 0;font-size:26px;font-family:Georgia,serif;color:#F7F1E6">Your sign-in code</td></tr>
      <tr><td style="padding:20px 32px"><div style="font-size:40px;letter-spacing:14px;font-weight:bold;color:#D9B26F;background:#0A0A0C;border:1px solid #3A3226;border-radius:14px;padding:18px 0;text-align:center">${esc(code)}</div></td></tr>
      <tr><td style="padding:0 32px 22px;font-size:14px;line-height:1.6;color:#B9B1A4">Expires in 10 minutes. If you didn't ask for this, you can ignore this email.</td></tr>`),
  };
}

export function posterMail(o: {
  to: string;
  title: string;
  when: string;
  png: Buffer;
  preview: Buffer; // small JPEG shown inside the email body
  filename: string;
  link?: string;
}): Mail {
  return {
    to: o.to,
    subject: `Your poster is ready: ${o.title}`,
    text: `Your poster for "${o.title}" (${o.when}) is attached.${o.link ? ` You can also download it here: ${o.link}` : ""}`,
    html: shell(`<tr><td style="padding:8px 32px 0;font-size:26px;font-family:Georgia,serif;color:#F7F1E6">Your poster is ready ✦</td></tr>
      <tr><td style="padding:8px 32px 18px;font-size:14px;color:#B9B1A4">${esc(o.title)} · ${esc(o.when)}</td></tr>
      <tr><td style="padding:0 32px"><img src="cid:poster" width="496" style="width:100%;max-width:496px;border-radius:12px;display:block" alt="${esc(o.title)} poster"/></td></tr>
      <tr><td style="padding:20px 32px 24px;font-size:14px;line-height:1.6;color:#B9B1A4">The full-resolution PNG (1080×1350) is attached.${
        o.link ? ` <a href="${esc(o.link)}" style="color:#D9B26F">Open in Poster Studio</a>` : ""
      }</td></tr>`),
    attachments: [
      { filename: "preview.jpg", content: o.preview, contentType: "image/jpeg", cid: "poster" },
      { filename: o.filename, content: o.png, contentType: "image/png" },
    ],
  };
}
