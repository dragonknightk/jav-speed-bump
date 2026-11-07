# 生成工具栏图标（黄黑减速带条纹 + 圆角），需要 Pillow：python3 scripts/make-icons.py
from PIL import Image, ImageDraw
import os
out = os.path.join(os.path.dirname(__file__), '..', 'src', 'icons')
os.makedirs(out, exist_ok=True)
S = 512
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
mask = Image.new('L', (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=110, fill=255)
base = Image.new('RGBA', (S, S), (16, 20, 26, 255))
d = ImageDraw.Draw(base)
# 减速带：中间一条斜纹带
band_top, band_bot = 200, 330
stripes = Image.new('RGBA', (S, S), (0, 0, 0, 0))
sd = ImageDraw.Draw(stripes)
w = 64
for i in range(-S, 2 * S, w * 2):
    sd.polygon([(i, band_bot), (i + w, band_bot), (i + w + (band_bot - band_top), band_top), (i + (band_bot - band_top), band_top)], fill=(245, 179, 1, 255))
band_mask = Image.new('L', (S, S), 0)
ImageDraw.Draw(band_mask).rounded_rectangle([40, band_top, S - 40, band_bot], radius=40, fill=255)
d.rounded_rectangle([40, band_top, S - 40, band_bot], radius=40, fill=(20, 20, 20, 255))
base.paste(stripes, (0, 0), Image.composite(stripes, Image.new('RGBA', (S, S)), band_mask).split()[3])
img.paste(base, (0, 0), mask)
for size in (16, 32, 48, 128):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(out, f'icon{size}.png'))
print('ok')
