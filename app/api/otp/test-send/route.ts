import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Call the public Convex action to send test OTP
    await convex.action(api.otp.sendEmailAction.sendTestOtp, {});

    return NextResponse.json({ 
      ok: true, 
      message: "Test OTP sent to yashdangar123@gmail.com" 
    });
  } catch (error: any) {
    console.error("Error sending test OTP:", error);

    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to send test OTP" },
      { status: 500 },
    );
  }
}
