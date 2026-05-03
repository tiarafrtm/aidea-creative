import { Router } from "express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/me", requireAuth, (req, res) => {
  if (!req.authUser || !req.authProfile) {
    return res.status(401).json({ error: "Tidak terautentikasi." });
  }
  res.json({
    id: req.authUser.id,
    email: req.authUser.email ?? null,
    profile: {
      id: req.authProfile.id,
      namaLengkap: req.authProfile.namaLengkap,
      noTelepon: req.authProfile.noTelepon,
      alamat: req.authProfile.alamat,
      fotoProfil: req.authProfile.fotoProfil,
      role: req.authProfile.role,
    },
  });
});

router.put("/me", requireAuth, async (req, res) => {
  if (!req.authUser || !req.authProfile) {
    return res.status(401).json({ error: "Tidak terautentikasi." });
  }
  const { namaLengkap, noTelepon, alamat, fotoProfil } = req.body as {
    namaLengkap?: string;
    noTelepon?: string | null;
    alamat?: string | null;
    fotoProfil?: string | null;
  };

  const set: Partial<typeof profilesTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (namaLengkap !== undefined) set.namaLengkap = namaLengkap;
  if (noTelepon !== undefined) set.noTelepon = noTelepon || null;
  if (alamat !== undefined) set.alamat = alamat || null;
  if (fotoProfil !== undefined) set.fotoProfil = fotoProfil || null;

  const [updated] = await db
    .update(profilesTable)
    .set(set)
    .where(eq(profilesTable.id, req.authUser.id))
    .returning();

  if (!updated) {
    return res.status(404).json({ error: "Profil tidak ditemukan." });
  }

  res.json({
    profile: {
      id: updated.id,
      namaLengkap: updated.namaLengkap,
      noTelepon: updated.noTelepon,
      alamat: updated.alamat,
      fotoProfil: updated.fotoProfil,
      role: updated.role,
    },
  });
});

export default router;
