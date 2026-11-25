"""Bake the Wayfarer's cubic lattice from its painted elevations. Requires Pillow and NumPy.

Coordinates in the construction notes are pixels of the 2172 x 724 side master.
Each output face belongs to an occupied cell next to an empty one. Internal faces
are discarded. The browser draws all exterior faces with a single instanced mesh.
"""

from pathlib import Path
import gzip
import struct
import numpy as np
from PIL import Image

ART = Path(__file__).resolve().parents[1] / "public" / "study"
SIDE = Image.open(ART / "wayfarer-elevation.webp").convert("RGBA")
DECK = np.asarray(Image.open(ART / "wayfarer-deck.webp").convert("RGBA"))
STERN = np.asarray(Image.open(ART / "wayfarer-stern.webp").convert("RGBA"))
BOW = np.asarray(Image.open(ART / "wayfarer-bow.webp").convert("RGBA"))
W, H = SIDE.size
# Deck sheer, keel and beam at successive stations from stern to bowsprit.
STATIONS = np.array(
    [
        [0, 449, 450, 2],
        [20, 423, 466, 40],
        [55, 401, 511, 86],
        [116, 392, 547, 125],
        [216, 381, 576, 148],
        [330, 380, 594, 155],
        [465, 395, 607, 159],
        [710, 391, 614, 162],
        [1040, 388, 615, 162],
        [1300, 391, 612, 156],
        [1450, 400, 595, 145],
        [1550, 409, 575, 123],
        [1680, 421, 533, 93],
        [1795, 432, 488, 49],
        [1870, 435, 462, 18],
        [1945, 435, 448, 9],
        [2080, 428, 443, 7],
        [2127, 419, 451, 12],
        [2150, 423, 443, 7],
        [2172, 431, 432, 1],
    ],
    dtype=float,
)
CABIN = np.array(
    [
        [16, 431],
        [41, 394],
        [65, 379],
        [90, 338],
        [130, 318],
        [195, 302],
        [251, 294],
        [301, 307],
        [358, 335],
        [420, 378],
        [467, 399],
    ],
    dtype=float,
)


def bake(width):
    k = width / W
    height = round(H * k)
    center = int(np.ceil(205 * k))
    source = np.array(SIDE.resize((width, height), Image.Resampling.LANCZOS))
    opaque = source[:, :, 3] >= 95
    ix = (np.arange(width, dtype=np.float32) + 0.5) / k
    iy = (np.arange(height, dtype=np.float32)[:, None] + 0.5) / k
    sheer, keel, beam = [np.interp(ix, STATIONS[:, 0], STATIONS[:, i]).astype("f") for i in (1, 2, 3)]
    side = np.zeros((height, width, 2 * center + 1), np.uint8)
    # Solid hull sections taper continuously from their maximum beam towards a narrow lift keel.
    depth = np.clip((iy - sheer) / np.maximum(1, keel - sheer), 0, 1)
    wall = beam * (0.04 + 0.96 * np.sqrt(np.maximum(0, 1 - depth**1.28)))
    hull = opaque & (iy >= sheer - 1) & (iy <= keel + 1)
    cabin_top = np.interp(ix, CABIN[:, 0], CABIN[:, 1])
    cabin = opaque & (ix >= 16) & (ix < 467) & (iy < sheer) & (iy >= cabin_top)
    rise = np.clip((sheer - iy) / np.maximum(1, sheer - cabin_top), 0, 1)
    cabin_wall = beam * 0.95 * np.sqrt(np.maximum(0.015, 1 - rise**2.6))
    # The four cloth panels lie on different bearings. Wind fills the centers;
    # luffs stay at the spars. The depth of the cloth is two physical cells.
    # A continuous field keeps fine strokes on both sides of a sail seam
    # attached when seen end-on. Gaffs and mast sockets share these end points.
    bearing = np.interp(
        ix,
        [0, 130, 308, 375, 505, 780, 841, 1022, 1148, 1428, 1560, 1820, 2120, 2172],
        [0, 0, -27, 104, 73, 0, -12, 115, 78, 0, -24, 42, 0, 0],
    )
    curvature = np.interp(
        ix,
        [0, 350, 540, 780, 910, 1070, 1240, 1428, 1660, 2120, 2172],
        [0, 0, 19, 0, 13, 2, 19, 0, 24, 0, 0],
    )
    sheet = bearing + curvature * np.sin(np.clip((iy - 27) / 383, 0, 1) * np.pi)
    # Small ventral fins have their own roots, thickness and opposite camber.
    fins = iy > keel + 1
    sheet = np.where(fins, (iy - keel) * np.where(ix < 1000, 0.52, -0.52), sheet)
    rig = opaque & ~hull & ~cabin
    yy, xx = np.nonzero(rig)
    z0 = np.rint(sheet[yy, xx] * k).astype(int) + center
    for offset in (-1, 0, 1):
        side[yy, xx, np.clip(z0 + offset, 0, 2 * center)] = 3
    for zz in range(2 * center + 1):
        radius = abs(zz - center) / k
        side[:, :, zz][hull & (wall >= radius)] = 1
        side[:, :, zz][cabin & (cabin_wall >= radius)] = 2

    def rod(start, end, radius, material):
        # Rounded solid rods in ship coordinates, including diagonal stays and ratlines.
        a = np.array(start, dtype="f") * k
        b = np.array(end, dtype="f") * k
        a[2] += center
        b[2] += center
        length = np.linalg.norm(b - a)
        n = max(2, int(np.ceil(length * 1.15)))
        line = np.linspace(a, b, n).round().astype(int)
        rr = max(0.57, radius * k)
        r = int(np.ceil(rr))
        for dx in range(-r, r + 1):
            for dy in range(-r, r + 1):
                for dz in range(-r, r + 1):
                    if dx * dx + dy * dy + dz * dz > rr * rr:
                        continue
                    x, y, z = (line + [dx, dy, dz]).T
                    ok = (
                        (x >= 0) & (x < width) & (y >= 0) & (y < height) & (z >= 0) & (z < side.shape[2])
                    )
                    side[y[ok], x[ok], z[ok]] = material

    # Masts are round all the way through. Paint their axial wood grain and brass collars
    # from a strip just inside the original painted mast rather than baking a lighting ramp.
    for mast, crown, foot in [(781, 10, 399), (1428, 47, 408)]:
        for y in range(int(crown * k), int(foot * k) + 1):
            t = (y / k - crown) / (foot - crown)
            radius = (6.5 + 8.5 * t) * k
            x0 = int(mast * k)
            for dx in range(-int(radius), int(radius) + 1):
                half = int(np.sqrt(max(0, radius**2 - dx**2)))
                side[y, x0 + dx, center - half : center + half + 1] = 4
        # Port and starboard shrouds and the cross-tied ladders behind each sail.
        for direction in (-1, 1):
            feet = [
                (mast - 102, foot + 2, 140 * direction),
                (mast - 55, foot + 1, 145 * direction),
                (mast + 44, foot, 141 * direction),
                (mast + 74, foot + 1, 140 * direction),
            ]
            head = np.array([mast, crown + 48, 3 * direction])
            for footpoint in feet:
                rod(head, footpoint, 1.65, 5)
            for t in np.arange(0.28, 0.99, 0.058):
                l = head + (np.array(feet[0]) - head) * t
                r = head + (np.array(feet[1]) - head) * t
                rod(l, r, 1.1, 5)
    rod((782, 47, 0), (506, 32, 73), 4.3, 6)
    rod((1428, 76, 0), (1148, 47, 78), 4.2, 6)
    rod((785, 345, 0), (378, 337, 104), 4, 6)
    rod((1420, 355, 0), (1022, 340, 115), 4, 6)
    rod((785, 38, 0), (1426, 67, 0), 1.5, 5)
    rod((1425, 66, 0), (2120, 427, 0), 1.6, 5)
    rod((1431, 92, 0), (1833, 429, -42), 1.4, 5)
    rod((779, 48, 0), (206, 364, -107), 1.5, 5)
    # Raised skylight, hatch covers and belaying rails have shape even from directly overhead.
    for xa, xb, hw, thickness in [(953, 1146, 45, 12), (1026, 1105, 80, 5), (270, 338, 34, 10)]:
        for x in range(int(xa * k), int(xb * k)):
            cap = int(round(sheer[x] * k))
            lo = center - int(hw * k)
            hi = center + int(hw * k)
            side[cap - int(thickness * k) : cap + 1, x, lo:hi] = 7
    for sign in (-1, 1):
        previous = None
        for x in range(450, 1781, 22):
            xg = min(width - 1, int(x * k))
            p = (x, sheer[xg] - 9, sign * (beam[xg] - 3))
            if previous is not None:
                rod(previous, p, 2, 8)
            if (x - 450) % 66 == 0:
                rod(p, (x, sheer[xg] + 1, p[2]), 1.8, 8)
            previous = p

    # The gallery has a separate transom master. Its rear face curves around
    # both quarters and the brass frame stands proud of the recessed glazing.
    z_world = (np.arange(side.shape[2]) - center) / k
    stern_u = np.clip(((z_world / 282 + 0.5) * (STERN.shape[1] - 1)).astype(int), 0, STERN.shape[1] - 1)
    stern_v = np.clip(((iy[:, 0] - 294) / 280 * (STERN.shape[0] - 1)).astype(int), 0, STERN.shape[0] - 1)
    back = STERN[stern_v[:, None], stern_u]
    transom = (back[:, :, 3] > 115) & (np.abs(z_world) < 141) & (iy >= 294) & (iy <= 574)
    rear_x = 10 + 81 * (z_world / 141) ** 2 + 38 * ((iy - 441) / 147) ** 2
    recess = np.clip((back[:, :, 0].astype(float) - back[:, :, 2]) / 255, 0, 1) * 3
    front = np.rint((rear_x - recess) * k).astype(int)
    for y, z in zip(*np.nonzero(transom)):
        start = front[y, z]
        # Join into the existing rounded cabin. Outboard lamps get a short
        # housing of their own where the transom silhouette overhangs the hull.
        line = side[y, :, z]
        inside = np.flatnonzero((line[start : int(265 * k)] == 1) | (line[start : int(265 * k)] == 2))
        stop = start + (int(inside[0]) + 2 if inside.size else max(2, int(13 * k)))
        line[:start] = np.where((line[:start] == 1) | (line[:start] == 2), 0, line[:start])
        line[start:stop] = 9

    # A narrow stem follows the forward sweep of the hull under the bowsprit.
    previous = None
    for y in range(round(453 * k), round(600 * k), 2):
        section = np.flatnonzero(side[y, :, center] == 1)
        if not section.size:
            continue
        point = (section[-1] / k + 1, y / k, 0)
        if previous is not None:
            rod(previous, point, 3.5, 10)
        previous = point
    bow_edge = np.full((height, side.shape[2]), -1, dtype=int)
    for x in range(round(1270 * k), width):
        surface = side[:, x, :]
        bow_edge[(surface == 1) | (surface == 10)] = x

    deck = DECK
    # Remap each deck station to the authored plan's nontransparent beam.
    deck_x = np.clip((ix / W * deck.shape[1]).astype(int), 0, deck.shape[1] - 1)
    valid_deck = deck[:, :, 3] > 120
    dlow = valid_deck.argmax(axis=0)[deck_x]
    dhigh = (deck.shape[0] - 1 - valid_deck[::-1].argmax(axis=0))[deck_x]
    records = []
    # Stored normal order: +X, -X, +Y(up), -Y, +Z, -Z. Side array Y runs downward.
    for axis, step in ((1, 1), (1, -1), (0, -1), (0, 1), (2, 1), (2, -1)):
        normal = len(records)
        neighbour = np.roll(side, -step, axis=axis)
        edge = [slice(None)] * 3
        edge[axis] = -1 if step == 1 else 0
        neighbour[tuple(edge)] = 0
        y, x, z = np.nonzero((side != 0) & (neighbour == 0))
        del neighbour
        material = side[y, x, z]
        color = source[y, x, :3].copy()
        frac = np.clip((z - center) / (np.maximum(beam[x], 1) * k), -1, 1)
        deck_y = np.clip(
            ((dlow[x] + dhigh[x]) / 2 + frac * (dhigh[x] - dlow[x]) * 0.486).astype(int),
            0,
            deck.shape[0] - 1,
        )
        deck_color = deck[deck_y, deck_x[x], :3]
        on_deck = (material == 7) | ((material == 1) & (y / k < sheer[x] + 4) & (normal == 2))
        # Use golden glazing from the roof plan for the raised aft cabin.
        on_roof = (material == 2) & (normal == 2) & (np.abs(frac) < 0.62)
        color[on_deck | on_roof] = deck_color[on_deck | on_roof]
        on_mast = material == 4
        mast = np.where(ix[x] < 1100, 781, 1428)
        mx = np.clip((mast * k + ((z - center) * 0.38)).astype(int), 0, width - 1)
        color[on_mast] = source[y[on_mast], mx[on_mast], :3]
        # Narrow rods derive their pigment from original pixels of hemp, wood and brass.
        for ident, anchor in [(5, (695, 270)), (6, (780, 183)), (8, (529, 550))]:
            mask = material == ident
            if not np.any(mask):
                continue
            ox = np.round((anchor[0] + ((x[mask] + z[mask]) % 5) - 2) * k).astype(int)
            oy = np.round((anchor[1] + ((y[mask] + z[mask]) % 9) - 4) * k).astype(int)
            sampled = source[oy, ox, :3]
            if ident == 5:
                sampled = (np.array([112, 83, 48]) * 0.72 + sampled * 0.28).astype("u1")
            color[mask] = sampled
        # Project the carved cheeks across the forward-facing cells, gently
        # blending into the painted flanks as the hull opens out towards the beam.
        at_bow = ((material == 1) | (material == 10)) & (ix[x] > 1270)
        idx = np.flatnonzero(at_bow)
        if idx.size:
            by, bx, bz = y[idx], x[idx], z[idx]
            u = np.clip(
                ((z_world[bz] / 275 + 0.5) * (BOW.shape[1] - 1)).astype(int), 0, BOW.shape[1] - 1
            )
            v = np.clip(((by / k - 399) / 213 * (BOW.shape[0] - 1)).astype(int), 0, BOW.shape[0] - 1)
            fragment = BOW[v, u]
            reach = np.clip(1 - (bow_edge[by, bz] - bx) / (68 * k), 0, 1)
            opacity = (fragment[:, 3] / 255 * reach * np.clip((ix[bx] - 1270) / 135, 0, 1))[:, None]
            color[idx] = color[idx] * (1 - opacity) + fragment[:, :3] * opacity
        gallery = material == 9
        color[gallery] = STERN[stern_v[y[gallery]], stern_u[z[gallery]], :3]
        entry = np.empty(len(x), dtype=[("cell", "<u2", (3,)), ("ink", "u1", (4,))])
        entry["cell"][:, 0] = x
        entry["cell"][:, 1] = height - 1 - y
        entry["cell"][:, 2] = z
        entry["ink"][:, :3] = color
        entry["ink"][:, 3] = normal
        records.append(entry)
    n = sum(len(a) for a in records)
    out = ART / f"wayfarer-{width}.vox.gz"
    with gzip.GzipFile(filename=str(out), mode="wb", compresslevel=6, mtime=0) as f:
        f.write(
            struct.pack(
                "<4sIIIII", b"SKV1", width, height, side.shape[2], n, int(np.count_nonzero(side))
            )
        )
        for group in records:
            f.write(group.tobytes())
    print(
        width,
        "across;",
        np.count_nonzero(side),
        "occupied cells;",
        n,
        "exterior faces;",
        out.stat().st_size,
        "bytes",
        flush=True,
    )


if __name__ == "__main__":
    for width in (576, 1536):
        bake(width)
