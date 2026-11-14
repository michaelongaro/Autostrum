"""Generate UI subsets with fonttools[woff]; original fonts remain as fallbacks."""
from pathlib import Path
from fontTools import subset

font_dir = Path(__file__).resolve().parents[1] / "src/styles/fonts"
unicodes = "U+0000-00FF,U+2000-206F,U+20A0-20CF,U+2100-21FF,U+266D-266F,U+FFFD"
for name in ("noto-sans", "noto-sans-italic"):
    subset.main([
        str(font_dir / f"{name}.woff2"),
        f"--output-file={font_dir / f'{name}-latin.woff2'}",
        f"--unicodes={unicodes}",
        "--flavor=woff2",
        "--layout-features=*",
    ])
