"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { JobForm } from "@/components/panel/JobForm";
import { PageHeader } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { Card } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface Emp { user_id: number; name: string; email: string; locality_id: number | null; pincode: string; address: string; contact_person: string; mobile: string }

export default function AdminNewJob() {
  const router = useRouter();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [emp, setEmp] = useState<Emp | null>(null);
  const { data } = useApi<{ data: Emp[] }>(`admin/employers?status=active${search ? `&q=${encodeURIComponent(search)}` : ""}`);
  return (
    <>
      <PageHeader title="Post a job for an employer" subtitle="Jobs posted by admins go live immediately and are recorded in the audit log." />
      <Card title="1. Choose employer" className="mb-5">
        {emp ? (
          <div className="flex items-center justify-between gap-3"><p><strong>{emp.name}</strong> · {emp.email}</p><button className="text-sm font-semibold text-brand-700" onClick={() => setEmp(null)}>Change</button></div>
        ) : (
          <>
            <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }} className="flex gap-2"><input className="input" placeholder="Search company name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search employers" /></form>
            <ul className="mt-3 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {data?.data.map((e) => <li key={e.user_id}><button className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50" onClick={() => setEmp(e)}><strong>{e.name}</strong> <span className="text-slate-500">· {e.email}</span></button></li>)}
              {data && !data.data.length && <li className="px-4 py-3 text-sm text-slate-500">No active employers found.</li>}
            </ul>
          </>
        )}
      </Card>
      {emp && (
        <JobForm key={emp.user_id} initial={{ status: "active" }} endpoint="admin/jobs" method="post"
          defaults={{ contact_name: emp.contact_person, contact_mobile: emp.mobile ?? "", contact_email: emp.email, locality_id: emp.locality_id ? String(emp.locality_id) : "", pincode: emp.pincode ?? "", office_address: emp.address ?? "" }}
          onSaved={(job, msg) => { toast(msg); router.push(`/admin/jobs/${job.id}`); }} extraBody={{ employer_id: emp.user_id }} />
      )}
    </>
  );
}
