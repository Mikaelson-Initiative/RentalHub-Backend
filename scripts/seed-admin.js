// Run: node scripts/seed-admin.js
// Clears all user data and creates the admin account.

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const ADMIN_EMAIL    = "hello@mikaelsoninitiative.org";
const ADMIN_NAME     = "RentalHub Admin";
const ADMIN_PASSWORD = "Admin@RentalHub2026!";

async function main() {
  const prisma = new PrismaClient();
  try {
    // Delete in dependency order so FK constraints don't fire
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.property.deleteMany();
    await prisma.emailOtp.deleteMany();
    await prisma.user.deleteMany();

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const admin = await prisma.user.create({
      data: {
        name:               ADMIN_NAME,
        email:              ADMIN_EMAIL,
        password:           hash,
        role:               "ADMIN",
        emailVerified:      true,
        verificationStatus: "VERIFIED",
      },
    });

    console.log("✓ All test data cleared");
    console.log("✓ Admin account created");
    console.log("  Email:   ", admin.email);
    console.log("  Password:", ADMIN_PASSWORD);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
