import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServiceRoleClient } from "../src/lib/supabase/admin";
import { runSyncChannelHistory } from "../src/lib/channels/run-sync-channel-history";
import { getSyncHistoryMessagesPerChatFromEnv } from "../src/lib/channels/sync-history-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const CHANNEL_ID = "2b04521e-2c2b-4023-ba13-968403a6ca70";
const COMPANY_ID = "30b172e4-b1a6-4795-8df1-646fd3b007d7";

async function main() {
  const admin = createServiceRoleClient();
  const { data: ch } = await admin
    .from("channels")
    .select("id, uazapi_token_encrypted")
    .eq("id", CHANNEL_ID)
    .eq("company_id", COMPANY_ID)
    .single();
  const token = ch?.uazapi_token_encrypted;
  if (!token) {
    console.error("Channel token not found");
    process.exit(1);
  }

  console.log("Syncing history for channel", CHANNEL_ID, "...");
  const result = await runSyncChannelHistory({
    channelId: CHANNEL_ID,
    companyId: COMPANY_ID,
    token,
    createMissingConversations: true,
    targetMessagesPerChat: getSyncHistoryMessagesPerChatFromEnv(),
  });

  console.log(JSON.stringify(result, null, 2));

  const { count } = await admin
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("channel_id", CHANNEL_ID);
  console.log("Conversations in channel:", count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
