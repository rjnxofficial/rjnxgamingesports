/** Zod schemas shared by client forms and server actions. */
import { z } from "zod";
import {
  FORMATS,
  GAME_SLUGS,
  MATCH_STATUSES,
  MODES,
  ROLES,
  SUPPORT_STATUSES,
} from "./constants";

export const uuidSchema = z.string().uuid("Invalid identifier");

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username must be at most 24 characters")
  .regex(/^[a-zA-Z0-9_.]+$/, "Use letters, numbers, underscore or dot only");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z.object({
  username: usernameSchema.optional(),
  full_name: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+0-9\s-]*$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  state: z.string().trim().max(60).optional().or(z.literal("")),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  in_game_name: z.string().trim().max(40).optional().or(z.literal("")),
  game_uid: z.string().trim().max(40).optional().or(z.literal("")),
  primary_game_id: z.string().uuid().nullable().optional(),
});

export const teamSchema = z.object({
  name: z.string().trim().min(3, "Team name must be at least 3 characters").max(40),
  tag: z
    .string()
    .trim()
    .max(6, "Tag must be 6 characters or fewer")
    .optional()
    .or(z.literal("")),
  game_id: z.string().uuid("Choose a game").optional().nullable(),
  logo_url: z.string().url().optional().or(z.literal("")).nullable(),
});

export const invitationSchema = z.object({
  team_id: uuidSchema,
  username: usernameSchema,
  message: z.string().trim().max(200).optional().or(z.literal("")),
});

const isoDate = z
  .string()
  .min(1, "Required")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date");

export const tournamentSchema = z
  .object({
    name: z.string().trim().min(4, "Name is too short").max(90),
    slug: z
      .string()
      .trim()
      .min(4, "Slug is too short")
      .max(90)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only"),
    game_id: uuidSchema,
    mode: z.enum(MODES),
    format: z.enum(FORMATS),
    description: z.string().trim().max(4000).optional().or(z.literal("")),
    rules: z.string().trim().max(8000).optional().or(z.literal("")),
    banner_url: z.string().url().optional().or(z.literal("")).nullable(),
    entry_fee: z.coerce.number().min(0, "Entry fee cannot be negative").max(100000),
    prize_pool: z.coerce.number().min(0).max(100000000),
    max_slots: z.coerce.number().int().min(2, "At least 2 slots").max(4096),
    min_team_size: z.coerce.number().int().min(1).max(8),
    max_team_size: z.coerce.number().int().min(1).max(8),
    registration_starts_at: isoDate.optional().nullable(),
    registration_ends_at: isoDate.optional().nullable(),
    starts_at: isoDate,
    ends_at: isoDate.optional().nullable(),
    status: z
      .enum([
        "draft",
        "published",
        "registration_open",
        "registration_closed",
        "live",
        "completed",
        "cancelled",
      ])
      .default("draft"),
    is_featured: z.coerce.boolean().default(false),
    requires_approval: z.coerce.boolean().default(false),
    scoring_rule_id: z.string().uuid().optional().nullable(),
  })
  .refine((v) => v.max_team_size >= v.min_team_size, {
    message: "Max team size must be >= min team size",
    path: ["max_team_size"],
  })
  .refine(
    (v) =>
      !v.registration_ends_at ||
      !v.registration_starts_at ||
      Date.parse(v.registration_ends_at) > Date.parse(v.registration_starts_at),
    { message: "Registration deadline must be after registration start", path: ["registration_ends_at"] },
  )
  .refine(
    (v) => !v.registration_ends_at || Date.parse(v.registration_ends_at) <= Date.parse(v.starts_at),
    { message: "Registration must close before the tournament starts", path: ["registration_ends_at"] },
  )
  .refine((v) => !v.ends_at || Date.parse(v.ends_at) >= Date.parse(v.starts_at), {
    message: "End date must be after start date",
    path: ["ends_at"],
  });

export const matchSchema = z.object({
  tournament_id: uuidSchema,
  round: z.coerce.number().int().min(1).max(50).default(1),
  match_number: z.coerce.number().int().min(1).max(500).default(1),
  group_label: z.string().trim().max(30).optional().or(z.literal("")),
  scheduled_at: isoDate.optional().nullable(),
  map_name: z.string().trim().max(40).optional().or(z.literal("")),
  status: z.enum(MATCH_STATUSES).default("scheduled"),
});

export const roomCredentialsSchema = z.object({
  match_id: uuidSchema,
  room_id: z.string().trim().min(1, "Room ID is required").max(60),
  room_password: z.string().trim().min(1, "Room password is required").max(60),
  publish: z.coerce.boolean().default(true),
});

export const matchResultSchema = z.object({
  match_id: uuidSchema,
  participant_id: uuidSchema,
  placement: z.coerce.number().int().min(1).max(200).nullable().optional(),
  kills: z.coerce.number().int().min(0).max(200).default(0),
  bonus_points: z.coerce.number().int().min(-200).max(200).default(0),
  evidence_url: z.string().url().optional().or(z.literal("")).nullable(),
});

export const verifyResultSchema = z.object({
  result_ids: z.array(uuidSchema).min(1, "Select at least one result"),
  verify: z.coerce.boolean().default(true),
});

export const registrationSchema = z.object({
  tournament_id: uuidSchema,
  team_id: uuidSchema.optional().nullable(),
});

export const registrationReviewSchema = z.object({
  registration_id: uuidSchema,
  status: z.enum(["approved", "rejected", "waitlisted", "cancelled"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const newsSchema = z.object({
  title: z.string().trim().min(4).max(140),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only")
    .max(140),
  excerpt: z.string().trim().max(300).optional().or(z.literal("")),
  content: z.string().trim().min(10, "Write some content"),
  cover_url: z.string().url().optional().or(z.literal("")).nullable(),
  is_published: z.coerce.boolean().default(false),
});

export const bannerSchema = z.object({
  title: z.string().trim().min(2).max(80),
  subtitle: z.string().trim().max(140).optional().or(z.literal("")),
  image_url: z.string().url("Enter a valid image URL"),
  link_url: z.string().url().optional().or(z.literal("")).nullable(),
  placement: z.enum(["home_hero", "home_strip", "tournaments", "sidebar"]).default("home_hero"),
  is_active: z.coerce.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(4, "Subject is too short").max(120),
  category: z.enum(["account", "tournament", "payment", "technical", "report", "other"]),
  message: z.string().trim().min(10, "Describe your issue in at least 10 characters").max(4000),
});

export const supportReplySchema = z.object({
  ticket_id: uuidSchema,
  status: z.enum(SUPPORT_STATUSES),
  admin_reply: z.string().trim().min(1, "Write a reply").max(4000),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  subject: z.string().trim().min(3).max(140),
  message: z.string().trim().min(10, "Message too short").max(4000),
});

export const roleGrantSchema = z.object({
  user_id: uuidSchema,
  role: z.enum(ROLES),
});

export const notificationSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().max(600).optional().or(z.literal("")),
  link: z.string().trim().max(300).optional().or(z.literal("")),
  audience: z.enum(["all", "players", "staff", "tournament", "user"]).default("all"),
  tournament_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  type: z
    .enum([
      "registration",
      "approval",
      "match",
      "room",
      "result",
      "winner",
      "team",
      "announcement",
      "admin",
      "payment",
      "system",
    ])
    .default("announcement"),
});

export const scoringRuleSchema = z.object({
  name: z.string().trim().min(3).max(60),
  placement_points: z
    .array(z.object({ placement: z.coerce.number().int().min(1), points: z.coerce.number().int() }))
    .min(1, "Add at least one placement"),
  kill_points: z.coerce.number().int().min(0).max(50),
  tie_breakers: z
    .array(z.enum(["total_points", "kills", "best_placement", "wins"]))
    .min(1)
    .default(["total_points", "kills", "best_placement"]),
  is_default: z.coerce.boolean().default(false),
});

export const platformSettingSchema = z.object({
  key: z.string().trim().min(2).max(60),
  value: z.string().trim().max(2000),
  description: z.string().trim().max(200).optional().or(z.literal("")),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type TournamentInput = z.infer<typeof tournamentSchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** Validate FormData against a zod schema and return a typed flat result. */
export function parseFormData<S extends z.ZodTypeAny>(
  schema: S,
  formData: FormData,
): { success: true; data: z.infer<S> } | { success: false; error: string; field?: string } {
  const raw: Record<string, unknown> = {};
  for (const key of Object.keys((schema as unknown as z.ZodObject<z.ZodRawShape>).shape ?? {})) {
    const values = formData.getAll(key);
    if (values.length === 0) continue;
    const value = values.length > 1 ? values : values[0];
    // Checkbox + boolean coercion helpers
    if (value === "on" || value === "true") raw[key] = true;
    else if (value === "false" || value === "") raw[key] = value === "" ? "" : false;
    else raw[key] = value;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Invalid input", field: first?.path?.join(".") };
  }
  return { success: true, data: parsed.data };
}
