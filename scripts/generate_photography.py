from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import time
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageFile, ImageOps

ImageFile.LOAD_TRUNCATED_IMAGES = True

US_STATE_CODES = {
    "Florida": "FL",
    "Colorado": "CO",
}

DERIVED_KEYWORDS = (
    "convert to 720",
    "thumb",
    "dji album",
    "denoiseai",
    "thumbnail",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", default=r"E:\Drone")
    parser.add_argument("--output-root", default=r".\assets\photography")
    parser.add_argument("--display-height", type=int, default=720)
    parser.add_argument("--thumb-height", type=int, default=360)
    parser.add_argument("--display-quality", type=int, default=82)
    parser.add_argument("--thumb-quality", type=int, default=72)
    parser.add_argument("--location-precision", type=int, default=2)
    parser.add_argument("--limit", type=int)
    return parser.parse_args()


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "item"


def gps_to_deg(gps_ifd: dict | None) -> tuple[float, float] | None:
    if not gps_ifd:
        return None

    lat = gps_ifd.get(2)
    lat_ref = gps_ifd.get(1)
    lon = gps_ifd.get(4)
    lon_ref = gps_ifd.get(3)

    if not lat or not lon or not lat_ref or not lon_ref:
        return None

    lat_deg = float(lat[0]) + float(lat[1]) / 60 + float(lat[2]) / 3600
    lon_deg = float(lon[0]) + float(lon[1]) / 60 + float(lon[2]) / 3600

    if lat_ref == "S":
        lat_deg *= -1
    if lon_ref == "W":
        lon_deg *= -1

    return lat_deg, lon_deg


def prepare_image(source: Path, target_height: int) -> tuple[Image.Image, tuple[int, int]]:
    with Image.open(source) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        if img.height > target_height:
            target_width = round(img.width * (target_height / img.height))
            img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        return img.copy(), img.size


def save_image(image: Image.Image, destination: Path, quality: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(
        destination,
        format="JPEG",
        quality=quality,
        optimize=True,
        progressive=True,
    )


def get_visual_digest(image: Image.Image) -> str:
    digest = hashlib.sha256()
    digest.update(f"{image.width}x{image.height}|".encode("utf-8"))
    digest.update(image.tobytes())
    return digest.hexdigest()


def get_taken_date(exif) -> tuple[str, str]:
    raw = exif.get(306) or exif.get(36867) or exif.get(36868)
    if not raw:
        return "Undated", "Undated"

    try:
        parsed = datetime.strptime(raw, "%Y:%m:%d %H:%M:%S")
        return parsed.strftime("%Y-%m"), parsed.strftime("%Y-%m-%d")
    except ValueError:
        return raw[:7].replace(":", "-"), raw[:10].replace(":", "-")


def is_derived_path(path: Path) -> bool:
    lowered = str(path).lower()
    return any(keyword in lowered for keyword in DERIVED_KEYWORDS)


def candidate_score(path: Path, original_size: tuple[int, int]) -> tuple[int, int, int, int]:
    width, height = original_size
    preferred = 0 if is_derived_path(path) else 1
    return preferred, width * height, int(path.stat().st_size), -len(path.parts)


def cache_key(coords: tuple[float, float], precision: int) -> str:
    return f"{round(coords[0], precision):.{precision}f},{round(coords[1], precision):.{precision}f}"


def fetch_location_label(cluster_key: str, cache: dict[str, str]) -> str:
    if cluster_key in cache:
        return cache[cluster_key]

    lat, lon = [float(value) for value in cluster_key.split(",")]
    url = "https://nominatim.openstreetmap.org/reverse?" + urllib.parse.urlencode(
        {
            "format": "jsonv2",
            "lat": lat,
            "lon": lon,
            "zoom": 13,
            "addressdetails": 1,
        }
    )
    request = urllib.request.Request(url, headers={"User-Agent": "Codex-JodyRutter-Portfolio/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.load(response)

    address = data.get("address", {})
    primary = (
        address.get("island")
        or address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("hamlet")
        or address.get("municipality")
        or address.get("suburb")
        or address.get("county")
        or address.get("state")
        or "Unknown Location"
    )
    iso_code = address.get("ISO3166-2-lvl4", "")
    state_code = iso_code.split("-")[-1] if iso_code else US_STATE_CODES.get(address.get("state", ""))
    label = f"{primary}, {state_code}" if state_code and primary != "Unknown Location" else primary
    cache[cluster_key] = label
    time.sleep(1.1)
    return label


def load_location_cache(cache_path: Path) -> dict[str, str]:
    if cache_path.exists():
        return json.loads(cache_path.read_text(encoding="utf-8"))
    return {}


def choose_unique_candidates(args: argparse.Namespace, files: list[Path]) -> tuple[list[dict], int]:
    chosen: dict[str, dict] = {}
    duplicate_count = 0

    for index, file_path in enumerate(files, start=1):
        try:
            with Image.open(file_path) as source_img:
                source_img = ImageOps.exif_transpose(source_img)
                exif = source_img.getexif()
                original_size = source_img.size
                coords = gps_to_deg(exif.get_ifd(34853))
                year_month, date_label = get_taken_date(exif)

            display_preview, display_size = prepare_image(file_path, args.display_height)
            visual_digest = get_visual_digest(display_preview)
            display_preview.close()

            record = {
                "source": file_path,
                "relativeSource": file_path.relative_to(Path(args.source_root).resolve()).as_posix(),
                "coords": coords,
                "clusterKey": cache_key(coords, args.location_precision) if coords else None,
                "yearMonth": year_month,
                "dateLabel": date_label,
                "score": candidate_score(file_path, original_size),
                "originalWidth": original_size[0],
                "originalHeight": original_size[1],
                "displayWidth": display_size[0],
                "displayHeight": display_size[1],
            }

            existing = chosen.get(visual_digest)
            if existing is None:
                chosen[visual_digest] = record
            else:
                duplicate_count += 1
                if record["score"] > existing["score"]:
                    chosen[visual_digest] = record
        except Exception:
            continue

        if index % 250 == 0:
            print(f"Analyzed {index} of {len(files)} source photos...")

    winners = list(chosen.values())
    winners.sort(
        key=lambda item: (
            item["yearMonth"] == "Undated",
            item["yearMonth"],
            item["relativeSource"],
        )
    )
    return winners, duplicate_count


def ensure_output_root(output_root: Path) -> None:
    if output_root.exists():
        if output_root.name != "photography":
            raise RuntimeError(f"Refusing to delete unexpected output root: {output_root}")
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True, exist_ok=True)


def main() -> None:
    args = parse_args()
    source_root = Path(args.source_root).resolve()
    output_root = Path(args.output_root).resolve()
    display_root = output_root / "display"
    thumb_root = output_root / "thumbs"
    data_root = output_root / "data"
    cache_path = Path(__file__).with_name("location_cache.json")

    files = sorted(
        [
            path
            for path in source_root.rglob("*")
            if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png"}
        ]
    )
    if args.limit:
        files = files[: args.limit]

    winners, duplicate_count = choose_unique_candidates(args, files)

    location_cache = load_location_cache(cache_path)
    unique_clusters = sorted({item["clusterKey"] for item in winners if item["clusterKey"]})
    for cluster in unique_clusters:
        fetch_location_label(cluster, location_cache)
    cache_path.write_text(json.dumps(location_cache, indent=2), encoding="utf-8")

    ensure_output_root(output_root)
    display_root.mkdir(parents=True, exist_ok=True)
    thumb_root.mkdir(parents=True, exist_ok=True)
    data_root.mkdir(parents=True, exist_ok=True)

    album_counts: Counter[str] = Counter()
    year_month_counts: Counter[str] = Counter()
    manifest_items: list[dict[str, object]] = []
    used_relative_paths: set[str] = set()

    for index, item in enumerate(winners, start=1):
        location_label = (
            location_cache.get(item["clusterKey"], "Unknown Location")
            if item["clusterKey"]
            else "Unknown Location"
        )
        year_month = item["yearMonth"] if item["yearMonth"] != "Undated" else "undated"
        location_slug = slugify(location_label)
        year_slug = slugify(year_month)
        stem_slug = slugify(Path(item["relativeSource"]).stem)
        filename = f"{stem_slug}.jpg"
        relative_jpg = f"{location_slug}/{year_slug}/{filename}"
        counter = 2
        while relative_jpg in used_relative_paths:
            filename = f"{stem_slug}-{counter}.jpg"
            relative_jpg = f"{location_slug}/{year_slug}/{filename}"
            counter += 1
        used_relative_paths.add(relative_jpg)

        display_path = display_root / relative_jpg
        thumb_path = thumb_root / relative_jpg

        display_image, display_size = prepare_image(item["source"], args.display_height)
        thumb_image, thumb_size = prepare_image(item["source"], args.thumb_height)
        save_image(display_image, display_path, args.display_quality)
        save_image(thumb_image, thumb_path, args.thumb_quality)
        display_image.close()
        thumb_image.close()

        album_counts[location_label] += 1
        year_month_counts[item["yearMonth"]] += 1
        manifest_items.append(
            {
                "album": location_label,
                "folder": f"{location_label}/{item['yearMonth']}",
                "locationLabel": location_label,
                "yearMonth": item["yearMonth"],
                "dateLabel": item["dateLabel"],
                "relativePath": item["relativeSource"],
                "name": Path(item["relativeSource"]).name,
                "display": f"../assets/photography/display/{relative_jpg}",
                "thumb": f"../assets/photography/thumbs/{relative_jpg}",
                "width": display_size[0],
                "height": display_size[1],
                "thumbWidth": thumb_size[0],
                "thumbHeight": thumb_size[1],
                "sizeKB": round(display_path.stat().st_size / 1024),
                "gps": list(item["coords"]) if item["coords"] else None,
            }
        )

        if index % 250 == 0:
            print(f"Rendered {index} of {len(winners)} unique gallery photos...")

    albums = [
        {"name": album_name, "count": count}
        for album_name, count in sorted(album_counts.items(), key=lambda item: (-item[1], item[0].lower()))
    ]
    year_months = [
        {"name": month_name, "count": count}
        for month_name, count in sorted(year_month_counts.items(), key=lambda item: item[0], reverse=True)
    ]

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceRoot": str(source_root),
        "displayHeight": args.display_height,
        "thumbHeight": args.thumb_height,
        "sourceTotal": len(files),
        "duplicatesRemoved": duplicate_count,
        "total": len(manifest_items),
        "albums": albums,
        "yearMonths": year_months,
        "photos": manifest_items,
    }

    manifest_path = data_root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    display_size = sum(path.stat().st_size for path in display_root.rglob("*") if path.is_file()) / (1024 ** 3)
    thumb_size = sum(path.stat().st_size for path in thumb_root.rglob("*") if path.is_file()) / (1024 ** 3)

    print(
        json.dumps(
            {
                "sourcePhotos": len(files),
                "uniquePhotos": len(manifest_items),
                "duplicatesRemoved": duplicate_count,
                "displayGB": round(display_size, 2),
                "thumbGB": round(thumb_size, 2),
                "manifest": str(manifest_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
