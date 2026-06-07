from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


def connected_background(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    candidate = Image.new("L", (width + 2, height + 2), 255)
    candidate_pixels = candidate.load()

    for y in range(height):
        for x in range(width):
            red, green, blue = pixels[x, y]
            bright = min(red, green, blue) >= 226
            neutral = max(red, green, blue) - min(red, green, blue) <= 36
            candidate_pixels[x + 1, y + 1] = 255 if bright and neutral else 0

    visited = Image.new("L", candidate.size, 0)
    visited_pixels = visited.load()
    queue = deque([(0, 0)])
    visited_pixels[0, 0] = 255

    while queue:
        x, y = queue.popleft()
        for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if not (0 <= next_x < width + 2 and 0 <= next_y < height + 2):
                continue
            if visited_pixels[next_x, next_y] or not candidate_pixels[next_x, next_y]:
                continue
            visited_pixels[next_x, next_y] = 255
            queue.append((next_x, next_y))

    return visited.crop((1, 1, width + 1, height + 1))


def prepare(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    if alpha.getextrema() == (255, 255):
        rgb = image.convert("RGB")
        background = connected_background(image)
        edge_zone = background.filter(ImageFilter.MaxFilter(9))
        alpha = Image.new("L", image.size, 255)

        rgb_pixels = rgb.load()
        background_pixels = background.load()
        edge_pixels = edge_zone.load()
        alpha_pixels = alpha.load()

        for y in range(image.height):
            for x in range(image.width):
                if background_pixels[x, y]:
                    alpha_pixels[x, y] = 0
                    continue
                if not edge_pixels[x, y]:
                    continue
                red, green, blue = rgb_pixels[x, y]
                brightness = min(red, green, blue)
                if brightness > 210:
                    alpha_pixels[x, y] = min(255, max(0, int((255 - brightness) * 255 / 45)))

        image.putalpha(alpha)
    bounds = alpha.getbbox()
    if not bounds:
        raise ValueError(f"No foreground found: {source}")

    image = image.crop(bounds)
    scale = min(900 / image.width, 900 / image.height)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    image = image.resize(size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    offset = ((1024 - image.width) // 2, (1024 - image.height) // 2)
    canvas.alpha_composite(image, offset)
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare a generated monster image for the game.")
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    prepare(args.source, args.destination)


if __name__ == "__main__":
    main()
