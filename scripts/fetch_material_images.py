
import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = ROOT / "ai-service" / "data" / "materials.csv"
OUTPUT = ROOT / "data" / "material_image_candidates.json"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(DEFAULT_INPUT))
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()

    input_path = Path(args.input)

    if not input_path.exists():
        raise SystemExit(f"File tidak ditemukan: {input_path}")

    with input_path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        required = {"jenis_material", "kategori"}

        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise SystemExit(
                "Kolom CSV tidak sesuai. "
                f"Kolom ditemukan: {reader.fieldnames}"
            )

        materials = list(reader)

    # Hilangkan duplikat berdasarkan jenis dan kategori.
    unique_materials = {}
    for row in materials:
        name = (row.get("jenis_material") or "").strip()
        category = (row.get("kategori") or "").strip()

        if not name:
            continue

        key = (name.lower(), category.lower())
        unique_materials.setdefault(
            key,
            {
                "jenis_material": name,
                "kategori": category,
                "query": f"{name} {category}".strip(),
            },
        )

    items = list(unique_materials.values())[:max(0, args.limit)]
    
    import urllib.parse
    import urllib.request
    import urllib.error
    import time

    results = []

    for index, item in enumerate(items, start=1):
        
        search_terms = {
            "kayu": "scrap wood pieces",
            "elektronik": "electronic components waste",
            "kaca": "recycled glass pieces",
            "karet": "scrap rubber material",
            "kertas & kardus": "recycled cardboard paper",
            "lainnya": "recycled materials scraps",
            "logam": "scrap metal pieces",
            "organik": "organic waste compost material",
            "plastik": "recycled plastic scraps",
            "tekstil": "fabric textile scraps",
        }

        material_name = item["jenis_material"].lower()
        query = search_terms.get(material_name, material_name + " recycled material")

        params = urllib.parse.urlencode({
            "q": query,
            "page_size": 5,
        })
        url = f"https://api.openverse.org/v1/images/?{params}"

        print(f"[{index}/{len(items)}] Mencari: {query}")

        request = urllib.request.Request(
            url,
            headers={"User-Agent": "CIRCLO-Material-Catalog/1.0"},
        )

        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = json.loads(response.read().decode("utf-8"))

            candidates = []
            for image in payload.get("results", []):
                candidates.append({
                    "title": image.get("title"),
                    "url": image.get("url"),
                    "thumbnail": image.get("thumbnail"),
                    "source": image.get("foreign_landing_url"),
                    "creator": image.get("creator"),
                    "license": image.get("license"),
                    "license_version": image.get("license_version"),
                    "license_url": image.get("license_url"),
                })

            item["images"] = candidates
            print(f"    Ditemukan: {len(candidates)} kandidat")

        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            item["images"] = []
            item["error"] = str(error)
            print(f"    Gagal: {error}")

        results.append(item)
        time.sleep(1)

    OUTPUT.write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"\nSelesai. Hasil tersimpan di: {OUTPUT}")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(items, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Jumlah baris CSV: {len(materials)}")
    print(f"Material unik: {len(unique_materials)}")
    print(f"Disiapkan untuk pencarian: {len(items)}")
    print(f"File hasil: {OUTPUT}")


if __name__ == "__main__":
    main()
