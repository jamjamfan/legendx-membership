import Image from "next/image";
import brandLogo from "@/logo/legendx_bw2.jpg";

export function BrandMark() {
  return (
    <span className="brand-logo" aria-label="LegendX 財技">
      <Image
        src={brandLogo}
        alt="LegendX 財技"
        priority
        sizes="(max-width: 620px) 162px, 210px"
      />
    </span>
  );
}
