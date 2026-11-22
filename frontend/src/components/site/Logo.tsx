import Image from "next/image";
import Link from "next/link";

export function Logo({ variant = "light", className = "h-10 w-auto sm:h-11" }: { variant?: "light" | "dark"; className?: string }) {
  return (
    <Link href="/" className="inline-flex shrink-0 items-center" aria-label="SuratRojgar home">
      <Image src={`/brand/suratrojgar-logo-${variant}.svg`} alt="SuratRojgar – Surat's own job portal" width={431} height={104} priority className={className} />
    </Link>
  );
}
