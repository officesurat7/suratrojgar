export type Option = Record<string, string>;

export interface Locality { id: number; name: string; slug: string; zone?: string | null; pincode?: string | null; job_count?: number }
export interface JobRole { id: number; job_category_id: number; name: string; slug: string }
export interface Category { id: number; name: string; slug: string; icon?: string | null; description?: string | null; job_count?: number; roles: JobRole[] }
export interface EducationLevel { id: number; name: string; slug: string; rank: number }

export interface Meta {
  categories: Category[];
  localities: Locality[];
  education_levels: EducationLevel[];
  business_categories: { id: number; name: string; slug: string }[];
  options: {
    employment_types: Option; work_modes: Option; shifts: Option; salary_periods: Option; joining: Option;
    experience_bands: Option; gender_preferences: Option; genders: Option; contact_visibility: Option;
    application_statuses: Option; employment_statuses: Option; availability: Option; company_types: Option;
    complaint_reasons: Option;
  };
  stats: { active_jobs: number; employers: number };
  settings: Record<string, string | number | boolean>;
}

export interface JobCard {
  id: number; slug: string; url: string; title: string; company: string; company_slug?: string | null; company_verified?: boolean;
  category: { id: number; name: string; slug: string } | null;
  role: { id: number; name: string; slug: string } | null;
  salary: { min: number | null; max: number | null; currency: string; period: string; negotiable: boolean };
  location: { city: string; state: string; locality: { id: number; name: string; slug: string } | null; area: string | null; pincode: string | null };
  employment_type: string; employment_type_label: string; work_mode: string; work_mode_label: string; shift: string | null;
  experience: { min: number; max: number | null }; education: string | null; vacancies: number; joining: string;
  posted_at: string | null; expires_at: string | null; excerpt: string; is_priority: boolean; priority: number | null;
}

export interface JobDetail extends JobCard {
  description: string; skills_required: string[]; skills_preferred: string[];
  working_days: string | null; working_hours: string | null; weekly_off: string | null; benefits: string | null;
  gender_preference: string; contact_visibility: "verified_users" | "applicants_only" | "hidden";
  questions: { id: number; question: string; is_required: boolean }[];
  status: string; is_active: boolean; company_about: string | null;
}

export interface Paginated<T> { data: T[]; meta: { current_page: number; last_page: number; per_page?: number; total: number } }

export interface SessionUser {
  id: number; name: string; email: string; mobile: string | null;
  user_type: "job_seeker" | "employer" | "admin_staff" | "admin" | "super_admin";
  status: string; email_verified: boolean; two_factor_enabled: boolean; permissions: string[];
  notification_preferences: Record<string, { mail?: boolean }>;
  employer: { company_name: string; slug: string; verified: boolean } | null;
  profile_completion: number | null;
}
