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
  return `<!doctype html><html><body style="margin:0;background:#0B0A09;padding:32px 12px;font-family:Helvetica,Arial,sans-serif;color:#EDE6DA">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
  <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#121216;border:1px solid #2A2620;border-radius:18px;overflow:hidden">
    <tr><td style="padding:28px 32px 8px;font-size:11px;letter-spacing:4px;color:#D6B36F">PICHAVARAM HOUSE · POSTER STUDIO</td></tr>
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

function table(rows: [string, string][]) {
  return `<tr><td style="padding:4px 32px 8px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.5">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 12px 7px 0;color:#9A9183;vertical-align:top;width:120px;border-bottom:1px solid #23201B">${esc(k)}</td><td style="padding:7px 0;color:#EFE8DA;border-bottom:1px solid #23201B;word-break:break-word">${esc(v)}</td></tr>`,
    )
    .join("")}</table></td></tr>`;
}

function button(href: string, label: string) {
  return `<tr><td style="padding:20px 32px 26px"><a href="${esc(href)}" style="display:inline-block;background:#D6B36F;color:#17120A;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:999px">${esc(label)}</a></td></tr>`;
}

const textRows = (rows: [string, string][]) => rows.map(([k, v]) => `${k}: ${v}`).join("\n");

/** To the admins: a new request is waiting to be assigned. */
export function newRequestMail(o: { to: string; from: string; title: string; rows: [string, string][]; link: string }): Mail {
  return {
    to: o.to,
    subject: `New poster request: ${o.title}`,
    text: `${o.from} asked for a poster.\n\n${textRows(o.rows)}\n\nAssign a designer: ${o.link}`,
    html: shell(`<tr><td style="padding:8px 32px 0;font-size:26px;font-family:Georgia,serif;color:#F7F1E6">New poster request</td></tr>
      <tr><td style="padding:8px 32px 14px;font-size:14px;color:#B9B1A4">From ${esc(o.from)}. Pick a designer for it.</td></tr>
      ${table(o.rows)}${button(o.link, "Assign a designer")}`),
  };
}

/** To the designer: the brief, with the house crests attached. */
export function assignedMail(o: {
  to: string;
  name: string;
  title: string;
  rows: [string, string][];
  link: string;
  attachments: MailAttachment[];
}): Mail {
  const hi = o.name ? `Hi ${o.name.split(" ")[0]}, a` : "A";
  return {
    to: o.to,
    subject: `Poster to design: ${o.title}`,
    text: `${hi} poster request is yours.\n\n${textRows(o.rows)}\n\nThe house crests are attached. When it's ready, upload it here and it goes to the RC: ${o.link}`,
    html: shell(`<tr><td style="padding:8px 32px 0;font-size:26px;font-family:Georgia,serif;color:#F7F1E6">A poster for you to design</td></tr>
      <tr><td style="padding:8px 32px 14px;font-size:14px;line-height:1.6;color:#B9B1A4">${esc(hi)} poster request is yours. The house crests are attached. When it's ready, upload it on the request page and it is emailed to the RC.</td></tr>
      ${table(o.rows)}${button(o.link, "Open the request")}`),
    attachments: o.attachments,
  };
}

/** To the RC: their finished poster. */
export function deliveredMail(o: {
  to: string;
  title: string;
  when: string;
  poster: Buffer;
  mime: string;
  preview: Buffer; // small JPEG shown inside the email body
  filename: string;
  link: string;
}): Mail {
  return {
    to: o.to,
    subject: `Your poster is ready: ${o.title}`,
    text: `Your poster for "${o.title}" (${o.when}) is attached. You can also download it here: ${o.link}`,
    html: shell(`<tr><td style="padding:8px 32px 0;font-size:26px;font-family:Georgia,serif;color:#F7F1E6">Your poster is ready</td></tr>
      <tr><td style="padding:8px 32px 18px;font-size:14px;color:#B9B1A4">${esc(o.title)}, ${esc(o.when)}</td></tr>
      <tr><td style="padding:0 32px"><img src="cid:poster" width="496" style="width:100%;max-width:496px;border-radius:8px;display:block" alt="${esc(o.title)} poster"/></td></tr>
      <tr><td style="padding:20px 32px 4px;font-size:14px;line-height:1.6;color:#B9B1A4">The full-size poster is attached, ready for WhatsApp and Instagram.</td></tr>
      ${button(o.link, "Open in Poster Studio")}`),
    attachments: [
      { filename: "preview.jpg", content: o.preview, contentType: "image/jpeg", cid: "poster" },
      { filename: o.filename, content: o.poster, contentType: o.mime },
    ],
  };
}
