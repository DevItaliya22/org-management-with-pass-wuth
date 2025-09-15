"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Image from "next/image";

export function SessionInfo() {
  const sessionData = useQuery(api.session.getCurrentUserSession);

  if (sessionData === undefined) {
    return (
      <div className="mx-auto">
        <p>Loading session data...</p>
      </div>
    );
  }

  if (sessionData === null) {
    return (
      <div className="mx-auto">
        <p>Not authenticated</p>
      </div>
    );
  }

  const { user, resellerMember, team } = sessionData;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-center">Session Information</h2>

      {/* User Info */}
      <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">👤 User Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div>
            <strong>Name:</strong> {user.name || "Not set"}
          </div>
          <div>
            <strong>Email:</strong> {user.email || "Not set"}
          </div>
          <div>
            <strong>Role:</strong> {user.role || "Not set"}
          </div>
          <div>
            <strong>User ID:</strong>{" "}
            <code className="text-xs">{user._id}</code>
          </div>
          <div>
            <strong>Created:</strong>{" "}
            {new Date(user._creationTime).toLocaleDateString()}
          </div>
          {user.emailVerificationTime && (
            <div>
              <strong>Email Verified:</strong>{" "}
              {new Date(user.emailVerificationTime).toLocaleDateString()}
            </div>
          )}
        </div>
        {user.image && (
          <div className="mt-3">
            <Image
              src={user.image}
              alt="Profile"
              width={64}
              height={64}
              className="rounded-full"
            />
          </div>
        )}
      </div>

      {/* Reseller Member Info */}
      <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">
          🏢 Reseller Member Information
        </h3>
        {resellerMember ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <strong>Role:</strong> {resellerMember.role}
            </div>
            <div>
              <strong>Status:</strong>
              <span
                className={`ml-1 px-2 py-1 rounded text-xs ${
                  resellerMember.status === "active_member"
                    ? "bg-green-200 text-green-800"
                    : resellerMember.status === "default_member"
                      ? "bg-blue-200 text-blue-800"
                      : resellerMember.status === "pending_invitation"
                        ? "bg-yellow-200 text-yellow-800"
                        : "bg-red-200 text-red-800"
                }`}
              >
                {resellerMember.status}
              </span>
            </div>
            <div>
              <strong>Active:</strong>{" "}
              {resellerMember.isActive ? "✅ Yes" : "❌ No"}
            </div>
            <div>
              <strong>Blocked:</strong>{" "}
              {resellerMember.isBlocked ? "❌ Yes" : "✅ No"}
            </div>
            <div>
              <strong>Member ID:</strong>{" "}
              <code className="text-xs">{resellerMember._id}</code>
            </div>
            <div>
              <strong>Joined:</strong>{" "}
              {new Date(resellerMember.createdAt).toLocaleDateString()}
            </div>
            {resellerMember.approvedAt && (
              <div>
                <strong>Approved:</strong>{" "}
                {new Date(resellerMember.approvedAt).toLocaleDateString()}
              </div>
            )}
            {resellerMember.approvedByUserId && (
              <div>
                <strong>Approved By:</strong>{" "}
                <code className="text-xs">
                  {resellerMember.approvedByUserId}
                </code>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No reseller member data found</p>
        )}
      </div>

      {/* Team Info */}
      <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">👥 Team Information</h3>
        {team ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <strong>Team Name:</strong> {team.name}
            </div>
            <div>
              <strong>Slug:</strong>{" "}
              <code className="text-xs">{team.slug}</code>
            </div>
            <div>
              <strong>Team ID:</strong>{" "}
              <code className="text-xs">{team._id}</code>
            </div>
            <div>
              <strong>Created:</strong>{" "}
              {new Date(team.createdAt).toLocaleDateString()}
            </div>
            <div>
              <strong>Last Updated:</strong>{" "}
              {new Date(team.updatedAt).toLocaleDateString()}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No team data found</p>
        )}
      </div>
    </div>
  );
}
