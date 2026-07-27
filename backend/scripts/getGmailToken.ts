import { google } from "googleapis";
import env from "../src/config/env.js";

const clientId = env.GMAIL_CLIENT_ID || env.GOOGLE_CLIENT_ID;
const clientSecret = env.GMAIL_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;
const redirectUri = "https://developers.google.com/oauthplayground";

if (!clientId || !clientSecret) {
  console.error("Error: GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET missing in .env");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authCode = process.argv[2];

if (!authCode) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.send"],
  });

  console.log("\n========================================================");
  console.log("STEP 1: Generate Gmail OAuth URL");
  console.log("========================================================\n");
  console.log("Open this URL in your browser:\n");
  console.log(authUrl);
  console.log("\n--------------------------------------------------------");
  console.log("After authorizing, copy the 'code=' parameter from the browser URL bar,");
  console.log("then run STEP 2:\n");
  console.log("  bun scripts/getGmailToken.ts YOUR_COPIED_CODE");
  console.log("========================================================\n");
} else {
  console.log("\nExchanging authorization code for refresh token...");
  try {
    const { tokens } = await oauth2Client.getToken(authCode.trim());
    if (!tokens.refresh_token) {
      console.warn("Warning: No refresh token returned. Make sure to revoke app access in your Google Account and re-run Step 1 to force consent prompt.");
    } else {
      console.log("\n========================================================");
      console.log("SUCCESS! Here is your new GMAIL_REFRESH_TOKEN:");
      console.log("========================================================\n");
      console.log(tokens.refresh_token);
      console.log("\nCopy & paste this token into your backend/.env file:");
      console.log(`GMAIL_REFRESH_TOKEN="${tokens.refresh_token}"`);
      console.log("========================================================\n");
    }
  } catch (err: any) {
    console.error("Error exchanging code for token:", err?.message || err);
  }
}
