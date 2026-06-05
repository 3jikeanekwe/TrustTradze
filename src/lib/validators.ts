import { z } from "zod";

export const emailSchema = z.string().email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password is too long");

export const fullNameSchema = z
  .string()
  .min(2, "Full name is too short")
  .max(80, "Full name is too long");

export const bankAccountSchema = z.object({
  bankName: z.string().min(2).max(80),
  accountNumber: z.string().min(10).max(10),
  accountName: z.string().min(2).max(120)
});

export const productSchema = z.object({
  title: z.string().min(2).max(120),
  price: z.number().positive(),
  category: z.enum([
    "Agriculture",
    "Electronics",
    "Fashion",
    "Vehicles",
    "Construction",
    "Home & Living",
    "Industrial",
    "Other"
  ]),
  youtubeUrl: z.string().url(),
  location: z.string().min(2).max(120)
});

export const serviceSchema = z.object({
  title: z.string().min(2).max(120),
  price: z.number().positive(),
  category: z.enum([
    "Repair",
    "Logistics",
    "Freelancing",
    "Construction",
    "Technology",
    "Education",
    "Consulting",
    "Other"
  ]),
  locationType: z.enum(["Physical", "Home Service", "Online"]),
  location: z.string().min(2).max(120)
});

export const escrowCreateSchema = z.object({
  title: z.string().min(2).max(140),
  categoryGroup: z.enum(["products", "services"]),
  category: z.string().min(2).max(80),
  amount: z.number().positive(),
  buyerEmail: emailSchema,
  sellerEmail: emailSchema
});

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(2000)
});
