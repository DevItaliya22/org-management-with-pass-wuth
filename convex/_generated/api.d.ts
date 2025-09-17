/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as access from "../access.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as cron from "../cron.js";
import type * as http from "../http.js";
import type * as lib_teamNames from "../lib/teamNames.js";
import type * as orders from "../orders.js";
import type * as otp_NodemailerOTP from "../otp/NodemailerOTP.js";
import type * as otp_sendEmailAction from "../otp/sendEmailAction.js";
import type * as session from "../session.js";
import type * as staff from "../staff.js";
import type * as teams from "../teams.js";
import type * as templates_VerificationCodeEmail from "../templates/VerificationCodeEmail.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  access: typeof access;
  auth: typeof auth;
  chat: typeof chat;
  cron: typeof cron;
  http: typeof http;
  "lib/teamNames": typeof lib_teamNames;
  orders: typeof orders;
  "otp/NodemailerOTP": typeof otp_NodemailerOTP;
  "otp/sendEmailAction": typeof otp_sendEmailAction;
  session: typeof session;
  staff: typeof staff;
  teams: typeof teams;
  "templates/VerificationCodeEmail": typeof templates_VerificationCodeEmail;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
