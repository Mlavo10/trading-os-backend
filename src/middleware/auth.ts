import type { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";
import { prisma } from "../lib/prisma.js";

// Supabase issues JWTs signed with your project's JWT secret (found in
// Supabase Dashboard -> Project Settings -> API -> JWT Secret).
// The frontend gets this token from supabase.auth.getSession() after login
// and sends it as: Authorization: Bearer <token>
const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!);

export interface AuthedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }
  const token = header.slice("Bearer ".length);

  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub as string;
    const email = (payload.email as string) ?? "";

    if (!userId) {
      return res.status(401).json({ error: "Token missing subject claim" });
    }

    // Auto-provision the local User row on first authenticated request,
    // so Trade/JournalPage foreign keys always have somewhere to point.
    await prisma.user.upsert({
      where: { id: userId },
      update: { email },
      create: { id: userId, email },
    });

    req.userId = userId;
    req.userEmail = email;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
