import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().max(200).optional().default(""),
  content: z.any(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
  coverImage: z.string().optional().or(z.literal("")),
  published: z.boolean().default(false),
  hidden: z.boolean().default(false),
  language: z.enum(["uz", "ja", "en", "ru"]).default("uz"),
  tags: z.array(z.string()).default([]),
});

export const updatePostSchema = createPostSchema.partial();

export const updateTranslationSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.any().optional(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format")
    .optional(),
  coverImage: z.string().optional().or(z.literal("")).nullable(),
  tags: z.array(z.string()).optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1, "Comment is required").max(2000),
  postId: z.string().min(1),
  parentId: z.string().optional(),
  language: z.enum(["uz", "en", "ja", "ru"]).optional(),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  tag: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const imageUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, "File size must be less than 10MB")
    .refine(
      (file) => ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type),
      "Only image files are allowed (JPEG, PNG, GIF, WebP)"
    ),
});

export type ImageUploadSchema = z.infer<typeof imageUploadSchema>;
