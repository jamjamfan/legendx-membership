"use client";

import { QRCodeSVG } from "qrcode.react";

export function MemberPassCard({
  memberName,
  token,
  courseLabel,
}: {
  memberName: string;
  token: string;
  courseLabel: string;
}) {
  return (
    <div className="member-pass">
      <div className="member-pass-top">
        <span>LEGENDX CLASS PASS</span>
        <small>SECURE · SIGNED QR</small>
      </div>
      <div className="member-pass-body">
        <div className="pass-qr">
          <QRCodeSVG
            value={token}
            size={180}
            bgColor="#fcfdfd"
            fgColor="#071827"
            level="H"
            marginSize={2}
            title={`${memberName} 課堂通行證`}
          />
        </div>
        <div className="pass-copy">
          <span>持有人</span>
          <strong>{memberName}</strong>
          <p>{courseLabel}</p>
          <small>到場後向職員出示。每堂只可成功簽到一次。</small>
        </div>
      </div>
    </div>
  );
}
