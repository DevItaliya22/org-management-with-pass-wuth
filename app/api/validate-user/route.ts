import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import bcrypt from "bcryptjs";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Get user by email
    const user = await convex.query(api.users.getByEmail, { email });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "No account found with this email" },
        { status: 400 },
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Please set up your password first" },
        { status: 400 },
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Incorrect password" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error validating user:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
