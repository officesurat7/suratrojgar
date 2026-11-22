"use client";

import { ADMIN_NAV } from "@/components/panel/adminNav";
import { Shell } from "@/components/panel/Shell";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <Shell allow={["super_admin"]} nav={ADMIN_NAV} title="Super Admin">{children}</Shell>;
}
