import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrismaAdmin = globalThis as unknown as { prismaAdmin: PrismaClient };

export const prismaAdmin = globalForPrismaAdmin.prismaAdmin ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrismaAdmin.prismaAdmin = prismaAdmin;
