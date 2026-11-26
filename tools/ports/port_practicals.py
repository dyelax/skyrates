"""Model-space lanterns and four shared lighting sockets per city."""

import math
import bpy
from port_landscape import Batch, sites_for, surface, east, paint_material, pigment


def specs(port):
    s = sites_for(port)
    dock = s["dockworker"]
    x, y, z = dock["berth"]
    sign = east(port)
    jetty = ("jetty", (x - sign * 0.32, y - 1.5, 1.68), (1, 0.55, 0.24), 390, 2.0)
    g = lambda x, y: surface(port, x, y)
    if port == "sunstep":
        m = s["market"]
        return [
            ("orchard-lane", (-4.35, -2.7, g(-4.35, -2.7) + 1.47), (1, 0.52, 0.18), 650, 2.15),
            ("mill", (-6.15, 4.25, g(-6.2, 6.15) + 3.3), (1, 0.65, 0.31), 550, 2.6),
            ("market", (m["x"] + 0.10, m["y"] - 1.58, 2.1), (1, 0.58, 0.24), 720, 2.45),
            jetty,
        ]
    if port == "glasshouse":
        a = s["authority"]
        return [
            ("winterhouse", (-5.1, -3, g(-1.5, 1.1) + 1.6), (1, 0.56, 0.21), 700, 2.1),
            ("glasshouse", (-0.5, -1.3, g(-1.5, 1.1) + 1.65), (1, 0.67, 0.31), 510, 2.3),
            ("beacon", (a["x"], a["y"], a["z"] + 10.7), (1, 0.69, 0.32), 870, 2.05),
            jetty,
        ]
    if port == "copperfall":
        return [
            ("forge", (-1.42, 2.05, g(-1.5, 3.6) + 1.15), (1, 0.22, 0.042), 1200, 2.15),
            ("casting", (4.61, 3.34, g(3.8, 5.7) + 1.16), (1, 0.36, 0.072), 870, 2.5),
            ("keel", (0.45, -6.33, g(0.45, -6.33) + 1.0), (1, 0.59, 0.23), 460, 2.2),
            jetty,
        ]
    return [
        ("observatory", (-1.0, -1.2, g(-2.2, 1.2) + 3.77), (1, 0.60, 0.27), 810, 1.95),
        ("tower", (4.1, 0.48, g(4.6, 2.1) + 3.35), (1, 0.64, 0.29), 690, 2.5),
        ("arcade", (0.55, -4.66, g(0.7, -3.72) + 1.68), (1, 0.56, 0.20), 625, 2.0),
        jetty,
    ]


def lamp_positions(port):
    sign = east(port)
    positions = [
        (-7.5, -4.50),
        (-4.0, -3.05),
        (-0.8, -2.95),
        (2.7, -3.35),
        (5.8, -4.85),
        (8.5, 1.43),
        (11.25, 0.20),
        (14.55, 0.88),
        (-5.8, 4.8),
        (-2.5, 3.4),
    ]
    return [(x * sign, y, surface(port, x * sign, y) + 1.78) for x, y in positions]


def add_practicals(port, anchor):
    poles = Batch("Brass lantern posts and brackets")
    glass = Batch("Evening lamp glass")
    ps = lamp_positions(port)
    for _, p, _, _, _ in specs(port)[-1:]:
        ps.append(p)
    for idx, (x, y, z) in enumerate(ps):
        h = 1.78 if idx < len(ps) - 1 else 1.45
        poles.box(x, y, z - h * 0.5, 0.093, 0.093, h, "#725a3c")
        poles.box(x, y, z - h + 0.12, 0.23, 0.23, 0.25, "#8f805e")
        poles.box(x, y, z + 0.018, 0.32, 0.32, 0.12, "#b69762", math.pi / 4)
        glass.box(x, y, z + 0.17, 0.22, 0.22, 0.30, "#ffcc69", math.pi / 4)
        for dx, dy in ((-0.12, 0), (0.12, 0), (0, -0.12), (0, 0.12)):
            poles.box(x + dx, y + dy, z + 0.17, 0.035, 0.035, 0.34, "#967a4b")
        poles.box(x, y, z + 0.36, 0.36, 0.36, 0.085, "#7e6b47", math.pi / 4)
        poles.box(x, y, z + 0.43, 0.12, 0.12, 0.085, "#b39660")
    poles.mesh(paint_material())
    m = bpy.data.materials.new("Port · amber quay lanterns")
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = pigment("#ffdd9e")
    p.inputs["Emission Color"].default_value = pigment("#ffbd63")
    p.inputs["Emission Strength"].default_value = 0.80
    glass.mesh(m)
    for name, pos, _, _, _ in specs(port):
        anchor("practical-" + name, pos)
