from pathlib import Path
import random, math
p=Path('public/images'); random.seed(23)
ink='#172c2d'; paper='#f5dfad'; teal='#236d69'; coral='#d96946'; gold='#deb248'
def svg(w,h,body):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'
b=[f'<rect width="2400" height="540" fill="{teal}"/>',f'<path d="M0 0H2400V100H0Z" fill="{coral}"/>',f'<circle cx="735" cy="54" r="37" fill="{gold}"/>']
# Printmaker's waves at the waterline.
for y in [97,111]:
    d=f'M-40 {y}'
    for x in range(0,2450,90):d+=f' q22 -14 45 0 t45 0'
    b.append(f'<path d="{d}" fill="none" stroke="{paper}" stroke-width="6"/>')
# Layered reef shelves with strongly cut silhouettes.
for color,y,amp in [(ink,451,20),('#3b8271',465,14),(paper,489,11)]:
    pts=' '.join(f'{x},{y+int(math.sin(x/89)*amp)}' for x in range(0,2401,30))
    b.append(f'<polygon points="0,540 {pts} 2400,540" fill="{color}"/>')
# Fronds, fans and branching corals, each cut in two inks.
for i,x in enumerate(range(35,2400,135)):
    y=478+random.randrange(-8,6); h=random.randrange(58,126); c=[coral,gold,ink,paper][i%4]
    if i%3==0:
        for j in range(-3,4):
            end=x+j*12; top=y-h+abs(j)*9
            b.append(f'<path d="M{x} {y} Q{x+j*24} {y-35} {end} {top}" fill="none" stroke="{ink}" stroke-width="12"/><path d="M{x} {y-2} Q{x+j*24} {y-35} {end} {top}" fill="none" stroke="{c}" stroke-width="6"/>')
    elif i%3==1:
        b.append(f'<path d="M{x} {y}V{y-h} M{x} {y-25}l-25 -26v-22 M{x} {y-42}l24 -23v-20 M{x-25} {y-51}l-15 -4 M{x+24} {y-65}l15 -6" stroke="{ink}" stroke-width="15" fill="none" stroke-linecap="round"/>')
        b.append(f'<path d="M{x} {y}V{y-h} M{x} {y-25}l-25 -26v-22 M{x} {y-42}l24 -23v-20 M{x-25} {y-51}l-15 -4 M{x+24} {y-65}l15 -6" stroke="{c}" stroke-width="8" fill="none" stroke-linecap="round"/>')
    else:
        b.append(f'<path d="M{x} {y} Q{x-50} {y-75} {x} {y-h} Q{x+54} {y-75} {x} {y}Z" fill="{c}" stroke="{ink}" stroke-width="5"/>')
        for j in range(-2,3):b.append(f'<path d="M{x} {y-5}Q{x+j*20} {y-48} {x+j*6} {y-h+18}" fill="none" stroke="{paper if c!=paper else ink}" stroke-width="2"/>')
# Floating engraved current marks.
for i in range(65):
    x=random.randrange(30,2370); y=random.randrange(145,400)
    b.append(f'<path d="M{x} {y}q14 -5 30 0" fill="none" stroke="{paper}" stroke-opacity=".16" stroke-width="2"/>')
# Ornamental border, original triangles and flowing wave cuts.
for y in [0,520]:
    b.append(f'<rect y="{y}" width="2400" height="20" fill="{ink}"/>')
    for x in range(0,2400,40):b.append(f'<path d="M{x+2} {y+3}l18 14 18 -14Z" fill="none" stroke="{paper}" stroke-width="2"/>')
# Dry ink flecks across all layers, deterministic texture.
for i in range(6200):
    x=random.randrange(2400);y=random.randrange(540);r=random.choice([.45,.7,1,1.4])
    b.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{paper}" opacity="{random.choice([.08,.12,.2,.3])}"/>')
p.joinpath('reef-print.svg').write_text(svg(2400,540,''.join(b)))
# Original fish silhouettes, with cut-out stripes and a thick print edge.
for key,c in [('reef',gold),('moon','#8fc8af'),('coral',coral)]:
    body=f'<g stroke="{ink}" stroke-width="3" stroke-linejoin="round"><path d="M20 21L3 7l1 28Z" fill="{c}"/><path d="M18 21Q30 0 56 10l12 11Q49 44 18 21Z" fill="{c}"/><path d="M30 10l10 -8 10 7" fill="{c}"/></g><g fill="none" stroke="{paper}" stroke-width="3"><path d="M29 13l6 15M40 11l5 19M51 14l4 12"/></g><circle cx="58" cy="19" r="3" fill="{ink}"/><path d="M8 17l8 5 -9 6" fill="none" stroke="{paper}" stroke-width="2"/>'
    p.joinpath(f'fish-print-{key}.svg').write_text(svg(72,42,body))
# Diver is a horizontal swimming silhouette, suit ornaments confined to equipment.
body=f'''<g stroke="{ink}" stroke-width="3" stroke-linejoin="round">
<path d="M35 49L14 42 2 48l19 11 17 3M38 61L17 66 6 77l22 1 21 -16" fill="#6cae9b"/>
<path d="M29 43Q42 34 65 46l-5 21 -30 -7Z" fill="{coral}"/>
<path d="M52 49l17 -15 15 -3 3 7 -16 5 -10 17" fill="#e8b47f"/>
<path d="M58 60l18 3 13 -5 4 7 -17 6 -21 -3" fill="#e8b47f"/>
<path d="M82 32l10 -3m-9 5 11 -1m-10 4 9 2" fill="none" stroke-width="2"/>
<path d="M87 59l8 -4m-7 7 9 -1m-8 4 7 2" fill="none" stroke-width="2"/>
<ellipse cx="66" cy="29" rx="18" ry="20" fill="#e8b47f"/>
<path d="M48 29Q42 11 60 8q20 -3 22 15L68 18l-13 12Z" fill="{ink}"/>
<path d="M48 15L28 17l15 -8 -17 -3 25 -3 13 6" fill="{ink}"/>
<rect x="55" y="23" width="31" height="13" rx="5" fill="#a7cfb8"/>
<path d="M71 41q5 4 10 -1" fill="none" stroke-width="2"/>
<path d="M32 69q16 -10 31 1l-4 10 -25 -2Z" fill="{gold}"/>
</g><g fill="none" stroke="{paper}" stroke-width="2"><path d="M35 47l6 5 6 -5 6 5M35 55l6 5 6 -5M37 70l17 9m-8 -10 14 8m-24 -3 20 -3"/></g><circle cx="74" cy="29" r="2" fill="{ink}"/>'''
p.joinpath('diver-print.svg').write_text(svg(100,84,body))
