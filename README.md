# Firebase Authentication Setup

EcoBarangay uses Firebase Authentication for resident sign-in, email verification, and password reset. Firestore is the authoritative server-side store; the server verifies Firebase ID tokens and owns profile access, while client-side Firestore access is disabled by `firestore.rules`.

1. In Firebase Console, enable **Authentication → Sign-in method → Email/Password** and add each development and production hostname under **Authentication → Settings → Authorized domains**.
2. Keep `firebase-applet-config.json` aligned with the Firebase project used by the app. It contains public web-client configuration, not server credentials.
3. Configure the server runtime with Application Default Credentials for that same Firebase project. For local development, set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON file stored outside the repository. In production, use the hosting platform's workload identity or secret manager. Never commit or expose service-account credentials.
4. Ensure the server has access to Firebase Authentication token verification and the Firestore resources it uses, then start the app with `npm run dev`.

On the first server start without the `_metadata/appState` marker, existing Firestore collections take precedence; collections that are empty are imported from `data/db.json`, or seeded from the built-in dataset when no legacy data exists. The local JSON file is not written after this one-time migration. Keep a backup of the file until the initial Firestore load has completed.

New registrations are resident accounts and remain signed out until the user verifies the Firebase email link. Password reset is also completed through a Firebase email link. Legacy profiles migrate on the next successful password login: the user verifies their Firebase account, signs in again, and the server links the Firebase UID while removing the legacy password hash. Firestore data is loaded before the API starts; mutations are committed transactionally before success responses, and a revision check refreshes stale server caches or rejects a conflicting write instead of silently overwriting newer data. Privileged roles must be provisioned by an administrator.

## Operational workflows and release readiness

Environmental reports receive a tracking number, a status history, and a non-blocking possible-duplicate warning for matching open reports of the same category within 50 metres and seven days. Verified officials advance reports through review, assignment, work, resolution, or rejection; resolution requires a note or HTTPS evidence link. Residents can rate a resolution and request reopening. Recycling logs and passing segregation quizzes remain pending until official review; officials may award 0–50 points per activity with a required audit note. Verified recycling kilograms and points are credited once. Report awards are written to the activity log with their source and verifier. Household registration and event RSVPs do not award points.

Officials can create schedules and assign a collection team, vehicle, and zones. Schedule edits are recorded with the editor and changed field names. Residents can submit bulk pickup requests with optional compressed photo evidence; requests have tracking numbers and a history of scheduling, collection, missed pickups, completion, and cancellation. Operational transitions are validated server-side and generate barangay notifications.

AI photo assessments are suggestions only. Submission is not blocked by an AI rejection, photo uploads are type/signature checked and compressed before being stored, and verified officials can confirm, reject, or correct a suggestion. The AI endpoints apply per-process request limits; production deployments with multiple server instances still need a shared rate limiter at the gateway or in a managed store. Chat context excludes resident name, role, and EcoPoints, and local schedule answers use the authenticated user's barangay schedule; residents should avoid entering unnecessary personal information in AI prompts.

The current ranking is an informational score over recorded values, not a population-normalized or independently audited comparison. Missing or unverified indicators must not be interpreted as zero. Historical ranking snapshots and coverage metadata are not yet implemented.

Run `npm run lint`, `npm test`, and `npm run build` before deployment. `npm test` covers report status transitions and duplicate-detection boundaries, but is not a substitute for Firebase Emulator integration tests. Before a barangay pilot, configure the emulator or Firebase project, verify authorization and multi-instance write behavior, schedule and restore Firestore backups, test recovery and notification delivery, run mobile/accessibility/usability checks, and train operational staff. Automated backups, restoration tooling, broad integration/security suites, ranking history, AI evaluation against labeled reports, and a controlled pilot remain deployment work; do not use real resident data until these checks are complete.

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
