import { Email } from "@convex-dev/auth/providers/Email";
import { alphabet, generateRandomString } from "oslo/crypto";
// Node-only libraries should not be imported in this file; we'll call an HTTP endpoint instead.

export const NodemailerOTP = Email({
  id: "nodemailer-otp",
  maxAge: 60 * 20,
  async generateVerificationToken() {
    return generateRandomString(8, alphabet("0-9"));
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
