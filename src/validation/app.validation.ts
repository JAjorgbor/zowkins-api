import { z } from "zod";

const createApp = {
  body: z.object({
    name: z.string(),
    address: z.string(),
    phoneNumber: z.string(),
    whatsAppNumber: z.string(),
    email: z.email(),
    status: z.object({
      portal: z.enum(["online", "offline", "waitlist"]),
    }),
    description: z.string(),
    ratings: z.number(),
    images: z.array(z.string()),
    branding: z.object({
      logo: z.string(),
      logoLight: z.string(),
      logomark: z.string(),
      logomarkLight: z.string(),
    }),
  }),
};

const updateApp = {
  body: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    phoneNumber: z.string().optional(),
    whatsAppNumber: z.string().optional(),
    email: z.email().optional(),
    status: z
      .object({
        portal: z.enum(["online", "offline", "waitlist"]).optional(),
      })
      .optional(),
    description: z.string().optional(),
    ratings: z.number().optional(),
    images: z.array(z.string()).optional(),
    branding: z
      .object({
        logo: z.string().optional(),
        logoLight: z.string().optional(),
        logomark: z.string().optional(),
        logomarkLight: z.string().optional(),
      })
      .optional(),
  }),
};

const updateAppContact = {
  body: z.object({
    address: z.string().optional(),
    phoneNumber: z.string().optional(),
    whatsAppNumber: z.string().optional(),
    email: z.email().optional(),
  }),
};

export default {
  createApp,
  updateApp,
  updateAppContact,
};
