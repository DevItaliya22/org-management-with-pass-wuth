import { Email } from "@convex-dev/auth/providers/Email";
// Node-only libraries should not be imported in this file; we'll call an HTTP endpoint instead.

// Generate a numeric OTP code using Web Crypto when available, with a safe fallback.
function generateNumericCode(length: number): string {
  const digits: Array<string> = [];
  const useCrypto =
    typeof globalThis !== "undefined" &&
    !!globalThis.crypto &&
    !!globalThis.crypto.getRandomValues;
  if (useCrypto) {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      digits.push(String(bytes[i] % 10));
    }
  } else {
    for (let i = 0; i < length; i++) {
      digits.push(String(Math.floor(Math.random() * 10)));
    }
  }
  return digits.join("");
}

export const NodemailerOTP = Email({
  id: "nodemailer-otp",
  maxAge: 60 * 20,
  async generateVerificationToken() {
    return generateNumericCode(8);
  },
  async sendVerificationRequest({ identifier: email, token, expires }) {
    const res = await fetch(`${process.env.CONVEX_SITE_URL}/otp/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        code: token,
        expires: expires.toISOString(),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OTP send failed: ${body}`);
    }
  },
});
