/** SEO landing page definitions for /jobs/type/[type]. */
export const JOB_TYPE_PAGES: Record<string, { title: string; h1: string; param: Record<string, string>; intro: string }> = {
  "fresher": { title: "Fresher Jobs in Surat", h1: "Jobs for freshers in Surat", param: { experience: "fresher" }, intro: "No experience? These Surat employers welcome freshers and will train you on the job." },
  "part-time": { title: "Part-time Jobs in Surat", h1: "Part-time jobs in Surat", param: { type: "part_time" }, intro: "Flexible part-time work for students, homemakers and anyone looking for extra income." },
  "full-time": { title: "Full-time Jobs in Surat", h1: "Full-time jobs in Surat", param: { type: "full_time" }, intro: "Stable full-time jobs across Surat's textile, diamond, retail, office and IT sectors." },
  "work-from-home": { title: "Work from Home Jobs in Surat", h1: "Work from home jobs", param: { type: "work_from_home" }, intro: "Jobs from Surat employers that you can do from home." },
  "remote": { title: "Remote Jobs from Surat Companies", h1: "Remote jobs", param: { type: "remote" }, intro: "Remote roles offered by Surat-based companies." },
  "internship": { title: "Internships in Surat", h1: "Internships in Surat", param: { type: "internship" }, intro: "Gain real work experience with internships at Surat companies." },
  "daily-wage": { title: "Daily Wage Jobs in Surat", h1: "Daily wage jobs in Surat", param: { type: "daily_wage" }, intro: "Daily wage work in factories, warehouses, construction and more." },
  "night-shift": { title: "Night Shift Jobs in Surat", h1: "Night shift jobs in Surat", param: { shift: "night" }, intro: "Night shift openings in mills, security, BPO and logistics." },
  "contract": { title: "Contract Jobs in Surat", h1: "Contract jobs in Surat", param: { type: "contract" }, intro: "Fixed-term contract jobs with Surat employers." },
};
