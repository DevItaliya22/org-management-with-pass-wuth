import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
    const existingUser = await convex.query(api.users.getByEmail, { email });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 400 },
      );
    }

    // Create the user
    await convex.action(api.users.createUserWithPassword, {
      email,
      password,
      name,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create account. Please try again." },
      { status: 500 },
    );
  }
}
