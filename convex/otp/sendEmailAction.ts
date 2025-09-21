"use node";
import { internalAction, action } from "../_generated/server";
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

export const sendTeamInviteEmails = internalAction({
  args: {
    invitedEmail: v.string(),
    ownerEmails: v.array(v.string()),
    inviterEmail: v.string(),
    teamName: v.string(),
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

    const siteUrl = process.env.SITE_URL || "";
    const plainUrlText = siteUrl || "(set SITE_URL to your frontend URL)";

    const inviteeHtml = `
      <div style="font-family: Arial, sans-serif;">
        <h2>Team invitation to ${args.teamName}</h2>
        <p>${args.inviterEmail} invited you to join <strong>${args.teamName}</strong>.</p>
        <p>Please login here and accept your request:</p>
        <p>${plainUrlText}</p>
      </div>
    `;

    await transporter.sendMail({
      from: smtpUser,
      to: args.invitedEmail,
      subject: `Invitation to join ${args.teamName}`,
      html: inviteeHtml,
    });

    if (args.ownerEmails.length > 0) {
      const ownersHtml = `
        <div style="font-family: Arial, sans-serif;">
          <h3>Reseller admin sent an invitation</h3>
          <p><strong>Team:</strong> ${args.teamName}</p>
          <p><strong>Invited by:</strong> ${args.inviterEmail}</p>
          <p><strong>Invited email:</strong> ${args.invitedEmail}</p>
        </div>
      `;
      await transporter.sendMail({
        from: smtpUser,
        to: args.ownerEmails.join(","),
        subject: `New team invite for ${args.teamName}`,
        html: ownersHtml,
      });
    }

    return null;
  },
});
 
export const sendPromotionRequestEmail = internalAction({
  args: {
    ownerEmails: v.array(v.string()),
    requesterEmail: v.string(),
    teamName: v.string(),
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

    if (args.ownerEmails.length === 0) return null;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const siteUrl = process.env.SITE_URL || "";
    const ownersHtml = `
      <div style="font-family: Arial, sans-serif;">
        <h3>New admin promotion request</h3>
        <p><strong>Team:</strong> ${args.teamName}</p>
        <p><strong>Requested by:</strong> ${args.requesterEmail}</p>
        ${siteUrl ? `<p>Login: ${siteUrl}</p>` : ""}
      </div>
    `;

    await transporter.sendMail({
      from: smtpUser,
      to: args.ownerEmails.join(","),
      subject: `Admin promotion request for ${args.teamName}`,
      html: ownersHtml,
    });

    return null;
  },
});

export const sendStaffWelcomeEmail = internalAction({
  args: {
    email: v.string(),
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

    const siteUrl = process.env.SITE_URL || "";
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>Welcome to the team</h2>
        <p>Your staff account has been created.</p>
        ${siteUrl ? `<p>You can sign in here: <a href="${siteUrl}">${siteUrl}</a></p>` : ""}
        <p>If you did not expect this, please contact your administrator.</p>
      </div>
    `;

    await transporter.sendMail({
      from: smtpUser,
      to: args.email,
      subject: "Your staff account is ready",
      html,
    });

    return null;
  },
});

// Temporary testing function - sends random OTP to fixed email
export const sendTestOtp = action({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const smtpUser = process.env.NODEMAILER_EMAIL;
    const smtpPass = process.env.NODEMAILER_PASSKEY;

    if (!smtpUser || !smtpPass) {
      throw new Error(
        "Nodemailer credentials missing. Set NODEMAILER_EMAIL and NODEMAILER_PASSKEY in Convex env.",
      );
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const html = await render(
      VerificationCodeEmail({
        code,
        expires,
      }),
      { pretty: true },
    );

    await transporter.sendMail({
      from: smtpUser,
      to: "yashdangar123@gmail.com",
      subject: "Test OTP - Random Code",
      html,
    });

    console.log(`Test OTP sent to yashdangar123@gmail.com: ${code}`);
    return null;
  },
});