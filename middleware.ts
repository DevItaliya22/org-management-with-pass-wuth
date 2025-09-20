import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isSignInPage = nextUrl.pathname.startsWith("/signin")
  const isProtectedRoute = nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/dashboard")

  if (isSignInPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl))
  }

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/signin", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}