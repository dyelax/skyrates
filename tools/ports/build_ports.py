"""Create the modeled skyports, reusable Blender scenes, and game GLBs.

blender -b -P tools/ports/build_ports.py -- --out /path/to/editable-scenes sunstep glasshouse copperfall meridian
Use --terrain-only while the regional architecture libraries are being edited.
"""

import argparse
import importlib
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
from port_landscape import PORTS, sites_for, east, build_landscape
from pack_glb import pack
from port_practicals import specs, lamp_positions, add_practicals


def anchor(name, loc):
    ob = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    ob.empty_display_size = 0.32


def setup(port, terrain_only):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build_landscape(port)
    sites = sites_for(port)
    if not terrain_only:
        lib = "blender_trade" if port in ("sunstep", "copperfall") else "blender_landmarks"
        importlib.import_module(lib).build_architecture(port, sites)
    add_practicals(port, anchor)
    for key, s in sites.items():
        anchor("service-" + key, (s["x"], s["y"], s["z"]))
        anchor("berth-" + key, s["berth"])
        anchor("npc-" + key, (s["x"] + 0.70, s["y"] - 1.55, s["z"]))
    anchor("player-berth", sites["dockworker"]["berth"])


def lamp(name, kind, loc, color, energy):
    data = bpy.data.lights.new(name, kind)
    data.color = color
    data.energy = energy
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    if kind in ("SUN", "AREA"):
        ob.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob


def camera(name, loc, look, scale):
    data = bpy.data.cameras.new(name)
    cam = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(cam)
    cam.location = loc
    cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    data.type = "ORTHO"
    data.ortho_scale = scale
    data.clip_end = 300
    return cam


def studio(port):
    s = bpy.context.scene
    world = bpy.data.worlds.new("Cool high-altitude skylight")
    world.use_nodes = True
    s.world = world
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.37, 0.55, 0.72, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.42
    sunlight = lamp("Westering gold | key", "SUN", (-21, -27, 25), (1.0, 0.79, 0.55), 3.45)
    sunlight.data.angle = math.radians(9.0)
    sky = lamp("Cool open-sky bounce", "AREA", (16, 5, 25), (0.59, 0.77, 1.0), 1750)
    sky.data.shape = "DISK"
    sky.data.size = 27
    rim = lamp("Terrace rim", "AREA", (-3, 22, 16), (1.0, 0.85, 0.66), 1000)
    rim.data.size = 15
    warm = []
    for name, pos, color, power, spread in specs(port):
        light = lamp("Practical | " + name, "POINT", pos, color, 2)
        light.data.shadow_soft_size = spread * 0.34
        warm.append((light, power))
    for i, pos in enumerate(lamp_positions(port)):
        light = lamp(
            "Street lantern " + str(i + 1),
            "POINT",
            (pos[0], pos[1], pos[2] + 0.24),
            (1.0, 0.55, 0.24),
            0.15,
        )
        light.data.shadow_soft_size = 0.36
        warm.append((light, 46 if i % 3 else 72))
    wide = camera("Harbor | three quarter", (16 * east(port), -62, 39), (0, 0, -1.5), 48)
    close = camera(
        "Harbor | quay and town", (22 * east(port), -46, 24), (3.5 * east(port), 0.8, 0.75), 34
    )
    s.camera = wide
    s.render.engine = "CYCLES"
    s.cycles.samples = 28
    s.cycles.use_denoising = True
    s.cycles.max_bounces = 5
    s.render.resolution_x = 1152
    s.render.resolution_y = 900
    s.render.resolution_percentage = 100
    s.render.image_settings.file_format = "PNG"
    s.render.image_settings.color_mode = "RGBA"
    s.render.film_transparent = True
    s.view_settings.view_transform = "AgX"
    s.view_settings.look = "AgX - Medium High Contrast"
    bpy.context.view_layer.update()
    # Project actual modeled bounds, including the tallest tower and balloon, onto
    # the final camera plane; the entire floating silhouette needs breathing room.
    rotation = wide.rotation_euler.to_quaternion()
    right = rotation @ Vector((1, 0, 0))
    up = rotation @ Vector((0, 1, 0))
    points = [ob.matrix_world @ Vector(p) for ob in s.objects if ob.type == "MESH" for p in ob.bound_box]
    xs = [p.dot(right) for p in points]
    ys = [p.dot(up) for p in points]
    wide.location += right * ((max(xs) + min(xs)) * 0.5 - wide.location.dot(right)) + up * (
        (max(ys) + min(ys)) * 0.5 - wide.location.dot(up)
    )
    wide.data.ortho_scale = 1.11 * max(
        max(xs) - min(xs), (max(ys) - min(ys)) * s.render.resolution_x / s.render.resolution_y
    )
    ng = bpy.data.node_groups.new("Practical lamps | restrained optical halo", "CompositorNodeTree")
    ng.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    grab = ng.nodes.new("CompositorNodeRLayers")
    glow = ng.nodes.new("CompositorNodeGlare")
    out = ng.nodes.new("NodeGroupOutput")
    glow.inputs["Type"].default_value = "Fog Glow"
    glow.inputs["Quality"].default_value = "Medium"
    glow.inputs["Threshold"].default_value = 1.9
    glow.inputs["Strength"].default_value = 0.22
    glow.inputs["Size"].default_value = 0.28
    ng.links.new(grab.outputs["Image"], glow.inputs["Image"])
    ng.links.new(glow.outputs["Image"], out.inputs["Image"])
    s.compositing_node_group = ng
    return wide, close, sunlight, sky, rim, warm


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ports", nargs="+", choices=PORTS)
    ap.add_argument("--terrain-only", action="store_true")
    ap.add_argument("--quick", action="store_true")
    ap.add_argument("--no-renders", action="store_true")
    ap.add_argument(
        "--out",
        type=Path,
        required=True,
        help="Directory for editable .blend files and rendered lighting studies",
    )
    args = ap.parse_args(sys.argv[sys.argv.index("--") + 1 :])
    args.out.mkdir(parents=True, exist_ok=True)
    for port in args.ports:
        tag = port + ("-terrain" if args.terrain_only else "")
        setup(port, args.terrain_only)
        game = (args.out if args.terrain_only else ROOT / "public/art") / ("flight-town-" + tag + ".glb")
        bpy.ops.export_scene.gltf(
            filepath=str(game),
            export_format="GLB",
            export_yup=True,
            export_lights=False,
            export_cameras=False,
            export_materials="EXPORT",
            export_animations=False,
        )
        pack(game)
        wide, close, sun, sky, rim, warm = studio(port)
        s = bpy.context.scene
        world = s.world.node_tree.nodes["Background"]
        emissive = []
        for mat in bpy.data.materials:
            if not mat.use_nodes:
                continue
            node = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if not node:
                continue
            strength = node.inputs["Emission Strength"]
            if (
                strength.default_value > 0.01
                and sum(node.inputs["Emission Color"].default_value[:3]) > 0.01
            ):
                emissive.append((strength, strength.default_value))

        def keys(frame):
            for ob in (sun, sky, rim, *[l for l, _ in warm]):
                ob.data.keyframe_insert(data_path="energy", frame=frame)
                ob.data.keyframe_insert(data_path="color", frame=frame)
            for socket in (world.inputs[0], world.inputs[1], *[e for e, _ in emissive]):
                socket.keyframe_insert(data_path="default_value", frame=frame)

        keys(1)
        sun.data.energy = 0.82
        sun.data.color = (0.68, 0.76, 1.0)
        sky.data.energy = 1650
        sky.data.color = (0.52, 0.69, 1.0)
        rim.data.energy = 850
        rim.data.color = (0.89, 0.66, 0.58)
        world.inputs[0].default_value = (0.24, 0.36, 0.62, 1)
        world.inputs[1].default_value = 0.58
        for light, energy in warm:
            light.data.energy = energy
        for socket, day in emissive:
            socket.default_value = max(3.6, day * 5.0)
        keys(120)
        s.timeline_markers.new("Golden hour", frame=1)
        s.timeline_markers.new("Lantern light", frame=120)
        s.frame_start = 1
        s.frame_end = 120
        s.frame_set(1)
        blend = args.out / (tag + ".blend")
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=True)
        if args.no_renders:
            continue
        if args.quick:
            s.cycles.samples = 4
            s.render.resolution_percentage = 64

        def render(name, cam):
            s.camera = cam
            s.render.filepath = str(args.out / (tag + "-" + name + ".png"))
            bpy.ops.render.render(write_still=True)

        render("golden", wide)
        if not args.quick:
            render("quay", close)
        s.frame_set(120)
        render("dusk", wide)
        print("Finished", tag, game.stat().st_size, "bytes", flush=True)


main()
