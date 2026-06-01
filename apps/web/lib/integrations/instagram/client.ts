const GRAPH_API_BASE = "https://graph.instagram.com/v21.0";
const FACEBOOK_GRAPH_BASE = "https://graph.facebook.com/v21.0";

export interface InstagramProfile {
  id: string;
  username: string;
  name: string;
  profilePictureUrl: string;
  followersCount: number;
  mediaCount: number;
}

export interface InstagramConversation {
  id: string;
  participants: { data: { id: string; username: string }[] };
  updatedTime: string;
  messages?: {
    data: { id: string; message: string; from: { id: string }; created_time: string }[];
  };
}

export async function getInstagramProfile(accessToken: string): Promise<InstagramProfile> {
  const res = await fetch(
    `${GRAPH_API_BASE}/me?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${accessToken}`,
  );
  if (!res.ok) throw new Error(`Instagram API error: ${res.status}`);
  return res.json();
}

export async function getConversations(
  accessToken: string,
  pageId: string,
): Promise<InstagramConversation[]> {
  // Instagram DM access requires the Page-scoped token
  const res = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${pageId}/conversations?platform=instagram&fields=participants,updated_time,messages.limit(5){message,from,created_time}&access_token=${accessToken}`,
  );
  if (!res.ok) throw new Error(`Instagram Conversations API error: ${res.status}`);
  const data = await res.json();
  return data.data ?? [];
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{
  accessToken: string;
  userId: string;
}> {
  // Short-lived token exchange
  const res = await fetch(`${FACEBOOK_GRAPH_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });
  const data = await res.json();

  // Exchange for long-lived token (60 days)
  const longRes = await fetch(
    `${FACEBOOK_GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_APP_ID}&client_secret=${process.env.INSTAGRAM_APP_SECRET}&fb_exchange_token=${data.access_token}`,
  );
  const longData = await longRes.json();

  return {
    accessToken: longData.access_token,
    userId: data.user_id,
  };
}

export async function refreshLongLivedToken(token: string): Promise<string> {
  const res = await fetch(
    `${FACEBOOK_GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_APP_ID}&client_secret=${process.env.INSTAGRAM_APP_SECRET}&fb_exchange_token=${token}`,
  );
  const data = await res.json();
  return data.access_token;
}
