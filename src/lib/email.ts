export type EmailPayload = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

const RESEND_API = "https://api.resend.com/emails";

export async function sendEmail({ to, subject, html, text, from }: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddr = from || process.env.EMAIL_FROM || "no-reply@example.com";
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const body = {
    from: fromAddr,
    to: Array.isArray(to) ? to : [to],
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
  } as Record<string, unknown>;
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json && json.error) || `Email failed (${res.status})`);
  }
  return json;
}

export function appBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://localhost:3000";
  return String(raw).replace(/\/$/, "");
}
