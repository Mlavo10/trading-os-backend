import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";

export const journalRouter = Router();

// 1. Enforce that content is parsed as a valid input, defaulting to an empty object/string if null
const pageInput = z.object({
  title: z.string().min(1),
  content: z.any().transform((val) => (val === undefined ? {} : val)), 
});

journalRouter.get("/", async (req: AuthedRequest, res) => {
  const pages = await prisma.journalPage.findMany({
    where: { userId: req.userId! },
    orderBy: { updatedAt: "desc" },
  });
  res.json(pages);
});

journalRouter.get("/:id", async (req: AuthedRequest, res) => {
  const page = await prisma.journalPage.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json(page);
});

journalRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = pageInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // 2. Explicitly map properties so TypeScript knows 'content' is explicitly provided and not undefined
  const page = await prisma.journalPage.create({
    data: {
      userId: req.userId!,
      title: parsed.data.title,
      content: parsed.data.content,
    },
  });
  res.status(201).json(page);
});

journalRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = pageInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.journalPage.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) return res.status(404).json({ error: "Page not found" });

  const page = await prisma.journalPage.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(page);
});

journalRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const existing = await prisma.journalPage.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) return res.status(404).json({ error: "Page not found" });

  await prisma.journalPage.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
