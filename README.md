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
