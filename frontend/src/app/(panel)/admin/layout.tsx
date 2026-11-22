"use client";

import { ADMIN_NAV } from "@/components/panel/adminNav";
import { Shell } from "@/components/panel/Shell";
import { useAuth } from "@/components/providers";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const title = user?.user_type === "super_admin" ? "Super Admin" : user?.user_type === "admin_staff" ? "Admin Staff" : "Admin";
  return <Shell allow={["admin", "admin_staff", "super_admin"]} nav={ADMIN_NAV} title={title}>{children}</Shell>;
}
