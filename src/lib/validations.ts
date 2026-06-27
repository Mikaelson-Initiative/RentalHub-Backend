import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80, "Name must be at most 80 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters"),
  role: z.enum(["STUDENT", "LANDLORD"], { message: "Role must be STUDENT or LANDLORD" }),
});

export const PropertyQuerySchema = z.object({
  mine: z.enum(["true", "false"]).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  campus: z.string().optional(),
  page: z.coerce.number().min(1).catch(1),
  pageSize: z.coerce.number().min(1).max(100).catch(12),
});

export const PropertyCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  locationName: z.string().optional(),
  locationId: z.string().optional(),
  distanceToCampus: z.coerce.number().optional().nullable(),
  amenities: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  vacantUnits: z.coerce.number().min(1).optional().default(1),
}).refine(data => data.locationName || data.locationId, {
  message: "Either locationName or locationId must be provided",
  path: ["locationId"],
});

export const BookingCreateSchema = z.object({
  propertyId: z.string().min(1, "Property ID is required"),
  bidAmount: z.coerce.number().optional().nullable(),
  referralCode: z.string().optional().nullable(),
});
