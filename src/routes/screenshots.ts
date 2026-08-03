import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma.js";
import { supabaseAdmin, SCREENSHOTS_BUCKET } from "../lib/supabase.js";
import type { AuthedRequest } from "../middleware/auth.js";

export const screenshotsRouter = Router();

// STEP 1 — the app asks for a place to upload a screenshot to.
// POST /screenshots/upload-url  { tradeId, fileExt }
screenshotsRouter.post("/upload-url", async (req: AuthedRequest, res) => {
  const schema = z.object({ tradeId: z.string(), fileExt: z.string().default("png") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const trade = await prisma.trade.findFirst({
    where: { id: parsed.data.tradeId, userId: req.userId! },
  });
  if (!trade) return res.status(404).json({ error: "Trade not found" });

  const storagePath = `${req.userId}/${trade.id}/${randomUUID()}.${parsed.data.fileExt}`;

  const { data, error } = await supabaseAdmin.storage
    .from(SCREENSHOTS_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    return res.status(500).json({ error: "Could not create upload URL" });
  }

  // The Tauri app uploads the file directly to this URL (PUT), then calls
  // POST /screenshots/confirm below to register it against the trade.
  res.json({ storagePath, signedUrl: data.signedUrl, token: data.token });
});

// STEP 2 — after the direct upload succeeds, register the row.
// POST /screenshots/confirm  { tradeId, storagePath, caption? }
screenshotsRouter.post("/confirm", async (req: AuthedRequest, res) => {
  const schema = z.object({
    tradeId: z.string(),
    storagePath: z.string(),
    caption: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const trade = await prisma.trade.findFirst({
    where: { id: parsed.data.tradeId, userId: req.userId! },
  });
  if (!trade) return res.status(404).json({ error: "Trade not found" });

  const screenshot = await prisma.screenshot.create({
    data: {
      tradeId: trade.id,
      storagePath: parsed.data.storagePath,
      caption: parsed.data.caption,
    },
  });
  res.status(201).json(screenshot);
});

// GET /screenshots/:id/url — short-lived signed URL to view a screenshot
screenshotsRouter.get("/:id/url", async (req: AuthedRequest, res) => {
  const screenshot = await prisma.screenshot.findFirst({
    where: { id: req.params.id, trade: { userId: req.userId! } },
  });
  if (!screenshot) return res.status(404).json({ error: "Screenshot not found" });

  const { data, error } = await supabaseAdmin.storage
    .from(SCREENSHOTS_BUCKET)
    .createSignedUrl(screenshot.storagePath, 60 * 10); // 10 minutes

  if (error || !data) return res.status(500).json({ error: "Could not sign URL" });
  res.json({ url: data.signedUrl });
});

screenshotsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const screenshot = await prisma.screenshot.findFirst({
    where: { id: req.params.id, trade: { userId: req.userId! } },
  });
  if (!screenshot) return res.status(404).json({ error: "Screenshot not found" });

  await supabaseAdmin.storage.from(SCREENSHOTS_BUCKET).remove([screenshot.storagePath]);
  await prisma.screenshot.delete({ where: { id: screenshot.id } });
  res.status(204).send();
});
