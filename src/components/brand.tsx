import Link from "next/link";
import { Grid2X2 } from "lucide-react";

export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`wg-brand ${light ? "light" : ""}`}><span><Grid2X2 size={18} /></span><strong>WorkGrid</strong></Link>;
}
