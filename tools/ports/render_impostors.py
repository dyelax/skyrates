"""Render calibrated, transparent harbor views while the full game mesh streams.

blender -b -P tools/ports/render_impostors.py -- --scenes /path/to/editable-scenes
"""

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
PORTS = ("sunstep", "glasshouse", "copperfall", "meridian")


def render_port(port, scenes, output):
    bpy.ops.wm.open_mainfile(filepath=str(scenes / f"{port}.blend"))
    scene = bpy.context.scene
    scene.frame_set(1)
    camera = scene.camera
    camera.data.type = "ORTHO"
    # Eight world units per Blender unit. Keep the world origin exactly centered
    # so the ship and labels keep their bearing across a change of renderer.
    camera.data.ortho_scale = 72
    camera.data.shift_x = camera.data.shift_y = 0
    scene.render.resolution_x = scene.render.resolution_y = 576
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 82
    scene.cycles.samples = 12
    # Fen's optional repaired house is added by the running game.
    garden = bpy.data.objects.get("winter-glass-repaired")
    if garden:
        garden.hide_render = True
    yaw = 0.19 if port in ("sunstep", "copperfall") else -0.19
    for name, elevation, rotation in [("overhead", 1.5, 0), ("harbor", 0.73, yaw), ("counter", 0.415, yaw)]:
        camera.location = 110 * Vector((
            math.cos(elevation) * math.sin(rotation),
            -math.cos(elevation) * math.cos(rotation),
            math.sin(elevation),
        ))
        camera.rotation_euler = (-camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(output / f"flight-impostor-{port}-{name}.webp")
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scenes", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=ROOT / "public" / "art")
    parser.add_argument("--ports", nargs="+", choices=PORTS, default=PORTS)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    args.out.mkdir(parents=True, exist_ok=True)
    for port_id in args.ports:
        render_port(port_id, args.scenes.resolve(), args.out.resolve())
