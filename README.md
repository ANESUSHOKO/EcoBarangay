# Firebase Authentication Setup

EcoBarangay uses Firebase Authentication for password-based sign-in and password reset. Email verification is intentionally not required. Firestore is the authoritative server-side store; the server verifies Firebase ID tokens and owns profile access, while client-side Firestore access is disabled by `firestore.rules`.

1. In Firebase Console, enable **Authentication → Sign-in method → Email/Password** and add each development and production hostname under **Authentication → Settings → Authorized domains**.
2. Keep `firebase-applet-config.json` aligned with the Firebase project used by the app. It contains public web-client configuration, not server credentials.
3. Configure the server runtime with Application Default Credentials for that same Firebase project. For local development, set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON file stored outside the repository. On Netlify, set the `FIREBASE_SERVICE_ACCOUNT` secret described below. Never commit or expose service-account credentials.
4. Ensure the server has access to Firebase Authentication token verification and the configured Firestore database, then start the app with `npm run dev`.

Fresh and production-safe starts use empty operational collections; built-in demo data and `data/db.json` are not loaded automatically. For isolated local development only, `ECOBARANGAY_SEED_DEMO_DATA=true` opts into demo fixtures, and `ECOBARANGAY_IMPORT_LEGACY_DATA=true` opts into importing legacy JSON when Firestore collections are empty. Production runtimes ignore both settings. The authoritative PSGC location directory remains available. Existing Firestore contents are preserved; review and back up a database before connecting it.

The location selector and nearest-barangay lookup use the included official PSGC directory and remain available if Firebase Admin is not configured. Account registration, reports, and other operational data still require a working Firebase Admin connection; the health endpoint reports an API configuration error instead of presenting local or demo records as live data.

Users sign in immediately with their email and password; email verification is not required. Applicants can request Barangay Official access during registration; approval grants that account the **same platform-wide system-administrator capabilities**, including cross-barangay access. This is intentionally broad: approve only trusted officials. Both approved officials and configured system administrators use the single **Barangay Office** sign-in choice and can switch between barangay operations and platform administration. Shared passwords or PINs are not used. Password reset is completed through a Firebase email link. Legacy profiles migrate on the next successful password login: the server links the Firebase UID and removes the legacy password hash. Firestore data is loaded before the API starts; mutations are committed transactionally before success responses, and a revision check refreshes stale server caches or rejects a conflicting write instead of silently overwriting newer data.

To bootstrap the first system administrator without email verification, set `SYSTEM_ADMIN_EMAIL` in the server's secret environment configuration. For live Firebase, also set `SYSTEM_ADMIN_UID` to the exact UID shown for that account in Firebase Console > Authentication > Users; live administrator access requires both values to match, so email alone cannot claim the role. In the isolated local emulator, the configured email is sufficient because the demo project is loopback-only. The account must also have an EcoBarangay profile. The server does not provision or store passwords. Use a unique password and do not put credentials in source code or `.env.example`. Remove the configuration to revoke bootstrap access. Disable the Firebase account of any official who should no longer sign in; official-access revocation is not managed in the current UI.

### Local development without Google Cloud credentials

The local emulator profile uses a separate demo project ID and local Auth/Firestore emulators; it does not connect to the configured cloud Firebase project. Install a Java 21 runtime (for Apple Silicon, choose macOS/AArch64 from [Eclipse Temurin](https://adoptium.net/temurin/releases/)) and Node.js 22 LTS. From the repository root, start the app and emulators with:

```bash
SYSTEM_ADMIN_EMAIL="your-local-admin-email" npm run dev:emulator
```

The Firebase CLI and emulator binaries are downloaded on first run. The app is served at `http://localhost:3000`, and the local Emulator UI is at `http://127.0.0.1:4000`. Register and sign in directly with your email and a unique local password; the matching `SYSTEM_ADMIN_EMAIL` is automatically allowed to use the **Barangay Office** sign-in in the local emulator. Local emulator users and data are separate from production and are discarded when the emulator stops unless exported explicitly. Stop the combined app/emulator process with Ctrl-C.

### Local development with real Firebase

The web client uses the project in `firebase-applet-config.json` unless the emulator flag is enabled. To connect the local app to the real Firebase project:

1. In Firebase Console, enable **Authentication → Sign-in method → Email/Password** and ensure the configured named Firestore database exists. This also resolves Firebase's `auth/operation-not-allowed` error for password sign-in.
2. Create a Firebase service-account key for the same project and save it outside this repository. Do not commit the key or paste it into client code. Copy `.env.example` to `.env` and set `GOOGLE_APPLICATION_CREDENTIALS` to the key's absolute path. The server loads `.env` automatically; the Firebase Admin SDK uses the key for trusted Auth token verification and Firestore access.
3. From the repository root, run `npm run dev:firebase`, then open `http://localhost:3000`. This explicitly disables Auth emulators and enables production-safe data initialization: it will not import `data/db.json` or seed demo operational records into the real database. Existing Firestore data is retained. Writes made through this mode affect the real project.

Use the Firebase Emulator instructions above when you want isolated test accounts and data. Do not set emulator host variables when running `dev:firebase`. Local real-Firebase credentials, the Firebase project, and the production Netlify site must all refer to the same project.

## Operational workflows and release readiness

Environmental reports receive a tracking number, a status history, and a non-blocking possible-duplicate warning for matching open reports of the same category within 50 metres and seven days. Verified officials advance reports through review, assignment, work, resolution, or rejection; resolution requires a note or HTTPS evidence link. Residents can rate a resolution and request reopening. Recycling logs and passing segregation quizzes remain pending until official review; officials may award 0–50 points per activity with a required audit note. Verified recycling kilograms and points are credited once. Report awards are written to the activity log with their source and verifier. Household registration and event RSVPs do not award points.

Officials can create and edit collection schedules, including the day, time window, waste type, instructions, collection team, vehicle, and zones. Schedule edits are recorded with the editor and changed field names. The official results dashboard summarizes recorded report statuses and categories alongside barangay account/population totals; it does not fabricate historical trends. Residents can submit bulk pickup requests with optional compressed photo evidence; requests have tracking numbers and a history of scheduling, collection, missed pickups, completion, and cancellation. Operational transitions are validated server-side and generate barangay notifications.

AI photo and report assessments are suggestions only. The report-analysis tool sends the selected category and description to Gemini; residents should not include names, phone numbers, or other private details. Submission is not blocked by an AI suggestion or provider outage, photo uploads are type/signature checked and compressed before being stored, and authorized officials make final report decisions. AI requires `GEMINI_API_KEY`; missing configuration or provider failures are shown as unavailable rather than a successful analysis. The AI endpoints apply per-process request limits; production deployments with multiple server instances still need a shared rate limiter at the gateway or in a managed store. Chat context excludes resident name, role, and EcoPoints, and local schedule answers use the authenticated user's barangay schedule.

The current ranking is an informational score over recorded values, not a population-normalized or independently audited comparison. Its seven dimensions have a 100-point maximum: waste management (25), recycling (20), community participation (20), report resolution (15), cleanups (10), challenges (5), and education (5). Daily ranking snapshots are retained for 365 days for the top 100 recorded barangays; data completeness metadata, population normalization, and independent verification are not implemented. Missing or unverified indicators must not be interpreted as zero.

The map has an accessible list alternative for facilities, reports, and events. Facility map pins and resident-submitted report locations are not independently verified; users should confirm addresses before travel or field action.

Run `npm run lint`, `npm test`, and `npm run build` before deployment; the GitHub Actions workflow runs these on pushes and pull requests to `main`. `npm test` covers report status transitions, duplicate-detection boundaries, and ranking snapshot retention, but is not a substitute for Firebase Emulator integration tests. Before a barangay pilot, configure the emulator or Firebase project, verify authorization and multi-instance write behavior, schedule and restore Firestore backups, test recovery and notification delivery, run mobile/accessibility/usability checks, and train operational staff. Automated backups, restoration tooling, broad integration/security suites, ranking data-completeness metadata, AI evaluation against labeled reports, population normalization, and a controlled pilot remain deployment work; do not use real resident data until these checks are complete.

## Deploying the live site to Netlify

Netlify serves the built React app and routes `/api/*` to the Express API running as a Netlify Function. The emulator configuration is local-only; production requires the existing Firebase project and its named Firestore database. Do not deploy until the project owner has reviewed the Firebase project and database contents, enabled Firebase Authentication Email/Password, and arranged automated Firestore backups.

1. Connect the GitHub repository to Netlify, set the production branch to `main`, and keep the build command and publish directory from `netlify.toml` (`npm run build`, `dist`). `package-lock.json` is committed so Netlify and CI install reproducibly with `npm ci`.
2. In Netlify **Site configuration → Environment variables**, add `FIREBASE_SERVICE_ACCOUNT` as a secret containing the Firebase service-account JSON for the same project in `firebase-applet-config.json`. Grant that account only the Firestore access required by the app. Do not use a client API key as an Admin credential, upload the JSON file to the repository, or expose this value to the browser. The server validates the credential's project ID and uses the configured named Firestore database.
3. Set `SYSTEM_ADMIN_EMAIL` to the intended administrator's exact email before the first registration. Deploy and register that email in EcoBarangay using a unique password. In Firebase Console, copy that account's UID from Authentication > Users, set `SYSTEM_ADMIN_UID` in Netlify to that exact value, and trigger a new deploy. Then sign out and sign in again through **Barangay Office**. Until both values match, the account remains a resident; email alone does not grant administrator access.
4. Optionally add `GEMINI_API_KEY` to enable the AI photo and report suggestions and assistant. AI features remain unavailable without it; reporting, schedules, and account functions do not require the Gemini key. The current AI request throttle is per function instance, not shared across Netlify instances; configure platform rate limits and provider spending alerts before enabling AI for public traffic.
5. Add the Netlify production domain to Firebase Authentication's **Authorized domains**, set that domain as the site's primary domain, and verify that password reset links return to it. Confirm the Firestore Security Rules for the configured named database are the deny-all rules in `firestore.rules`. Never set `FIRESTORE_EMULATOR_HOST` or `FIREBASE_AUTH_EMULATOR_HOST` in Netlify.
6. On the first deployment, a fresh Firestore database is initialized without local demo reports, schedules, accounts, or scores. Users can register, submit reports, and authorized officials can create schedules and announcements. Approved Barangay Officials also receive platform-wide administration access. The official PSGC location dataset remains available. Existing Firestore contents are preserved; inspect and back up a database before connecting it rather than assuming it is empty.
7. After deployment, verify `/api/health`, registration/sign-in, password reset, report submission, official approval, schedule changes, and Firestore persistence using designated test accounts before inviting residents. Review Netlify function logs and Firebase Authentication/Firestore usage and configure billing limits/alerts appropriate for the pilot.

Set Netlify's environment variables for the **Functions** runtime, not only the build process. Keep production credentials and all real resident data out of preview deploys and pull-request builds. This repository configures deployment, but does not create the Firebase project, issue production credentials, enable billing, configure backups, or deploy the site automatically.

# EcoBarangay Pilipinas - Philippine Administrative Location Dataset

## Official Dataset Provenance
This application uses the official Philippine Standard Geographic Code (PSGC) and administrative boundary dataset from **BetterGov Philippines**:
- **Dataset Source**: [https://data.bettergov.ph/datasets/23](https://data.bettergov.ph/datasets/23)
- **Upstream Repository**: [https://github.com/bendlikeabamboo/barangay-boundaries-repository](https://github.com/bendlikeabamboo/barangay-boundaries-repository)
- **Official Releases**: PSGC Snapshot & NAMRIA Boundary Datasets (`v2026.4.13.0`)
- **Authority**: Philippine Statistics Authority (PSA) / National Mapping and Resource Information Authority (NAMRIA)

## Administrative Structure Hierarchy
The dataset represents the official 4-tier hierarchy:
```
Region (17) 
  ↳ Province (82) or Independent City / Highly Urbanized City (40)
       ↳ City / Municipality (1,635)
            ↳ Barangay (42,026)
```

### Special Administrative Cases Handled:
1. **National Capital Region (NCR)**: Does not have traditional provinces. Composed of 16 Highly Urbanized Cities and 1 Municipality (Pateros).
2. **Highly Urbanized Cities (HUC) & Independent Component Cities (ICC)**: Administratively and politically independent from their geographical provinces (e.g., Cebu City, Davao City, Angeles City, Baguio City). These are included directly in the Province/Independent City selector so citizens can immediately select their independent city without confusion.
3. **Parent-Child Relationships**: Selecting a Region dynamically filters to its corresponding Provinces/Independent Cities. Selecting a Province filters to its corresponding Municipalities/Component Cities. Selecting a Municipality/City lists all official barangays.

## Stored Dataset Files (`data/psgc/`):
- `regions.json`: 17 official Philippine administrative regions.
- `provinces.json`: 82 geographical provinces.
- `provinces_and_independent_cities.json`: 122 provinces and independent cities (HUC/ICC) with `isIndependentCity: true`.
- `cities.json`: 1,635 cities and municipalities with metadata (`type`: `HUC`, `ICC`, `COMPONENT_CITY`, `MUNICIPALITY`).
- `barangays_by_city.json`: Indexed dictionary mapping each city code to its sorted array of barangays with centroids (`lat`, `lng`) and PSGC codes.
- `all_barangays_index.json`: Flat index for search and nearest-match geolocation.
- `metadata.json`: Dataset metadata, timestamp, and entity counts.

## How to Update the Dataset
When BetterGov Philippines publishes a new dataset revision or PSGC quarter update:
1. Run the preprocessing import script:
   ```bash
   python3 scripts/import_bettergov_locations.py
   ```
2. The script downloads the latest GeoJSON boundary resources from BetterGov release endpoints, computes centroids, extracts PSGC codes, and regenerates the indexed JSON files in `data/psgc/`.
3. Restart the server (`npm run dev`) to reload the updated PSGC in-memory structures.
