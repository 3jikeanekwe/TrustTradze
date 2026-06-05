import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, createSessionCookie } from "@/lib/firebase/session";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { idToken?: string };
    const idToken = body.idToken?.trim();

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing ID token" },
        { status: 400 }
      );
    }

    const sessionCookie = await createSessionCookie(idToken);

    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 5
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create session";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
