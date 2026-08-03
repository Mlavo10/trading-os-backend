import express from "express";
import cors from "cors";
import { requireAuth } from "./middleware/auth.js";
import { tradesRouter } from "./routes/trades.js";
import { journalRouter } from "./routes/journal.js";
import { screenshotsRouter } from "./routes/screenshots.js";
import { settingsRouter } from "./routes/settings.js";

const app = express();

app.use(cors()); // tighten this to your Tauri app's origin before shipping
app.use(express.json());

// Public health check — used by Railway/Render to confirm the service is up.
app.get("/health", (_req, res) => res.json({ ok: true }));

// Everything below requires a valid Supabase-issued JWT.
app.use(requireAuth);

app.use("/trades", tradesRouter);
app.use("/journal", journalRouter);
app.use("/screenshots", screenshotsRouter);
app.use("/settings", settingsRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`trading-os-api listening on :${port}`);
});
