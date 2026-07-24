import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

export function hasValidBearerToken(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  if (!authorization || !secret) return false;
  const [scheme, token, extra] = authorization.split(" ");
  return (
    scheme === "Bearer" &&
    Boolean(token) &&
    !extra &&
    safeEqual(token, secret)
  );
}

export function hasValidSha256Signature(
  body: string,
  signature: string | null,
  secret: string | undefined,
): boolean {
  if (!signature || !secret || !signature.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  return safeEqual(signature, expected);
}
