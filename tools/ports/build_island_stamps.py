"""Blender settlement and grove atlas for minor islands.

blender -b -P tools/ports/build_island_stamps.py
Columns: Sunstep, Glasshouse, Copperfall, Meridian. Rows: homes, work, landmark,
grove. Cells are 256 square; the local ground origin projects to (128, 164).
The final PNG-to-WebP packing step uses host python3 and Pillow.
"""

import math
from pathlib import Path
import random
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
ATLAS = HERE.parents[1] / "public/art/islet-settlements.webp"
PORTS = ("sunstep", "glasshouse", "copperfall", "meridian")
ROWS = ("homes", "work", "landmark", "grove")
CELL = 256
ORIGIN_Y = 164 / CELL


def pack(directory, target):
    from PIL import Image

    atlas = Image.new("RGBA", (CELL * 4, CELL * 4))
    for col, port in enumerate(PORTS):
        for row, kind in enumerate(ROWS):
            img = Image.open(directory / f"{port}-{kind}.png").convert("RGBA")
            img = img.resize((CELL, CELL), Image.Resampling.LANCZOS)
            atlas.paste(img, (col * CELL, row * CELL))
    atlas.save(target, quality=91, method=6)


if "--pack" in sys.argv:
    pack(Path(sys.argv[-2]), Path(sys.argv[-1]))
    sys.exit(0)

sys.dont_write_bytecode = True
sys.path.insert(0, str(HERE))
import bpy
from mathutils import Vector
import blender_landmarks as reach
import blender_trade as yard
from port_landscape import Batch, COLORS, paint_material


def cottage(x, y, scale=1, yaw=0, industrial=False):
    yard.house(
        "copperfall" if industrial else "sunstep",
        "Hill cottage",
        x,
        y,
        2.65 * scale,
        3.4 * scale,
        2.12 * scale,
        yaw,
        industrial,
        base=0,
    )


def scaled(scale, build, *args):
    before = set(bpy.context.scene.objects)
    build(*args)
    for obj in set(bpy.context.scene.objects) - before:
        # Scale around the builder's declared ground origin, including child
        # pieces such as the orbit on the top of the transit spire.
        pivot = Vector((args[0], args[1], 0))
        obj.location = pivot + (obj.location - pivot) * scale
        obj.scale *= scale


def planting(port, trees):
    """Fruit crowns, weathered pines and narrow cypresses in the parent town's pigments."""
    colors = COLORS[port]["leaves"]
    foliage = Batch("Wind-shaped miniature orchard")
    trunk = Batch("Miniature orchard bark")
    rng = random.Random(170 + PORTS.index(port))
    for x, y, h, kind in trees:
        z0 = Vector((x, y, 0))
        top = Vector((x + h * 0.025, y + h * 0.025, h * 0.62))
        trunk.beam(z0, top, 0.12 * h, 0.12 * h, "#756249")
        if kind in ("pine", "snow"):
            for tier in range(4):
                t = tier * 0.155
                z = h * (0.11 + t)
                r = h * (0.35 - 0.058 * tier)
                rim = []
                mid = []
                for j in range(11):
                    a = j * math.tau / 11 + tier * 0.61
                    radius = r * rng.uniform(0.69, 0.87) if j % 2 else r * rng.uniform(1.02, 1.21)
                    delta = Vector((radius * math.cos(a), radius * math.sin(a), 0))
                    rim.append(Vector((x, y, z + rng.uniform(0, 0.12 * h))) + delta)
                    mid.append(Vector((x, y, z + 0.24 * h)) + delta * 0.52)
                tip = Vector((x + 0.03 * h, y + 0.02 * h, z + 0.43 * h))
                for j, lo in enumerate(rim):
                    k = (j + 1) % len(rim)
                    foliage.poly([lo, rim[k], mid[k], mid[j]], colors[(j + tier) % 3])
                    foliage.poly(
                        [mid[j], mid[k], tip],
                        "#dfded0" if kind == "snow" and (j + tier) % 5 < 4 else colors[1],
                    )
        elif kind == "cypress":
            for tier in range(4):
                level = 0.14 + tier * 0.16
                radius = h * (0.18 - 0.025 * tier)
                foliage.lump(
                    x + 0.04 * h * math.sin(tier),
                    y,
                    level * h,
                    radius,
                    radius * 0.85,
                    h * 0.40,
                    colors[tier % 3],
                    rng,
                    7,
                )
        else:
            for k in range(7):
                a = k * 2.4
                e = h * 0.25 * (0.4 + 0.6 * math.sin(k / 6 * math.pi))
                at = Vector(
                    (x + e * math.cos(a), y + e * math.sin(a), h * (0.46 + 0.15 * math.cos(k * 0.76)))
                )
                trunk.beam(z0 + Vector((0, 0, h * 0.24)), at, 0.08 * h, 0.075 * h, "#6d5743")
                foliage.lump(*at, h * 0.27, h * 0.24, h * 0.32, colors[(k // 2) % 3], rng, 8)
                # Pale leaves interrupt the crown's round outline. Small islands
                # keep the fruit visible at 50px without a speckled noise field.
                for j in range(8):
                    angle = j * 2.40 + k
                    outward = Vector((math.cos(angle), math.sin(angle), 0))
                    sideways = Vector((-outward.y, outward.x, 0))
                    base = at + outward * (0.18 * h) + Vector((0, 0, rng.uniform(0.05, 0.24) * h))
                    foliage.poly(
                        [
                            base,
                            base + sideways * (0.068 * h),
                            base + outward * (0.15 * h) + Vector((0, 0, 0.08 * h)),
                            base - sideways * (0.055 * h),
                        ],
                        colors[2] if j % 3 else "#9aa653",
                    )
                if kind == "fruit":
                    for j in range(6):
                        a = rng.uniform(0, math.tau)
                        f = at + Vector(
                            (0.225 * h * math.cos(a), 0.2 * h * math.sin(a), rng.uniform(0.04, 0.25) * h)
                        )
                        foliage.lump(
                            *f,
                            h * 0.047,
                            h * 0.049,
                            h * 0.068,
                            rng.choice(("#e4ad5a", "#dab85c", "#b96750")),
                            rng,
                            5,
                        )
    mat = paint_material()
    trunk.mesh(mat)
    foliage.mesh(mat)


def frames(x, y):
    p = yard.Piece("Ship frame and copper gantry", x, y, 0, -0.24)
    yard.cradle(p, 0, 0)
    yard.gantry(p, -2, 1.2)
    p.finish()


def shed(x, y, w, d, h, angle):
    p = yard.Piece("Copper fitting shed", x, y, 0, angle)
    yard.yard_shed(p, 0, 0, w, d, h)
    p.finish()


def kiln(x, y):
    p = yard.Piece("Twin chimneys and annealing kiln", x, y, 0, 0.18)
    yard.chimney(p, -0.65, 0.58, 0.64, 6.45)
    yard.chimney(p, 1.12, 1.05, 0.43, 4.20)
    p.box(0, -0.50, 0.83, 2.35, 2.4, 1.68, "brick")
    p.box(0, -1.72, 0.82, 1.20, 0.12, 1.1, "dark iron")
    p.box(0, -1.79, 0.70, 0.80, 0.05, 0.65, "forge glow")
    p.finish()


def tree_wisteria(x, y, s, seed):
    reach.wisteria_stand(x, y, 0, seed, s)


def survey(x, y):
    p = reach.Mason("Small brass survey platform", x, y, 0, -0.22)
    p.drum(0, 0, [(0, 2.2), (0.35, 2.23), (0.56, 2.02)], reach.IVORY, 12)
    p.drum(0, 0, [(0.55, 0.68), (0.72, 0.77), (1.45, 0.45), (1.65, 0.58)], reach.GOLD, 9)
    reach.dial(p, 2.65, 1.26)
    p.finish()


def sunstep(kind):
    if kind == "homes":
        cottage(-2.25, 0.55, 1.07, -0.18)
        cottage(1.13, 1.10, 0.93, 0.31)
        cottage(2.0, -1.55, 0.68, 0.06)
        trees = [(-3.30, -1.80, 1.70, "fruit"), (3.33, 1.68, 3.45, "cypress")]
    elif kind == "work":
        scaled(0.63, yard.windmill, 1.05, 1.05, 0)
        cottage(-2.55, 0.27, 0.84, -0.22)
        trees = [
            (-3.0, -1.75, 1.92, "fruit"),
            (-0.88, -1.83, 1.84, "fruit"),
            (3.64, 0.54, 2.8, "cypress"),
        ]
    elif kind == "landmark":
        yard.windmill(-0.25, -0.12, 0)
        trees = [
            (-3.42, 1.68, 3.95, "cypress"),
            (2.75, -0.75, 2.42, "fruit"),
            (3.11, 1.05, 2.95, "cypress"),
        ]
    else:
        trees = [
            (-3.07, 0.81, 2.87, "fruit"),
            (-1.57, -1.03, 3.16, "fruit"),
            (0.55, 0.66, 3.78, "fruit"),
            (2.43, -1.18, 2.67, "fruit"),
            (2.21, 1.89, 4.86, "cypress"),
        ]
    planting("sunstep", trees)


def glasshouse(kind):
    if kind == "homes":
        cottage(-1.75, 0.42, 1.02, -0.28)
        reach.conservatory("Glazier's courtyard lodge", 1.26, 1.08, 0, 3.65, 1.18, 1.35, 0.24)
        reach.round_pavilion("Lantern garden kiosk", 2.55, -1.30, 0, 1.08, True)
        tree_wisteria(-2.63, -1.64, 1.03, 823)
    elif kind == "work":
        reach.conservatory("Brass-ribbed nursery", -0.05, 0.92, 0, 7.24, 1.58, 1.54, 0.16)
        reach.arcaded_terrace("Propagation tables", 0.52, -1.55, 0, 4.1, 0.40, 0.12)
        tree_wisteria(-3.1, -1.0, 1.16, 127)
    elif kind == "landmark":
        scaled(0.58, reach.lantern, 1.05, 0.68, 0)
        reach.round_pavilion("Cutting glasshouse", -1.90, -0.62, 0, 1.54, True)
        tree_wisteria(2.75, -0.77, 0.88, 417)
    else:
        tree_wisteria(-2.65, 1.01, 1.65, 357)
        tree_wisteria(0.25, -0.98, 1.78, 425)
        tree_wisteria(2.66, 1.28, 1.35, 829)


def copperfall(kind):
    if kind == "homes":
        cottage(-2.27, 0.52, 1.06, 0.17, True)
        cottage(1.28, 1.46, 0.89, -0.39, True)
        shed(1.85, -1.32, 2.33, 2.18, 1.33, 0.15)
        trees = [(-3.03, -1.55, 2.42, "pine")]
    elif kind == "work":
        frames(-1.15, -0.22)
        shed(2.43, 0.69, 2.56, 3.70, 1.92, -0.32)
        trees = []
    elif kind == "landmark":
        kiln(0.68, 0.01)
        shed(-2.18, -0.54, 2.75, 3.55, 1.8, 0.2)
        trees = [(2.55, -1.28, 2.14, "pine")]
    else:
        p = yard.Piece("Abandoned rail siding", 1.12, 0.25, 0, 0.29)
        for i in range(7):
            p.box(0.05, -2.19 + i * 0.65, 0.09, 1.62, 0.22, 0.18, "oak framing")
        for x in (-0.52, 0.52):
            p.box(x, -0.22, 0.19, 0.12, 4.75, 0.18, "iron plate")
        p.finish()
        trees = [(-2.4, 0.68, 3.80, "pine"), (-0.80, -1.22, 2.62, "pine"), (2.05, 1.53, 2.88, "pine")]
    if trees:
        planting("copperfall", trees)


def meridian(kind):
    if kind == "homes":
        reach.round_pavilion("Surveyor lodge", -1.59, 0.79, 0, 1.64, False)
        reach.observatory("Surveyor roof", 1.51, -0.51, 0, 1.36)
        trees = [(2.66, 1.64, 3.15, "snow"), (-2.54, -1.35, 2.24, "snow")]
    elif kind == "work":
        survey(0.73, 0.05)
        reach.round_pavilion("Chart shelter", -2.36, -0.40, 0, 1.1, False)
        trees = [(2.74, 0.90, 2.93, "snow"), (2.07, -1.40, 1.76, "snow")]
    elif kind == "landmark":
        scaled(0.44, reach.spire, 1.19, 0.88, 0)
        reach.observatory("Transit dome", -1.66, -0.48, 0, 1.85)
        trees = [(2.91, -0.70, 2.43, "snow")]
    else:
        trees = [
            (-2.92, 0.79, 3.48, "snow"),
            (-1.45, -1.04, 2.45, "snow"),
            (0.54, 0.85, 4.56, "snow"),
            (2.32, -0.9, 2.79, "snow"),
            (2.56, 1.32, 3.86, "pine"),
        ]
    planting("meridian", trees)


def render(port, kind, directory):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    {"sunstep": sunstep, "glasshouse": glasshouse, "copperfall": copperfall, "meridian": meridian}[port](
        kind
    )
    scene = bpy.context.scene
    scene.world = bpy.data.worlds.new("Open blue sky")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.59, 0.72, 0.86, 1)
    bg.inputs[1].default_value = 0.75
    sun = bpy.data.lights.new("Warm afternoon", "SUN")
    sun.energy = 3.65
    sun.angle = math.radians(14)
    sun.color = (1, 0.88, 0.66)
    key = bpy.data.objects.new("Warm afternoon", sun)
    scene.collection.objects.link(key)
    key.rotation_euler = Vector((9, 7, -13)).to_track_quat("-Z", "Y").to_euler()
    camera = bpy.data.cameras.new("Isometric settlement")
    camera.type = "ORTHO"
    obj = bpy.data.objects.new("Isometric settlement", camera)
    scene.collection.objects.link(obj)
    scene.camera = obj
    direction = Vector((0.34, -0.67, 1.04)).normalized()
    obj.location = direction * 30
    obj.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
    bpy.context.view_layer.update()
    quat = obj.rotation_euler.to_quaternion()
    right = quat @ Vector((1, 0, 0))
    up = quat @ Vector((0, 1, 0))
    # Use actual mesh vertices. Bounding boxes of a diagonal pitched roof or
    # a windmill sail would reserve empty space around the high corners.
    points = [
        mesh.matrix_world @ v.co
        for mesh in scene.objects
        if mesh.type == "MESH"
        for v in mesh.data.vertices
    ]
    xs = [v.dot(right) for v in points]
    ys = [v.dot(up) for v in points]
    camera.ortho_scale = max(
        max(map(abs, xs)) / 0.4375, max(ys) / (ORIGIN_Y - 0.043), -min(ys) / (1 - ORIGIN_Y - 0.043)
    )
    obj.location += up * ((ORIGIN_Y - 0.5) * camera.ortho_scale)
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 20
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 4
    scene.render.resolution_x = scene.render.resolution_y = 384
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.filepath = str(directory / f"{port}-{kind}.png")
    bpy.ops.render.render(write_still=True)


with tempfile.TemporaryDirectory() as temporary:
    directory = Path(temporary)
    for port in PORTS:
        for kind in ROWS:
            render(port, kind, directory)
    subprocess.run(
        ["python3", str(Path(__file__).resolve()), "--pack", str(directory), str(ATLAS)], check=True
    )
