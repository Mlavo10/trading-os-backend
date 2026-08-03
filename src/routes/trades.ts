import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";

export const tradesRouter = Router();

const tradeInput = z.object({
  instrument: z.string().min(1),
  direction: z.enum(["Long", "Short"]),
  session: z.string().min(1),
  strategy: z.string().min(1),
  entry: z.number().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  riskPct: z.number().optional(),
  positionSize: z.number().optional(),
  pnl: z.number().default(0),
  rMultiple: z.number().default(0),
  grade: z.string().optional(),
  tags: z.array(z.string()).default([]),
  checklist: z.array(z.object({ label: z.string(), done: z.boolean() })).optional(),
  reflection: z.string().optional(),
  lessons: z.string().optional(),
  psychology: z
    .object({
      confidence: z.number().min(0).max(10),
      patience: z.number().min(0).max(10),
      discipline: z.number().min(0).max(10),
      stress: z.number().min(0).max(10),
    })
    .optional(),
  entryAt: z.string().datetime().optional(),
});

// GET /trades — list, newest first. Supports ?instrument=&session=&grade=&q=
tradesRouter.get("/", async (req: AuthedRequest, res) => {
  const { instrument, session, grade, q } = req.query as Record<string, string | undefined>;

  const trades = await prisma.trade.findMany({
    where: {
      userId: req.userId!,
      ...(instrument ? { instrument } : {}),
      ...(session ? { session } : {}),
      ...(grade ? { grade } : {}),
      ...(q
        ? {
            OR: [
              { instrument: { contains: q, mode: "insensitive" } },
              { strategy: { contains: q, mode: "insensitive" } },
              { tags: { has: q } },
            ],
          }
        : {}),
    },
    orderBy: { entryAt: "desc" },
    include: { screenshots: true },
  });

  res.json(trades);
});

// GET /trades/:id
tradesRouter.get("/:id", async (req: AuthedRequest, res) => {
  const trade = await prisma.trade.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { screenshots: true },
  });
  if (!trade) return res.status(404).json({ error: "Trade not found" });
  res.json(trade);
});

// POST /trades — create
tradesRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = tradeInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const trade = await prisma.trade.create({
    data: { ...parsed.data, userId: req.userId! },
  });
  res.status(201).json(trade);
});

// PATCH /trades/:id — partial update
tradesRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = tradeInput.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await prisma.trade.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) return res.status(404).json({ error: "Trade not found" });

  const trade = await prisma.trade.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(trade);
});

// DELETE /trades/:id
tradesRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const existing = await prisma.trade.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) return res.status(404).json({ error: "Trade not found" });

  await prisma.trade.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
