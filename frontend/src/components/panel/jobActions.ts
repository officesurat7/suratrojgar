/** Status transitions an employer can trigger from each job status. */
export const JOB_ACTIONS: Record<string, { action: string; label: string }[]> = {
  active: [{ action: "pause", label: "Pause" }, { action: "close", label: "Close" }],
  paused: [{ action: "activate", label: "Resume" }, { action: "close", label: "Close" }],
  draft: [{ action: "submit", label: "Submit" }],
  rejected: [{ action: "submit", label: "Resubmit" }],
  closed: [{ action: "reopen", label: "Reopen" }],
  expired: [{ action: "reopen", label: "Reopen" }],
};
