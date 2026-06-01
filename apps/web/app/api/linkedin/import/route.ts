import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { contacts, contactSourceLinks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

interface LinkedInCSVRow {
  firstName: string;
  lastName: string;
  emailAddress: string | null;
  company: string | null;
  position: string | null;
  connectedOn: string | null;
  url: string | null;
}

function parseCSV(csvText: string): LinkedInCSVRow[] {
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header row to find column indices
  const headerLine = lines[0];
  const headerCols = parseCSVLine(headerLine);

  const colMap: Record<string, number> = {};
  for (let i = 0; i < headerCols.length; i++) {
    const col = headerCols[i].trim().toLowerCase();
    if (col.includes("first") && col.includes("name")) colMap.firstName = i;
    else if (col.includes("last") && col.includes("name")) colMap.lastName = i;
    else if (col.includes("email")) colMap.emailAddress = i;
    else if (col.includes("company")) colMap.company = i;
    else if (col.includes("position")) colMap.position = i;
    else if (col.includes("connected") && col.includes("on")) colMap.connectedOn = i;
    else if (col.includes("url")) colMap.url = i;
  }

  const rows: LinkedInCSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 2) continue;

    const getCol = (key: string) => {
      const idx = colMap[key];
      if (idx === undefined || idx >= cols.length) return null;
      const val = cols[idx].trim();
      return val || null;
    };

    const firstName = getCol("firstName") ?? "";
    const lastName = getCol("lastName") ?? "";
    if (!firstName && !lastName) continue;

    rows.push({
      firstName,
      lastName,
      emailAddress: getCol("emailAddress"),
      company: getCol("company"),
      position: getCol("position"),
      connectedOn: getCol("connectedOn"),
      url: getCol("url"),
    });
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const csvText = await file.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;

    for (const row of rows) {
      const displayName = [row.firstName, row.lastName].filter(Boolean).join(" ");
      const linkedinUrl = row.url?.trim() ?? null;

      // Check for existing contact by LinkedIn URL or email
      const allUserContacts = await db.select().from(contacts)
        .where(eq(contacts.userId, userId));

      let existingContact = linkedinUrl
        ? allUserContacts.find((c) => c.linkedinUrl === linkedinUrl)
        : null;

      if (!existingContact && row.emailAddress) {
        existingContact = allUserContacts.find(
          (c) => c.emails.includes(row.emailAddress!),
        );
      }

      if (existingContact) {
        // Update existing contact with LinkedIn data
        await db.update(contacts).set({
          linkedinUrl: linkedinUrl ?? existingContact.linkedinUrl,
          company: row.company ?? existingContact.company,
          title: row.position ?? existingContact.title,
          firstName: row.firstName || existingContact.firstName,
          lastName: row.lastName || existingContact.lastName,
          updatedAt: new Date(),
        }).where(eq(contacts.id, existingContact.id));
        updated++;
      } else {
        // Create new contact
        const contactId = nanoid();
        await db.insert(contacts).values({
          id: contactId,
          userId,
          displayName,
          firstName: row.firstName || null,
          lastName: row.lastName || null,
          emails: row.emailAddress ? [row.emailAddress] : [],
          company: row.company,
          title: row.position,
          linkedinUrl,
        });

        // Create source link
        const sourceId = linkedinUrl ?? `linkedin-csv-${contactId}`;
        await db.insert(contactSourceLinks).values({
          id: nanoid(),
          contactId,
          source: "manual",
          sourceId,
          rawData: row as any,
        }).onConflictDoNothing();

        imported++;
      }
    }

    return NextResponse.json({
      status: "success",
      imported,
      updated,
      total: rows.length,
    });
  } catch (error) {
    console.error("LinkedIn CSV import error:", error);
    return NextResponse.json(
      { error: "Failed to import CSV" },
      { status: 500 },
    );
  }
}
