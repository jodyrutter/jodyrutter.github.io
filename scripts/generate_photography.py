from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", default=r"E:\Drone")
    parser.add_argument("--output-root", default=r".\assets\photography")
    parser.add_argument("--display-height", type=int, default=720)
    parser.add_argument("--thumb-height", type=int, default=360)
    parser.add_argument("--display-quality", type=int, default=82)
    parser.add_argument("--thumb-quality", type=int, default=72)
    return parser.parse_args()


def resize_image(source: Path, destination: Path, target_height: int, quality: int) -> tuple[int, int]:
    destination.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as img:
      img = img.convert("RGB")
      if img.height > target_height:
          target_width = round(img.width * (target_height / img.height))
          img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
      else:
          target_width = img.width
          target_height = img.height

      img.save(
          destination,
          format="JPEG",
          quality=quality,
          optimize=True,
          progressive=True,
      )

      return target_width, target_height


def main() -> None:
    args = parse_args()

    source_root = Path(args.source_root).resolve()
    output_root = Path(args.output_root).resolve()
    display_root = output_root / "display"
    thumb_root = output_root / "thumbs"
    data_root = output_root / "data"

    display_root.mkdir(parents=True, exist_ok=True)
    thumb_root.mkdir(parents=True, exist_ok=True)
    data_root.mkdir(parents=True, exist_ok=True)

    files = sorted(
        [
            path
            for path in source_root.rglob("*")
            if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png"}
        ]
    )

    album_counts: Counter[str] = Counter()
    manifest_items: list[dict[str, object]] = []

    for index, file_path in enumerate(files, start=1):
        relative_path = file_path.relative_to(source_root).as_posix()
        parent_parts = list(Path(relative_path).parts[:-1])
        folder = "/".join(parent_parts) if parent_parts else "root"
        album = parent_parts[0] if parent_parts else "root"

        relative_jpg = str(Path(relative_path).with_suffix(".jpg")).replace("\\", "/")
        display_path = display_root / relative_jpg
        thumb_path = thumb_root / relative_jpg

        display_width, display_height = resize_image(
            file_path,
            display_path,
            args.display_height,
            args.display_quality,
        )
        thumb_width, thumb_height = resize_image(
            file_path,
            thumb_path,
            args.thumb_height,
            args.thumb_quality,
        )

        album_counts[album] += 1
        manifest_items.append(
            {
                "album": album,
                "folder": folder,
                "name": file_path.name,
                "relativePath": relative_path,
                "display": f"../assets/photography/display/{relative_jpg}",
                "thumb": f"../assets/photography/thumbs/{relative_jpg}",
                "width": display_width,
                "height": display_height,
                "thumbWidth": thumb_width,
                "thumbHeight": thumb_height,
                "sizeKB": round(display_path.stat().st_size / 1024),
                "modified": datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc).strftime("%Y-%m-%d"),
            }
        )

        if index % 250 == 0:
            print(f"Processed {index} of {len(files)} photos...")

    albums = [
        {"name": album_name, "count": count}
        for album_name, count in sorted(album_counts.items(), key=lambda item: item[0].lower())
    ]

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceRoot": str(source_root),
        "displayHeight": args.display_height,
        "thumbHeight": args.thumb_height,
        "total": len(manifest_items),
        "albums": albums,
        "photos": manifest_items,
    }

    manifest_path = data_root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    display_size = sum(path.stat().st_size for path in display_root.rglob("*") if path.is_file()) / (1024 ** 3)
    thumb_size = sum(path.stat().st_size for path in thumb_root.rglob("*") if path.is_file()) / (1024 ** 3)

    print(
        json.dumps(
            {
                "totalPhotos": len(manifest_items),
                "displayGB": round(display_size, 2),
                "thumbGB": round(thumb_size, 2),
                "manifest": str(manifest_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
