"""Build the Vig 3D bust (BRD-001) from the modeller's GLB: web GLB, Apple USDZ, framing JSON, previews.

    python3 -I scripts/brand/vig_3d.py --src <norviq_lynx_revised_bust_no_base.glb> --out scripts/brand/out/vig-3d

Standard library only, plus macOS `sips` (texture decode) and `xcrun usdcat`/`usdzip` (USDZ).
See docs/vig-3d.md for what it fixes in the source and why.

The source file is untrusted data:
- it is copied into a fresh private temp directory and parsed there; nothing in it is executed;
- external URIs (buffers or images outside the GLB) are refused;
- every accessor and buffer view is bounds-checked against the binary chunk;
- --out must be new or empty; subprocesses get argv lists, never a shell.
"""

import argparse
import hashlib
import json
import math
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

FRONT_MESH = "01_reference_mapped_sculpt_surface"
BACK_MESH = "02_reconstructed_back_skin"
SIDE_MESH = "03_volumetric_sculpt_sides"

# Enforced limits (exit 1 if exceeded). docs/vig-3d.md "Enforced limits".
MAX_TRIANGLES = 50_000
MAX_GLB_BYTES = 1_500_000
MAX_TEXTURE_SIDE = 1024
MAX_DRAW_CALLS = 3
MIN_COVERAGE = 0.995  # share of source front cells the resampled mesh still covers

ALPHA_CUTOFF = 0.5
FOV_DEGREES = 28.0
FRAME_MARGIN = 1.12  # vertical breathing room around the bust at rest


def fail(msg):
    print(f"vig_3d: error: {msg}", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------- reading the GLB (untrusted)

COMPONENT = {5126: ("f", 4), 5125: ("I", 4), 5123: ("H", 2), 5121: ("B", 1)}
WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def read_glb(data):
    if len(data) < 20:
        fail("source is too small to be a GLB")
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or length != len(data):
        fail("source is not a glTF 2.0 binary with a consistent length")
    chunks, off = [], 12
    while off < len(data):
        if off + 8 > len(data):
            fail("truncated chunk header")
        size, kind = struct.unpack_from("<II", data, off)
        if off + 8 + size > len(data):
            fail("chunk runs past the end of the file")
        chunks.append((kind, data[off + 8 : off + 8 + size]))
        off += 8 + size
    if len(chunks) < 2 or chunks[0][0] != 0x4E4F534A or chunks[1][0] != 0x004E4942:
        fail("expected a JSON chunk followed by a BIN chunk")
    doc = json.loads(chunks[0][1].decode("utf-8"))
    binary = chunks[1][1]
    for buf in doc.get("buffers", []):
        if "uri" in buf:
            fail("external buffer URIs are refused")
    for img in doc.get("images", []):
        if "uri" in img:
            fail("external image URIs are refused")
    return doc, binary


def accessor(doc, binary, index):
    acc = doc["accessors"][index]
    if acc.get("sparse"):
        fail("sparse accessors are not supported")
    fmt, size = COMPONENT.get(acc["componentType"], (None, 0))
    if fmt is None:
        fail(f"unsupported component type {acc['componentType']}")
    width = WIDTH[acc["type"]]
    view = doc["bufferViews"][acc["bufferView"]]
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    stride = view.get("byteStride", size * width)
    count = acc["count"]
    end = start + stride * (count - 1) + size * width if count else start
    if end > view.get("byteOffset", 0) + view["byteLength"] or end > len(binary):
        fail(f"accessor {index} runs past its buffer view")
    out = []
    for i in range(count):
        vals = struct.unpack_from(f"<{width}{fmt}", binary, start + i * stride)
        out.append(vals if width > 1 else vals[0])
    return out


def mesh_by_name(doc, name):
    for mesh in doc.get("meshes", []):
        if mesh.get("name") == name:
            if len(mesh["primitives"]) != 1:
                fail(f"mesh {name} must have exactly one primitive")
            return mesh["primitives"][0]
    fail(f"source has no mesh named {name!r}; this script expects the 2026-11-13 lynx bust layout")


def image_bytes(doc, binary, index):
    img = doc["images"][index]
    view = doc["bufferViews"][img["bufferView"]]
    start = view.get("byteOffset", 0)
    if start + view["byteLength"] > len(binary):
        fail("image runs past the binary chunk")
    if img.get("mimeType") != "image/png":
        fail("expected a PNG texture")
    return binary[start : start + view["byteLength"]]


# ---------------------------------------------------------------- texture (via sips -> BMP)


def decode_png_with_sips(png, workdir):
    src = workdir / "texture-src.png"
    bmp = workdir / "texture-src.bmp"
    src.write_bytes(png)
    subprocess.run(["sips", "-s", "format", "bmp", str(src), "--out", str(bmp)], check=True, capture_output=True)
    b = bmp.read_bytes()
    if b[:2] != b"BM":
        fail("sips did not produce a BMP")
    pixel_offset = struct.unpack_from("<I", b, 10)[0]
    header_size = struct.unpack_from("<I", b, 14)[0]
    width, height = struct.unpack_from("<ii", b, 18)
    bpp, compression = struct.unpack_from("<HI", b, 28)
    if bpp != 32 or compression not in (0, 3) or header_size < 56:
        fail(f"unexpected BMP layout from sips (bpp={bpp}, compression={compression})")
    if compression == 3:
        masks = struct.unpack_from("<4I", b, 54)
    else:
        masks = (0x00FF0000, 0x0000FF00, 0x000000FF, 0xFF000000)
    shifts = [(m & -m).bit_length() - 1 if m else None for m in masks]
    top_down = height < 0
    height = abs(height)
    rgba = bytearray(width * height * 4)
    for row in range(height):
        src_row = row if top_down else height - 1 - row
        base = pixel_offset + src_row * width * 4
        words = struct.unpack_from(f"<{width}I", b, base)
        o = row * width * 4
        for w in words:
            rgba[o] = (w & masks[0]) >> shifts[0]
            rgba[o + 1] = (w & masks[1]) >> shifts[1]
            rgba[o + 2] = (w & masks[2]) >> shifts[2]
            rgba[o + 3] = (w & masks[3]) >> shifts[3] if shifts[3] is not None else 255
            o += 4
    return width, height, rgba


def png_bytes(width, height, rgba, channels=4):
    color_type = {3: 2, 4: 6}[channels]
    stride = width * channels
    raw = bytearray()
    prev = bytes(stride)
    for y in range(height):
        row = rgba[y * stride : (y + 1) * stride]
        raw.append(2)  # "Up" filter: compresses this kind of image well and is cheap
        raw.extend(bytes((row[i] - prev[i]) & 255 for i in range(stride)))
        prev = row

    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, color_type, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")


# ---------------------------------------------------------------- grid resample


def build_grid(front_pos, front_idx, back_pos, back_idx):
    """The source front and back are height fields over a regular (x, z) grid. Index them."""
    xs = sorted({round(p[0], 5) for p in front_pos + back_pos})
    diffs = sorted(b - a for a, b in zip(xs, xs[1:]) if b - a > 1e-6)
    if not diffs:
        fail("cannot detect a grid pitch")
    pitch = diffs[len(diffs) // 2]
    x0 = min(p[0] for p in front_pos + back_pos)
    z0 = min(p[2] for p in front_pos + back_pos)

    def key(p):
        i, k = (p[0] - x0) / pitch, (p[2] - z0) / pitch
        ri, rk = round(i), round(k)
        if abs(i - ri) > 0.05 or abs(k - rk) > 0.05:
            fail("source front/back are not on a regular grid; a grid resample would be wrong")
        return ri, rk

    def surface(pos):
        nodes = {}
        for p in pos:
            nodes.setdefault(key(p), p[1])
        return nodes

    front, back = surface(front_pos), surface(back_pos)
    cells = set()
    for a, b, c in zip(front_idx[0::3], front_idx[1::3], front_idx[2::3]):
        ks = [key(front_pos[a]), key(front_pos[b]), key(front_pos[c])]
        i0, k0 = min(k[0] for k in ks), min(k[1] for k in ks)
        if max(k[0] for k in ks) - i0 > 1 or max(k[1] for k in ks) - k0 > 1:
            fail("a front triangle spans more than one grid cell")
        cells.add((i0, k0))
    return pitch, x0, z0, front, back, cells


def resample(pitch, front, back, cells, stride):
    """Coarse cells of `stride` fine cells. A coarse cell exists if any fine cell under it exists.
    A coarse corner takes the fine height there, or the mean of fine nodes within `stride`."""
    coarse = {(i // stride, k // stride) for i, k in cells}

    def height(nodes, I, K):
        fi, fk = I * stride, K * stride
        if (fi, fk) in nodes:
            return nodes[(fi, fk)]
        near = [nodes[(fi + di, fk + dk)] for di in range(-stride, stride + 1) for dk in range(-stride, stride + 1) if (fi + di, fk + dk) in nodes]
        return sum(near) / len(near) if near else None

    corners = {}
    kept = set()
    for I, K in coarse:
        quad = [(I, K), (I + 1, K), (I, K + 1), (I + 1, K + 1)]
        ok = True
        for c in quad:
            if c not in corners:
                f, b = height(front, *c), height(back, *c)
                corners[c] = None if f is None or b is None else (f, b)
            ok = ok and corners[c] is not None
        if ok:
            kept.add((I, K))
    covered = sum(1 for i, k in cells if (i // stride, k // stride) in kept)
    return kept, {c: v for c, v in corners.items() if v is not None}, covered / len(cells)


def fit_planar_uv(front_pos, uvs):
    """The source UVs are a planar projection: u = a*x + c, v = b*z + d. Fit and verify."""

    def fit(xs, ys):
        n = len(xs)
        mx, my = sum(xs) / n, sum(ys) / n
        sxx = sum((x - mx) ** 2 for x in xs)
        slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
        icpt = my - slope * mx
        worst = max(abs(slope * x + icpt - y) for x, y in zip(xs, ys))
        return slope, icpt, worst

    a, c, eu = fit([p[0] for p in front_pos], [t[0] for t in uvs])
    b, d, ev = fit([p[2] for p in front_pos], [t[1] for t in uvs])
    if max(eu, ev) > 1e-4:
        fail(f"source UVs are not a planar projection (max error {max(eu, ev):.2e})")
    return lambda x, z: (a * x + c, b * z + d)


# ---------------------------------------------------------------- geometry helpers


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def norm(a):
    n = math.sqrt(dot(a, a)) or 1.0
    return (a[0] / n, a[1] / n, a[2] / n)


def smooth_normals(points, tris):
    acc = [[0.0, 0.0, 0.0] for _ in points]
    for a, b, c in tris:
        n = cross(sub(points[b], points[a]), sub(points[c], points[a]))  # area-weighted
        for v in (a, b, c):
            acc[v][0] += n[0]
            acc[v][1] += n[1]
            acc[v][2] += n[2]
    return [norm(tuple(n)) for n in acc]


def oriented(points, a, b, c, want):
    n = cross(sub(points[b], points[a]), sub(points[c], points[a]))
    return (a, b, c) if dot(n, want) >= 0 else (a, c, b)


# ---------------------------------------------------------------- writing glTF


def write_glb(path, prims, materials, texture_png):
    blob = bytearray()
    views, accessors = [], []

    def add_view(data, target=None):
        while len(blob) % 4:
            blob.append(0)
        view = {"buffer": 0, "byteOffset": len(blob), "byteLength": len(data)}
        if target:
            view["target"] = target
        blob.extend(data)
        views.append(view)
        return len(views) - 1

    def add_floats(rows, kind, minmax=False):
        flat = [v for r in rows for v in r]
        view = add_view(struct.pack(f"<{len(flat)}f", *flat), 34962)
        acc = {"bufferView": view, "componentType": 5126, "count": len(rows), "type": kind}
        if minmax:
            acc["min"] = [min(r[i] for r in rows) for i in range(len(rows[0]))]
            acc["max"] = [max(r[i] for r in rows) for i in range(len(rows[0]))]
        accessors.append(acc)
        return len(accessors) - 1

    def add_indices(tris, vertex_count):
        flat = [i for t in tris for i in t]
        fmt, ctype = ("H", 5123) if vertex_count < 65536 else ("I", 5125)
        view = add_view(struct.pack(f"<{len(flat)}{fmt}", *flat), 34963)
        accessors.append({"bufferView": view, "componentType": ctype, "count": len(flat), "type": "SCALAR"})
        return len(accessors) - 1

    gl_prims = []
    for prim in prims:
        attrs = {"POSITION": add_floats(prim["points"], "VEC3", True), "NORMAL": add_floats(prim["normals"], "VEC3")}
        if prim.get("uvs"):
            attrs["TEXCOORD_0"] = add_floats(prim["uvs"], "VEC2")
        gl_prims.append({"attributes": attrs, "indices": add_indices(prim["tris"], len(prim["points"])), "material": prim["material"]})
    image_view = add_view(texture_png)
    doc = {
        "asset": {"version": "2.0", "generator": "norviq-web-v2 scripts/brand/vig_3d.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"name": "Vig", "mesh": 0}],
        "meshes": [{"name": "Vig", "primitives": gl_prims}],
        "materials": materials,
        "textures": [{"sampler": 0, "source": 0}],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
        "images": [{"bufferView": image_view, "mimeType": "image/png"}],
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": len(blob)}],
    }
    text = json.dumps(doc, separators=(",", ":")).encode()
    text += b" " * (-len(text) % 4)
    blob.extend(b"\0" * (-len(blob) % 4))
    total = 12 + 8 + len(text) + 8 + len(blob)
    Path(path).write_bytes(
        struct.pack("<4sII", b"glTF", 2, total) + struct.pack("<I4s", len(text), b"JSON") + text + struct.pack("<I4s", len(blob), b"BIN\0") + blob
    )
    return total


# ---------------------------------------------------------------- writing USD


def write_usdz(path, prims, looks, texture_name, workdir):
    def tuples(rows, digits):
        return ", ".join("(" + ", ".join(f"{v:.{digits}g}" for v in r) + ")" for r in rows)

    lines = ["#usda 1.0", "(", '    defaultPrim = "Vig"', "    metersPerUnit = 1", '    upAxis = "Y"', ")", "",
             'def Xform "Vig" (', '    kind = "component"', ")", "{", '    def Scope "Materials"', "    {"]  # fmt: skip
    for name, look in looks.items():
        root = f"/Vig/Materials/{name}"
        lines += [f'        def Material "{name}"', "        {", f"            token outputs:surface.connect = <{root}/Surface.outputs:surface>",
                  '            def Shader "Surface"', "            {", '                uniform token info:id = "UsdPreviewSurface"',
                  f'                float inputs:roughness = {look["roughness"]}', f'                float inputs:metallic = {look["metallic"]}']  # fmt: skip
        if look.get("textured"):
            lines += [f"                color3f inputs:diffuseColor.connect = <{root}/Texture.outputs:rgb>",
                      f"                float inputs:opacity.connect = <{root}/Texture.outputs:a>",
                      f"                float inputs:opacityThreshold = {ALPHA_CUTOFF}",
                      "                token outputs:surface", "            }",
                      '            def Shader "Texture"', "            {", '                uniform token info:id = "UsdUVTexture"',
                      f"                asset inputs:file = @{texture_name}@",
                      '                token inputs:sourceColorSpace = "sRGB"',
                      '                token inputs:wrapS = "clamp"', '                token inputs:wrapT = "clamp"',
                      f"                float2 inputs:st.connect = <{root}/Reader.outputs:result>",
                      "                float3 outputs:rgb", "                float outputs:a", "            }",
                      '            def Shader "Reader"', "            {", '                uniform token info:id = "UsdPrimvarReader_float2"',
                      '                string inputs:varname = "st"', "                float2 outputs:result", "            }", "        }"]  # fmt: skip
        else:
            lines += [f'                color3f inputs:diffuseColor = {tuples([look["color"]], 5)}', "                token outputs:surface", "            }", "        }"]
    lines.append("    }")
    for prim in prims:
        name = prim["name"]
        lines += [f'    def Mesh "{name}" (', '        prepend apiSchemas = ["MaterialBindingAPI"]', "    )", "    {",
                  "        uniform bool doubleSided = 0",
                  f"        int[] faceVertexCounts = [{', '.join('3' for _ in prim['tris'])}]",
                  f"        int[] faceVertexIndices = [{', '.join(str(i) for t in prim['tris'] for i in t)}]",
                  f"        point3f[] points = [{tuples(prim['points'], 6)}]",
                  f'        normal3f[] normals = [{tuples(prim["normals"], 4)}] (', '            interpolation = "vertex"', "        )"]  # fmt: skip
        if prim.get("uvs"):
            st = [(u, 1.0 - v) for u, v in prim["uvs"]]  # USD st origin is bottom-left
            lines += [f"        texCoord2f[] primvars:st = [{tuples(st, 6)}] (", '            interpolation = "vertex"', "        )"]
        lines += ['        uniform token subdivisionScheme = "none"', f"        rel material:binding = </Vig/Materials/{prim['look']}>", "    }"]
    lines.append("}")
    usda = workdir / "Vig.usda"
    usdc = workdir / "Vig.usdc"
    usda.write_text("\n".join(lines) + "\n")
    subprocess.run(["xcrun", "usdcat", str(usda), "-o", str(usdc)], check=True, capture_output=True)
    target = Path(path).resolve()
    subprocess.run(["xcrun", "usdzip", str(target), usdc.name, texture_name], check=True, capture_output=True, cwd=workdir)
    return target.stat().st_size


# ---------------------------------------------------------------- previews (stdlib rasteriser)


def render_preview(path, prims, looks, tex, yaw, pitch, extent, size=420):
    tw, th, trgba = tex
    cy, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    cp, sp = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))

    def rotate(p):  # yaw about Y, then pitch about X
        x, y, z = p[0] * cy + p[2] * sy, p[1], -p[0] * sy + p[2] * cy
        return (x, y * cp - z * sp, y * sp + z * cp)

    def view(p):  # camera looks down -Z from +Z at the bust's mid-height
        return rotate((p[0], p[1] - 0.5, p[2]))

    scale = size / (FRAME_MARGIN * max(1.0, extent))
    img = bytearray([238, 238, 242] * size * size)
    zbuf = [-1e9] * (size * size)
    light = norm((-0.35, 0.45, 1.0))
    for prim in prims:
        look = looks[prim["look"]]
        pts = [view(p) for p in prim["points"]]
        nrm = [rotate(n) for n in prim["normals"]]
        scr = [(size / 2 + p[0] * scale, size / 2 - p[1] * scale, p[2]) for p in pts]
        uvs = prim.get("uvs")
        for a, b, c in prim["tris"]:
            (x0, y0, z0), (x1, y1, z1), (x2, y2, z2) = scr[a], scr[b], scr[c]
            area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
            if area >= 0:  # back-facing on screen (y is flipped)
                continue
            for px in range(max(0, int(min(x0, x1, x2))), min(size - 1, int(max(x0, x1, x2))) + 1):
                for py in range(max(0, int(min(y0, y1, y2))), min(size - 1, int(max(y0, y1, y2))) + 1):
                    qx, qy = px + 0.5, py + 0.5
                    w0 = ((x1 - qx) * (y2 - qy) - (x2 - qx) * (y1 - qy)) / area
                    w1 = ((x2 - qx) * (y0 - qy) - (x0 - qx) * (y2 - qy)) / area
                    w2 = 1 - w0 - w1
                    if w0 < 0 or w1 < 0 or w2 < 0:
                        continue
                    z = w0 * z0 + w1 * z1 + w2 * z2
                    i = py * size + px
                    if z <= zbuf[i]:
                        continue
                    if uvs:
                        u = w0 * uvs[a][0] + w1 * uvs[b][0] + w2 * uvs[c][0]
                        v = w0 * uvs[a][1] + w1 * uvs[b][1] + w2 * uvs[c][1]
                        ti = (min(th - 1, max(0, int(v * th))) * tw + min(tw - 1, max(0, int(u * tw)))) * 4
                        if trgba[ti + 3] < 255 * ALPHA_CUTOFF:
                            continue
                        base = (trgba[ti] / 255, trgba[ti + 1] / 255, trgba[ti + 2] / 255)
                    else:
                        base = look["color_srgb"]
                    n = norm(tuple(w0 * nrm[a][k] + w1 * nrm[b][k] + w2 * nrm[c][k] for k in range(3)))
                    shade = 0.5 + 0.5 * max(0.0, dot(n, light))
                    zbuf[i] = z
                    img[i * 3 : i * 3 + 3] = bytes(min(255, int(ch * shade * 255)) for ch in base)
    Path(path).write_bytes(png_bytes(size, size, img, channels=3))


# ---------------------------------------------------------------- main


def linear_to_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--src", required=True, help="norviq_lynx_revised_bust_no_base.glb")
    parser.add_argument("--out", default="scripts/brand/out/vig-3d")
    parser.add_argument("--stride", type=int, default=2, help="grid resample factor (2 = a quarter of the cells)")
    parser.add_argument("--no-preview", action="store_true")
    args = parser.parse_args()

    out = Path(args.out)
    if out.exists() and any(out.iterdir()):
        fail(f"{out} is not empty; remove it or pick a new --out")
    out.mkdir(parents=True, exist_ok=True)
    if sys.platform != "darwin":
        fail("needs macOS (sips, xcrun usdcat/usdzip)")

    with tempfile.TemporaryDirectory(prefix="vig3d-") as tmp:
        work = Path(tmp)
        src_copy = work / "source.glb"
        shutil.copyfile(args.src, src_copy)
        data = src_copy.read_bytes()
        source_sha = hashlib.sha256(data).hexdigest()
        doc, binary = read_glb(data)

        front_prim, back_prim, side_prim = mesh_by_name(doc, FRONT_MESH), mesh_by_name(doc, BACK_MESH), mesh_by_name(doc, SIDE_MESH)
        front_pos = accessor(doc, binary, front_prim["attributes"]["POSITION"])
        front_idx = accessor(doc, binary, front_prim["indices"])
        front_uv = accessor(doc, binary, front_prim["attributes"]["TEXCOORD_0"])
        back_pos = accessor(doc, binary, back_prim["attributes"]["POSITION"])
        back_idx = accessor(doc, binary, back_prim["indices"])
        src_mats = doc["materials"]
        front_mat, back_mat, side_mat = src_mats[front_prim["material"]], src_mats[back_prim["material"]], src_mats[side_prim["material"]]
        source_tris = sum(len(accessor(doc, binary, p["indices"])) // 3 for m in doc["meshes"] for p in m["primitives"])

        pitch, x0, z0, front, back, cells = build_grid(front_pos, front_idx, back_pos, back_idx)
        kept, corners, coverage = resample(pitch, front, back, cells, args.stride)
        if coverage < MIN_COVERAGE:
            fail(f"resample covers only {coverage:.2%} of the source front; lower --stride")
        uv_of = fit_planar_uv(front_pos, front_uv)
        step = pitch * args.stride

        # Source: x right, y depth (front is -y), z up.  Target: X right, Y up, Z toward the viewer.
        def src_xyz(c, depth):
            return (x0 + c[0] * step, depth, z0 + c[1] * step)

        raw = []
        for c, (fy, by) in corners.items():
            if by < fy:  # back must sit behind the front
                by = fy
            raw += [src_xyz(c, fy), src_xyz(c, by)]
        xs, ys, zs = [p[0] for p in raw], [p[2] for p in raw], [-p[1] for p in raw]
        height = max(ys) - min(ys)
        cx, cz, ymin = (max(xs) + min(xs)) / 2, (max(zs) + min(zs)) / 2, min(ys)

        def to_target(p):
            return ((p[0] - cx) / height, (p[2] - ymin) / height, (-p[1] - cz) / height)

        # front and back surfaces
        def surface(which, want):
            index, points, uvs = {}, [], []
            for c, hb in corners.items():
                depth = hb[0] if which == "front" else max(hb[0], hb[1])
                index[c] = len(points)
                sp = src_xyz(c, depth)
                points.append(to_target(sp))
                uvs.append(uv_of(sp[0], sp[2]))
            tris = []
            for I, K in kept:
                a, b, c_, d = index[(I, K)], index[(I + 1, K)], index[(I, K + 1)], index[(I + 1, K + 1)]
                tris += [oriented(points, a, b, d, want), oriented(points, a, d, c_, want)]
            return points, uvs, tris

        f_pts, f_uvs, f_tris = surface("front", (0, 0, 1))
        b_pts, _, b_tris = surface("back", (0, 0, -1))

        # walls along the boundary of the kept cells
        w_pts, w_tris = [], []
        sides = [((0, 0), (1, 0), (0, -1)), ((1, 0), (1, 1), (1, 0)), ((1, 1), (0, 1), (0, 1)), ((0, 1), (0, 0), (-1, 0))]
        for I, K in kept:
            for (da, db, out_dir) in sides:
                if (I + out_dir[0], K + out_dir[1]) in kept:
                    continue
                ca, cb = (I + da[0], K + da[1]), (I + db[0], K + db[1])
                base = len(w_pts)
                for c in (ca, cb):
                    hf, hb = corners[c]
                    w_pts.append(to_target(src_xyz(c, hf)))
                    w_pts.append(to_target(src_xyz(c, max(hf, hb))))
                want = (out_dir[0], out_dir[1], 0)  # grid i -> X, k -> Y
                w_tris += [oriented(w_pts, base, base + 2, base + 3, want), oriented(w_pts, base, base + 3, base + 1, want)]
        # drop degenerate walls (front and back meet at the rim)
        def area2(t):
            n = cross(sub(w_pts[t[1]], w_pts[t[0]]), sub(w_pts[t[2]], w_pts[t[0]]))
            return dot(n, n)

        w_tris = [t for t in w_tris if area2(t) > 1e-14]

        # texture: crop to the UV box of the kept front, clear everything outside the silhouette
        tw, th, rgba = decode_png_with_sips(image_bytes(doc, binary, doc["textures"][front_mat["pbrMetallicRoughness"]["baseColorTexture"]["index"]]["source"]), work)
        us, vs = [u for u, _ in f_uvs], [v for _, v in f_uvs]
        px0, px1 = max(0, math.floor(min(us) * tw) - 2), min(tw, math.ceil(max(us) * tw) + 2)
        py0, py1 = max(0, math.floor(min(vs) * th) - 2), min(th, math.ceil(max(vs) * th) + 2)
        cw, ch = px1 - px0, py1 - py0
        if max(cw, ch) > MAX_TEXTURE_SIDE:
            fail(f"cropped texture is {cw}x{ch}; exceeds {MAX_TEXTURE_SIDE}px and upscaling/resampling is not wired")
        side_lin = side_mat["pbrMetallicRoughness"]["baseColorFactor"][:3]
        fill = bytes(int(round(linear_to_srgb(c) * 255)) for c in side_lin) + b"\x00"
        crop = bytearray(cw * ch * 4)
        cleared = 0
        for y in range(ch):
            for x in range(cw):
                s = ((py0 + y) * tw + (px0 + x)) * 4
                d = (y * cw + x) * 4
                if rgba[s + 3] < 255 * ALPHA_CUTOFF:
                    crop[d : d + 4] = fill
                    cleared += 1
                else:
                    crop[d : d + 4] = rgba[s : s + 4]
        f_uvs = [((u * tw - px0) / cw, (v * th - py0) / ch) for u, v in f_uvs]
        texture_png = png_bytes(cw, ch, crop)
        texture_name = "vig_texture.png"
        (work / texture_name).write_bytes(texture_png)

        prims = [
            {"name": "Front", "look": "Front", "points": f_pts, "normals": smooth_normals(f_pts, f_tris), "uvs": f_uvs, "tris": f_tris, "material": 0},
            {"name": "Back", "look": "Back", "points": b_pts, "normals": smooth_normals(b_pts, b_tris), "tris": b_tris, "material": 1},
            {"name": "Walls", "look": "Walls", "points": w_pts, "normals": smooth_normals(w_pts, w_tris), "tris": w_tris, "material": 2},
        ]

        def pbr(m):
            p = m["pbrMetallicRoughness"]
            return p.get("baseColorFactor", [1, 1, 1, 1]), p.get("metallicFactor", 1.0), p.get("roughnessFactor", 1.0)

        fc, fm, fr = pbr(front_mat)
        bc, bm, br = pbr(back_mat)
        sc, sm, sr = pbr(side_mat)
        materials = [
            {"name": "Front", "pbrMetallicRoughness": {"baseColorTexture": {"index": 0}, "metallicFactor": fm, "roughnessFactor": fr},
             "alphaMode": "MASK", "alphaCutoff": ALPHA_CUTOFF},
            {"name": "Back", "pbrMetallicRoughness": {"baseColorFactor": bc, "metallicFactor": bm, "roughnessFactor": br}},
            {"name": "Walls", "pbrMetallicRoughness": {"baseColorFactor": sc, "metallicFactor": sm, "roughnessFactor": sr}},
        ]  # fmt: skip
        looks = {
            "Front": {"textured": True, "metallic": fm, "roughness": fr},
            "Back": {"color": bc[:3], "metallic": bm, "roughness": br, "color_srgb": tuple(linear_to_srgb(c) for c in bc[:3])},
            "Walls": {"color": sc[:3], "metallic": sm, "roughness": sr, "color_srgb": tuple(linear_to_srgb(c) for c in sc[:3])},
        }

        glb_bytes = write_glb(out / "vig.glb", prims, materials, texture_png)
        # The flat first paint and fallback on web: the cleared texture is an exact front view.
        (out / "vig-poster.png").write_bytes(texture_png)
        usdz_bytes = write_usdz(out / "Vig.usdz", prims, looks, texture_name, work)

        all_pts = f_pts + b_pts + w_pts
        lo = [min(p[i] for p in all_pts) for i in range(3)]
        hi = [max(p[i] for p in all_pts) for i in range(3)]
        extent = max(hi[0] - lo[0], hi[1] - lo[1])  # fit the larger side; the bust is about as wide as tall
        distance = extent * FRAME_MARGIN / 2 / math.tan(math.radians(FOV_DEGREES) / 2) + hi[2]
        triangles = sum(len(p["tris"]) for p in prims)
        model = {
            "version": 1,
            "about": "Vig 3D bust (BRD-001). Built by scripts/brand/vig_3d.py; do not edit by hand.",
            "space": "Y-up, metres, front faces +Z, origin at the base centre, height normalised to 1.0",
            "source": {"file": Path(args.src).name, "sha256": source_sha, "triangles": source_tris},
            "bounds": {"min": [round(v, 5) for v in lo], "max": [round(v, 5) for v in hi]},
            "framing": {"fovDegrees": FOV_DEGREES, "target": [0.0, round((lo[1] + hi[1]) / 2, 5), 0.0], "distance": round(distance, 5), "extent": round(extent, 5),
                        "aspect": round((hi[0] - lo[0]) / (hi[1] - lo[1]), 5)},
            "stats": {"triangles": triangles, "vertices": len(all_pts), "drawCalls": len(prims), "glbBytes": glb_bytes, "usdzBytes": usdz_bytes,
                      "texture": [cw, ch], "texelsCleared": round(cleared / (cw * ch), 4), "coverage": round(coverage, 4), "stride": args.stride},
        }  # fmt: skip
        (out / "vig-model.json").write_text(json.dumps(model, indent=2) + "\n")

        checker = subprocess.run(["xcrun", "usdchecker", str(out / "Vig.usdz")], capture_output=True, text=True)
        print(f"usdchecker: {'ok' if checker.returncode == 0 else 'FAILED'}")
        if checker.returncode != 0:
            print(checker.stdout + checker.stderr, file=sys.stderr)

        if not args.no_preview:
            pdir = out / "preview"
            pdir.mkdir()
            (pdir / "texture.png").write_bytes(texture_png)  # exactly what ships: check it carries no invented numbers
            tex = (cw, ch, crop)
            for name, yaw, pit in [("front", 0, 0), ("yaw+14", 14, 0), ("yaw-14", -14, 0), ("pitch+6", 0, 6), ("yaw+35-limit", 35, 0), ("back", 180, 0)]:
                render_preview(pdir / f"{name}.png", prims, looks, tex, yaw, pit, extent)

    print(json.dumps(model["stats"], indent=2))
    problems = []
    if triangles > MAX_TRIANGLES:
        problems.append(f"{triangles} triangles > {MAX_TRIANGLES}")
    if glb_bytes > MAX_GLB_BYTES:
        problems.append(f"GLB {glb_bytes} bytes > {MAX_GLB_BYTES}")
    if len(prims) > MAX_DRAW_CALLS:
        problems.append(f"{len(prims)} draw calls > {MAX_DRAW_CALLS}")
    if checker.returncode != 0:
        problems.append("usdchecker failed")
    if problems:
        fail("; ".join(problems))
    print(f"vig_3d: wrote {out}/vig.glb, vig-poster.png, Vig.usdz, vig-model.json")


if __name__ == "__main__":
    main()
