import {
  pgTable, pgEnum, text, integer, smallint, boolean,
  timestamp, jsonb, primaryKey, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums
export const channelEnum = pgEnum("channel", [
  "email", "whatsapp", "instagram", "linkedin", "calendar", "phone",
]);
export const directionEnum = pgEnum("direction", ["inbound", "outbound"]);
export const providerEnum = pgEnum("provider", [
  "google", "microsoft", "whatsapp", "instagram", "linkedin",
]);
export const reminderTypeEnum = pgEnum("reminder_type", [
  "birthday", "anniversary", "re_engagement", "follow_up", "custom",
]);
export const digestEnum = pgEnum("digest", ["none", "daily", "weekly"]);
export const sourceEnum = pgEnum("source", [
  "google", "outlook", "whatsapp", "instagram", "manual",
]);

// Better Auth tables
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contacts
export const contacts = pgTable("contacts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  emails: text("emails").array().notNull().default(sql`'{}'`),
  phones: text("phones").array().notNull().default(sql`'{}'`),
  company: text("company"),
  title: text("title"),
  linkedinUrl: text("linkedin_url"),
  instagramHandle: text("instagram_handle"),
  whatsappNumber: text("whatsapp_number"),
  birthday: text("birthday"),
  workAnniversary: text("work_anniversary"),
  photoUrl: text("photo_url"),
  personalScore: smallint("personal_score").notNull().default(0),
  professionalScore: smallint("professional_score").notNull().default(0),
  isVip: boolean("is_vip").notNull().default(false),
  lastContactAt: timestamp("last_contact_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("contacts_user_id_idx").on(t.userId),
  index("contacts_personal_score_idx").on(t.personalScore),
]);

export const contactSourceLinks = pgTable("contact_source_links", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  source: sourceEnum("source").notNull(),
  sourceId: text("source_id").notNull(),
  rawData: jsonb("raw_data"),
}, (t) => [
  uniqueIndex("contact_source_unique").on(t.source, t.sourceId),
]);

export const interactions = pgTable("interactions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  channel: channelEnum("channel").notNull(),
  direction: directionEnum("direction").notNull(),
  subject: text("subject"),
  bodyPreview: text("body_preview"),
  threadId: text("thread_id"),
  externalId: text("external_id"),
  occurredAt: timestamp("occurred_at").notNull(),
  metadata: jsonb("metadata"),
}, (t) => [
  index("interactions_contact_id_idx").on(t.contactId),
  index("interactions_occurred_at_idx").on(t.occurredAt),
]);

export const emails = pgTable("emails", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  threadId: text("thread_id"),
  messageId: text("message_id").notNull(),
  subject: text("subject"),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  toEmails: text("to_emails").array().notNull().default(sql`'{}'`),
  bodyPreview: text("body_preview"),
  bodyHtml: text("body_html"),
  receivedAt: timestamp("received_at").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  isStarred: boolean("is_starred").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  aiPriorityScore: smallint("ai_priority_score"),
  aiCategory: text("ai_category"),
  aiSummary: text("ai_summary"),
  needsReply: boolean("needs_reply").notNull().default(false),
  repliedAt: timestamp("replied_at"),
}, (t) => [
  index("emails_user_id_received_idx").on(t.userId, t.receivedAt),
  uniqueIndex("emails_message_id_unique").on(t.messageId),
]);

export const connectedAccounts = pgTable("connected_accounts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: providerEnum("provider").notNull(),
  accountEmail: text("account_email"),
  accountName: text("account_name"),
  accessTokenEnc: text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc"),
  tokenExpiresAt: timestamp("token_expires_at"),
  scopes: text("scopes").array(),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at"),
  gmailHistoryId: text("gmail_history_id"),
}, (t) => [
  index("connected_accounts_user_id_idx").on(t.userId),
]);

export const reminders = pgTable("reminders", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contactId: text("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  type: reminderTypeEnum("type").notNull(),
  dueAt: timestamp("due_at").notNull(),
  dismissedAt: timestamp("dismissed_at"),
  title: text("title").notNull(),
  body: text("body"),
}, (t) => [
  index("reminders_user_id_due_idx").on(t.userId, t.dueAt),
]);

export const scoreHistory = pgTable("score_history", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  personalScore: smallint("personal_score").notNull(),
  professionalScore: smallint("professional_score").notNull(),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
});

export const contactTags = pgTable("contact_tags", {
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.contactId, t.tagId] }),
]);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  reminderDigest: digestEnum("reminder_digest").notNull().default("daily"),
  digestTime: text("digest_time").notNull().default("08:00"),
  vipTitles: text("vip_titles").array().notNull().default(sql`ARRAY['professor','prof.','dr.','ceo','founder','director','vp','president']`),
  dormantThresholdDays: integer("dormant_threshold_days").notNull().default(90),
  timezone: text("timezone").notNull().default("UTC"),
});

export const whatsappAuthState = pgTable("whatsapp_auth_state", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  dataEnc: text("data_enc").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("wa_auth_user_key_unique").on(t.userId, t.key),
  index("wa_auth_user_id_idx").on(t.userId),
]);
