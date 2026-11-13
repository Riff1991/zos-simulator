"""Ikony aplikace (PWA) – vlastní jednoduchý motiv, žádné logo ZZS. python3 packaging/icons.py → site/icons/"""
from PIL import Image, ImageDraw, ImageFont
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def icon(size, maskable=False):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    pad = 0 if maskable else int(size * 0.04); r = 0 if maskable else int(size * 0.2)
    d.rounded_rectangle([pad, pad, size - pad, size - pad], r, fill=(19, 33, 46))
    s = size / 512
    # EKG křivka
    pts = [(70, 330), (175, 330), (205, 275), (235, 385), (270, 215), (300, 330), (442, 330)]
    d.line([(x * s, y * s) for x, y in pts], fill=(230, 64, 52), width=max(2, int(22 * s)), joint='curve')
    f = ImageFont.truetype(F, int(150 * s))
    w = d.textlength('ZOS', font=f)
    d.text(((size - w) / 2, 95 * s), 'ZOS', font=f, fill=(255, 255, 255))
    return im
for sz in (192, 512):
    icon(sz).save(f'site/icons/icon-{sz}.png'); icon(sz, True).save(f'site/icons/maskable-{sz}.png')
icon(180).save('site/icons/apple-touch-icon.png')
print('ok')
