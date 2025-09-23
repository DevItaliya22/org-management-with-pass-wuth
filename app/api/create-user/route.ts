import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isTimeout =
        err?.code === "ETIMEDOUT" || err?.cause?.code === "ETIMEDOUT";
      if (i < attempts - 1 && isTimeout) {
        await new Promise((r) => setTimeout(r, 200 * (i + 1)));
        continue;
      }
      break;
    }
  }
  throw lastError;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: "Email, password, and name are required" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await withRetry(() =>
      convex.query(api.users.getByEmail, { email }),
    );

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 400 },
      );
    }

    // Create the user
    await withRetry(() =>
      convex.action(api.users.createUserWithPassword, {
        email,
        password,
        name,
      }),
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create account. Please try again." },
      { status: 500 },
    );
  }
}
