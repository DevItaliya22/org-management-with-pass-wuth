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

  return step === "signIn" || step === "signUp" ? (
    <div className="flex flex-col gap-8 w-96 mx-auto h-screen justify-center items-center">
      <p>Log in to see the numbers</p>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          formData.set("flow", step);
          void signIn("password", formData)
            .then(() => setStep({ email: formData.get("email") as string }))
            .catch((err: any) => {
              // If backend returns verification-needed as an error, advance to code step
              if (err && /verify|code|otp/i.test(err.message || "")) {
                setStep({ email: formData.get("email") as string });
                setError(null);
              } else {
                setError(err?.message || "Sign in failed");
              }
            });
        }}
      >
        <button
          className="text-foreground underline hover:no-underline cursor-pointer"
          type="button"
          onClick={() => signIn("google")}
        >
          Sign in with Google
        </button>
        <br />
        <input
          className="bg-background text-foreground rounded-md p-2 border-2 border-slate-200 dark:border-slate-800"
          name="email"
          placeholder="Email"
          type="email"
          required
        />
        <input
          className="bg-background text-foreground rounded-md p-2 border-2 border-slate-200 dark:border-slate-800"
          name="password"
          placeholder="Password"
          type="password"
          required
        />
        <input name="flow" value={step} type="hidden" readOnly />
        <button
          className="bg-foreground text-background rounded-md"
          type="submit"
        >
          {step === "signIn" ? "Sign in" : "Sign up"}
        </button>
        <div className="flex flex-row gap-2">
          <span>
            {step === "signIn"
              ? "Don't have an account?"
              : "Already have an account?"}
          </span>
          <span
            className="text-foreground underline hover:no-underline cursor-pointer"
            onClick={() => setStep(step === "signIn" ? "signUp" : "signIn")}
          >
            {step === "signIn" ? "Sign up instead" : "Sign in instead"}
          </span>
        </div>
        {error && (
          <div className="bg-red-500/20 border-2 border-red-500/50 rounded-md p-2">
            <p className="text-foreground font-mono text-xs">Error: {error}</p>
          </div>
        )}
      </form>
    </div>
  ) : (
    <div className="flex flex-col gap-8 w-96 mx-auto h-screen justify-center items-center">
      <p>Enter the verification code sent to your email</p>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          formData.set("flow", "email-verification");
          void signIn("password", formData)
            .then(() => router.push("/"))
            .catch((err: any) =>
              setError(err?.message || "Verification failed"),
            );
        }}
      >
        <input
          className="bg-background text-foreground rounded-md p-2 border-2 border-slate-200 dark:border-slate-800"
          name="code"
          placeholder="Code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required
        />
        <input name="email" value={step.email} type="hidden" readOnly />
        <button
          className="bg-foreground text-background rounded-md"
          type="submit"
        >
          Continue
        </button>
        <button
          className="text-foreground underline hover:no-underline cursor-pointer"
          type="button"
          onClick={() => setStep("signIn")}
        >
          Cancel
        </button>
        {error && (
          <div className="bg-red-500/20 border-2 border-red-500/50 rounded-md p-2">
            <p className="text-foreground font-mono text-xs">Error: {error}</p>
          </div>
        )}
      </form>
    </div>
  );
}
