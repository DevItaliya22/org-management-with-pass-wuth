"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"signIn" | "signUp" | { email: string }>(
    "signIn",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return step === "signIn" || step === "signUp" ? (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none fixed top-0 left-0 w-full z-0 dark:opacity-35 opacity-20"
        style={{
          height: "35vh",
          background:
            "linear-gradient(to left, oklch(0.7 0.25 180), oklch(0.7 0.25 200), oklch(0.6 0.2 270), oklch(0.7 0.3 320))",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
        }}
      />
      <div className="relative z-10 min-h-screen w-full grid place-items-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-background border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-2 text-center">
              <h1 className="text-2xl font-semibold text-foreground">
                {step === "signIn" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {step === "signIn"
                  ? "Log in to continue to your dashboard"
                  : "Sign up to get started"}
              </p>
            </div>
            <div className="px-6 pb-6">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  void Promise.resolve(signIn("google"))
                    .catch((err: any) =>
                      setError(err?.message || "Google sign-in failed"),
                    )
                    .finally(() => setIsLoading(false));
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-medium bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                disabled={isLoading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12  s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.64,6.053,29.082,4,24,4C12.955,4,4,12.955,4,24  s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,13,24,13c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657  C33.64,6.053,29.082,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.136,0,9.757-1.969,13.285-5.18l-6.143-5.203C29.205,35.091,26.715,36,24,36  c-5.201,0-9.616-3.322-11.272-7.952l-6.52,5.025C9.5,39.556,16.227,44,24,44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.793,2.237-2.231,4.154-4.108,5.609l0.003-0.002l6.143,5.203  C35.688,40.83,44,35,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">
                    or continue with email
                  </span>
                </div>
              </div>

              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setError(null);
                  setIsLoading(true);
                  const formData = new FormData(event.currentTarget);
                  formData.set("flow", step);
                  void signIn("password", formData)
                    .then(() =>
                      setStep({ email: formData.get("email") as string }),
                    )
                    .catch((err: any) => {
                      if (err && /verify|code|otp/i.test(err.message || "")) {
                        setStep({ email: formData.get("email") as string });
                        setError(null);
                      } else {
                        setError(
                          err?.message ||
                            (step === "signIn"
                              ? "Sign in failed"
                              : "Sign up failed"),
                        );
                      }
                    })
                    .finally(() => setIsLoading(false));
                }}
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    className="w-full bg-background text-foreground rounded-md px-3 py-2 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/40"
                    name="email"
                    placeholder="you@example.com"
                    type="email"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      className="w-full bg-background text-foreground rounded-md px-3 py-2 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/40 pr-10"
                      name="password"
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={isLoading}
                      autoComplete={
                        step === "signIn" ? "current-password" : "new-password"
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-5 h-5"
                        >
                          <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l2.201 2.2A11.64 11.64 0 0 0 1.732 12C3.06 16.412 7.272 20 12 20c1.97 0 3.812-.53 5.39-1.46l3.08 3.08a.75.75 0 0 0 1.06-1.06L3.53 2.47zM12 18.5c-4.014 0-7.62-3.056-8.806-6.5a10.107 10.107 0 0 1 2.597-3.864l2.302 2.301A4.75 4.75 0 0 0 12 16.75a4.73 4.73 0 0 0 2.036-.454l1.143 1.143A8.973 8.973 0 0 1 12 18.5zm2.333-3.52-1.13-1.13a3.25 3.25 0 0 1-3.553-3.553l-1.13-1.13a4.75 4.75 0 0 0 5.812 5.812z" />
                          <path d="M14.876 9.123 17.79 12.037a8.97 8.97 0 0 0 1.016-1.538C17.94 6.588 13.728 3 9 3a10.07 10.07 0 0 0-4.39 1.46l1.286 1.286A8.973 8.973 0 0 1 9 4.5c4.014 0 7.62 3.056 8.806 6.5a10.107 10.107 0 0 1-1.016 1.538l-1.914-1.914A4.75 4.75 0 0 0 9 7.25c-.72 0-1.398.17-2.004.472l1.143 1.143A3.25 3.25 0 0 1 12 8.75c.79 0 1.527.27 2.11.73l.066-.357z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-5 h-5"
                        >
                          <path d="M12 5c-5.088 0-9.3 3.588-10.268 8 .968 4.412 5.18 8 10.268 8s9.3-3.588 10.268-8C21.3 8.588 17.088 5 12 5zm0 13.5c-4.014 0-7.62-3.056-8.806-6.5C4.38 8.056 7.986 5 12 5s7.62 3.056 8.806 6.5C19.62 14.444 16.014 18.5 12 18.5z" />
                          <path d="M12 8.75A3.25 3.25 0 1 0 12 15.25 3.25 3.25 0 0 0 12 8.75z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <input name="flow" value={step} type="hidden" readOnly />

                <button
                  className="w-full inline-flex items-center justify-center rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Please wait…"
                    : step === "signIn"
                      ? "Sign in"
                      : "Create account"}
                </button>

                <div className="text-center text-sm text-muted-foreground">
                  {step === "signIn" ? (
                    <>
                      Don't have an account?{" "}
                      <button
                        type="button"
                        className="text-foreground underline hover:no-underline"
                        onClick={() => setStep("signUp")}
                        disabled={isLoading}
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="text-foreground underline hover:no-underline"
                        onClick={() => setStep("signIn")}
                        disabled={isLoading}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>

                {error && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400 rounded-md px-3 py-2">
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none fixed top-0 left-0 w-full z-0 dark:opacity-35 opacity-20"
        style={{
          height: "35vh",
          background:
            "linear-gradient(to left, oklch(0.7 0.25 180), oklch(0.7 0.25 200), oklch(0.6 0.2 270), oklch(0.7 0.3 320))",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
        }}
      />
      <div className="relative z-10 min-h-screen w-full grid place-items-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-background border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-2 text-center">
              <h1 className="text-2xl font-semibold text-foreground">
                Verify your email
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the verification code sent to your inbox
              </p>
            </div>
            <div className="px-6 pb-6">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setError(null);
                  setIsLoading(true);
                  const formData = new FormData(event.currentTarget);
                  formData.set("flow", "email-verification");
                  void signIn("password", formData)
                    .then(() => router.push("/"))
                    .catch((err: any) =>
                      setError(err?.message || "Verification failed"),
                    )
                    .finally(() => setIsLoading(false));
                }}
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="code"
                    className="text-sm font-medium text-foreground"
                  >
                    Verification code
                  </label>
                  <input
                    id="code"
                    className="w-full bg-background text-foreground rounded-md px-3 py-2 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/40"
                    name="code"
                    placeholder="123456"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    disabled={isLoading}
                  />
                </div>
                <input
                  name="email"
                  value={(step as { email: string }).email}
                  type="hidden"
                  readOnly
                />
                <button
                  className="w-full inline-flex items-center justify-center rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying…" : "Continue"}
                </button>
                <button
                  className="w-full inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  type="button"
                  onClick={() => setStep("signIn")}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                {error && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400 rounded-md px-3 py-2">
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
