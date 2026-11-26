"""Keep port colors and unit normals in WebGL-native normalized byte streams."""

import json
import struct
from array import array


def pack(path):
    raw = path.read_bytes()
    size = struct.unpack_from("<I", raw, 12)[0]
    doc = json.loads(raw[20 : 20 + size])
    binary = raw[28 + size :]
    views = doc["bufferViews"]
    ownership = {}
    for i, a in enumerate(doc["accessors"]):
        if "bufferView" in a:
            ownership.setdefault(a["bufferView"], []).append(i)
    semantic = {}
    for mesh in doc["meshes"]:
        for primitive in mesh["primitives"]:
            for key, i in primitive["attributes"].items():
                semantic[i] = key
    out = bytearray()
    quantized = False
    for vid, view in enumerate(views):
        start = view.get("byteOffset", 0)
        data = binary[start : start + view["byteLength"]]
        ids = ownership.get(vid, [])
        if len(ids) == 1:
            i = ids[0]
            a = doc["accessors"][i]
            key = semantic.get(i)
            if (
                key in ("COLOR_0", "NORMAL")
                and a["componentType"] == 5126
                and a["type"] == "VEC3"
                and not a.get("byteOffset")
                and not view.get("byteStride")
            ):
                floats = array("f")
                floats.frombytes(data)
                stride = 4
                vals = bytearray(a["count"] * stride)
                for n in range(a["count"]):
                    for j in range(3):
                        v = floats[3 * n + j]
                        vals[4 * n + j] = (
                            max(-127, min(127, round(v * 127))) % 256
                            if key == "NORMAL"
                            else max(0, min(255, round(v * 255)))
                        )
                    if key == "COLOR_0":
                        vals[4 * n + 3] = 255
                a["normalized"] = True
                a["componentType"] = 5120 if key == "NORMAL" else 5121
                a.pop("max", None)
                a.pop("min", None)
                if key == "NORMAL":
                    quantized = True
                else:
                    a["type"] = "VEC4"
                view["byteStride"] = stride
                data = vals
        while len(out) % 4:
            out.append(0)
        view["byteOffset"] = len(out)
        view["byteLength"] = len(data)
        out.extend(data)
    while len(out) % 4:
        out.append(0)
    doc["buffers"][0]["byteLength"] = len(out)
    if quantized:
        for f in ("extensionsUsed", "extensionsRequired"):
            if "KHR_mesh_quantization" not in doc.setdefault(f, []):
                doc[f].append("KHR_mesh_quantization")
    js = json.dumps(doc, separators=(",", ":"), ensure_ascii=False).encode()
    js += b" " * (-len(js) % 4)
    total = 12 + 8 + len(js) + 8 + len(out)
    path.write_bytes(
        struct.pack("<4sIIII", b"glTF", 2, total, len(js), 0x4E4F534A)
        + js
        + struct.pack("<II", len(out), 0x004E4942)
        + out
    )
