import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import bcrypt from "bcryptjs";

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

// Create user endpoint
http.route({
  path: "/create-user",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { email, password, name } = await request.json();

      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Email, password, and name are required",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Check if user already exists
      const existingUser = await ctx.runQuery(api.users.getByEmail, { email });

      if (existingUser) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "An account with this email already exists",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Create the user
      await ctx.runAction(api.users.createUserWithPassword, {
        email,
        password,
        name,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("Error creating user:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create account. Please try again.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

// Validate user endpoint
http.route({
  path: "/validate-user",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { email, password } = await request.json();

      if (!email || !password) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Email and password are required",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Get user by email
      const user = await ctx.runQuery(api.users.getByEmail, { email });

      if (!user) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "No account found with this email",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      if (!user.passwordHash) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Please set up your password first",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        return new Response(
          JSON.stringify({ success: false, error: "Incorrect password" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("Error validating user:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Something went wrong. Please try again.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

// Send OTP endpoint
http.route({
  path: "/send-otp",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { email } = await request.json();

      if (!email) {
        return new Response(
          JSON.stringify({ success: false, error: "Email is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Call the existing sendVerificationEmail mutation
      const result = await ctx.runMutation(api.users.sendVerificationEmail, {
        email,
      });

      if (result.success) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to send verification email",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    } catch (error: any) {
      console.error("Error sending OTP:", error);

      // Handle specific error messages
      let errorMessage = "Something went wrong. Please try again.";
      if (error.message?.includes("User not found")) {
        errorMessage =
          "Please sign up first before requesting verification code.";
      } else if (error.message?.includes("send failed")) {
        errorMessage = "Failed to send email. Please check your email address.";
      }

      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

export default http;


// It looks like your browser is making a cross-origin request to your Convex HTTP action at https://brainy-chinchilla-900.convex.site/validate-user, but your handlers don’t send any CORS headers and you don’t handle the preflight OPTIONS request. That’s why it works in tools like curl/Postman (no CORS) but fails in the browser. [[Common patterns](https://docs.convex.dev/functions/http-actions#common-patterns); [Debugging](https://docs.convex.dev/functions/http-actions#debugging)]

// Two options to fix this:

// Option A: Add CORS headers and an OPTIONS route manually
// - Add an OPTIONS route for each POST path that a browser will call, and echo the headers your frontend sends (e.g., Authorization, Content-Type).
// - Add Access-Control-Allow-Origin on the actual POST response, and Vary: origin.

// Example for /validate-user:

// ```ts
// import { httpRouter } from "convex/server";
// import { httpAction } from "./_generated/server";

// const http = httpRouter();

// // Preflight for /validate-user
// http.route({
//   path: "/validate-user",
//   method: "OPTIONS",
//   handler: httpAction(async (_, request) => {
//     const h = request.headers;
//     if (
//       h.get("Origin") !== null &&
//       h.get("Access-Control-Request-Method") !== null
//     ) {
//       // Include all headers your frontend will send, e.g. Authorization
//       const allowHeaders =
//         h.get("Access-Control-Request-Headers") ?? "Content-Type, Authorization";
//       return new Response(null, {
//         headers: new Headers({
//           "Access-Control-Allow-Origin": h.get("Origin")!, // or a specific origin
//           "Access-Control-Allow-Methods": "POST",
//           "Access-Control-Allow-Headers": allowHeaders,
//           "Access-Control-Max-Age": "86400",
//           Vary: "origin",
//         }),
//       });
//     }
//     return new Response();
//   }),
// });

// // Actual POST
// http.route({
//   path: "/validate-user",
//   method: "POST",
//   handler: httpAction(async (ctx, request) => {
//     // ... your existing logic ...
//     return new Response(JSON.stringify({ success: true }), {
//       status: 200,
//       headers: new Headers({
//         "Content-Type": "application/json",
//         "Access-Control-Allow-Origin": request.headers.get("Origin") ?? "*",
//         Vary: "origin",
//       }),
//     });
//   }),
// });

// export default http;
// ```

// Notes:
// - If your frontend sends Authorization, include it in Access-Control-Allow-Headers for the preflight, or simply echo Access-Control-Request-Headers as shown. A missing Authorization in preflight is a common reason POST is blocked. [[Discord CORS thread](https://discord.com/channels/1019350475847499849/1374693671982600334)]
// - If you use credentials (cookies), do not use "*" for Access-Control-Allow-Origin; specify your exact origin. [[Dev guide 4](https://stack.convex.dev/a-developers-guide-to-cors#4-implementing-cors-on-your-own)]

// Option B: Use convex-helpers CORS router
// This auto-generates the OPTIONS routes and headers for you.

// ```ts
// import { httpRouter } from "convex/server";
// import { httpAction } from "./_generated/server";
// import { corsRouter } from "convex-helpers/server/cors";

// const http = httpRouter();
// const cors = corsRouter(http, {
//   // specify your allowed origins; use "*" for testing (not for creds)
//   allowedOrigins: ["http://localhost:3000", "https://yourapp.com"],
//   // include headers your frontend will send
//   allowedHeaders: ["Content-Type", "Authorization"],
//   // optional: debug: true,
// });

// cors.route({
//   path: "/validate-user",
//   method: "POST",
//   handler: httpAction(async (ctx, request) => {
//     // ... your existing logic ...
//     return new Response(JSON.stringify({ success: true }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   }),
// });

// export default http;
// ```

// The helper will register the corresponding OPTIONS route and set correct headers. [[Using a library](https://stack.convex.dev/a-developers-guide-to-cors#5-using-a-library); [Discord OPTIONS thread](https://discord.com/channels/1019350475847499849/1406426223281705092)]

// Quick checks
// - Ensure you’re calling the .convex.site domain, not .convex.cloud. [[HTTP Actions](https://docs.convex.dev/functions/http-actions); [Debugging](https://docs.convex.dev/functions/http-actions#debugging)]
// - Verify preflight hits your endpoint (Network tab shows OPTIONS 200) and that Access-Control-Allow-Headers includes everything the browser asked for in Access-Control-Request-Headers. [[Common patterns](https://docs.convex.dev/functions/http-actions#common-patterns); [Discord CORS tip](https://discord.com/channels/1019350475847499849/1374693671982600334)]
// - If under active abuse, consider rate limiting or pausing the deployment as needed. [[Spam signup thread](https://discord.com/channels/1019350475847499849/1408531234685980763)]

// If you share the exact browser console error and the request/response headers of both the OPTIONS and POST from the Network tab, I can point out the specific header that’s missing.