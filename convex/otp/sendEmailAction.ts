"use node";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import { VerificationCodeEmail } from "../templates/VerificationCodeEmail";

export const sendOtpEmail = internalAction({
  args: {
    email: v.string(),
    code: v.string(),
    expires: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const smtpUser = process.env.NODEMAILER_EMAIL;
    const smtpPass = process.env.NODEMAILER_PASSKEY;

    if (!smtpUser || !smtpPass) {
      throw new Error(
        "Nodemailer credentials missing. Set NODEMAILER_EMAIL and NODEMAILER_PASSKEY in Convex env.",
      );
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const html = await render(
      VerificationCodeEmail({
        code: args.code,
        expires: new Date(args.expires),
      }),
      { pretty: true },
    );

    await transporter.sendMail({
      from: smtpUser,
      to: args.email,
      subject: "Your verification code",
      html,
    });
    return null;
  },
});
