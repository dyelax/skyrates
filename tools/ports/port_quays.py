"""Quays and gardens shaped around each harbor's navigable inlet."""

import math
import random

from mathutils import Vector
from port_landscape import HARBOR_COASTS, RX, RY, SLIP_HALF_WIDTH, arch, coast, east, surface

Z = Vector((0, 0, 1))
STONE = "#c6b99b"
COPING = "#e2d6b7"
TIMBER = "#8e694b"
IRON = "#5e6770"
BRASS = "#c39b53"
WHARFS = {
    "sunstep": ("#a8845b", "#b89b70", "#885e40"),
    "glasshouse": ("#a88764", "#bd9970", "#8c6646"),
    "copperfall": ("#7e6052", "#947660", "#63544d"),
    "meridian": ("#978670", "#b1a18a", "#7c705e"),
}


def shore(port, angle):
    radius = coast(port, angle)
    return Vector((RX * radius * math.cos(angle), RY * radius * math.sin(angle), 0))


def coast_frame(port, angle, z):
    point = shore(port, angle)
    tangent = (shore(port, angle + 0.007) - shore(port, angle - 0.007)).normalized()
    point.z = z
    return point, Vector((tangent.y, -tangent.x, 0))


def strip(batch, rows, top, side, depth, foot=None):
    """A connected stone/wood course. Adjacent curve stations share geometry."""
    inside, outside = rows[0]
    if (outside - inside).cross(rows[1][0] - inside).z < 0:
        rows = list(reversed(rows))
    edge = []
    for inside, outside in rows:
        edge.append(
            [
                batch.vert(p, color)
                for p, color in (
                    (inside, top),
                    (outside, top),
                    (outside - Z * depth, side),
                    (inside - Z * depth, foot or side),
                )
            ]
        )
    for a, b in zip(edge, edge[1:]):
        batch.face(a[0], a[1], b[1], b[0])
        batch.face(a[1], a[2], b[2], b[1])
        batch.face(a[2], a[3], b[3], b[2])
        batch.face(a[3], a[0], b[0], b[3])
    batch.face(*edge[0][::-1])
    batch.face(*edge[-1])


def bollard(batch, p, size=1.0):
    batch.box(p.x, p.y, p.z + 0.25 * size, 0.24 * size, 0.25 * size, 0.51 * size, "#555e5a")
    batch.box(p.x, p.y, p.z + 0.53 * size, 0.41 * size, 0.31 * size, 0.11 * size, BRASS)


def curve_rail(batch, points, tint=COPING, rail_height=0.63):
    posts = []
    for a, b in zip(points, points[1:]):
        count = max(1, math.ceil((b - a).length / 0.62))
        posts.extend(a.lerp(b, j / count) for j in range(count))
        batch.beam(a + Z * rail_height, b + Z * rail_height, 0.16, 0.14, tint)
    posts.append(points[-1])
    for n, p in enumerate(posts):
        heavy = n == 0 or n == len(posts) - 1 or n % 5 == 0
        width = 0.24 if heavy else 0.11
        batch.box(p.x, p.y, p.z + rail_height * 0.47, width, width, rail_height * 0.94, STONE)
        if heavy:
            batch.box(p.x, p.y, p.z + rail_height + 0.025, 0.32, 0.31, 0.13, tint)


def gangway(batch, trim, start, heading, length, width, colors):
    """The two backed heads of a packet slip, open on the basin side."""
    out = Vector((math.cos(heading), math.sin(heading), 0))
    side = Vector((-out.y, out.x, 0))
    n = max(2, math.ceil(length / 0.36))
    for i in range(n):
        p = start + out * ((i + 0.5) * length / n)
        batch.box(p.x, p.y, p.z - 0.16, length / n - 0.014, width, 0.32, colors[i % 3], heading)
    end = start + out * length
    for sign in (-1, 1):
        lip = side * (width * 0.47 * sign)
        batch.beam(start + lip - Z * 0.31, end + lip - Z * 0.31, 0.21, 0.34, colors[2])
        batch.beam(
            start + lip - Z * 2.25, start + out * (length * 0.75) + lip - Z * 0.30, 0.24, 0.25, colors[2]
        )
        bollard(trim, end + lip - out * 0.26, 0.95)
    return end


def pennant(batch, pole, high, field, stripe):
    batch.beam(pole, pole + Z * high, 0.09, 0.09, BRASS)
    top = pole + Z * (high - 0.12)
    wave = [
        top + Vector((0.22 * i, 0.11 * math.sin(i * 1.45), -0.05 * math.sin(i * 0.95))) for i in range(6)
    ]
    for i, (a, b) in enumerate(zip(wave, wave[1:])):
        ad = 0.55 - 0.065 * i
        bd = 0.55 - 0.065 * (i + 1)
        batch.poly([a, b, b - Z * bd, a - Z * ad], field if i < 4 else stripe)


def loading_derrick(wood, metal, pivot, heading, scale):
    along = Vector((math.cos(heading), math.sin(heading), 0))
    side = Vector((-along.y, along.x, 0))

    def at(a, b, h):
        return pivot + scale * (along * a + side * b + Z * h)

    wood.box(
        pivot.x,
        pivot.y,
        pivot.z + 0.18 * scale,
        1.1 * scale,
        1.2 * scale,
        0.36 * scale,
        "#776250",
        heading,
    )
    for sign in (-1, 1):
        wood.beam(
            at(-0.32, 0.39 * sign, 0.24),
            at(0.05, 0.12 * sign, 3.9),
            0.19 * scale,
            0.19 * scale,
            "#775536",
        )
        wood.beam(at(0, 0.12 * sign, 1.65), at(2.1, 0.12 * sign, 3.68), 0.16 * scale, 0.2 * scale, TIMBER)
        wood.beam(
            at(0, 0.12 * sign, 3.73), at(2.3, 0.12 * sign, 3.77), 0.18 * scale, 0.21 * scale, TIMBER
        )
    metal.beam(at(2.2, 0, 3.8), at(2.2, 0, 1.94), 0.028 * scale, 0.028 * scale, "#474946")
    metal.beam(at(2.19, 0, 1.95), at(2.3, 0, 1.80), 0.062 * scale, 0.06 * scale, BRASS)
    metal.beam(at(2.3, 0, 1.80), at(2.4, 0, 1.99), 0.055 * scale, 0.055 * scale, BRASS)


def arrival_slip(port, dock, acc):
    """A horseshoe walking quay wraps an open ship-sized slip at the main berth."""
    sign = east(port)
    half_gap = SLIP_HALF_WIDTH[port]
    plank_width, length = {
        "sunstep": (2.10, 9.0),
        "glasshouse": (2.23, 10.6),
        "copperfall": (2.46, 9.5),
        "meridian": (1.96, 8.8),
    }[port]
    # The captain's mooring is at x=±23.875 and y=0. The open slot runs
    # at its real position from the curved head all the way out between the arms.
    spring = 21.1
    colors = WHARFS[port]
    span = 40
    rows = []
    for i in range(span + 1):
        a = -math.pi / 2 + math.pi * i / span
        rows.append(
            tuple(
                Vector(
                    (
                        sign * (spring - (3.72 + offset) * math.cos(a)),
                        (half_gap + offset) * math.sin(a),
                        0.17,
                    )
                )
                for offset in (-plank_width * 0.5, plank_width * 0.5)
            )
        )
    strip(dock, rows, colors[1], colors[2], 0.48)
    for i, ((a, b), (c, d)) in enumerate(zip(rows, rows[1:])):
        vertices = [a, b, d, c]
        if (b - a).cross(c - a).z < 0:
            vertices.reverse()
        dock.poly([q + Z * 0.023 for q in vertices], colors[(i // 2) % 3])
        if i % 6 == 1:
            bollard(acc, a + Z * 0.03, 0.83)
    for side in (-1, 1):
        heading = 0 if sign > 0 else math.pi
        start = Vector((sign * spring, side * half_gap, 0.17))
        tip = gangway(dock, acc, start, heading, length, plank_width, colors)
        # Upright piles and diagonal knees cast a recognizable silhouette
        # below each arm. Their structure stays on its own side of the slip.
        approach = Vector((sign, 0, 0))
        rail = Vector((0, side * (plank_width * 0.43), 0))
        for fraction, foot in ((0.13, 4.8), (0.71, 2.65)):
            pile = start + approach * (length * fraction) + rail
            dock.beam(pile - Z * foot, pile + Z * 0.38, 0.31, 0.32, colors[2])
            dock.beam(pile - Z * (foot - 0.35), pile + approach * 2.4 - Z * 0.32, 0.23, 0.26, colors[2])
        bollard(acc, tip + rail - approach * 0.31, 1.43)
        if side > 0:
            loading_derrick(dock, acc, start + approach * 1.4 + rail * 0.4, heading, 0.91)
        else:
            ink = {
                "sunstep": "#a54938",
                "glasshouse": "#448d85",
                "copperfall": "#993b32",
                "meridian": "#335c85",
            }[port]
            pennant(acc, tip - approach * 0.72 + rail, 2.05, ink, "#d3ab67")


def basin(port, stone, dock, acc):
    spec = HARBOR_COASTS[port]
    sign = east(port)
    arc = []
    for i in range(23):
        f = spec["mouth"] + spec["width"] * (i / 11 - 1)
        angle = math.atan2(math.sin(f), sign * math.cos(f))
        arc.append(coast_frame(port, angle, 0.16))
    rows = [(p - n * 1.10, p + n * 0.45) for p, n in arc]
    colors = WHARFS[port]
    strip(stone, rows, STONE, "#89785d", 0.69)
    for i, ((a, b), (c, d)) in enumerate(zip(rows, rows[1:])):
        mid = (a + b + c + d) * 0.25
        planks = [a, b, d, c] if sign > 0 else [c, d, b, a]
        dock.poly([p + Z * 0.035 for p in planks], colors[i % 3])
        if i % 4 == 1:
            bollard(acc, (b + d) * 0.5 + Z * 0.045)
        acc.beam(b - Z * 0.28, d - Z * 0.28, 0.13, 0.16, "#766548")
        if i % 3 == 0:
            acc.beam(mid - Z * 0.94, b - Z * 0.27, 0.14, 0.17, "#69583d")
    if port == "copperfall":
        anchor, normal = arc[2]
        loading_derrick(dock, acc, anchor, math.atan2(normal.y, normal.x), 1.12)
    if port == "copperfall":
        # Two running rails terminate at the open mouth of the ore-loading bay.
        for k in (0.13, 0.78):
            for (a, b), (c, d) in zip(rows, rows[1:]):
                acc.beam(a.lerp(b, k) + Z * 0.085, c.lerp(d, k) + Z * 0.085, 0.075, 0.095, IRON)


def gallery(port, center, span, elevation, bays, stone, foliage, flowers, rng, planted):
    # A curved undercroft carries the projecting walk. The arch springers,
    # cornices and railing follow the actual scallop rather than a straight chord.
    samples = bays * 4
    frames = [
        coast_frame(port, center + span * (2 * i / samples - 1), elevation) for i in range(samples + 1)
    ]
    # Project the Glasshouse promenade past the cliff crown so both its
    # open arcades and pendant flower clusters read in silhouette.
    lip = 1.85 if port == "glasshouse" else 0.72
    rows = [(p - n * 1.75, p + n * lip) for p, n in frames]
    strip(stone, rows, "#d3c4a6", "#aba088", 0.40)
    strip(
        stone,
        [(b - Z * 0.25 - n * 0.21, b - Z * 0.25 + n * 0.14) for (_, b), (_, n) in zip(rows, frames)],
        COPING,
        "#9d8c72",
        0.22,
    )
    fronts = [b - n * 0.18 for (_, b), (_, n) in zip(rows, frames)]
    curve_rail(stone, fronts)
    for i in range(bays):
        a, b = fronts[i * 4], fronts[(i + 1) * 4]
        middle = (a + b) * 0.5
        axis = (b - a).normalized()
        width = (b - a).length
        arch(
            stone,
            (middle.x, middle.y, elevation - 3.12),
            (axis.x, axis.y),
            max(0.48, width * 0.45 - 0.12),
            2.67,
            0.46,
            rng,
            COPING,
        )
    if planted:
        # A patterned earth bed set behind the balustrade.
        strip(
            stone,
            [(p - n * 1.65 + Z * 0.14, p - n * 0.82 + Z * 0.14) for p, n in frames],
            "#775e4c",
            "#b3a080",
            0.25,
        )
        for i, (p, n) in enumerate(frames):
            if i % 2:
                continue
            root = p - n * 1.16 + Z * 0.15
            foliage.lump(root.x, root.y, root.z, 0.37, 0.31, 0.47, "#62714a", rng, 5)
            for k in range(3):
                flowers.lump(
                    root.x + rng.uniform(-0.22, 0.22),
                    root.y + rng.uniform(-0.19, 0.19),
                    root.z + 0.28,
                    0.075,
                    0.07,
                    0.13,
                    rng.choice(("#e4d7bd", "#d4b6de", "#dcaabb")),
                    rng,
                    4,
                )
    return [(p + n * (lip - 0.68), n) for p, n in frames]


def leaf(batch, at, direction, length, shade):
    dx, dy = math.cos(direction), math.sin(direction)
    axial = Vector((dx, dy, 0))
    side = Vector((-dy, dx, 0))
    tip = at + axial * length - Z * (length * 0.25)
    center = at + axial * (length * 0.44) + Z * 0.045
    batch.poly([at, center - side * length * 0.23, tip], shade)
    batch.poly([at, tip, center + side * length * 0.23], shade)


def cliff_garden(frames, leaves, petals, rng):
    lavender = ("#8c61b7", "#bb89db", "#deb5ed", "#f7d8e9")
    clusters = (2, len(frames) // 2 + 1, len(frames) - 3)
    for patch, index in enumerate(clusters):
        edge, n = frames[index]
        across = Vector((-n.y, n.x, 0))
        # Roots grow through the balustrade and around the exposed lip. Bow
        # the long stems out over the rock, then draw their tips back toward it.
        center = edge + n * 0.77 + Z * 0.47
        for i in range(14):
            f = (i - 6.5) / 6.5
            phase = rng.uniform(0, math.tau)
            lateral = f * (1.26 if patch == 1 else 0.87) + rng.uniform(-0.16, 0.16)
            start = (
                center + across * lateral + n * rng.uniform(-0.17, 0.18) + Z * rng.uniform(-0.22, 0.14)
            )
            length = (1 - 0.48 * f * f) * rng.uniform(3.0, 5.5) * (1.15 if patch == 1 else 0.85)
            heading = math.atan2(n.y, n.x)
            for l in range(5):
                base = (
                    start
                    - n * rng.uniform(0.02, 0.8)
                    + across * rng.uniform(-0.27, 0.27)
                    + Z * rng.uniform(-0.15, 0.19)
                )
                leaf(
                    leaves,
                    base,
                    heading + rng.uniform(-2.3, 2.3),
                    rng.uniform(0.25, 0.53),
                    rng.choice(("#506847", "#648549", "#85a25e")),
                )

            def strand(t):
                return (
                    start
                    + n * (1.25 * math.sin(t * 2.55) * min(1, length / 3))
                    + across * (0.16 * math.sin(t * 5 + phase) - 0.16 * math.sin(phase))
                    - Z * (length * t)
                )

            for j in range(3):
                leaves.beam(strand(j / 3), strand((j + 1) / 3), 0.025, 0.023, "#5a734c")
            # Hand-shaped three-dimensional pea blossoms overlap around a single
            # rachis. Narrow terminal buds and an occasional bare tendril retain
            # the broken silhouette several meters below the terrace.
            count = max(11, round(length * 9))
            for j in range(count):
                t = (j + 0.65) / count
                a = phase + j * 2.40
                fan = n * math.cos(a) + across * math.sin(a)
                wing = n * (-math.sin(a)) + across * math.cos(a)
                size = (0.07 + 0.22 * (1 - t) ** 0.60) * rng.uniform(0.80, 1.17)
                base = strand(t) + fan * (size * 0.38)
                throat = base + fan * size * 0.34
                top = base + fan * size * 0.69 + Z * size * 0.42
                shade = lavender[rng.choices(range(4), weights=(2, 4, 5, 2))[0]]
                petals.poly(
                    [
                        throat,
                        base + wing * size * 0.69 + Z * size * 0.46,
                        top,
                        base - wing * size * 0.62 + Z * size * 0.34,
                    ],
                    shade,
                )
                petals.poly(
                    [base, throat + wing * size * 0.31, base + fan * size - Z * size * 0.45], lavender[2]
                )
                if j % 5 == 0 and t < 0.62:
                    leaf(leaves, base, heading + a, 0.16 + 0.19 * (1 - t), "#708d55")
            if i % 5 == 0:
                end = strand(1)
                for j in range(3):
                    down = end + n * 0.045 + across * (0.07 * (-1) ** j) - Z * 0.24
                    leaves.beam(end, down, 0.016, 0.016, "#718451")
                    end = down


def grand_steps(stone, start, end, width, steps, rng):
    axis = end - start
    angle = math.atan2(axis.y, axis.x)
    run = axis.xy.length / steps
    for i in range(steps):
        p = start.lerp(end, (i + 0.5) / steps)
        height = start.z + (end.z - start.z) * (i + 1) / steps
        stone.box(
            p.x,
            p.y,
            height - 0.19,
            run + 0.06,
            width,
            0.38,
            rng.choice(("#cdbda2", "#d4c5a8", "#c3b397")),
            angle,
        )
        nose = start.lerp(end, i / steps)
        stone.box(nose.x, nose.y, height - 0.02, 0.076, width + 0.12, 0.10, COPING, angle)


def orchard_sweeps(stone, green, flowers, rng, p):
    # Nested fruit terraces on the mill slope, closed by a broad stair.
    for level in range(3):
        row = []
        for j in range(19):
            t = j / 18
            x = -12.1 + 8.7 * t + level * 0.35
            y = -3.8 + 1.55 * level - 1.17 * math.sin(math.pi * t)
            top = surface(p, x, y) + 0.46 + 0.12 * level
            row.append((Vector((x, y + 0.42, top)), Vector((x, y - 0.17, top))))
            if j % 3 == 1:
                yp = y + 0.72
                zp = surface(p, x, yp)
                green.lump(x, yp, zp + 0.10, 0.41, 0.39, 0.63, "#738d48", rng, 6)
                for k in range(4):
                    flowers.lump(
                        x + rng.uniform(-0.25, 0.25),
                        yp + rng.uniform(-0.21, 0.21),
                        zp + 0.55,
                        0.095,
                        0.087,
                        0.15,
                        "#eab669",
                        rng,
                        4,
                    )
        strip(stone, row, "#d3c8a5", "#a49c7a", 0.77)
    grand_steps(stone, Vector((-3.15, -6.10, -0.28)), Vector((-2.35, -2.08, 0.64)), 1.25, 11, rng)


def meridian_court(stone, acc, rng):
    # The crescent stair of the survey court, inset around the telescope dome.
    center = Vector((-0.8, 1.25, 0))
    rows = []
    for k in range(25):
        a = math.radians(198 + 120 * k / 24)
        d = Vector((math.cos(a), math.sin(a), 0))
        outer = center + Vector((5.6 * d.x, 5.05 * d.y, 0))
        outer.z = surface("meridian", outer.x, outer.y) + 0.8
        rows.append((outer - d * 0.76, outer + d * 0.31))
    strip(stone, rows, "#e5dfca", "#a99f89", 0.87)
    curve_rail(stone, [q for _, q in rows[:9]], "#eee5ca")
    curve_rail(stone, [q for _, q in rows[13:]], "#eee5ca")
    top = rows[10][1]
    grand_steps(stone, Vector((top.x - 0.30, top.y - 2.75, top.z - 0.89)), top, 1.54, 9, rng)
    pennant(acc, rows[3][1], 2.67, "#253d65", "#d4b575")


def build_quays(port, stone, dock, acc, flowers, green):
    rng = random.Random(3183 + sum(map(ord, port)))
    basin(port, stone, dock, acc)
    arrival_slip(port, dock, acc)
    if port == "glasshouse":
        for i, (a, w, _) in enumerate(HARBOR_COASTS[port]["terraces"]):
            level = (0.32, 0.79, 0.08)[i]
            frames = gallery(port, a, w, level, 4 if i == 1 else 3, stone, green, flowers, rng, True)
            cliff_garden(frames, green, flowers, rng)
        grand_steps(stone, Vector((4.7, -10.42, -0.35)), Vector((3.8, -6.65, 1.07)), 1.86, 12, rng)
    elif port == "sunstep":
        for a, w, _ in HARBOR_COASTS[port]["terraces"]:
            gallery(port, a, w, -0.43, 3, stone, green, flowers, rng, False)
        orchard_sweeps(stone, green, flowers, rng, port)
    elif port == "meridian":
        gallery(port, -1.59, 0.39, -0.59, 5, stone, green, flowers, rng, False)
        meridian_court(stone, acc, rng)
