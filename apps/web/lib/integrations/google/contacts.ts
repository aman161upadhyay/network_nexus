import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export interface GoogleContact {
  resourceName: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  emails: string[];
  phones: string[];
  company?: string;
  title?: string;
  photoUrl?: string;
  birthday?: string;
}

export async function listConnections(auth: OAuth2Client): Promise<GoogleContact[]> {
  const people = google.people({ version: "v1", auth });
  const contacts: GoogleContact[] = [];
  let pageToken: string | undefined;

  do {
    const res = await people.people.connections.list({
      resourceName: "people/me",
      pageSize: 1000,
      pageToken,
      personFields: "names,emailAddresses,phoneNumbers,organizations,birthdays,photos",
    });

    const connections = res.data.connections ?? [];
    for (const c of connections) {
      const name = c.names?.[0];
      const emails = (c.emailAddresses ?? []).map((e) => e.value ?? "").filter(Boolean);
      if (!name?.displayName && emails.length === 0) continue;

      contacts.push({
        resourceName: c.resourceName ?? "",
        displayName: name?.displayName ?? emails[0] ?? "Unknown",
        firstName: name?.givenName ?? undefined,
        lastName: name?.familyName ?? undefined,
        emails,
        phones: (c.phoneNumbers ?? []).map((p) => p.value ?? "").filter(Boolean),
        company: c.organizations?.[0]?.name ?? undefined,
        title: c.organizations?.[0]?.title ?? undefined,
        photoUrl: c.photos?.[0]?.url ?? undefined,
        birthday: c.birthdays?.[0]?.date
          ? `${c.birthdays[0].date.year ?? "0000"}-${String(c.birthdays[0].date.month ?? 1).padStart(2, "0")}-${String(c.birthdays[0].date.day ?? 1).padStart(2, "0")}`
          : undefined,
      });
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return contacts;
}
