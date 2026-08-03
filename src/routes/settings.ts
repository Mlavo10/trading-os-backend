import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";

export const settingsRouter = Router();

const settingsInput = z.object({
  darkMode: z.boolean().optional(),
  defaultRiskPct: z.number().optional(),
  baseCurrency: z.string().optional(),
  weeklyGoalTrades: z.number().int().optional(),
});

settingsRouter.get("/", async (req: AuthedRequest, res) => {
  const settings = await prisma.userSettings.upsert({
    where: { userId: req.userId! },
    update: {},
    create: { userId: req.userId! },
  });
  res.json(settings);
});

settingsRouter.patch("/", async (req: AuthedRequest, res) => {
  const parsed = settingsInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const settings = await prisma.userSettings.upsert({
    where: { userId: req.userId! },
    update: parsed.data,
    create: { userId: req.userId!, ...parsed.data },
  });
  res.json(settings);
});
