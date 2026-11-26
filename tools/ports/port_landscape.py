"""Editable port terrain and craftwork. Blender X east, Y north, Z up."""

import math
import random
from functools import lru_cache
from pathlib import Path
import bpy
from port_cliffs import build_fractures, shelf_cover
from mathutils import Vector

PORTS = ("sunstep", "glasshouse", "copperfall", "meridian")
SITES = [
    ("dockworker", 0, 18),
    ("market", -0.94, 24),
    ("shipyard", 0.96, 27),
    ("authority", -2.35, 22),
    ("civic", 2.46, 20),
]
RX, RY = 19.25, 12.625
TAU = math.tau
COLORS = {
    "sunstep": dict(
        turf="#778044",
        meadow="#ab9a53",
        soil="#927a4c",
        rock="#82725b",
        deep="#554d47",
        seam="#b7ae88",
        leaves=("#44532c", "#647435", "#8c9247"),
        flowers=("#efcb72", "#cc806e", "#e3cba6", "#95739d"),
    ),
    "glasshouse": dict(
        turf="#74855e",
        meadow="#99aa72",
        soil="#897b61",
        rock="#7b7e76",
        deep="#505259",
        seam="#b8b6a2",
        leaves=("#395b3f", "#52724c", "#84935a"),
        flowers=("#9975cd", "#7753b2", "#c4a8e5", "#d4bddf"),
    ),
    "copperfall": dict(
        turf="#80775b",
        meadow="#9a8963",
        soil="#8d684e",
        rock="#7c6254",
        deep="#4b4648",
        seam="#b69b78",
        leaves=("#47573c", "#64724c", "#8b8456"),
        flowers=("#c4a875", "#bd8e62", "#b9a583", "#81885b"),
    ),
    "meridian": dict(
        turf="#969b78",
        meadow="#b0a685",
        soil="#948974",
        rock="#777a7c",
        deep="#484c53",
        seam="#bfc0b2",
        leaves=("#4d6552", "#667b60", "#89987a"),
        flowers=("#d4d5b7", "#c1a5c2", "#ddcd9a", "#ab97a2"),
    ),
}


def smooth(v):
    t = max(0, min(1, v))
    return t * t * (3 - 2 * t)


def east(port):
    return 1 if port in ("sunstep", "copperfall") else -1


@lru_cache(maxsize=4)
def sites_for(port):
    data = {}
    for key, theta, radius in SITES:
        dx, dy = east(port) * math.cos(theta), -math.sin(theta)
        berth = (
            (191 * east(port) / 8, 0, 0)
            if key == "dockworker"
            else ((155 + radius + 28) / 8 * dx, (108 + radius + 28) / 8 * dy, 0)
        )
        data[key] = dict(x=148 / 8 * dx, y=100 / 8 * dy, z=0, berth=berth, radius=radius / 8)
    return data


def coast(port, a):
    phase = PORTS.index(port) * 1.23 + 0.56
    # Port geometry comes from the same ellipse and quay pads as the game.
    theta = -a
    h = (
        0.895
        + 0.089 * math.cos(theta * 3 + phase)
        + 0.059 * math.sin(theta * 5 - 0.8 * phase)
        + 0.035 * math.cos(theta * 8 + 1.2)
        + 0.017 * math.sin(theta * 17 + phase)
    )
    for s in sites_for(port).values():
        b = math.atan2(s["y"] / RY, s["x"] / RX)
        da = math.atan2(math.sin(b - a), math.cos(b - a))
        h = max(h, 0.82 + 0.17 * math.exp(-da * da / 0.052))
    return h


def surface(port, x, y):
    # Several broad upper orchards and courts rise inland. Gradients lead down
    # into the service plazas and stay continuous under hill buildings.
    u = east(port) * x
    grade = y * 0.85 - 0.16 * u + 1.05 * math.sin(u * 0.23)
    top = (
        -1.35
        + 1.35 * smooth((grade + 6.3) / 1.5)
        + 1.40 * smooth((grade - 0.3) / 1.35)
        + 1.48 * smooth((grade - 3.5) / 1.35)
        + 1.28 * smooth((grade - 7.1) / 1.5)
    )
    pads = 1.0
    for s in sites_for(port).values():
        pads = min(pads, smooth((math.hypot(x - s["x"], y - s["y"]) - s["radius"] * 0.9) / 3.0))
    if port == "glasshouse":
        top += 1.25 * smooth(1 - ((u + 2.4) / 8.5) ** 2 - ((y + 0.4) / 4.1) ** 2)
    elif port == "copperfall":
        top = top * 0.76 - 1.55 * smooth(1 - ((u - 4.0) / 7.6) ** 2 - ((y + 1.3) / 4.6) ** 2)
    elif port == "meridian":
        top += 2.5 * smooth(1 - ((u + 7.7) / 7.3) ** 2 - ((y - 8.2) / 5.1) ** 2)
    return top * pads


@lru_cache(maxsize=1024)
def linear(c):
    v = [int(c[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in v)


def pigment(c, light=1):
    return tuple(min(1, max(0, val * light)) for val in linear(c)) + (1.0,)


class Batch:
    """Shared indexed geometry, with exportable sRGB pigments on vertices."""

    def __init__(self, label):
        self.label = label
        self.vertices = []
        self.faces = []
        self.colors = []

    def vert(self, point, col, light=1):
        self.vertices.append(tuple(point))
        self.colors.append(pigment(col, light))
        return len(self.vertices) - 1

    def face(self, *ids):
        self.faces.append(tuple(ids))

    def poly(self, pts, col, light=1):
        self.face(*(self.vert(p, col, light) for p in pts))

    def box(self, x, y, z, w, d, h, col, ang=0):
        c, s = math.cos(ang), math.sin(ang)
        q = [
            self.vert(
                (x + i * w / 2 * c - j * d / 2 * s, y + i * w / 2 * s + j * d / 2 * c, z + k * h / 2),
                col,
                0.94 if k < 0 else 1.04,
            )
            for k in (-1, 1)
            for i, j in ((-1, -1), (1, -1), (1, 1), (-1, 1))
        ]
        self.face(q[3], q[2], q[1], q[0])
        self.face(*q[4:])
        for j in range(4):
            i = (j + 1) % 4
            self.face(q[j], q[i], q[4 + i], q[4 + j])

    def beam(self, a, b, w, d, col):
        av, bv = Vector(a), Vector(b)
        axis = (bv - av).normalized()
        side = (
            axis.cross(Vector((0, 0, 1)) if abs(axis.z) < 0.85 else Vector((0, 1, 0))).normalized()
            * w
            * 0.5
        )
        up = axis.cross(side).normalized() * d * 0.5
        lo = [self.vert(av + i * side + j * up, col) for i, j in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        hi = [self.vert(bv + i * side + j * up, col) for i, j in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        self.face(*lo[::-1])
        self.face(*hi)
        for j in range(4):
            i = (j + 1) % 4
            self.face(lo[j], lo[i], hi[i], hi[j])

    def lump(self, x, y, z, w, d, h, col, r, n=7, rough=0.13):
        angle = r.random() * TAU
        rows = []
        for frac, level in ((0.66, 0), (1, 0.30), (0.87, 0.68), (0.40, 0.92)):
            row = []
            for j in range(n):
                a = angle + j * TAU / n
                ratio = frac * (1 + r.uniform(-rough, rough))
                row.append(
                    self.vert(
                        (
                            x + math.cos(a) * w * ratio,
                            y + math.sin(a) * d * ratio,
                            z + h * (level + r.uniform(-0.04, 0.04)),
                        ),
                        col,
                        0.71 + 0.31 * level + r.uniform(-0.07, 0.07),
                    )
                )
            rows.append(row)
        self.face(*rows[0][::-1])
        cap = self.vert((x + 0.07 * w, y, z + h), col, 1.08)
        for j in range(n):
            k = (j + 1) % n
            for lo, hi in zip(rows, rows[1:]):
                self.face(lo[j], lo[k], hi[k], hi[j])
            self.face(rows[-1][j], rows[-1][k], cap)

    def mesh(self, color_mat, tile=None):
        if not self.faces:
            return
        m = bpy.data.meshes.new(self.label)
        m.from_pydata(self.vertices, [], self.faces)
        m.materials.append(color_mat)
        m.update()
        attr = m.color_attributes.new("Port paint", "FLOAT_COLOR", "POINT")
        if tile:
            # Baked pigment is multiplied by the packed albedo in both Blender and glTF.
            # The original local variation tints the paint without darkening it twice.
            for i, col in enumerate(self.colors):
                dark = 0.20 if self.label.startswith("Fractured bedrock") else 0.47
                self.colors[i] = tuple(dark + (1 - dark) * min(1, c * 2.45) for c in col[:3]) + (1.0,)
            uv = m.uv_layers.new(name="Hand-painted UV")
            for poly in m.polygons:
                ps = [self.vertices[m.loops[k].vertex_index] for k in poly.loop_indices]
                for k, (x, y, z) in zip(poly.loop_indices, ps):
                    if abs(poly.normal.z) > 0.62:
                        pair = (x / 4.5, y / 4.5)
                    elif abs(poly.normal.x) > abs(poly.normal.y):
                        pair = (y / 3.2, z / 3.2)
                    else:
                        pair = (x / 3.2, z / 3.2)
                    uv.data[k].uv = pair
        attr.data.foreach_set("color", [channel for col in self.colors for channel in col])
        if self.label.startswith(("Continuous", "Wind-shaped", "Fruit", "Orchard", "Planted", "Snow")):
            for face in m.polygons:
                face.use_smooth = True
        obj = bpy.data.objects.new(self.label, m)
        bpy.context.collection.objects.link(obj)
        return obj


def paint_material(tile=None):
    m = bpy.data.materials.new("Terrain | " + (tile or "painted sun and weathering"))
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.88
    attr = m.node_tree.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Port paint"
    color = attr.outputs["Color"]
    if tile:
        image = bpy.data.images.load(
            str(Path(__file__).parent / "materials" / (tile + ".jpg")), check_existing=True
        )
        image.pack()
        tex = m.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = image
        tex.extension = "REPEAT"
        multiply = m.node_tree.nodes.new("ShaderNodeMixRGB")
        multiply.blend_type = "MULTIPLY"
        multiply.inputs[0].default_value = 1.0
        m.node_tree.links.new(tex.outputs["Color"], multiply.inputs[1])
        m.node_tree.links.new(color, multiply.inputs[2])
        color = multiply.outputs["Color"]
    m.node_tree.links.new(color, bsdf.inputs["Base Color"])
    return m


def solid_ground(port, r, stone):
    p = COLORS[port]
    top = Batch("Continuous hillside terraces")
    rings = []
    n = 112
    nr = 31
    center = top.vert((0, 0, surface(port, 0, 0)), p["turf"])
    for j in range(1, nr + 1):
        row = []
        for k in range(n):
            angle = TAU * k / n
            rad = coast(port, angle) * j / nr
            x, y = RX * math.cos(angle) * rad, RY * math.sin(angle) * rad
            wav = 0.45 * math.cos(x * 0.68 + y * 0.35) + 0.35 * math.sin(x * 0.95 - y * 0.77)
            c = p["meadow"] if wav > 0.46 else p["soil"] if wav < -0.48 else p["turf"]
            row.append(top.vert((x, y, surface(port, x, y)), c, r.uniform(0.94, 1.07)))
        for k in range(n):
            q = (k + 1) % n
            if not rings:
                top.face(center, row[k], row[q])
            else:
                top.face(rings[-1][k], row[k], row[q], rings[-1][q])
        rings.append(row)
    cliff = Batch("Fractured bedrock and hanging outcrops")
    edge = [Vector(top.vertices[i]) for i in rings[-1]]
    profiles = {
        "sunstep": (1.00, 0.10),
        "glasshouse": (0.94, -0.05),
        "copperfall": (1.12, 0.16),
        "meridian": (1.25, -0.19),
    }
    depth_scale, skew = profiles[port]
    depths = [
        (0, 1),
        (0.25, 1.001),
        (0.85, 0.997),
        (1.65, 0.992),
        (2.0, 0.973),
        (2.25, 0.99),
        (3.4, 0.98),
        (3.7, 0.968),
        (4.35, 0.974),
        (5.85, 0.945),
        (6.2, 0.952),
        (7.3, 0.92),
        (8.0, 0.918),
        (9.4, 0.843),
        (11.5, 0.728),
        (13.0, 0.715),
        (15.4, 0.56),
        (17.1, 0.39),
        (18.8, 0.17),
    ]
    bands = (
        p["turf"],
        p["soil"],
        p["seam"],
        p["rock"],
        p["rock"],
        p["seam"],
        p["rock"],
        p["deep"],
        p["rock"],
        p["rock"],
        p["seam"],
        p["rock"],
        p["rock"],
        p["deep"],
        p["rock"],
        p["seam"],
        p["rock"],
        p["deep"],
        p["rock"],
    )
    shelves = []
    for j, (depth, base) in enumerate(depths):
        row = []
        for k, q in enumerate(edge):
            a = TAU * k / n
            scale = base + (
                0 if j == 0 else 0.027 * math.sin(13 * a - 0.09 * j) + 0.031 * math.sin(6 * a + 0.12 * j)
            )
            h = (
                depth
                * depth_scale
                * (
                    0.80
                    + 0.24 * math.sin(3 * a + 0.35 * PORTS.index(port))
                    + 0.14 * math.cos(7 * a)
                    + 0.055 * math.sin(14 * a)
                )
            )
            c = bands[j]
            row.append(
                cliff.vert(
                    (
                        q.x * scale + skew * depth,
                        q.y * scale + 0.070 * depth,
                        q.z - h + (r.uniform(-0.12, 0.12) if j else 0),
                    ),
                    c,
                    0.81 + r.random() * 0.24,
                )
            )
        if shelves:
            for k in range(n):
                q = (k + 1) % n
                cliff.face(shelves[-1][k], row[k], row[q], shelves[-1][q])
        shelves.append(row)
    cliff.face(*shelves[-1][::-1])
    # Staggered cliff plates: directional rock fractures and patches of scree on ledges.
    for k in range(158):
        q = r.choice(edge)
        below = r.uniform(0.35, 9.1)
        scale = 1 - below * 0.018
        x, y = q.x * (scale - 0.028), q.y * (scale - 0.030)
        stone.lump(
            x,
            y,
            q.z - below,
            r.uniform(0.26, 0.86),
            r.uniform(0.24, 0.58),
            r.uniform(0.44, 1.78),
            r.choice((p["rock"], p["rock"], p["seam"], p["deep"])),
            r,
            6,
            0.23,
        )
    if port in ("meridian", "copperfall"):
        for x0, y0, w, d, h in (
            [
                (-9, 8, 3.7, 2.7, 7.9),
                (7, 8, 3, 2.0, 5.8),
                (-3, 10.4, 2.4, 1.5, 7.2),
                (-14, 4.6, 2.1, 1.7, 5.1),
                (11, -3.5, 2.4, 1.4, 3.9),
                (-7, -9.8, 1.8, 1.4, 2.9),
            ]
            if port == "meridian"
            else [(-8, 8.5, 2.9, 2.4, 4.5), (-2, 11.2, 2.0, 1.6, 3.4)]
        ):
            x = x0 * east(port)
            z = surface(port, x, y0) - 0.5
            for j in range(3):
                xx = x + r.uniform(-0.9, 0.9)
                yy = y0 + r.uniform(-0.6, 0.6)
                points = []
                for i in range(7):
                    a = TAU * i / 7
                    points.append(
                        (xx + w * math.cos(a) * (1 + r.random() * 0.15), yy + d * math.sin(a), z)
                    )
                summit = (xx - 0.8, yy + 0.22, z + h)
                for i in range(7):
                    a, b = Vector(points[i]), Vector(points[(i + 1) % 7])
                    peak = Vector(summit)
                    sa = a.lerp(peak, 0.73 + r.random() * 0.07)
                    sb = b.lerp(peak, 0.71 + r.random() * 0.08)
                    stone.poly([a, b, sb, sa], p["rock"], r.uniform(0.8, 1.12))
                    stone.poly(
                        [sa, sb, peak],
                        "#e1decb" if port == "meridian" else p["seam"],
                        r.uniform(0.90, 1.02),
                    )
    crowns = build_fractures(port, cliff, edge, shelves, depths)
    return top, cliff, crowns


def rounded_path(points, samples=6):
    """Catmull–Rom interpolation in the plane."""
    v = [Vector(p) for p in points]
    out = []
    for i in range(len(v) - 1):
        a, b, c, d = v[max(0, i - 1)], v[i], v[i + 1], v[min(len(v) - 1, i + 2)]
        for j in range(samples):
            t = j / samples
            out.append(
                (
                    2 * b
                    + (-a + c) * t
                    + (2 * a - 5 * b + 4 * c - d) * t * t
                    + (-a + 3 * b - 3 * c + d) * t * t * t
                )
                * 0.5
            )
    return out + [v[-1]]


def ribbon(batch, pts, width, height, tints, r):
    prev = None
    for i, p in enumerate(pts):
        v = pts[min(i + 1, len(pts) - 1)] - pts[max(0, i - 1)]
        v.normalize()
        side = Vector((-v.y, v.x))
        row = []
        for k in (-1, 1):
            x, y = p + side * width * 0.5 * k
            row.append(batch.vert((x, y, height(x, y)), r.choice(tints)))
        if prev:
            batch.face(prev[0], prev[1], row[1], row[0])
        prev = row


def make_paths(port, r, road, wall):
    p = COLORS[port]
    s = sites_for(port)
    sign = east(port)

    def at(key):
        return (s[key]["x"], s[key]["y"])

    def xy(x, y):
        return (x * sign, y)

    paths = [
        (
            [
                at("authority"),
                xy(-9, 5.7),
                xy(-5.0, 4.5),
                xy(-1.8, 2.7),
                xy(2, 3.1),
                xy(6.8, 5.2),
                at("market"),
            ],
            1.32,
        ),
        (
            [at("civic"), xy(-8.3, -5.8), xy(-4.6, -4.0), xy(1.0, -3.6), xy(6.8, -5.8), at("shipyard")],
            1.19,
        ),
        ([at("dockworker"), xy(14, 0.9), xy(10.1, 1.3), xy(6.1, 0.7), xy(2, 3.1)], 1.62),
        ([xy(11.3, 1.65), xy(10.2, -2.6), xy(8.2, -3.9), xy(6.8, -5.8)], 1.0),
        ([xy(-8.5, 5.35), xy(-10.1, 3.1), xy(-9.4, 0.55), xy(-7.7, -1.4), xy(-8.3, -5.8)], 0.93),
        ([xy(-4.6, -4), xy(-3.1, -1.2), xy(-1, 0.2), xy(-1.8, 2.7)], 0.87),
    ]
    for n, (coords, width) in enumerate(paths):
        path = rounded_path(coords, 12)
        ribbon(
            road, path, width + 0.20, lambda x, y: surface(port, x, y) + 0.035, ("#85775c", "#9a8b70"), r
        )
        ribbon(
            road,
            path,
            width,
            lambda x, y: surface(port, x, y) + 0.065,
            ("#baa582", "#c8b995", "#c0ae8d"),
            r,
        )
        # Visible small paving on the sweeping town street, with transverse
        # steps only where the ground actually changes level.
        for i, (a, b) in enumerate(zip(path, path[1:])):
            ds = (b - a).length
            if ds < 0.03:
                continue
            mid = (a + b) * 0.5
            u = (b - a).normalized()
            side = Vector((-u.y, u.x))
            angle = math.atan2(u.y, u.x)
            h = surface(port, *mid)
            rise = abs(surface(port, *a) - surface(port, *b))
            if rise > 0.12:
                road.box(
                    *mid,
                    h + 0.105,
                    i % 2 and ds * 0.89 or ds * 0.93,
                    width * 0.95,
                    0.14,
                    "#d9c8aa",
                    angle
                )
            else:
                count = 3 if width > 1 else 2
                for j in range(count):
                    off = (j + 0.5 - count * 0.5) * width / count
                    c = mid + side * off + u * (r.random() - 0.5) * 0.06
                    road.box(
                        *c,
                        surface(port, *c) + 0.079,
                        max(0.035, ds - 0.03),
                        width / count - 0.045,
                        0.028,
                        r.choice(("#c3b08e", "#d2bea0", "#bca887", "#b5a285")),
                        angle
                    )
    # Contour retaining walls. Their curved capstones cast shadows across graded beds.
    for idx, (height, length, u0) in enumerate(
        ((0.45, 8.2, -4.1), (3.75, 8.2, -4.1), (7.15, 6.5, -2.9), (-5.6, 8.7, -3.7))
    ):
        path = []
        for j in range(24):
            u = u0 + length * j / 23
            y = (height + 0.16 * u - 1.05 * math.sin(0.23 * u)) / 0.85
            path.append(Vector((u * sign, y)))
        for i, (a, b) in enumerate(zip(path, path[1:])):
            if 12 <= i <= 14:
                continue
            mid = (a + b) * 0.5
            d = (b - a).length
            ang = math.atan2(b.y - a.y, b.x - a.x)
            lev = surface(port, *mid)
            wall.box(*mid, lev + 0.11, d + 0.018, 0.31, 0.76, "#9c957a", ang)
            wall.box(*mid, lev + 0.49, d + 0.03, 0.38, 0.14, "#d5c6a3", ang)
            if i % 3 == 0:
                wall.box(*mid, lev + 0.04, d * 0.65, 0.34, 0.25, "#b3a58b", ang)
    # Forecourt at the commercial junction: radial stone paving and a quiet compass inlay.
    x, y = xy(9.6, 1.2)
    z = surface(port, x, y)
    for ring, (radius, col) in enumerate(
        ((1.60, "#9d9179"), (1.49, "#d0c1a5"), (1.15, "#a59679"), (1.08, "#cebb96"))
    ):
        road.poly(
            [
                (
                    x + math.cos(j * TAU / 32) * radius,
                    y + math.sin(j * TAU / 32) * radius,
                    z + 0.095 + 0.009 * ring,
                )
                for j in range(32)
            ],
            col,
        )
    for j in range(8):
        a = j * TAU / 8
        road.poly(
            [
                (x, y, z + 0.14),
                (x + 0.17 * math.cos(a + 1.2), y + 0.17 * math.sin(a + 1.2), z + 0.14),
                (x + 0.92 * math.cos(a), y + 0.92 * math.sin(a), z + 0.14),
            ],
            "#8e7e62",
        )


def arch(work, origin, u, radius, height, width, r, tint="#c8b79a"):
    """Masonry voussoirs span an actual open arch with front and back surfaces."""
    x, y, z = origin
    dx, dy = u
    nx, ny = -dy, dx

    def point(a, b, h):
        return (x + dx * a + nx * b, y + dy * a + ny * b, z + h)

    thickness = 0.31
    spring = height - radius
    for side in (-1, 1):
        c = point(side * (radius + thickness * 0.62), 0, spring * 0.5)
        work.box(*c, 0.50, width, spring, "#aa9c84", math.atan2(dy, dx))
        work.box(
            *point(side * (radius + thickness * 0.62), 0, spring * 0.91),
            0.61,
            width + 0.12,
            0.22,
            tint,
            math.atan2(dy, dx)
        )
    for j in range(13):
        a = j * math.pi / 13 + 0.012
        b = (j + 1) * math.pi / 13 - 0.012
        ro = radius + thickness * (1.26 if j == 6 else 1)
        vv = [
            work.vert(
                point(rr * math.cos(ang), dep, spring + rr * math.sin(ang)), tint, r.uniform(0.89, 1.05)
            )
            for dep in (-width * 0.5, width * 0.5)
            for rr, ang in ((radius, a), (ro, a), (ro, b), (radius, b))
        ]
        work.face(*vv[:4])
        work.face(*vv[4:][::-1])
        for j0 in range(4):
            k = (j0 + 1) % 4
            work.face(vv[j0], vv[4 + j0], vv[4 + k], vv[k])


def rail(work, a, b, tint="#cdbd9e"):
    va, vb = Vector(a), Vector(b)
    length = (vb - va).length
    work.beam(va + Vector((0, 0, 0.53)), vb + Vector((0, 0, 0.53)), 0.14, 0.18, tint)
    n = max(2, round(length / 0.55))
    for j in range(n + 1):
        p = va.lerp(vb, j / n)
        if j in (0, n):
            work.box(*[p.x, p.y, p.z + 0.28], 0.29, 0.29, 0.57, "#b9a987")
            work.box(p.x, p.y, p.z + 0.59, 0.37, 0.37, 0.12, tint)
        else:
            work.box(p.x, p.y, p.z + 0.2, 0.13, 0.13, 0.34, "#c3b79c")
            work.box(p.x, p.y, p.z + 0.14, 0.18, 0.18, 0.14, tint)


def docks(port, r, b, acc):
    p = COLORS[port]
    sites = sites_for(port)
    for site, s in sites.items():
        start = Vector((s["x"], s["y"]))
        target = Vector(s["berth"][:2])
        u = (target - start).normalized()
        side = Vector((-u.y, u.x))
        angle = math.atan2(u.y, u.x)
        distance = (target - start).length

        def loc(a, w, h):
            pt = start + a * u + w * side
            return (pt.x, pt.y, h)

        if site in ("dockworker", "shipyard"):
            wide = 4.15 if site == "dockworker" else 3.20
            # Solid bracketed lips, edge trusses, rails and asymmetric bollards.
            n = math.ceil(distance / 0.23)
            for j in range(n):
                a = (j + 0.5) * distance / n
                b.box(
                    *loc(a, 0, -0.12),
                    distance / n - 0.012,
                    wide,
                    0.24,
                    r.choice(("#896547", "#9c7755", "#aa865f")),
                    angle
                )
            for sign in (-1, 1):
                b.beam(
                    loc(0, sign * wide * 0.47, -0.38),
                    loc(distance + 0.08, sign * wide * 0.47, -0.38),
                    0.28,
                    0.46,
                    "#725740",
                )
                b.beam(
                    loc(distance * 0.25, sign * wide * 0.47, -3.1),
                    loc(distance * 0.85, sign * wide * 0.47, -0.38),
                    0.25,
                    0.31,
                    "#7b624b",
                )
                b.beam(
                    loc(distance * 0.38, sign * wide * 0.46, -2.55),
                    loc(distance * 0.38, sign * wide * 0.46, -0.35),
                    0.21,
                    0.24,
                    "#806340",
                )
                for k in range(4):
                    a = distance * (0.21 + 0.24 * k)
                    b.box(*loc(a, sign * (wide * 0.45), 0.29), 0.17, 0.17, 0.76, "#b09361", angle)
                b.beam(
                    loc(distance * 0.2, sign * wide * 0.45, 0.55),
                    loc(distance * 0.93, sign * wide * 0.45, 0.55),
                    0.07,
                    0.07,
                    "#96805a",
                )
            for t in (-1, 1):
                a = distance - 0.35
                acc.box(*loc(a, t * (wide * 0.42), 0.46), 0.32, 0.32, 0.92, "#8e754f", angle)
                acc.box(*loc(a, t * (wide * 0.42), 0.99), 0.40, 0.40, 0.20, "#d9b86d", angle)
        else:
            wide = 2.8 if site == "market" else 1.90
            n = math.ceil(distance / 0.43)
            for j in range(n):
                a = (j + 0.5) * distance / n
                w = wide * (1 - 0.21 * j / n)
                b.box(*loc(a, 0, -0.21), distance / n + 0.005, w, 0.38, "#ac9b7d", angle)
                for k in (-1, 1):
                    b.box(
                        *loc(a, k * w * 0.245, -0.003),
                        distance / n - 0.03,
                        w * 0.49 - 0.025,
                        0.10,
                        r.choice(("#c8b99b", "#d1c3a7", "#b9ac91")),
                        angle
                    )
            for sign in (-1, 1):
                arch(
                    b,
                    loc(distance * 0.55, sign * wide * 0.35, -2.10),
                    tuple(u),
                    min(1.25, distance * 0.24),
                    1.90,
                    0.45,
                    r,
                )
            if site == "authority" or site == "civic":
                rail(
                    b, loc(distance * 0.22, -wide * 0.46, 0.08), loc(distance * 0.91, -wide * 0.39, 0.08)
                )
    # Real external vaulted gallery under the light-colored lower terrace.
    angle = -1.60
    for j in range(8):
        a = angle + (j - 3.5) * 0.104
        radius = coast(port, a)
        x = (RX * radius + 0.38) * math.cos(a)
        y = (RY * radius + 0.58) * math.sin(a)
        z = surface(port, x, y)
        u = (-math.sin(a), math.cos(a))
        arch(b, (x, y, z - 3.5), u, 0.76, 2.25, 0.57, r)
        b.box(x, y, z - 1.02, 2.20, 1.90, 0.43, "#b6aa90", math.atan2(u[1], u[0]))
        rail(b, (x - u[0] * 1.00, y - u[1] * 1.0, z - 0.78), (x + u[0] * 1.0, y + u[1] * 1.0, z - 0.78))


def gardens(port, r, wood, green, flowers):
    p = COLORS[port]
    sign = east(port)
    sites = sites_for(port)

    def clear(x, y, margin=3):
        return all(math.hypot(x - s["x"], y - s["y"]) > s["radius"] + margin for s in sites.values())

    def specimen(x, y, height, kind):
        z = surface(port, x, y)
        wood.beam(
            (x, y, z - 0.03), (x + 0.04, y, z + height * 0.70), height * 0.058, height * 0.062, "#71533c"
        )
        if kind == "cypress":
            for i in range(3):
                green.lump(
                    x,
                    y,
                    z + height * (0.11 + 0.22 * i),
                    height * (0.139 - 0.024 * i),
                    height * (0.146 - 0.025 * i),
                    height * (0.57 - 0.069 * i),
                    p["leaves"][i % 3],
                    r,
                    7,
                )
            return
        for j in range(6):
            a = j * TAU / 6 + r.random() * 0.25
            rad = height * r.uniform(0.11, 0.25)
            xx = x + math.cos(a) * rad
            yy = y + math.sin(a) * rad
            zz = z + height * r.uniform(0.41, 0.63)
            wood.beam((x, y, z + 0.35 * height), (xx, yy, zz + 0.11 * height), 0.11, 0.10, "#685039")
            green.lump(
                xx, yy, zz, height * 0.25, height * 0.22, height * 0.40, p["leaves"][(j + 1) % 3], r, 6
            )
            if kind == "fruit":
                for k in range(4):
                    bearing = a + (k - 1.5) * 0.9
                    x1 = xx + math.cos(bearing) * height * 0.18
                    y1 = yy + math.sin(bearing) * height * 0.17
                    flowers.lump(
                        x1,
                        y1,
                        zz + height * (0.14 + 0.14 * r.random()),
                        0.085,
                        0.083,
                        0.16,
                        r.choice(("#e2a84c", "#bf7245", "#e5c087")),
                        r,
                        4,
                    )

    # Packed planting beds follow the terrain rather than being scattered over the town.
    if port == "sunstep":
        for row in range(3):
            for j in range(7):
                x = (-8.8 + j * 1.95 + row * 0.48) * sign
                y = 5.3 + 1.65 * row + 0.28 * math.cos(j * 0.75)
                if clear(x, y, 0.55):
                    specimen(x, y, r.uniform(1.75, 2.23), "fruit")
        for j in range(3):
            x = (6.2 + 1.05 * j) * sign
            y = 8.6 - 0.42 * j
            if clear(x, y, 0.6):
                specimen(x, y, r.uniform(2.2, 3.1), "cypress")
        # Ripe grain and bundled sheaves, distinguishable from orchard and roads.
        for row in range(11):
            for j in range(33):
                x = (2.5 + j * 0.16 + row * 0.11) * sign
                y = 6.7 + row * 0.17 + 0.13 * math.sin(j / 8)
                if not clear(x, y, 0.65):
                    continue
                z = surface(port, x, y)
                h = 0.24 + r.random() * 0.18
                green.beam(
                    (x, y, z),
                    (x + 0.08, y + 0.03, z + h),
                    0.050,
                    0.043,
                    r.choice(("#d3a84c", "#bd9643", "#e0b456")),
                )
    elif port in ("glasshouse", "meridian"):
        for cx, cy in ((-6, 7.7), (-9.7, -1.7), (3.8, -6.1), (6.4, 5.4)):
            for j in range(2):
                x = (cx + j * 0.78) * sign
                y = cy + r.uniform(-0.36, 0.36)
                if clear(x, y, 0.9):
                    specimen(x, y, r.uniform(2.2, 3.25), "cypress")
    beds = {
        "sunstep": [(-8.0, -5.0), (-3.6, 4.3), (6.2, 5.2), (6.7, -5.7)],
        "glasshouse": [
            (-8.8, -5.4),
            (-7.2, 3.5),
            (-2.8, 8.5),
            (4.1, 6.9),
            (4.3, -4.3),
            (11, -3.0),
            (10, 4.1),
        ],
        "meridian": [(-5, -4.0), (-9, 1.2), (5.0, -6.0), (11, 3.0)],
        "copperfall": [(-8, -4.8), (4.3, 7.6), (-2, 8.6)],
    }[port]
    for cx, cy in beds:
        for k in range(16):
            x = (cx + r.uniform(-1.9, 1.9)) * sign
            y = cy + r.uniform(-0.58, 0.58)
            z = surface(port, x, y)
            if not clear(x, y, 0.18):
                continue
            green.lump(
                x,
                y,
                z - 0.10,
                r.uniform(0.18, 0.45),
                r.uniform(0.17, 0.34),
                r.uniform(0.24, 0.48),
                r.choice(p["leaves"]),
                r,
                5,
            )
            for j in range(3):
                xx = x + r.uniform(-0.16, 0.16)
                yy = y + r.uniform(-0.12, 0.12)
                flowers.lump(
                    xx,
                    yy,
                    z + 0.19 + r.random() * 0.14,
                    0.074,
                    0.075,
                    0.116,
                    r.choice(p["flowers"]),
                    r,
                    4,
                )
    # Planting that trails down from cliff ledges breaks the hard coast outline.
    for j in range(80 if port != "copperfall" else 35):
        a = r.uniform(-math.pi, math.pi)
        edge = coast(port, a)
        x = RX * edge * math.cos(a)
        y = RY * edge * math.sin(a)
        z = surface(port, x, y)
        if not clear(x, y, 0.55):
            continue
        green.lump(
            x,
            y,
            z - 0.16,
            0.33 + r.random() * 0.3,
            0.35 + r.random() * 0.23,
            0.24 + r.random() * 0.42,
            r.choice(p["leaves"]),
            r,
            6,
        )
        if j % 3:
            continue
        for k in range(r.randint(3, 8)):
            xx = x + 0.11 * math.sin(k * 0.55)
            yy = y + 0.06 * k * math.sin(a)
            zz = z - 0.22 * k
            green.lump(xx, yy, zz, 0.22, 0.18, 0.39, p["leaves"][k % 3], r, 5)
            if port == "glasshouse" or (port == "sunstep" and k % 2):
                flowers.lump(xx, yy - 0.11, zz, 0.095, 0.09, 0.27, r.choice(p["flowers"]), r, 5)


def foreground(port, r, paving, trees, flowers, hedge):
    p = COLORS[port]
    sg = east(port)

    def z(x, y):
        return surface(port, x, y)

    # Curved raised plots and a stone snow-melt channel front the trading quarter.
    # Their horizontal faces remain legible even when the village is viewed at a distance.
    plots = [(-4.9, -6.4, 3.8, 1.5), (2.8, -7.9, 2.8, 1.1), (-10.8, 0.7, 1.9, 1.15)]
    for idx, (cx, cy, rx, ry) in enumerate(plots):
        cx *= sg
        outline = [
            Vector(
                (
                    cx + rx * math.cos(TAU * i / 25) * (1 + 0.06 * math.sin(i * 0.8)),
                    cy + ry * math.sin(TAU * i / 25),
                )
            )
            for i in range(25)
        ]
        n = len(outline)
        height = 0.36 if port != "meridian" else 0.24
        soil = p["soil"] if port != "glasshouse" else "#696e51"
        for j, q in enumerate(outline):
            nxt = outline[(j + 1) % n]
            mid = (q + nxt) * 0.5
            delta = nxt - q
            paving.poly(
                [
                    (cx, cy, z(cx, cy) + height),
                    (q.x, q.y, z(*q) + height),
                    (nxt.x, nxt.y, z(*nxt) + height),
                ],
                soil,
            )
            paving.box(
                *mid,
                z(*mid) + height * 0.54,
                delta.length + 0.02,
                0.20,
                height + 0.12,
                r.choice(("#a99c7d", "#b6aa8c", "#9c957b")),
                math.atan2(delta.y, delta.x)
            )
            paving.box(
                *mid,
                z(*mid) + height + 0.08,
                delta.length + 0.02,
                0.25,
                0.105,
                "#d4c8ac",
                math.atan2(delta.y, delta.x)
            )
        if port == "copperfall":
            for j in range(9):
                x = cx + r.uniform(-rx * 0.66, rx * 0.66)
                y = cy + r.uniform(-ry * 0.59, ry * 0.59)
                h = z(x, y) + height
                if idx == 1:
                    paving.beam(
                        (x - 0.58, y, h + 0.09),
                        (x + 0.62, y + 0.15, h + 0.09),
                        0.15,
                        0.16,
                        r.choice(("#655b56", "#9e714e")),
                    )
                else:
                    trees.lump(
                        x,
                        y,
                        h,
                        0.32 + r.random() * 0.35,
                        0.23 + r.random() * 0.26,
                        0.25 + r.random() * 0.4,
                        "#625b58",
                        r,
                        6,
                    )
        else:
            for j in range(40 if port == "glasshouse" else 28):
                a = r.random() * TAU
                rad = math.sqrt(r.random()) * 0.88
                x = cx + rx * rad * math.cos(a)
                y = cy + ry * rad * math.sin(a)
                h = z(x, y) + height
                hedge.lump(
                    x,
                    y,
                    h - 0.035,
                    0.24 + r.random() * 0.17,
                    0.19 + r.random() * 0.16,
                    0.27 + r.random() * 0.22,
                    r.choice(p["leaves"]),
                    r,
                    5,
                )
                for k in range(3):
                    xx = x + r.uniform(-0.16, 0.16)
                    yy = y + r.uniform(-0.15, 0.15)
                    flowers.lump(
                        xx,
                        yy,
                        h + 0.20 + r.random() * 0.16,
                        0.10,
                        0.10,
                        0.17,
                        r.choice(p["flowers"]),
                        r,
                        4,
                    )
            if port == "sunstep":
                for j in range(3 if idx == 0 else 2):
                    x = cx + (j - 1) * rx * 0.71
                    y = cy + 0.14 * math.sin(j)
                    h = z(x, y) + height
                    trees.beam((x, y, h), (x + 0.1, y, h + 1.20), 0.15, 0.14, "#69533e")
                    for q in range(4):
                        a = q * TAU / 4 + 0.4
                        xx = x + 0.37 * math.cos(a)
                        yy = y + 0.34 * math.sin(a)
                        hedge.lump(xx, yy, h + 0.79, 0.52, 0.45, 0.64, p["leaves"][q % 3], r)
                        for f in range(4):
                            flowers.lump(
                                xx + r.uniform(-0.32, 0.32),
                                yy + r.uniform(-0.29, 0.29),
                                h + 1.10 + r.random() * 0.17,
                                0.093,
                                0.086,
                                0.16,
                                r.choice(("#da9c3d", "#e2b55d", "#bf6d43")),
                                r,
                                4,
                            )
    # A proper returning flight of curved external steps cuts across the front
    # escarpment. Each tread has a rise, projecting nosing and thick landing.
    start = Vector((-7.1 * sg, -7.2))
    bend = Vector((-5.5 * sg, -9.8))
    end = Vector((-1.1 * sg, -12.3))
    path = rounded_path([start, bend, end], 12)
    z0 = z(*start) + 0.04
    z1 = z(*end) - 0.82
    for j, (a, b) in enumerate(zip(path, path[1:])):
        m = (a + b) * 0.5
        axis = b - a
        frac = (j + 0.5) / (len(path) - 1)
        height = z0 * (1 - frac) + z1 * frac
        angle = math.atan2(axis.y, axis.x)
        paving.box(
            *m,
            height - 0.18,
            axis.length + 0.022,
            1.40,
            0.36,
            r.choice(("#b9ac90", "#c5b59a", "#b4a58c")),
            angle
        )
        side = Vector((-math.sin(angle), math.cos(angle))) * 0.65
        q = m + side
        paving.box(*q, height + 0.07, axis.length + 0.05, 0.12, 0.15, "#d1be9d", angle)
    if port == "meridian":
        for cx, cy, rx, ry in (
            (-6.5, 8.3, 4, 1.35),
            (4.5, 5.3, 2.9, 1.1),
            (-10, -1.7, 2.45, 0.87),
            (1.4, -7.8, 2.4, 0.58),
            (6, -6.8, 1.45, 0.48),
        ):
            perim = []
            for j in range(18):
                a = TAU * j / 18
                xx = cx + rx * math.cos(a) * r.uniform(0.83, 1.1)
                yy = cy + ry * math.sin(a) * r.uniform(0.83, 1.1)
                perim.append((xx, yy, z(xx, yy) + 0.11))
            for j in range(18):
                paving.poly(
                    [(cx, cy, z(cx, cy) + 0.12), perim[j], perim[(j + 1) % 18]],
                    r.choice(("#d9dcce", "#e6e5d8", "#d3d8cd")),
                )


def build_landscape(port):
    r = random.Random(3119 + 231 * PORTS.index(port))
    boulder = Batch("Outcrop spurs and stratified talus")
    top, cliff, crowns = solid_ground(port, r, boulder)
    road = Batch("Stepped lanes and inlaid courts")
    stone = Batch("Stonework, arcade and retaining walls")
    dock = Batch("Quays and working piers")
    acc = Batch("Mooring fittings")
    wood = Batch("Orchard trunks and growing supports")
    green = Batch("Wind-shaped greenery and crops")
    flowers = Batch("Fruit and seasonal flowers")
    make_paths(port, r, road, stone)
    docks(port, r, dock, acc)
    gardens(port, r, wood, green, flowers)
    shelf_cover(green, crowns, port)
    foreground(port, r, stone, wood, flowers, green)
    mat = paint_material()
    strata = "strata" if port == "copperfall" else "limestone"
    textured = {key: paint_material(key) for key in {"meadow", strata, "limestone", "masonry"}}
    for batch, tile in (
        (top, "limestone" if port == "meridian" else "meadow"),
        (cliff, strata),
        (boulder, "limestone"),
        (road, "masonry"),
    ):
        batch.mesh(textured[tile], tile)
    for batch in (stone, dock, acc, wood, green, flowers):
        batch.mesh(mat)
