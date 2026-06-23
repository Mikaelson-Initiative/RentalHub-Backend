import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database…");

  const admin = await prisma.user.upsert({
    where: { email: "admin@rentalhub.ng" },
    update: {},
    create: {
      name: "RentalHub Admin",
      email: "admin@rentalhub.ng",
      password: await bcrypt.hash("Admin@1234", 10),
      role: "ADMIN",
      emailVerified: true,
      verificationStatus: "VERIFIED",
    },
  });

  const landlord = await prisma.user.upsert({
    where: { email: "landlord@rentalhub.ng" },
    update: {},
    create: {
      name: "Emeka Okonkwo",
      email: "landlord@rentalhub.ng",
      password: await bcrypt.hash("Landlord@1234", 10),
      role: "LANDLORD",
      emailVerified: true,
      verificationStatus: "VERIFIED",
      phoneNumber: "08012345678",
      bankName: "Access Bank",
      bankAccountNumber: "0123456789",
      bankAccountName: "Emeka Okonkwo",
    },
  });

  await prisma.user.upsert({
    where: { email: "student@rentalhub.ng" },
    update: {},
    create: {
      name: "Chioma Nwosu",
      email: "student@rentalhub.ng",
      password: await bcrypt.hash("Student@1234", 10),
      role: "STUDENT",
      emailVerified: true,
      verificationStatus: "VERIFIED",
    },
  });

  const [akoda, mbukpa, stateHousing, parliamentary, calabarSouth] = await Promise.all([
    prisma.location.upsert({ where: { name: "Akoda" }, update: {}, create: { name: "Akoda", classification: "Neighbourhood" } }),
    prisma.location.upsert({ where: { name: "Mbukpa" }, update: {}, create: { name: "Mbukpa", classification: "Neighbourhood" } }),
    prisma.location.upsert({ where: { name: "State Housing" }, update: {}, create: { name: "State Housing", classification: "Estate" } }),
    prisma.location.upsert({ where: { name: "Parliamentary Extension" }, update: {}, create: { name: "Parliamentary Extension", classification: "Neighbourhood" } }),
    prisma.location.upsert({ where: { name: "Calabar South" }, update: {}, create: { name: "Calabar South", classification: "Neighbourhood" } }),
  ]);

  const properties = [
    {
      title: "Cozy Studio Apartment — Akoda",
      description:
        "A well-ventilated studio apartment perfect for a single student. Walking distance to UNICAL main gate. Includes running water, 24-hour security, and a private bathroom.",
      price: 180000,
      distanceToCampus: 0.3,
      amenities: ["Running Water", "Security", "Private Bathroom", "Parking"],
      vacantUnits: 2,
      locationId: akoda.id,
    },
    {
      title: "Furnished 1-Bedroom Flat — Mbukpa",
      description:
        "Fully furnished 1-bedroom flat with a kitchen, sitting room, and modern bathroom. Ideal for students who prefer independence. Borehole water and prepaid meter.",
      price: 250000,
      distanceToCampus: 1.2,
      amenities: ["Furnished", "Borehole Water", "Prepaid Meter", "Kitchen", "Parking"],
      vacantUnits: 1,
      locationId: mbukpa.id,
    },
    {
      title: "Shared Room (2-in-1) — State Housing",
      description:
        "Affordable shared accommodation in a clean and secure estate. Two students per room. Shared kitchen and bathroom. Good road access and frequent transport.",
      price: 90000,
      distanceToCampus: 2.0,
      amenities: ["Security", "Good Road", "Shared Kitchen"],
      vacantUnits: 4,
      locationId: stateHousing.id,
    },
    {
      title: "Spacious Self-Contain — Parliamentary Extension",
      description:
        "Large self-contain apartment with a modern bathroom, kitchen space, and strong natural lighting. Close to shopping centres and eateries. Quiet environment.",
      price: 200000,
      distanceToCampus: 0.8,
      amenities: ["Private Bathroom", "Kitchen", "Running Water", "Tiled Floor"],
      vacantUnits: 1,
      locationId: parliamentary.id,
    },
    {
      title: "Mini Flat — Calabar South",
      description:
        "Clean mini flat with a sitting area, bedroom, and kitchen. Quiet neighbourhood suitable for focused study. Resident landlord ensures quick maintenance response.",
      price: 160000,
      distanceToCampus: 1.5,
      amenities: ["Running Water", "Prepaid Meter", "Kitchen", "Security"],
      vacantUnits: 2,
      locationId: calabarSouth.id,
    },
    {
      title: "Premium Self-Contain — Akoda",
      description:
        "Newly built self-contain with POP ceiling, ceramic tiles, modern fittings, and strong water pressure. 5 minutes walk from UNICAL main gate. Very limited availability.",
      price: 300000,
      distanceToCampus: 0.5,
      amenities: ["Running Water", "Tiled Floor", "POP Ceiling", "Security", "Prepaid Meter", "Parking"],
      vacantUnits: 1,
      locationId: akoda.id,
    },
    {
      title: "2-Bedroom Flat (Shared) — Mbukpa",
      description:
        "Well-maintained 2-bedroom flat perfect for two friends splitting rent. Large rooms, a shared sitting area, and a fully functional kitchen. 10 minutes drive to campus.",
      price: 350000,
      distanceToCampus: 1.8,
      amenities: ["Kitchen", "Running Water", "Prepaid Meter", "Parking", "Security"],
      vacantUnits: 1,
      locationId: mbukpa.id,
    },
    {
      title: "Budget Room (1-in-1) — State Housing",
      description:
        "Affordable private room in a well-managed hostel-style building. Shared bathroom and kitchen. Ideal for students on a tight budget. 24-hour security on premises.",
      price: 70000,
      distanceToCampus: 2.2,
      amenities: ["Security", "Shared Bathroom", "Shared Kitchen"],
      vacantUnits: 3,
      locationId: stateHousing.id,
    },
  ];

  for (const p of properties) {
    await prisma.property.create({
      data: {
        title: p.title,
        description: p.description,
        price: p.price,
        distanceToCampus: p.distanceToCampus,
        amenities: p.amenities,
        images: [],
        status: "APPROVED",
        vacantUnits: p.vacantUnits,
        landlordId: landlord.id,
        locationId: p.locationId,
      },
    });
  }

  console.log("Done.");
  console.log(`  Admin:    admin@rentalhub.ng     /  Admin@1234`);
  console.log(`  Landlord: landlord@rentalhub.ng  /  Landlord@1234`);
  console.log(`  Student:  student@rentalhub.ng   /  Student@1234`);
  console.log(`  ${admin.id} (admin id)`);
  console.log(`  ${landlord.id} (landlord id)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
