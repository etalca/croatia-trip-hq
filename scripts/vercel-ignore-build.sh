#!/usr/bin/env bash
set -euo pipefail

# Vercel's Ignored Build Step convention:
#   exit 0 => cancel/skip this deployment
#   exit 1 => continue building/deploying
#
# Now that the real trip link is public, production must not update from a normal
# push to main. Production should only change when Tanner explicitly approves
# promoting a verified staging/preview deployment.
if [[ "${VERCEL_ENV:-}" == "production" && "${VERCEL_GIT_COMMIT_REF:-}" == "main" ]]; then
  echo "Skipping automatic production build from main. Verify staging first, then promote intentionally."
  exit 0
fi

# Let staging, feature previews, and explicitly approved non-main production flows continue.
exit 1
