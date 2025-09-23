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
    // Call the public Convex action to send test OTP
    await withRetry(() =>
      convex.action(api.otp.sendEmailAction.sendTestOtp, {}),
    );

    return NextResponse.json({
      ok: true,
      message: "Test OTP sent to yashdangar123@gmail.com",
    });
  } catch (error: any) {
    console.error("Error sending test OTP:", error);

    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to send test OTP" },
      { status: 500 },
    );
  }
}
