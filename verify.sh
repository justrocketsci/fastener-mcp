#!/usr/bin/env bash
set -euo pipefail
npm run catalog:validate
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npm run test:geometry
npm run geometry:verify
npm run build
# Start `PUBLIC_ASSET_ORIGIN=http://localhost:3100 npm start -- -p 3100`
# separately, then run npm run test:client. CI starts/stops its own server.
