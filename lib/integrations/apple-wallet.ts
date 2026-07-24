import { readFile } from "node:fs/promises";
import path from "node:path";
import { PKPass } from "passkit-generator";
import sharp from "sharp";

interface AppleWalletPassInput {
  serialNumber: string;
  memberName: string;
  sessionTitle: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  qrToken: string;
}

function certificateBundle() {
  const passTypeIdentifier = process.env.APPLE_PASS_TYPE_IDENTIFIER;
  const teamIdentifier = process.env.APPLE_TEAM_IDENTIFIER;
  const signerCert = process.env.APPLE_PASS_CERTIFICATE_BASE64;
  const signerKey = process.env.APPLE_PASS_PRIVATE_KEY_BASE64;
  const wwdr = process.env.APPLE_WWDR_CERTIFICATE_BASE64;
  if (
    !passTypeIdentifier ||
    !teamIdentifier ||
    !signerCert ||
    !signerKey ||
    !wwdr
  ) {
    return null;
  }
  return {
    passTypeIdentifier,
    teamIdentifier,
    certificates: {
      signerCert: Buffer.from(signerCert, "base64"),
      signerKey: Buffer.from(signerKey, "base64"),
      wwdr: Buffer.from(wwdr, "base64"),
      signerKeyPassphrase:
        process.env.APPLE_PASS_CERTIFICATE_PASSWORD || undefined,
    },
  };
}

async function passImages() {
  const source = await readFile(
    path.join(process.cwd(), "logo", "legendx_bw2.jpg"),
  );
  const [icon, icon2x, logo, logo2x] = await Promise.all([
    sharp(source).resize(29, 29, { fit: "cover" }).png().toBuffer(),
    sharp(source).resize(58, 58, { fit: "cover" }).png().toBuffer(),
    sharp(source).resize(160, 50, { fit: "inside" }).png().toBuffer(),
    sharp(source).resize(320, 100, { fit: "inside" }).png().toBuffer(),
  ]);
  return {
    "icon.png": icon,
    "icon@2x.png": icon2x,
    "logo.png": logo,
    "logo@2x.png": logo2x,
  };
}

export async function createAppleWalletPass(
  input: AppleWalletPassInput,
): Promise<Buffer | null> {
  const configured = certificateBundle();
  if (!configured) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://legendx.hk";
  const startsAt = new Date(input.startsAt);
  const date = new Intl.DateTimeFormat("zh-HK", {
    dateStyle: "medium",
    timeZone: "Asia/Hong_Kong",
  }).format(startsAt);
  const time = new Intl.DateTimeFormat("zh-HK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Hong_Kong",
  }).format(startsAt);

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: configured.passTypeIdentifier,
    teamIdentifier: configured.teamIdentifier,
    serialNumber: input.serialNumber,
    organizationName: "LegendX",
    description: `${input.sessionTitle} 課堂通行證`,
    logoText: "LEGENDX",
    backgroundColor: "rgb(7, 24, 39)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(214, 177, 91)",
    sharingProhibited: true,
    relevantDate: input.startsAt,
    expirationDate: input.endsAt,
    appLaunchURL: `${appUrl}/member/pass`,
    eventTicket: {
      headerFields: [
        { key: "date", label: "日期", value: date },
      ],
      primaryFields: [
        { key: "class", label: "課堂", value: input.sessionTitle },
      ],
      secondaryFields: [
        { key: "member", label: "會員", value: input.memberName },
        { key: "time", label: "時間", value: time },
      ],
      auxiliaryFields: [
        { key: "venue", label: "地點", value: input.venue },
      ],
      backFields: [
        {
          key: "instructions",
          label: "簽到方法",
          value: "到場後向 LegendX 職員出示此通行證的 QR Code。",
        },
        {
          key: "support",
          label: "會員中心",
          value: `${appUrl}/member/pass`,
        },
      ],
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: input.qrToken,
        messageEncoding: "iso-8859-1",
        altText: "LegendX check-in",
      },
    ],
  };

  const pass = new PKPass(
    {
      ...(await passImages()),
      "pass.json": Buffer.from(JSON.stringify(passJson)),
    },
    configured.certificates,
  );
  return pass.getAsBuffer();
}
