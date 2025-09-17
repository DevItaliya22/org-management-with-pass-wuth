#!/usr/bin/env bash
set -euo pipefail

# Clear all Convex tables by importing /dev/null
# Usage: ./cleardb.sh

# Ensure we're in the project root (where convex/schema.ts exists)
if [[ ! -f "convex/schema.ts" ]] || [[ ! -f "package.json" ]]; then
  echo "Error: Run this script from the project root containing convex/schema.ts and package.json" >&2
  exit 1
fi

# Static list of tables from convex/schema.ts (excluding authTables spread)
TABLES=(
adminPromotionRequests
auditLogs
authAccounts
authRateLimits
authRefreshTokens
authSessions
authVerificationCodes
authVerifiers
  users
  teams
  resellerMembers
  adminPromotionRequests
  teamInvitationRequests
  categories
  staff
  orders
  chats
  messages
  ratePresets
  payments
  disputes
  ccSummaries
  auditLogs
  costs
  files
)

echo "Found tables: ${TABLES[*]}"

# Run imports to replace each table's contents with empty
for table in "${TABLES[@]}"; do
  [[ -z "$table" ]] && continue
  echo "Clearing table: $table"
  npx convex import --table "$table" --replace -y --format jsonLines /dev/null
  echo "Cleared: $table"
  echo
done

echo "All done."
