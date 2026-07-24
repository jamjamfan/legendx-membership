import { createSign } from "node:crypto";

interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
}

interface GoogleWalletPassInput {
  objectSuffix: string;
  memberName: string;
  sessionTitle: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  qrToken: string;
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signJwt(
  payload: Record<string, unknown>,
  privateKey: string,
): string {
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode(payload)}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(privateKey, "base64url")}`;
}

function credentials(): {
  issuerId: string;
  account: GoogleServiceAccount;
} | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!issuerId || !raw) return null;
  const account = JSON.parse(raw) as GoogleServiceAccount;
  if (!account.client_email || !account.private_key) return null;
  return { issuerId, account };
}

async function accessToken(account: GoogleServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(
    {
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/wallet_object.issuer",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    account.private_key,
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`google_oauth_failed:${response.status}`);
  const payload = (await response.json()) as { access_token: string };
  return payload.access_token;
}

async function ensureGenericClass(
  issuerId: string,
  token: string,
): Promise<string> {
  const classId = `${issuerId}.legendx_class_pass`;
  const endpoint = `https://walletobjects.googleapis.com/walletobjects/v1/genericClass/${encodeURIComponent(classId)}`;
  const existing = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (existing.ok) return classId;
  if (existing.status !== 404) {
    throw new Error(`google_wallet_class_check_failed:${existing.status}`);
  }

  const created = await fetch(
    "https://walletobjects.googleapis.com/walletobjects/v1/genericClass",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: classId,
        issuerName: "LegendX",
        reviewStatus: "UNDER_REVIEW",
      }),
    },
  );
  if (!created.ok && created.status !== 409) {
    throw new Error(`google_wallet_class_create_failed:${created.status}`);
  }
  return classId;
}

export async function createGoogleWalletSaveUrl(
  input: GoogleWalletPassInput,
): Promise<string | null> {
  const configured = credentials();
  if (!configured) return null;
  const token = await accessToken(configured.account);
  const classId = await ensureGenericClass(configured.issuerId, token);
  const suffix = input.objectSuffix.replace(/[^A-Za-z0-9._-]/g, "_");
  const objectId = `${configured.issuerId}.${suffix}`.slice(0, 255);
  const now = Math.floor(Date.now() / 1000);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://legendx.hk";

  const jwt = signJwt(
    {
      iss: configured.account.client_email,
      aud: "google",
      origins: [new URL(appUrl).origin],
      typ: "savetowallet",
      iat: now,
      payload: {
        genericObjects: [
          {
            id: objectId,
            classId,
            state: "ACTIVE",
            cardTitle: {
              defaultValue: { language: "zh-HK", value: "LegendX 課堂通行證" },
            },
            header: {
              defaultValue: { language: "zh-HK", value: input.sessionTitle },
            },
            subheader: {
              defaultValue: { language: "zh-HK", value: input.memberName },
            },
            barcode: {
              type: "QR_CODE",
              value: input.qrToken,
              alternateText: "LegendX check-in",
            },
            hexBackgroundColor: "#071827",
            validTimeInterval: {
              start: { date: input.startsAt },
              end: { date: input.endsAt },
            },
            textModulesData: [
              { id: "venue", header: "地點", body: input.venue },
            ],
          },
        ],
      },
    },
    configured.account.private_key,
  );
  return `https://pay.google.com/gp/v/save/${jwt}`;
}
