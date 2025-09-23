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
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    // Send reset OTP (doesn't reveal account existence)
    const result = await withRetry(() =>
      convex.mutation(api.users.sendPasswordResetEmail, {
        email,
      }),
    );

    return NextResponse.json({ success: !!result?.success });
  } catch (error: any) {
    console.error("Error requesting password reset:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
