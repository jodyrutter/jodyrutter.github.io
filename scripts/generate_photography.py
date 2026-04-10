from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import shutil
import time
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFile, ImageFilter, ImageOps, ImageStat

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
    parser.add_argument("--display-quality", type=int, default=66)
    parser.add_argument("--thumb-quality", type=int, default=60)
    parser.add_argument("--location-precision", type=int, default=2)
    parser.add_argument("--quality-threshold", type=float, default=47.0)
    parser.add_argument("--panorama-quality-threshold", type=float, default=44.0)
    parser.add_argument("--limit", type=int)
    return parser.parse_args()


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def scale_linear(value: float, low: float, high: float) -> float:
    if high <= low:
        return 100.0
    return clamp((value - low) / (high - low), 0.0, 1.0) * 100


def scale_log(value: float, low: float, high: float) -> float:
    if value <= 0:
        return 0.0
    low_log = math.log1p(max(low, 0))
    high_log = math.log1p(max(high, low + 1))
    value_log = math.log1p(value)
    if high_log <= low_log:
        return 100.0
    return clamp((value_log - low_log) / (high_log - low_log), 0.0, 1.0) * 100


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


def resize_to_height(image: Image.Image, target_height: int) -> Image.Image:
    if image.height <= target_height:
        return image.copy()

    target_width = round(image.width * (target_height / image.height))
    return image.resize((target_width, target_height), Image.Resampling.LANCZOS)


def prepare_image(source: Path, target_height: int) -> tuple[Image.Image, tuple[int, int]]:
    with Image.open(source) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        prepared = resize_to_height(img, target_height)
        return prepared.copy(), prepared.size


def enhance_for_web(image: Image.Image, *, is_thumb: bool) -> Image.Image:
    grayscale = ImageOps.grayscale(image)
    stat = ImageStat.Stat(grayscale)
    mean_luma = float(stat.mean[0])
    std_luma = float(stat.stddev[0])

    equalize_mix = clamp(
        0.18 + max(0.0, (32.0 - std_luma) / 110.0) + (0.08 if mean_luma < 82 else 0.0),
        0.14,
        0.40,
    )
    autocontrast_mix = clamp(
        0.18 + max(0.0, (36.0 - std_luma) / 140.0),
        0.18,
        0.34,
    )
    brightness_factor = clamp(
        1.0 + max(-0.04, min(0.08, (98.0 - mean_luma) / 420.0)),
        0.96,
        1.08,
    )
    contrast_factor = clamp(
        1.04 + max(0.0, (38.0 - std_luma) / 170.0),
        1.02,
        1.12,
    )
    color_factor = clamp(
        1.03 + max(0.0, (40.0 - std_luma) / 220.0),
        1.02,
        1.08,
    )

    y_channel, cb_channel, cr_channel = image.convert("YCbCr").split()
    equalized_y = ImageOps.equalize(y_channel)
    merged = Image.merge(
        "YCbCr",
        (Image.blend(y_channel, equalized_y, equalize_mix), cb_channel, cr_channel),
    ).convert("RGB")

    autocontrasted = ImageOps.autocontrast(merged, cutoff=0.4)
    enhanced = Image.blend(merged, autocontrasted, autocontrast_mix)
    enhanced = ImageEnhance.Brightness(enhanced).enhance(brightness_factor)
    enhanced = ImageEnhance.Contrast(enhanced).enhance(contrast_factor)
    enhanced = ImageEnhance.Color(enhanced).enhance(color_factor)
    enhanced = enhanced.filter(
        ImageFilter.UnsharpMask(
            radius=0.9 if is_thumb else 1.15,
            percent=105 if is_thumb else 125,
            threshold=3 if is_thumb else 2,
        )
    )
    return enhanced


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


def compute_quality_metrics(
    image: Image.Image,
    *,
    quality_threshold: float,
    panorama_quality_threshold: float,
) -> dict[str, object]:
    gray = np.asarray(image.convert("L"), dtype=np.float32)
    if gray.shape[0] >= 3 and gray.shape[1] >= 3:
        center = gray[1:-1, 1:-1]
        laplacian = (
            gray[:-2, 1:-1]
            + gray[2:, 1:-1]
            + gray[1:-1, :-2]
            + gray[1:-1, 2:]
            - (4 * center)
        )
        blur_variance = float(laplacian.var())
    else:
        blur_variance = 0.0

    mean_luma = float(gray.mean()) if gray.size else 0.0
    contrast_std = float(gray.std()) if gray.size else 0.0
    dark_fraction = float((gray < 12).mean()) if gray.size else 0.0
    bright_fraction = float((gray > 243).mean()) if gray.size else 0.0
    is_panorama = image.width / max(image.height, 1) >= 2.2

    sharp_score = scale_log(blur_variance, 8.0, 1800.0)
    contrast_score = scale_linear(contrast_std, 14.0, 60.0)
    exposure_score = clamp(
        100.0 - (abs(mean_luma - 110.0) / 80.0 * 70.0) - (dark_fraction * 90.0) - (bright_fraction * 90.0),
        0.0,
        100.0,
    )
    quality_score = round((0.5 * sharp_score) + (0.22 * contrast_score) + (0.28 * exposure_score), 1)

    min_sharp = 14.0 if is_panorama else 18.0
    min_quality = panorama_quality_threshold if is_panorama else quality_threshold
    flags: list[str] = []
    if sharp_score < min_sharp:
        flags.append("soft")
    if exposure_score < 28.0:
        flags.append("exposure")
    if contrast_score < 20.0:
        flags.append("flat")

    return {
        "qualityScore": quality_score,
        "sharpnessScore": round(sharp_score, 1),
        "contrastScore": round(contrast_score, 1),
        "exposureScore": round(exposure_score, 1),
        "blurVariance": round(blur_variance, 2),
        "brightnessMean": round(mean_luma, 2),
        "contrastStd": round(contrast_std, 2),
        "darkFraction": round(dark_fraction, 4),
        "brightFraction": round(bright_fraction, 4),
        "qualityFlags": flags,
        "isHighQuality": quality_score >= min_quality and sharp_score >= min_sharp and exposure_score >= 28.0,
    }


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
            quality = compute_quality_metrics(
                display_preview,
                quality_threshold=args.quality_threshold,
                panorama_quality_threshold=args.panorama_quality_threshold,
            )
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
                "quality": quality,
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


def build_output_variants(source: Path, display_height: int, thumb_height: int) -> tuple[Image.Image, tuple[int, int], Image.Image, tuple[int, int]]:
    with Image.open(source) as image:
        base = ImageOps.exif_transpose(image).convert("RGB")
        display = enhance_for_web(resize_to_height(base, display_height), is_thumb=False)
        thumb = enhance_for_web(resize_to_height(base, thumb_height), is_thumb=True)
        return display.copy(), display.size, thumb.copy(), thumb.size


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
    high_quality_total = 0

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

        display_image, display_size, thumb_image, thumb_size = build_output_variants(
            item["source"],
            args.display_height,
            args.thumb_height,
        )
        save_image(display_image, display_path, args.display_quality)
        save_image(thumb_image, thumb_path, args.thumb_quality)
        display_image.close()
        thumb_image.close()

        quality = item["quality"]
        if quality["isHighQuality"]:
            high_quality_total += 1

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
                **quality,
            }
        )

        if index % 250 == 0:
            print(f"Rendered {index} of {len(winners)} unique gallery photos...")

    albums = [
        {"name": album_name, "count": count}
        for album_name, count in sorted(album_counts.items(), key=lambda entry: (-entry[1], entry[0].lower()))
    ]
    year_months = [
        {"name": month_name, "count": count}
        for month_name, count in sorted(year_month_counts.items(), key=lambda entry: entry[0], reverse=True)
    ]

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceRoot": str(source_root),
        "displayHeight": args.display_height,
        "thumbHeight": args.thumb_height,
        "sourceTotal": len(files),
        "duplicatesRemoved": duplicate_count,
        "total": len(manifest_items),
        "highQualityTotal": high_quality_total,
        "qualityThreshold": args.quality_threshold,
        "panoramaQualityThreshold": args.panorama_quality_threshold,
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
                "highQualityTotal": high_quality_total,
                "displayGB": round(display_size, 2),
                "thumbGB": round(thumb_size, 2),
                "manifest": str(manifest_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
