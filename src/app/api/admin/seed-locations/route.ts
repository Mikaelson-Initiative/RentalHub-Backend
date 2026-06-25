import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, catchError } from "@/lib/res";

const LOCATIONS: Array<{ name: string; campus: string }> = [
  // BOUESTI — Ikere-Ekiti
  { name: "Uro",               campus: "bouesti"  },
  { name: "Odo Oja",           campus: "bouesti"  },
  { name: "Oke 'Kere",         campus: "bouesti"  },
  { name: "Afao Road",         campus: "bouesti"  },
  { name: "Olumilua Estate",   campus: "bouesti"  },
  { name: "Ajebandele",        campus: "bouesti"  },
  { name: "Ikoyi Estate",      campus: "bouesti"  },
  { name: "Amoye GS",          campus: "bouesti"  },
  // UNILAG — University of Lagos
  { name: "Akoka",             campus: "unilag"   },
  { name: "Yaba",              campus: "unilag"   },
  { name: "Abule Ijesha",      campus: "unilag"   },
  { name: "Bariga",            campus: "unilag"   },
  { name: "Iwaya",             campus: "unilag"   },
  { name: "Onike",             campus: "unilag"   },
  { name: "Sabo",              campus: "unilag"   },
  { name: "Otto-Awori",        campus: "unilag"   },
  // UNILORIN — University of Ilorin
  { name: "Tanke",             campus: "unilorin" },
  { name: "Fate",              campus: "unilorin" },
  { name: "Oke-Odo",           campus: "unilorin" },
  { name: "Challenge",         campus: "unilorin" },
  { name: "Gaa-Akanbi",        campus: "unilorin" },
  { name: "Unity Road",        campus: "unilorin" },
  { name: "Ilofa Road",        campus: "unilorin" },
  { name: "Oke-Kura",          campus: "unilorin" },
];

export async function POST(req: NextRequest) {
  try {
    requireAuth(req, "ADMIN");

    let created = 0;
    let updated = 0;
    for (const loc of LOCATIONS) {
      const existing = await prisma.location.findUnique({ where: { name: loc.name } });
      if (existing) {
        if (existing.campus !== loc.campus) {
          await prisma.location.update({ where: { name: loc.name }, data: { campus: loc.campus } });
          updated++;
        }
      } else {
        await prisma.location.create({ data: { name: loc.name, campus: loc.campus, classification: "Neighbourhood" } });
        created++;
      }
    }

    return ok({ message: `Done. ${created} created, ${updated} updated.`, created, updated });
  } catch (e) {
    return catchError(e);
  }
}
