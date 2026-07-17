from pathlib import Path
import hashlib
import shutil

ROOT = Path(".")

folders = [
    "input/pinterest",
    "input/behance",
    "input/dribbble",
    "input/screenshots",
    "input/sketches",
    "references",
    "curated",
    "docs",
    "export"
]

for folder in folders:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

hashes = {}

for image in ROOT.rglob("*"):
    if image.suffix.lower() not in [".png", ".jpg", ".jpeg", ".webp"]:
        continue

    digest = hashlib.sha256(image.read_bytes()).hexdigest()

    if digest in hashes:
        print(f"Duplicada: {image}")
    else:
        hashes[digest] = image

print("Estrutura pronta.")