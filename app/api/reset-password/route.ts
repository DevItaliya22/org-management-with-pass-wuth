import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Email, code and new password are required" },
        { status: 400 },
      );
    }

    const result = await convex.action(api.users.resetPasswordWithOtp, {
      email,
      code,
      newPassword,
    });

    return NextResponse.json({ success: !!result?.success });
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Invalid code or request" },
      { status: 400 },
    );
  }
}


