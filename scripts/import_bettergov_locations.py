#!/usr/bin/env python3
"""
BetterGov Philippine Administrative Locations Importer
Source: BetterGov Dataset #23 (https://data.bettergov.ph/datasets/23)
Author/Curator: Manuel Balmeo & Philippine Statistics Authority (PSA) / NAMRIA
Release: v2026.4.13.0 (PSGC Snapshot 2023-10-24)

This script downloads and preprocesses the official Philippine Standard Geographic Code (PSGC)
hierarchical boundaries into clean, indexed persistent JSON files for the EcoBarangay application.
"""

import urllib.request
import json
import os
import sys
import time

BASE_URL = "https://github.com/bendlikeabamboo/barangay-boundaries-repository/releases/download/v2026.4.13.0"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "psgc")

FILES = {
    "regions": "regions.geojson",
    "provinces": "provinces.geojson",
    "highly_urbanized_cities": "highly_urbanized_cities.geojson",
    "independent_component_cities": "independent_component_cities.geojson",
    "component_cities": "component_cities.geojson",
    "municipalities": "municipalities.geojson",
    "barangays": "barangays.geojson",
}

def fetch_geojson(filename):
    url = f"{BASE_URL}/{filename}"
    print(f"Fetching {filename} from {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "EcoBarangay/1.0 (PSGC Importer)"})
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode("utf-8")
        data = json.loads(content)
        print(f"  ✓ {filename}: {len(data['features'])} features loaded")
        return data["features"]

def calculate_centroid(geometry):
    if not geometry or not geometry.get("coordinates"):
        return 14.5995, 120.9842 # Default Manila coordinates fallback
    
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")
    
    ring = []
    if gtype == "Polygon" and coords and len(coords) > 0:
        ring = coords[0]
    elif gtype == "MultiPolygon" and coords and len(coords) > 0 and len(coords[0]) > 0:
        ring = coords[0][0]
    
    if ring and len(ring) > 0:
        lng_sum = sum(p[0] for p in ring)
        lat_sum = sum(p[1] for p in ring)
        return round(lat_sum / len(ring), 6), round(lng_sum / len(ring), 6)
    
    return 14.5995, 120.9842

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    start_time = time.time()
    print("Starting Philippine administrative location dataset import...")

    # 1. Regions
    raw_regions = fetch_geojson(FILES["regions"])
    regions = []
    for f in raw_regions:
        p = f["properties"]
        regions.append({
            "code": p.get("ADM1_PCODE") or p.get("psgc_id"),
            "psgcCode": p.get("psgc_code") or "",
            "name": p.get("ADM1_EN") or p.get("psgc_name"),
            "altName": p.get("ADM1ALT1EN") or "",
        })
    # Sort regions naturally
    regions.sort(key=lambda r: r["name"])

    # 2. Provinces
    raw_provinces = fetch_geojson(FILES["provinces"])
    provinces = []
    for f in raw_provinces:
        p = f["properties"]
        provinces.append({
            "code": p.get("ADM2_PCODE") or p.get("psgc_id"),
            "psgcCode": p.get("psgc_code") or "",
            "name": p.get("ADM2_EN") or p.get("psgc_name"),
            "regionCode": p.get("ADM1_PCODE"),
            "regionName": p.get("ADM1_EN"),
            "isIndependentCity": False
        })
    provinces.sort(key=lambda p: p["name"])

    # 3. Cities and Municipalities
    # We collect:
    # - Highly Urbanized Cities (HUC)
    # - Independent Component Cities (ICC)
    # - Component Cities (CC)
    # - Municipalities
    raw_huc = fetch_geojson(FILES["highly_urbanized_cities"])
    raw_icc = fetch_geojson(FILES["independent_component_cities"])
    raw_cc = fetch_geojson(FILES["component_cities"])
    raw_mun = fetch_geojson(FILES["municipalities"])

    cities = []

    # Process HUCs (Independent from provinces)
    for f in raw_huc:
        p = f["properties"]
        code = p.get("ADM3_PCODE") or p.get("psgc_id")
        name = p.get("ADM3_EN") or p.get("psgc_name")
        region_code = p.get("ADM1_PCODE")
        region_name = p.get("ADM1_EN")
        # Province code for HUC is either empty or its own code
        cities.append({
            "code": code,
            "psgcCode": p.get("psgc_code") or "",
            "name": name,
            "type": "HUC",
            "isIndependent": True,
            "isNCR": (region_code == "PH13"),
            "provinceCode": p.get("ADM2_PCODE") or code,
            "provinceName": p.get("ADM2_EN") or name,
            "regionCode": region_code,
            "regionName": region_name,
        })

    # Process ICCs (Independent Component Cities)
    for f in raw_icc:
        p = f["properties"]
        code = p.get("ADM3_PCODE") or p.get("psgc_id") or p.get("ADM2_PCODE")
        name = p.get("ADM3_EN") or p.get("psgc_name") or p.get("ADM2_EN")
        region_code = p.get("ADM1_PCODE")
        region_name = p.get("ADM1_EN")
        cities.append({
            "code": code,
            "psgcCode": p.get("psgc_code") or "",
            "name": name,
            "type": "ICC",
            "isIndependent": True,
            "isNCR": False,
            "provinceCode": p.get("ADM2_PCODE") or code,
            "provinceName": p.get("ADM2_EN") or name,
            "regionCode": region_code,
            "regionName": region_name,
        })

    # Process Component Cities
    for f in raw_cc:
        p = f["properties"]
        cities.append({
            "code": p.get("ADM3_PCODE") or p.get("psgc_id"),
            "psgcCode": p.get("psgc_code") or "",
            "name": p.get("ADM3_EN") or p.get("psgc_name"),
            "type": "COMPONENT_CITY",
            "isIndependent": False,
            "isNCR": False,
            "provinceCode": p.get("ADM2_PCODE"),
            "provinceName": p.get("ADM2_EN"),
            "regionCode": p.get("ADM1_PCODE"),
            "regionName": p.get("ADM1_EN"),
        })

    # Process Municipalities
    for f in raw_mun:
        p = f["properties"]
        region_code = p.get("ADM1_PCODE")
        cities.append({
            "code": p.get("ADM3_PCODE") or p.get("psgc_id"),
            "psgcCode": p.get("psgc_code") or "",
            "name": p.get("ADM3_EN") or p.get("psgc_name"),
            "type": "MUNICIPALITY",
            "isIndependent": False,
            "isNCR": (region_code == "PH13"),
            "provinceCode": p.get("ADM2_PCODE"),
            "provinceName": p.get("ADM2_EN"),
            "regionCode": region_code,
            "regionName": p.get("ADM1_EN"),
        })

    # Deduplicate cities by code
    unique_cities = {}
    for c in cities:
        unique_cities[c["code"]] = c
    cities_list = list(unique_cities.values())
    cities_list.sort(key=lambda c: c["name"])

    # 4. Also add Independent Cities (HUCs / ICCs) to the "Provinces / Independent Cities" list
    # so that selecting a Region shows Provinces AND Independent Cities (e.g. Angeles, Cebu City, Davao City, all NCR cities)
    province_or_independent_list = list(provinces)
    existing_prov_codes = {p["code"] for p in province_or_independent_list}

    for c in cities_list:
        if c.get("isIndependent") and c["code"] not in existing_prov_codes:
            province_or_independent_list.append({
                "code": c["code"],
                "psgcCode": c["psgcCode"],
                "name": c["name"],
                "regionCode": c["regionCode"],
                "regionName": c["regionName"],
                "isIndependentCity": True
            })
    province_or_independent_list.sort(key=lambda p: p["name"])

    # 5. Barangays
    raw_barangays = fetch_geojson(FILES["barangays"])
    barangays_by_city = {}
    all_barangays_summary = []

    city_code_lookup = {c["code"]: c for c in cities_list}

    for f in raw_barangays:
        p = f["properties"]
        geom = f.get("geometry")
        lat, lng = calculate_centroid(geom)

        b_id = p.get("ADM4_PCODE") or p.get("psgc_id") or p.get("psgc_code")
        b_name = p.get("ADM4_EN") or p.get("psgc_name") or "Barangay"
        city_code = p.get("ADM3_PCODE")
        city_name = p.get("ADM3_EN")
        prov_code = p.get("ADM2_PCODE")
        prov_name = p.get("ADM2_EN")
        reg_code = p.get("ADM1_PCODE")
        reg_name = p.get("ADM1_EN")
        psgc = p.get("psgc_code") or ""

        # Normalize city details from lookup if missing
        if city_code in city_code_lookup:
            matched_city = city_code_lookup[city_code]
            if not prov_code: prov_code = matched_city["provinceCode"]
            if not prov_name: prov_name = matched_city["provinceName"]
            if not reg_code: reg_code = matched_city["regionCode"]
            if not reg_name: reg_name = matched_city["regionName"]

        b_record = {
            "id": b_id,
            "psgcCode": psgc,
            "name": b_name,
            "cityCode": city_code,
            "cityName": city_name,
            "provinceCode": prov_code,
            "provinceName": prov_name,
            "regionCode": reg_code,
            "regionName": reg_name,
            "lat": lat,
            "lng": lng,
        }

        if city_code not in barangays_by_city:
            barangays_by_city[city_code] = []
        barangays_by_city[city_code].append(b_record)

        all_barangays_summary.append({
            "id": b_id,
            "name": b_name,
            "cityCode": city_code,
            "cityName": city_name,
            "provinceCode": prov_code,
            "provinceName": prov_name,
            "regionCode": reg_code,
            "psgcCode": psgc,
            "lat": lat,
            "lng": lng,
        })

    # Sort barangays within each city alphabetically
    for c_code in barangays_by_city:
        barangays_by_city[c_code].sort(key=lambda b: b["name"])

    # 6. Save data files
    print("Saving processed administrative location datasets to data/psgc/...")

    with open(os.path.join(OUTPUT_DIR, "regions.json"), "w", encoding="utf-8") as f:
        json.dump(regions, f, indent=2, ensure_ascii=False)

    with open(os.path.join(OUTPUT_DIR, "provinces.json"), "w", encoding="utf-8") as f:
        json.dump(provinces, f, indent=2, ensure_ascii=False)

    with open(os.path.join(OUTPUT_DIR, "provinces_and_independent_cities.json"), "w", encoding="utf-8") as f:
        json.dump(province_or_independent_list, f, indent=2, ensure_ascii=False)

    with open(os.path.join(OUTPUT_DIR, "cities.json"), "w", encoding="utf-8") as f:
        json.dump(cities_list, f, indent=2, ensure_ascii=False)

    with open(os.path.join(OUTPUT_DIR, "barangays_by_city.json"), "w", encoding="utf-8") as f:
        json.dump(barangays_by_city, f, ensure_ascii=False)

    with open(os.path.join(OUTPUT_DIR, "all_barangays_index.json"), "w", encoding="utf-8") as f:
        json.dump(all_barangays_summary, f, ensure_ascii=False)

    # Metadata for provenance and updating
    metadata = {
        "dataset_name": "Philippine Administrative Location Boundaries & PSGC Directory",
        "source": "https://data.bettergov.ph/datasets/23",
        "repository": "https://github.com/bendlikeabamboo/barangay-boundaries-repository",
        "release_tag": "v2026.4.13.0",
        "psgc_snapshot": "2023-10-24",
        "namria_version": "2023-11-06",
        "imported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "counts": {
            "regions": len(regions),
            "provinces": len(provinces),
            "provinces_and_independent_cities": len(province_or_independent_list),
            "cities_and_municipalities": len(cities_list),
            "barangays": len(all_barangays_summary),
        },
        "update_instructions": "To update this dataset when BetterGov releases a new version, run `python3 scripts/import_bettergov_locations.py`."
    }

    with open(os.path.join(OUTPUT_DIR, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    elapsed = round(time.time() - start_time, 2)
    print(f"\n✅ SUCCESS! Preprocessed official BetterGov dataset in {elapsed}s:")
    print(f"   • Regions: {len(regions)}")
    print(f"   • Provinces: {len(provinces)}")
    print(f"   • Provinces & Independent Cities: {len(province_or_independent_list)}")
    print(f"   • Cities & Municipalities: {len(cities_list)}")
    print(f"   • Barangays: {len(all_barangays_summary)}")
    print(f"   • Files written to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
