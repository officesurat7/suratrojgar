"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers";
import { Button, EmptyState } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { JobCard as Job, Paginated } from "@/lib/types";
import { JobCard } from "./JobCard";

/** Hook: saved/applied state for job cards + save toggle that redirects guests to login. */
export function useJobStates(jobs: Job[]) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const ids = jobs.map((j) => j.id).join(",");

  useEffect(() => {
    if (user?.user_type !== "job_seeker" || !ids) return;
    api.post<{ saved: number[]; applied: number[] }>("seeker/job-states", { ids: ids.split(",").map(Number) })
      .then((r) => { setSaved(new Set(r.saved)); setApplied(new Set(r.applied)); }).catch(() => {});
  }, [user, ids]);

  const toggle = useCallback(async (job: Job) => {
    if (!user) { router.push(`/login?next=${encodeURIComponent(pathname)}`); return; }
    if (user.user_type !== "job_seeker") { toast("Only job seekers can save jobs.", "info"); return; }
    const was = saved.has(job.id);
    setSaved((s) => { const n = new Set(s); if (was) n.delete(job.id); else n.add(job.id); return n; });
    try {
      if (was) await api.del(`seeker/saved-jobs/${job.id}`); else await api.post(`seeker/saved-jobs/${job.id}`);
      toast(was ? "Removed from saved jobs." : "Job saved. Find it under Saved Jobs.");
    } catch (e) {
      setSaved((s) => { const n = new Set(s); if (was) n.add(job.id); else n.delete(job.id); return n; });
      toast((e as Error).message, "error");
    }
  }, [user, saved, router, pathname, toast]);

  return { saved, applied, toggle };
}

/** Grid with "Load more" (infinite list) used on the homepage. */
export function LoadMoreJobs({ initial, query = "" }: { initial: Paginated<Job>; query?: string }) {
  const [jobs, setJobs] = useState(initial.data);
  const [page, setPage] = useState(initial.meta.current_page);
  const [loading, setLoading] = useState(false);
  const last = initial.meta.last_page;
  const { saved, applied, toggle } = useJobStates(jobs);
  const { toast } = useToast();

  const more = async () => {
    setLoading(true);
    try {
      const r = await api.get<Paginated<Job>>(`jobs?${query}${query ? "&" : ""}page=${page + 1}`);
      setJobs((j) => [...j, ...r.data.filter((x) => !j.some((y) => y.id === x.id))]);
      setPage(r.meta.current_page);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!jobs.length) return <EmptyState title="No jobs yet" text="New jobs are added every day. Please check back soon." />;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map((j) => <JobCard key={j.id} job={j} saved={saved.has(j.id)} applied={applied.has(j.id)} onToggleSave={toggle} />)}
      </div>
      {page < last && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" size="lg" loading={loading} onClick={more}>Load more jobs</Button>
        </div>
      )}
    </>
  );
}

export function StaticJobGrid({ jobs, cols = "sm:grid-cols-2 lg:grid-cols-3" }: { jobs: Job[]; cols?: string }) {
  const { saved, applied, toggle } = useJobStates(jobs);
  return (
    <div className={`grid gap-4 ${cols}`}>
      {jobs.map((j) => <JobCard key={j.id} job={j} saved={saved.has(j.id)} applied={applied.has(j.id)} onToggleSave={toggle} />)}
    </div>
  );
}
