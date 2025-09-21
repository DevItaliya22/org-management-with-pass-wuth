import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/otp/send",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const { email, code, expires } = (await req.json()) as {
        email: string;
        code: string;
        expires: string;
      };

      await ctx.runAction(internal.otp.sendEmailAction.sendOtpEmail, {
        email,
        code,
        expires,
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({ ok: false, error: err?.message || "send failed" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  }),
});

// Temporary testing endpoint - sends random OTP to fixed email
http.route({
  path: "/otp/test-send",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      await ctx.runAction(api.otp.sendEmailAction.sendTestOtp, {});

      return new Response(JSON.stringify({ ok: true, message: "Test OTP sent to yashdangar123@gmail.com" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({ ok: false, error: err?.message || "test send failed" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  }),
});

export default http;
