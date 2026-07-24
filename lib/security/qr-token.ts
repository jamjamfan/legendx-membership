const textEncoder = new TextEncoder();

export interface CheckInClaims {
  version: 1;
  memberId: string;
  sessionId: string;
  expiresAt: number;
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? textEncoder.encode(input) : input;
  return Buffer.from(bytes).toString("base64url");
}

function base64UrlDecode(input: string): Uint8Array {
  return new Uint8Array(Buffer.from(input, "base64url"));
}

function asArrayBuffer(input: Uint8Array): ArrayBuffer {
  return Uint8Array.from(input).buffer;
}

async function signingKey() {
  const secret =
    process.env.QR_SIGNING_SECRET ??
    (process.env.NODE_ENV === "production"
      ? null
      : "legendx-local-demo-signing-secret-only");
  if (!secret) throw new Error("QR_SIGNING_SECRET is required");

  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signCheckInToken(claims: CheckInClaims): Promise<string> {
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    textEncoder.encode(encodedClaims),
  );
  return `${encodedClaims}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function issueCheckInToken(
  memberId: string,
  sessionId: string,
  lifetimeMs = 8 * 60 * 60 * 1000,
): Promise<string> {
  return signCheckInToken({
    version: 1,
    memberId,
    sessionId,
    expiresAt: Date.now() + lifetimeMs,
  });
}

export async function verifyCheckInToken(
  token: string,
): Promise<CheckInClaims | null> {
  const [encodedClaims, encodedSignature, extra] = token.split(".");
  if (!encodedClaims || !encodedSignature || extra) return null;

  const valid = await crypto.subtle.verify(
    "HMAC",
    await signingKey(),
    asArrayBuffer(base64UrlDecode(encodedSignature)),
    textEncoder.encode(encodedClaims),
  );
  if (!valid) return null;

  try {
    const claims = JSON.parse(
      Buffer.from(encodedClaims, "base64url").toString("utf8"),
    ) as CheckInClaims;
    if (
      claims.version !== 1 ||
      !claims.memberId ||
      !claims.sessionId ||
      claims.expiresAt <= Date.now()
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
