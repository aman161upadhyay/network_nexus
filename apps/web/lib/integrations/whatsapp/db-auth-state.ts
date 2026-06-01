import { db } from "@/lib/db";
import { whatsappAuthState } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/integrations/encryption";
import type { AuthenticationState, SignalDataTypeMap } from "@whiskeysockets/baileys";
import { proto } from "@whiskeysockets/baileys";
import { initAuthCreds, BufferJSON } from "@whiskeysockets/baileys";

export async function useDBAuthState(userId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const writeData = async (key: string, data: any) => {
    const serialized = JSON.stringify(data, BufferJSON.replacer);
    const encrypted = encrypt(serialized);
    await db.insert(whatsappAuthState)
      .values({ userId, key, dataEnc: encrypted })
      .onConflictDoUpdate({
        target: [whatsappAuthState.userId, whatsappAuthState.key],
        set: { dataEnc: encrypted, updatedAt: new Date() },
      });
  };

  const readData = async (key: string): Promise<any | null> => {
    const rows = await db.select()
      .from(whatsappAuthState)
      .where(
        and(
          eq(whatsappAuthState.userId, userId),
          eq(whatsappAuthState.key, key),
        ),
      );
    const row = rows[0];
    if (!row) return null;
    return JSON.parse(decrypt(row.dataEnc), BufferJSON.reviver);
  };

  const removeData = async (key: string) => {
    await db.delete(whatsappAuthState).where(
      and(
        eq(whatsappAuthState.userId, userId),
        eq(whatsappAuthState.key, key),
      ),
    );
  };

  const creds = (await readData("creds")) ?? initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
          const result: { [id: string]: SignalDataTypeMap[T] } = {};
          for (const id of ids) {
            const data = await readData(`${type}-${id}`);
            if (data) {
              result[id] = (type === "app-state-sync-key"
                ? proto.Message.AppStateSyncKeyData.fromObject(data)
                : data) as SignalDataTypeMap[T];
            }
          }
          return result;
        },
        set: async (data: Record<string, Record<string, any>>) => {
          for (const [type, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries)) {
              if (value) {
                await writeData(`${type}-${id}`, value);
              } else {
                await removeData(`${type}-${id}`);
              }
            }
          }
        },
      },
    },
    saveCreds: () => writeData("creds", creds),
  };
}
