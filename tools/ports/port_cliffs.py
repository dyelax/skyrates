"""Jointed exterior rock around the weathered core of each floating island."""

import math
import random

from mathutils import Vector


# Light weathering on the exposed lips gives way to the local bedrock in the cracks.
STONE = {
    "sunstep": ("#dcceaa", "#c5b998", "#b7ac8d", "#bcb090", "#988d71"),
    "copperfall": ("#b79275", "#a47d63", "#967263", "#80685f", "#6f5e58"),
    "glasshouse": ("#aab6ae", "#99a39b", "#87948a", "#77857d", "#727d7a"),
    "meridian": ("#c1c8c7", "#969fa8", "#7e8999", "#707c8c", "#606b7b"),
}


def build_fractures(port, cliff, edge, shelves, depths):
    """Retain the pigment and crevices of the inner strata. Jointed buttresses
    break their exposed outline from the earth lip down to the broken toes.
    The town's ground and every service pad keep their original border.
    """
    region = ("sunstep", "copperfall", "glasshouse", "meridian").index(port)
    rng = random.Random(7193 + 179 * region)
    colors = STONE[port]
    # Shelter bedding behind the new buttresses. It remains visible in their
    # deepest joints and joins the existing unbroken shoreline at the top.
    for ids, (depth, _) in zip(shelves[1:], depths[1:]):
        weight = min(1, depth / 5)
        for i in ids:
            x, y, z = cliff.vertices[i]
            cliff.vertices[i] = (
                x * (1 - 0.22 * weight),
                y * (1 - 0.20 * weight),
                z + depth * (0.19 + 0.12 * max(0, (depth - 8) / 11)),
            )

    n = len(edge)
    crowns = []
    # Broad chalk shoulders, long quarry joints, shale fans and glacial spurs.
    courses = {
        "sunstep": (36, 27, 19),
        "copperfall": (27, 24, 21),
        "glasshouse": (39, 34, 22),
        "meridian": (30, 26, 20),
    }[port]
    for course, count in enumerate(courses):
        lengths = [rng.uniform(0.58, 1.54) for _ in range(count)]
        circumference = sum(lengths)
        sectors = [math.tau * length / circumference for length in lengths]
        theta = 0.16 + course * 1.43
        for slot, arc in enumerate(sectors):
            angle = (theta + arc * 0.5) % math.tau
            theta += arc
            u = angle * n / math.tau
            shoulder = edge[int(u)].lerp(edge[(int(u) + 1) % n], u % 1)
            prev = edge[(int(u) - 2) % n]
            next_point = edge[(int(u) + 2) % n]
            tangent = Vector((next_point.x - prev.x, next_point.y - prev.y, 0)).normalized()
            inward = Vector((-tangent.y, tangent.x, 0))
            angular_radius = (next_point - prev).xy.length / (4 * math.tau / n)
            width = angular_radius * arc * rng.uniform(1.01, 1.29)
            wave = 0.5 + 0.5 * math.sin(3 * angle + 0.47 * region) * math.cos(2 * angle - 0.3)
            depth = {"sunstep": 1.0, "copperfall": 1.13, "glasshouse": 0.99, "meridian": 1.23}[port] * (
                0.69 + 0.43 * wave
            )
            if course == 0:
                inset, drop = rng.uniform(0.55, 1.25), rng.uniform(0.24, 1.23)
                height = rng.uniform(3.3, 6.7) * depth
                thickness = rng.uniform(2.3, 4.3)
            elif course == 1:
                inset, drop = rng.uniform(0.7, 2.0), rng.uniform(3.1, 4.7) * depth
                height = rng.uniform(4.8, 8.1) * depth
                thickness = rng.uniform(3.4, 6.0)
            else:
                inset, drop = rng.uniform(3.3, 5.9), rng.uniform(5.3, 8.1) * depth
                height = rng.uniform(5.6, 10.1) * depth
                thickness = rng.uniform(3.1, 6.25)
            pivot = shoulder + inward * inset - Vector((0, 0, drop))
            if port == "copperfall":
                # Long fractured diagonal quarry cuts alternate with rusty benches.
                tangent = (tangent + inward * rng.uniform(-0.23, 0.25)).normalized()
                thickness *= 1.1
            elif port == "glasshouse":
                thickness *= 0.76
                height *= 0.92 if slot % 4 else 1.12
            elif port == "meridian":
                width *= 0.94
                height *= 1.13 if slot % 5 < 2 else 0.93
            points = rock_block(
                cliff, pivot, tangent, inward, width, thickness, height, colors, rng, course, port
            )
            if (port == "sunstep" and course < 2 and (slot + course) % 3 != 0) or (
                port == "meridian" and course < 2 and shoulder.z - drop > -3 and slot % 5 != 2
            ):
                crowns.append(points)
    return crowns


def rock_block(mesh, pivot, side, inward, width, thickness, height, palette, rng, course, port):
    # The outer polygon is a chipped plane rather than a circular cross section.
    clip = rng.uniform(0.15, 0.32)
    profile = [
        (-0.50, -0.26),
        (-0.50 + clip, -0.52),
        (0.35, -0.46),
        (0.53, -0.18),
        (0.44, 0.28),
        (0.18, 0.55),
        (-0.45, 0.41),
    ]
    outline = [(a + rng.uniform(-0.07, 0.07), b + rng.uniform(-0.09, 0.09)) for a, b in profile]
    tilt = rng.uniform(-0.19, 0.19)
    if port == "copperfall":
        tilt = 0.11 + 0.21 * math.cos(pivot.x * 0.18)
    elif port == "meridian":
        tilt += 0.16 * math.sin(pivot.y * 0.27)
    opposite = rng.uniform(-0.11, 0.11)

    def frame(x, y, z):
        return pivot + side * x + inward * y + Vector((0, 0, z))

    def crown(x, y):
        return tilt * width * x + opposite * thickness * y

    top = [frame(width * x * 0.90, thickness * y * 0.87, crown(x, y)) for x, y in outline]
    shoulders = [
        frame(width * x, thickness * y, crown(x, y) - height * rng.uniform(0.08, 0.21)) for x, y in outline
    ]
    ankle = rng.uniform(0.63, 0.87)
    drift = rng.uniform(-0.29, 0.25) * width
    if port == "copperfall":
        drift += 0.24 * width
    elif port == "glasshouse":
        drift += 0.20 * width * math.sin(pivot.x * 0.22)
    heel = [
        frame(width * x * ankle + drift, thickness * (y * ankle + 0.04), -height * rng.uniform(0.66, 0.90))
        for x, y in outline
    ]
    toe_width = rng.uniform(0.24, 0.57) if course else rng.uniform(0.59, 0.80)
    toe = [
        frame(
            width * x * toe_width + 1.35 * drift,
            thickness * (y * toe_width + 0.20),
            -height + crown(x, y) * 0.36,
        )
        for x, y in outline
    ]
    base = rng.choices(palette, weights=(2, 5, 5, 3, 1))[0]
    mesh.poly(top, rng.choice(palette[:2]), 1.03)
    for i in range(len(top)):
        j = (i + 1) % len(top)
        mesh.poly(
            [top[i], shoulders[i], shoulders[j], top[j]],
            rng.choice((base, palette[0], palette[1])),
            rng.uniform(0.92, 1.05),
        )
        mesh.poly([shoulders[i], heel[i], heel[j], shoulders[j]], base, rng.uniform(0.71, 1.08))
        if i in (0, 1, 2) and (height > 4.5 or width > 4) and rng.random() < 0.24:
            # A slanting joint opens onto the scarp. It tapers to a split in
            # this individual face and never forms a band circling the island.
            upper = shoulders[i].lerp(shoulders[j], rng.uniform(0.26, 0.65))
            floor = heel[i].lerp(heel[j], rng.uniform(0.24, 0.75))
            delta = shoulders[j] - shoulders[i]
            normal = (heel[i] - shoulders[i]).cross(shoulders[j] - shoulders[i]).normalized() * 0.023
            elbow = upper.lerp(floor, 0.38) + delta * 0.09
            mesh.poly(
                [
                    upper + normal,
                    elbow + normal,
                    floor + normal,
                    elbow + normal + delta * 0.032,
                    upper + normal + delta * 0.021,
                ],
                palette[-1],
                0.62,
            )
        mesh.poly(
            [heel[i], toe[i], toe[j], heel[j]], rng.choice((base, base, palette[-2])), rng.uniform(0.75, 0.98)
        )
    mesh.poly(toe[::-1], palette[-2], 0.77)
    return top, shoulders, heel


def shelf_cover(mesh, crowns, port):
    """Paint moss or retained snow onto the geometry of exposed ledges."""
    rng = random.Random(443)
    for crown, lip, lower in crowns:
        center = sum(crown, Vector((0, 0, 0))) / len(crown)
        # A patch hugs the lip, with soil exposed through its middle and a few
        # hanging runners below the ledge. Break up the flat, pale shoulder.
        if port == "meridian":
            lift = Vector((0, 0, 0.058))
            patch = [center.lerp(vertex, rng.uniform(0.68, 0.98)) + lift for vertex in crown]
            mesh.poly(patch, "#e5e8df", 1.04)
            for i in rng.sample([0, 1, 2, 3], 2):
                j = (i + 1) % len(crown)
                a = crown[i].lerp(crown[j], 0.17)
                b = crown[i].lerp(crown[j], 0.75)
                tip = lip[i].lerp(lip[j], 0.49).lerp(a, 0.27)
                mesh.poly([a + lift, tip, b + lift], "#cdd9d7")
            continue
        for i in rng.sample([0, 1, 2, 3], rng.randint(1, 2)):
            j = (i + 1) % len(crown)
            a, b = crown[i], crown[j]
            middle = a.lerp(b, 0.5)
            lift = Vector((0, 0, 0.065))
            color = rng.choice(("#7b884e", "#6e7b43", "#8d9559", "#79894d"))
            mesh.poly(
                [
                    a + lift,
                    a.lerp(center, 0.24) + lift,
                    middle.lerp(center, 0.41) + lift,
                    b.lerp(center, 0.16) + lift,
                    b + lift,
                ],
                color,
            )
            front = (lip[i] - a).cross(b - a).normalized() * 0.044
            for k in range(4):
                f = 0.09 + 0.23 * k + rng.uniform(-0.04, 0.04)
                x = a.lerp(b, f)
                y = a.lerp(b, f + 0.15)
                m = x.lerp(y, 0.5)
                toe = (
                    lip[i]
                    .lerp(lip[j], f + 0.09)
                    .lerp(lower[i].lerp(lower[j], f + 0.09), rng.uniform(0.03, 0.32))
                )
                mesh.poly(
                    [x + front + lift, toe + front, y + front + lift],
                    rng.choice((color, "#657343", "#82904d")),
                )
                if k % 2:
                    direction = (b - a).normalized() * 0.15
                    mesh.poly([m + front, toe + front - direction, toe + front + direction * 0.26], color)
