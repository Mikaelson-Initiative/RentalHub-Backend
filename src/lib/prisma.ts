import "server-only";
import { PrismaClient } from "@prisma/client";

const basePrisma = new PrismaClient();

const extendedPrisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const softDeleteModels = ["User", "Property", "Review"];
        if (softDeleteModels.includes(model)) {
          if (operation === "findUnique" || operation === "findFirst") {
             
            return (basePrisma as any)[model].findFirst({
              ...args,
              where: { ...args.where, deletedAt: null },
            });
          }
          if (operation === "findMany" || operation === "count") {
            args.where = { ...args.where, deletedAt: null };
            return query(args);
          }
          if (operation === "delete") {
             
            return (basePrisma as any)[model].update({
              ...args,
              data: { deletedAt: new Date() },
            });
          }
          if (operation === "deleteMany") {
             
            return (basePrisma as any)[model].updateMany({
              ...args,
              data: { deletedAt: new Date() },
            });
          }
        }
        return query(args);
      }
    }
  }
});

type ExtendedPrismaClient = typeof extendedPrisma;

const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma ?? extendedPrisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
