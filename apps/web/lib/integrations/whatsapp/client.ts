import makeWASocket, {
  DisconnectReason,
  WASocket,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import type { AuthenticationState } from "@whiskeysockets/baileys";

export interface WhatsAppConnection {
  socket: WASocket;
  qrCode: string | null;
  isConnected: boolean;
}

export async function createWhatsAppSession(
  authState: { state: AuthenticationState; saveCreds: () => Promise<void> },
  onQR: (qr: string) => void,
  onConnected: (jid: string) => void,
  onMessage: (message: any) => void,
): Promise<WASocket> {
  const { state, saveCreds } = authState;
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    // Minimize data usage -- metadata only by default
    getMessage: async () => undefined,
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      onQR(qr);
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        // Reconnect unless user explicitly logged out
        createWhatsAppSession(authState, onQR, onConnected, onMessage);
      }
    }

    if (connection === "open") {
      onConnected(socket.user?.id ?? "unknown");
    }
  });

  socket.ev.on("messages.upsert", ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key.fromMe && msg.message) {
        onMessage(msg);
      }
    }
  });

  return socket;
}
