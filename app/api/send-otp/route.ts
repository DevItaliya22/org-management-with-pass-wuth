import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    // Send verification email using Convex
    const result = await convex.mutation(api.users.sendVerificationEmail, {
      email,
    });

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to send verification email" },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("Error sending OTP:", error);

    // Handle specific error messages
    let errorMessage = "Something went wrong. Please try again.";
    if (error.message?.includes("User not found")) {
      errorMessage =
        "Please sign up first before requesting verification code.";
    } else if (error.message?.includes("send failed")) {
      errorMessage = "Failed to send email. Please check your email address.";
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
