#!/usr/bin/env python3

"""A4-optimized Prisma ER SVG generator with non-overlapping orthogonal channel routing."""

import re
import sys
from html import escape

CARD_W = 200
ROW_H = 20
HEADER_H = 32
COLS = 4
X_GAP = 70
Y_GAP = 40
MARGIN = 45


def parse(schema):
    models = {}
    for n, b in re.findall(r"model\s+(\w+)\s*\{(.*?)\n\}", schema, re.S):
        fs = []
        for l in b.splitlines():
            l = l.strip()
            if not l or l.startswith("//") or l.startswith("@@"):
                continue
            p = l.split()
            if len(p) < 2:
                continue
            fs.append({
                "name": p[0],
                "type": p[1],
                "extra": " ".join(p[2:]),
                "pk": "@id" in l,
                "uq": "@unique" in l,
                "fk": False,
            })
        models[n] = fs
    names = set(models)
    for fs in models.values():
        for f in fs:
            b = f["type"].rstrip("?[]")
            f["fk"] = "@relation" in f["extra"] or f["name"].endswith("Id") or b in names
    return models


def badge(o, x, y, text, bg):
    o.append(f'<rect x="{x}" y="{y}" width="18" height="12" rx="2" fill="{bg}"/>')
    o.append(
        f'<text x="{x+9}" y="{y+9}" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#ffffff">{text}</text>'
    )


def build_orthogonal_path(x1, y1, x2, y2, x_chan, radius=6):
    dx1 = 1 if x_chan > x1 else -1
    dx2 = 1 if x2 > x_chan else -1
    dy = 1 if y2 > y1 else -1

    if abs(y2 - y1) < radius * 2:
        return f"M {x1} {y1} L {x_chan} {y1} L {x_chan} {y2} L {x2} {y2}"

    r1_x = x_chan - dx1 * radius
    r1_y = y1 + dy * radius
    r2_y = y2 - dy * radius
    r2_x = x_chan + dx2 * radius

    sweep1 = 1 if (dx1 == 1 and dy == 1) or (dx1 == -1 and dy == -1) else 0
    sweep2 = 1 if (dx2 == 1 and dy == -1) or (dx2 == -1 and dy == 1) else 0

    return f"M {x1} {y1} L {r1_x} {y1} A {radius} {radius} 0 0 {sweep1} {x_chan} {r1_y} L {x_chan} {r2_y} A {radius} {radius} 0 0 {sweep2} {r2_x} {y2} L {x2} {y2}"


def gen(models):
    preferred_cols = {
        "User": 0,
        "PasskeyCredential": 0,
        "SavedAddress": 0,
        "AdminLog": 0,
        "Order": 1,
        "Payment": 1,
        "OrderItem": 1,
        "Coupon": 1,
        "Review": 2,
        "Wishlist": 2,
        "ProductVariant": 2,
        "Product": 2,
        "Category": 3,
    }

    col_y = [MARGIN] * COLS
    pos = {}
    heights = {}

    col_items = [[] for _ in range(COLS)]
    for m in models:
        c = preferred_cols.get(m, 0)
        col_items[c].append(m)

    for c in range(COLS):
        for m in col_items[c]:
            fs = models[m]
            h = HEADER_H + len(fs) * ROW_H + 6
            x = MARGIN + c * (CARD_W + X_GAP)
            y = col_y[c]
            pos[m] = (x, y)
            heights[m] = h
            col_y[c] += h + Y_GAP

    max_y = max(col_y) + MARGIN
    svg_w = MARGIN * 2 + COLS * CARD_W + (COLS - 1) * X_GAP
    svg_h = max_y

    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {svg_w} {svg_h}" width="{svg_w}" height="{svg_h}" style="background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">',
        "<defs>",
        '  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">',
        '    <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569"/>',
        "  </marker>",
        '  <filter id="shadow" x="-3%" y="-3%" width="106%" height="106%">',
        '    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.07"/>',
        "  </filter>",
        "</defs>",
    ]

    field_pos = {}

    for m, fs in models.items():
        x, y = pos[m]
        h = heights[m]
        out.append(
            f'<rect x="{x}" y="{y}" width="{CARD_W}" height="{h}" rx="5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" filter="url(#shadow)"/>'
        )
        out.append(
            f'<rect x="{x}" y="{y}" width="{CARD_W}" height="{HEADER_H}" rx="5" fill="#f1f5f9"/>'
        )
        out.append(
            f'<rect x="{x}" y="{y+HEADER_H-5}" width="{CARD_W}" height="5" fill="#f1f5f9"/>'
        )
        out.append(
            f'<line x1="{x}" y1="{y+HEADER_H}" x2="{x+CARD_W}" y2="{y+HEADER_H}" stroke="#cbd5e1" stroke-width="1"/>'
        )
        out.append(
            f'<text x="{x+10}" y="{y+20}" font-size="12" font-weight="700" fill="#0f172a">{escape(m)}</text>'
        )

        cy = y + HEADER_H
        for i, f in enumerate(fs):
            fy = cy + i * ROW_H
            if i % 2 == 1:
                out.append(
                    f'<rect x="{x+1}" y="{fy}" width="{CARD_W-2}" height="{ROW_H}" fill="#f8fafc"/>'
                )
            bx = x + 6
            if f["pk"]:
                badge(out, bx, fy + 4, "PK", "#2563eb")
                bx += 21
            if f["fk"]:
                badge(out, bx, fy + 4, "FK", "#059669")
                bx += 21
            if f["uq"] and not f["pk"]:
                badge(out, bx, fy + 4, "UQ", "#7c3aed")
                bx += 21

            out.append(
                f'<text x="{bx}" y="{fy+14}" font-size="9.5" font-weight="500" fill="#334155">{escape(f["name"])}</text>'
            )
            out.append(
                f'<text x="{x+CARD_W-6}" y="{fy+14}" text-anchor="end" font-size="8.5" fill="#94a3b8">{escape(f["type"])}</text>'
            )
            field_pos[(m, f["name"])] = (x, fy + ROW_H / 2, CARD_W)

    line_colors = [
        "#2563eb",
        "#059669",
        "#7c3aed",
        "#d97706",
        "#dc2626",
        "#0891b2",
        "#475569",
    ]
    chan_slots = {}
    rel_idx = 0

    for m, fs in models.items():
        sx, sy = pos[m]
        sw = CARD_W
        c_src = preferred_cols.get(m, 0)

        for f in fs:
            b = f["type"].rstrip("?[]")
            if b not in models or b == m:
                continue

            src_fp = field_pos.get((m, f["name"]))
            dst_fp = field_pos.get((b, "id"))
            if not src_fp or not dst_fp:
                continue

            dx, dy = pos[b]
            dw = CARD_W
            c_dst = preferred_cols.get(b, 0)

            s_y = src_fp[1]
            d_y = dst_fp[1]

            if c_dst > c_src:
                chan_key = f"{c_src}_right"
                base_x = sx + sw
                dir_sign = 1
            elif c_dst < c_src:
                chan_key = f"{c_src}_left"
                base_x = sx
                dir_sign = -1
            else:
                chan_key = f"{c_src}_internal"
                base_x = sx + sw
                dir_sign = 1

            slot = chan_slots.get(chan_key, 0)
            chan_slots[chan_key] = slot + 1

            x_chan = base_x + dir_sign * (10 + slot * 6)
            x1 = base_x
            x2 = dx if c_dst > c_src else (dx + dw if c_dst < c_src else dx + dw)

            path_d = build_orthogonal_path(x1, s_y, x2, d_y, x_chan)
            color = line_colors[rel_idx % len(line_colors)]
            rel_idx += 1

            out.append(
                f'<path d="{path_d}" fill="none" stroke="{color}" stroke-width="1.3" opacity="0.8" marker-end="url(#arrow)"/>'
            )

    out.append("</svg>")
    return "\n".join(out)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python erd.py schema.prisma out.svg")
        raise SystemExit
    schema_path = sys.argv[1]
    out_path = sys.argv[2]
    models = parse(open(schema_path, encoding="utf8").read())
    svg_data = gen(models)
    open(out_path, "w", encoding="utf8").write(svg_data)
    print("Generated", out_path)
