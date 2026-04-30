import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import PostalMime from "postal-mime";

export async function listMessages(
  auth: OAuth2Client,
  options: { maxResults?: number; pageToken?: string; q?: string } = {}
) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: options.maxResults ?? 50,
    pageToken: options.pageToken,
    q: options.q,
  });
  return res.data;
}

export async function getMessage(auth: OAuth2Client, messageId: string) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "raw",
  });
  return res.data;
}

export async function parseMessage(rawBase64: string) {
  const raw = Buffer.from(rawBase64, "base64url").toString("binary");
  const parser = new PostalMime();
  const parsed = await parser.parse(raw);

  const from = parsed.from;
  const fromAddress = from && !from.group ? from.address : "";
  const fromName = from ? from.name : "";

  return {
    subject: parsed.subject ?? "(no subject)",
    fromEmail: fromAddress ?? "",
    fromName: fromName ?? "",
    toEmails: (parsed.to ?? [])
      .filter((t) => !t.group)
      .map((t) => (t as { address: string }).address ?? "")
      .filter(Boolean),
    bodyHtml: parsed.html ?? "",
    bodyPreview: (parsed.text ?? parsed.html ?? "").slice(0, 500).replace(/<[^>]+>/g, ""),
    date: parsed.date ? new Date(parsed.date) : new Date(),
    messageId: parsed.messageId ?? "",
  };
}

export async function getHistoryList(
  auth: OAuth2Client,
  startHistoryId: string
) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.history.list({
    userId: "me",
    startHistoryId,
    historyTypes: ["messageAdded"],
  });
  return res.data;
}

export async function watchMailbox(auth: OAuth2Client, topicName: string) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName,
      labelIds: ["INBOX"],
    },
  });
  return res.data;
}

export async function getProfile(auth: OAuth2Client) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.getProfile({ userId: "me" });
  return res.data;
}
