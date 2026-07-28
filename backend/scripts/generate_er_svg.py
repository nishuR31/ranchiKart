import re

with open('/home/nishu/TechStack/codes/RanchiKart/backend/prisma/schema.prisma') as f:
    text = f.read()

def parse_prisma(text):
    enums = {}
    for e_name, e_body in re.findall(r'enum\s+(\w+)\s*\{([^}]+)\}', text):
        values = [v.strip() for v in e_body.strip().split() if v.strip() and not v.strip().startswith('//')]
        enums[e_name] = values

    models = {}
    pos = 0
    while True:
        m = re.search(r'model\s+(\w+)\s*\{', text[pos:])
        if not m:
            break
        mname = m.group(1)
        start_idx = pos + m.end()
        depth = 1
        i = start_idx
        while i < len(text) and depth > 0:
            if text[i] == '{': depth += 1
            elif text[i] == '}': depth -= 1
            i += 1
        body = text[start_idx:i-1]
        pos = i
        
        fields = []
        for line in body.split('\n'):
            line = line.strip()
            if not line or line.startswith('//'):
                continue
            parts = line.split()
            if len(parts) >= 2:
                fname = parts[0]
                ftype = parts[1]
                extra = ' '.join(parts[2:]) if len(parts) > 2 else ''
                
                is_pk = '@id' in extra
                is_unique = '@unique' in extra
                is_fk = '@relation' in extra or fname.endswith('Id') or (ftype.rstrip('[]?').strip() in models)
                
                fields.append({
                    'name': fname,
                    'type': ftype,
                    'extra': extra,
                    'is_pk': is_pk,
                    'is_fk': is_fk,
                    'is_unique': is_unique
                })
        models[mname] = fields
    return enums, models

enums, models = parse_prisma(text)

card_width = 380

layout = {
    # Row 1: Users & Auth
    'User': {'x': 1050, 'y': 150, 'color': '#1d4ed8'},
    'PasskeyCredential': {'x': 550, 'y': 150, 'color': '#0284c7'},
    'SavedAddress': {'x': 1550, 'y': 150, 'color': '#0284c7'},
    'AdminLog': {'x': 2050, 'y': 150, 'color': '#475569'},

    # Row 2: Catalog & Products
    'Category': {'x': 50, 'y': 1050, 'color': '#7e22ce'},
    'Product': {'x': 550, 'y': 1050, 'color': '#6b21a8'},
    'ProductVariant': {'x': 1050, 'y': 1050, 'color': '#7e22ce'},
    'Wishlist': {'x': 1550, 'y': 1050, 'color': '#be185d'},

    # Row 3: Reviews & Coupons & Order
    'Review': {'x': 2050, 'y': 1050, 'color': '#b91c1c'},
    'Coupon': {'x': 50, 'y': 2150, 'color': '#047857'},
    'Order': {'x': 1050, 'y': 2150, 'color': '#c2410c'},
    'OrderItem': {'x': 1550, 'y': 2150, 'color': '#d97706'},
    'Payment': {'x': 2050, 'y': 2150, 'color': '#15803d'},
}

svg_parts = []
svg_parts.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 3300" width="2500" height="3300" style="background:#0f172a; font-family: Inter, system-ui, sans-serif;">\n')

# Definitions / Filters
svg_parts.append('''<defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.4" />
    </filter>
</defs>\n''')

# Header Title Block
svg_parts.append('''
<g transform="translate(50, 40)">
    <rect width="2400" height="75" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5" filter="url(#shadow)"/>
    <text x="30" y="45" font-size="24" font-weight="800" fill="#f8fafc" letter-spacing="0.5">RANCHIKART DATABASE ER DIAGRAM (Prisma Schema v2.2)</text>
    <text x="1600" y="45" font-size="14" font-weight="500" fill="#94a3b8">13 Entities • 7 Enums • 203 Fields • PostgreSQL</text>
</g>\n''')

field_positions = {}

for mname, ffields in models.items():
    if mname not in layout: continue
    cfg = layout[mname]
    x, y = cfg['x'], cfg['y']
    header_color = cfg['color']
    
    row_height = 24
    header_h = 42
    total_h = header_h + len(ffields) * row_height + 12
    
    svg_parts.append(f'''
    <g transform="translate({x}, {y})" filter="url(#shadow)">
        <!-- Card Background -->
        <rect width="{card_width}" height="{total_h}" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        
        <!-- Header -->
        <path d="M 0 10 Q 0 0 10 0 L {card_width-10} 0 Q {card_width} 0 {card_width} 10 L {card_width} {header_h} L 0 {header_h} Z" fill="{header_color}" />
        <text x="16" y="26" font-size="16" font-weight="700" fill="#ffffff">{mname}</text>
        <text x="{card_width-16}" y="26" font-size="12" font-weight="600" fill="#e2e8f0" text-anchor="end">{len(ffields)} fields</text>
    ''')
    
    curr_y = header_h + 18
    for idx, f in enumerate(ffields):
        fn = f['name']
        ft = f['type']
        
        field_positions[(mname, fn)] = (x, y + curr_y - 6)
        
        if idx % 2 == 1:
            svg_parts.append(f'<rect x="1" y="{curr_y-14}" width="{card_width-2}" height="{row_height}" fill="#0f172a" opacity="0.4"/>')
            
        badge_x = 14
        if f['is_pk']:
            svg_parts.append(f'<rect x="{badge_x}" y="{curr_y-12}" width="22" height="14" rx="3" fill="#eab308"/><text x="{badge_x+11}" y="{curr_y-1}" font-size="9" font-weight="800" fill="#000000" text-anchor="middle">PK</text>')
            badge_x += 26
        if f['is_fk']:
            svg_parts.append(f'<rect x="{badge_x}" y="{curr_y-12}" width="22" height="14" rx="3" fill="#06b6d4"/><text x="{badge_x+11}" y="{curr_y-1}" font-size="9" font-weight="800" fill="#000000" text-anchor="middle">FK</text>')
            badge_x += 26
        if f['is_unique'] and not f['is_pk']:
            svg_parts.append(f'<rect x="{badge_x}" y="{curr_y-12}" width="22" height="14" rx="3" fill="#a855f7"/><text x="{badge_x+11}" y="{curr_y-1}" font-size="9" font-weight="800" fill="#ffffff" text-anchor="middle">UQ</text>')
            badge_x += 26

        is_rel = ft.rstrip('[]?').strip() in models
        if is_rel:
            name_color = "#38bdf8"
        elif f['is_pk'] or f['is_fk']:
            name_color = "#f8fafc"
        else:
            name_color = "#e2e8f0"

        type_color = "#a855f7" if is_rel else "#94a3b8"
        
        svg_parts.append(f'<text x="{badge_x}" y="{curr_y}" font-size="12" font-weight="600" fill="{name_color}">{fn}</text>')
        svg_parts.append(f'<text x="{card_width-14}" y="{curr_y}" font-size="11" font-weight="500" fill="{type_color}" text-anchor="end">{ft}</text>')
        
        curr_y += row_height
        
    svg_parts.append('</g>\n')

# Draw Relationships (Edges)
edges = [
    ('PasskeyCredential', 'userId', 'User', 'id', '1:N'),
    ('SavedAddress', 'userId', 'User', 'id', '1:N'),
    ('AdminLog', 'adminId', 'User', 'id', '1:N'),
    ('Product', 'categoryId', 'Category', 'id', '1:N'),
    ('ProductVariant', 'productId', 'Product', 'id', '1:N'),
    ('Review', 'productId', 'Product', 'id', '1:N'),
    ('Review', 'userId', 'User', 'id', '1:N'),
    ('Review', 'orderId', 'Order', 'id', '0..1:N'),
    ('Wishlist', 'userId', 'User', 'id', '1:N'),
    ('Wishlist', 'productId', 'Product', 'id', '1:N'),
    ('Coupon', 'categoryId', 'Category', 'id', '0..1:N'),
    ('Order', 'userId', 'User', 'id', '1:N'),
    ('Order', 'couponId', 'Coupon', 'id', '0..1:N'),
    ('OrderItem', 'orderId', 'Order', 'id', '1:N'),
    ('OrderItem', 'productId', 'Product', 'id', '1:N'),
    ('OrderItem', 'variantId', 'ProductVariant', 'id', '0..1:N'),
    ('Payment', 'orderId', 'Order', 'id', '1:N'),
]

svg_parts.append('<g id="relationships">\n')
for src_m, src_f, tgt_m, tgt_f, rel_lbl in edges:
    if (src_m, src_f) in field_positions and (tgt_m, tgt_f) in field_positions:
        x1, y1 = field_positions[(src_m, src_f)]
        x2, y2 = field_positions[(tgt_m, tgt_f)]
        
        src_x_center = layout[src_m]['x'] + card_width / 2
        tgt_x_center = layout[tgt_m]['x'] + card_width / 2
        
        if src_x_center < tgt_x_center:
            start_x = layout[src_m]['x'] + card_width
            end_x = layout[tgt_m]['x']
        else:
            start_x = layout[src_m]['x']
            end_x = layout[tgt_m]['x'] + card_width
            
        dx = abs(end_x - start_x) * 0.4
        c1x = start_x + (dx if start_x < end_x else -dx)
        c2x = end_x - (dx if start_x < end_x else -dx)
        
        path_d = f'M {start_x} {y1} C {c1x} {y1}, {c2x} {y2}, {end_x} {y2}'
        
        svg_parts.append(f'''
        <path d="{path_d}" fill="none" stroke="#06b6d4" stroke-width="2" stroke-dasharray="4 2" opacity="0.6"/>
        <circle cx="{start_x}" cy="{y1}" r="4" fill="#06b6d4"/>
        <circle cx="{end_x}" cy="{y2}" r="4" fill="#eab308"/>
        ''')
svg_parts.append('</g>\n')

svg_parts.append('</svg>\n')

final_svg = ''.join(svg_parts)
with open('/home/nishu/TechStack/codes/RanchiKart/backend/er.svg', 'w') as f:
    f.write(final_svg)

print('Generated er.svg successfully! Size:', len(final_svg), 'bytes')
