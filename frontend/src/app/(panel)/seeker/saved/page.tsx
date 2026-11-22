"use client";

import Link from "next/link";
import { useState } from "react";
import { StaticJobGrid } from "@/components/jobs/JobGrid";
import { PageHeader } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { EmptyState, PageLoader, Pagination } from "@/components/ui";
import type { JobCard } from "@/lib/types";

export default function SavedPage() {
  const [page, setPage] = useState(1);
  const { data, loading } = useApi<{ data: JobCard[]; meta: { current_page: number; last_page: number; total: number } }>(`seeker/saved-jobs?page=${page}`);
  return (
    <>
      <PageHeader title="Saved jobs" subtitle="Jobs you bookmarked. Apply before they expire." />
      {loading && !data ? <PageLoader /> : !data?.data.length ? (
        <EmptyState icon="🔖" title="No saved jobs" text="Tap Save on any job to keep it here." action={<Link href="/jobs" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">Browse jobs</Link>} />
      ) : <StaticJobGrid jobs={data.data} cols="sm:grid-cols-2 xl:grid-cols-3" />}
      {data && <Pagination page={data.meta.current_page} last={data.meta.last_page} onPage={setPage} />}
    </>
  );
}
