import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export interface CalendarEvent {
  id: string;
  summary: string;
  startAt: Date;
  endAt: Date;
  attendeeEmails: string[];
  organizerEmail: string;
}

export async function listEvents(
  auth: OAuth2Client,
  options: { timeMin?: Date; timeMax?: Date; maxResults?: number } = {}
): Promise<CalendarEvent[]> {
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: (options.timeMin ?? new Date(Date.now() - 90 * 86_400_000)).toISOString(),
    timeMax: (options.timeMax ?? new Date(Date.now() + 30 * 86_400_000)).toISOString(),
    maxResults: options.maxResults ?? 500,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items ?? [])
    .filter((e) => e.status !== "cancelled")
    .map((e) => ({
      id: e.id ?? "",
      summary: e.summary ?? "(no title)",
      startAt: new Date(e.start?.dateTime ?? e.start?.date ?? ""),
      endAt: new Date(e.end?.dateTime ?? e.end?.date ?? ""),
      attendeeEmails: (e.attendees ?? [])
        .map((a) => a.email ?? "")
        .filter((email) => email && !email.endsWith("@resource.calendar.google.com")),
      organizerEmail: e.organizer?.email ?? "",
    }));
}
