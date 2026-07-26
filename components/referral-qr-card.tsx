"use client";

import { QRCodeSVG } from "qrcode.react";

export function ReferralQrCard({
  url,
  code,
}: {
  url: string;
  code: string;
}) {
  return (
    <div className="referral-qr-card">
      <div className="referral-qr-image">
        <QRCodeSVG
          value={url}
          size={154}
          bgColor="#fcfdfd"
          fgColor="#071827"
          level="H"
          marginSize={2}
          title={`LegendX 朋友介紹連結 ${code}`}
        />
      </div>
      <div>
        <strong>掃碼用介紹價報名</strong>
        <small>朋友用手機相機掃描，會直接打開你嘅專屬介紹頁。</small>
      </div>
    </div>
  );
}
