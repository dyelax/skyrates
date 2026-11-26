"""Sunstep's orchard village and Copperfall's working yards, in Blender model units."""
from math import cos, sin, pi, hypot
from random import Random
import bpy
from mathutils import Vector
from port_landscape import surface


def linear(rgb):
    channels = [int(rgb[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4 for v in channels) + (1,)


PIGMENTS = {
    'honey plaster': ('DFBF86', .88, 0), 'chalk plaster': ('E4D7AF', .86, 0),
    'stone courses': ('AF967A', .96, 0), 'foundation': ('827565', .98, 0),
    'oak framing': ('805636', .82, 0), 'charred timber': ('524333', .85, 0),
    'oak endgrain': ('AF865B', .84, 0), 'new planks': ('CBAC78', .83, 0),
    'tile red': ('A9583C', .92, 0), 'tile ochre': ('C67850', .9, 0), 'tile umber': ('8F503D', .92, 0),
    'brick': ('9A6047', .92, 0), 'light brick': ('B77A54', .94, 0),
    'slate': ('4D6572', .72, .18), 'lead sheeting': ('6D8089', .69, .19), 'dark iron': ('384244', .64, .52),
    'iron plate': ('536065', .62, .42), 'verdigris': ('678E7E', .6, .32),
    'aged copper': ('AC704E', .59, .38), 'folded copper': ('B87555', .64, .28),
    'oxidized sheet': ('68867A', .69, .22), 'copper oxide': ('916951', .70, .24),
    'crane yellow': ('D0A348', .63, .34), 'crane edge': ('E4BD64', .53, .37), 'polished brass': ('D1A75C', .42, .54),
    'sackcloth': ('C9B589', .98, 0), 'sun canvas': ('D69B60', .94, 0), 'pale linen': ('E2CFA0', .91, 0),
    'awning stripes': ('8A6248', .93, 0), 'glass': ('48645F', .32, .21), 'warm windows': ('E9AE65', .44, .02),
    'forge glow': ('FFAC4C', .62, .04), 'forge coals': ('FF8A3D', .60, .03), 'leaf shadow': ('526C48', .94, 0), 'leaf sun': ('899A58', .94, 0),
    'pear': ('A4AE56', .8, 0), 'blush': ('BD8061', .9, 0), 'tarp': ('73928F', .91,0),
}


def material(name):
    key = 'Port · ' + name
    mat = bpy.data.materials.get(key)
    if mat:
        return mat
    color, rough, metal = PIGMENTS[name]
    mat = bpy.data.materials.new(key)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = linear(color)
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Metallic'].default_value = metal
    if name in ('warm windows', 'forge coals', 'forge glow'):
        shader.inputs['Emission Color'].default_value = linear('FFBB65' if name == 'warm windows' else 'FF9A40' if name=='forge glow' else 'FF722D')
        shader.inputs['Emission Strength'].default_value = .7 if name == 'warm windows' else 2.6
    mat.diffuse_color = linear(color)
    return mat


class Piece:
    """Assemble a coherent model as sculpted faces sharing a small PBR palette."""
    def __init__(self, name, x, y, z=0, yaw=0):
        self.name, self.origin, self.yaw = name, (x, y, z), yaw
        self.verts, self.faces, self.face_mats = [], [], []

    def polygon(self, vertices, mat):
        if len(vertices) < 3:
            return
        idx = len(self.verts)
        self.verts.extend(tuple(v) for v in vertices)
        self.faces.append(tuple(range(idx, idx + len(vertices))))
        self.face_mats.append(mat)

    def prism(self, outline, z0, z1, mat):
        low = [(x, y, z0) for x, y in outline]
        high = [(x, y, z1) for x, y in outline]
        self.polygon(low[::-1], mat)
        self.polygon(high, mat)
        for i in range(len(low)):
            j = (i + 1) % len(low)
            self.polygon([low[i], low[j], high[j], high[i]], mat)

    def box(self, x, y, z, w, d, h, mat):
        self.prism([(x-w/2,y-d/2),(x+w/2,y-d/2),(x+w/2,y+d/2),(x-w/2,y+d/2)], z-h/2,z+h/2,mat)

    def beam(self, a, b, width, depth=None, mat='oak framing', sides=4):
        a, b = Vector(a), Vector(b)
        axis = (b - a).normalized()
        u = axis.cross(Vector((0, 0, 1)) if abs(axis.z)<.92 else Vector((1, 0, 0))).normalized()
        v = axis.cross(u).normalized()
        hw, hd = width/2, (depth if depth else width)/2
        if sides == 4:
            points = [-u*hw-v*hd,u*hw-v*hd,u*hw+v*hd,-u*hw+v*hd]
        else:
            points = [u*hw*cos(i*2*pi/sides)+v*hd*sin(i*2*pi/sides) for i in range(sides)]
        low, high = [a+p for p in points], [b+p for p in points]
        self.polygon(low[::-1],mat); self.polygon(high,mat)
        for i in range(sides):
            j=(i+1)%sides;self.polygon([low[i],low[j],high[j],high[i]],mat)

    def cone(self, x, y, z, low, top, height, mat, sides=10):
        ring=lambda r,h:[(x+r*cos(i*2*pi/sides),y+r*sin(i*2*pi/sides),h) for i in range(sides)]
        a,b=ring(low,z),ring(top,z+height)
        self.polygon(a[::-1],mat)
        if top:self.polygon(b,mat)
        for i in range(sides):
            j=(i+1)%sides;self.polygon([a[i],a[j],b[j],b[i]] if top else [a[i],a[j],b[j]],mat)

    def finish(self):
        mesh=bpy.data.meshes.new(self.name)
        mesh.from_pydata(self.verts,[],self.faces);mesh.update()
        keys=list(dict.fromkeys(self.face_mats));indices={k:i for i,k in enumerate(keys)}
        for key in keys:mesh.materials.append(material(key))
        for face,key in zip(mesh.polygons,self.face_mats):face.material_index=indices[key]
        obj=bpy.data.objects.new(self.name,mesh);bpy.context.collection.objects.link(obj)
        obj.location=self.origin;obj.rotation_euler.z=self.yaw
        return obj


def window(p,x,y,z,w,h,lit=False):
    p.box(x,y,z,w,.09,h,'charred timber');p.box(x,y-.052,z,w*.79,.025,h*.82,'warm windows' if lit else 'glass')
    p.box(x,y-.083,z,.052,.04,h*.84,'oak framing');p.box(x,y-.086,z,w*.82,.038,.06,'oak framing')
    p.box(x,y-.10,z-h*.53,w+.15,.26,.11,'stone courses')


def clay_roof(p,w,d,h,rise,metal=False):
    """A shallow kick at the eave, heavy rounded ridge caps and independent tile courses."""
    aw,ad=w/2+.32,d/2+.31
    y0,y1=-ad,ad
    shades=['slate','lead sheeting','slate'] if metal else ['tile red','tile ochre','tile umber']
    strips=7
    def roof_z(t):return h+rise*(1-t)**1.24+.07*t**6
    for side in (-1,1):
        for i in range(strips):
            a,b=i/strips,(i+1)/strips
            line=[(side*a*aw,y0,roof_z(a)),(side*b*aw,y0,roof_z(b)),(side*b*aw,y1,roof_z(b)),(side*a*aw,y1,roof_z(a))]
            p.polygon(line if side==1 else line[::-1],shades[0]);p.beam((side*b*aw,y0,roof_z(b)+.018),(side*b*aw,y1,roof_z(b)+.018),.045,.048,shades[1 if i%3==1 else 0])
            for j in range(1,max(2,round(d*1.6))):
                yy=y0+(j+(i%2)*.47)*(y1-y0)/max(2,round(d*1.6))
                if yy<y1-.06:p.beam((side*a*aw,yy,roof_z(a)+.012),(side*b*aw,yy,roof_z(b)+.012),.045,.035,shades[(i+j)%3])
        for end in (-1,1):
            p.beam((0,end*ad,h+rise),(side*aw,end*ad,roof_z(1)),.12,.13,'oak framing')
            p.polygon([(0,end*d/2,h+rise-.09),(side*w/2,end*d/2,h),(0,end*d/2,h)],'honey plaster' if not metal else 'brick')
    p.beam((0,-ad-.03,h+rise+.035),(0,ad+.03,h+rise+.035),.24,.22,'aged copper' if metal else 'tile ochre',7)


def house(port,label,x,y,w,d,h,yaw=0,industrial=False,base=None):
    p=Piece(label,x,y,surface(port,x,y) if base is None else base,yaw)
    wall='brick' if industrial else 'honey plaster'
    p.box(0,0,.23,w+.27,d+.27,.46,'foundation');p.box(0,0,h/2+.18,w,d,h-.28,wall)
    r=Random(label);rows=round(d*1.6)
    for side in (-1,1):
        p.box(side*(w/2-.09),-d/2-.02,h/2,.12,.16,h-.06,'oak framing')
        for i in range(max(1,int(h/1.8))):window(p,side*w*.27,-d*.5-.06,.95+i*1.37,.57,.78,(i==0 and r.random()<.53))
        for j in range(rows):
            if j%3==1:p.box(side*(w*.5+.025),-d*.4+j*.53,h*.57,.08,.67,.83,('warm windows' if (side==1 and j%6==1) else 'glass'))
        for k in range(5):p.box(side*(w*.5-.1),-d*.5-.035,.2+(.48*k),.36,.15,.18,'stone courses')
    p.box(0,-d/2-.056,.8,.66,.17,1.58,'charred timber');p.box(.2,-d/2-.14,.79,.07,.08,.07,'polished brass')
    p.box(0,-d/2-.03,h-.09,w,.16,.17,'oak framing');p.beam((-w*.39,-d*.5-.05,.4),(-.55,-d*.5-.05,h-.35),.095,.15,'oak framing')
    clay_roof(p,w,d,h,w*(.42 if industrial else .52),industrial)
    p.box(w*.32,d*.25,h+.48,.49,.50,1.7,'brick');p.box(w*.32,d*.25,h+1.37,.58,.61,.17,'light brick')
    return p.finish()


def canopy(p,x,y,z,w,d,ink):
    for i in range(9):
        a=x+(i/9-.5)*w;b=a+w/9
        p.polygon([(a,y,z+.05),(b,y,z+.05),(b,y-d*.52,z-.11),(a,y-d*.52,z-.11)], ink if i%3 else 'pale linen')
        p.polygon([(a,y-d*.52,z-.11),(b,y-d*.52,z-.11),(b,y-d,z-.42),(a,y-d,z-.42)],ink if i%3 else 'pale linen')
        p.polygon([(a,y-d,z-.42),(b,y-d,z-.42),(b,y-d,z-.66),(a,y-d,z-.61)],ink if i%3 else 'pale linen')
    for dx in (-w*.48,w*.48):p.beam((x+dx,y-d,0),(x+dx,y-d,z-.37),.10,mat='oak framing')


def stall(p,x,y,goods='pear'):
    canopy(p,x,y,2.65,3.9,2.0,'sun canvas' if goods=='pear' else 'tarp')
    p.box(x,y-1.56,.78,3.6,.82,.12,'new planks');p.box(x,y-1.58,.41,3.25,.66,.7,'oak framing')
    for i in range(3):
        xx=x-1.06+i*1.02;p.box(xx,y-1.6,.87,.86,.66,.14,'oak endgrain')
        for j in range(6):p.cone(xx+(j%3-.9)*.22,y-1.60+(j//3-.5)*.21,.94,.11,.075,.18,'pear' if goods=='pear' else 'aged copper',6)


def windmill(x,y,base):
    p=Piece('Sunstep • timber windmill',x,y,base)
    p.cone(0,0,0,1.85,1.21,6.25,'chalk plaster',10);p.cone(0,0,6.23,1.55,.2,1.54,'tile umber',10)
    for i in range(9):
        a=2*pi*i/9;p.beam((1.74*cos(a),1.74*sin(a),.43),(1.22*cos(a),1.22*sin(a),5.99),.15,mat='oak framing')
    p.cone(0,0,3.1,1.63,1.63,.21,'oak framing');p.cone(0,0,5.76,1.31,1.31,.18,'oak framing')
    p.box(0,-1.7,1,.9,.11,2,'charred timber');window(p,.05,-1.47,3.65,.50,.63,True);p.finish().scale=(1.25,1.25,1.25)
    rotor=Piece('mill-sails',x,y-1.59,base+5.58)
    rotor.beam((0,-.31,0),(0,.26,0),.48,.48,'polished brass',8)
    for i in range(4):
        a=.54+i*pi/2;c,s=cos(a),sin(a)
        pt=lambda r,v:(r*c-v*s,-.13,r*s+v*c)
        rotor.beam(pt(.06,0),pt(3.85,0),.16,.15,'oak framing');rotor.beam(pt(.97,.68),pt(3.82,.68),.10,.11,'oak endgrain')
        for j in range(8):
            lo=1.02+j*.35;hi=lo+.32;rotor.polygon([pt(lo,.08),pt(hi,.08),pt(hi,.62),pt(lo,.62)],'pale linen' if j%3 else 'sackcloth');rotor.beam(pt(lo,-.06),pt(lo,.7),.07,.07,'oak framing')
    body_scale=1.25
    rotor.origin=(x,y-1.59*body_scale,base+5.58*body_scale)
    rotor.finish().scale=(body_scale,body_scale,body_scale)


def chimney(p,x,y,r,h):
    p.cone(x,y,0,r*1.28,r*1.15,.7,'light brick');p.cone(x,y,.65,r,r*.65,h-.65,'brick',12)
    for k in range(4):p.cone(x,y,1+(h-1)*k/4,r*(1-.085*k)*1.03,r*(1-.085*k)*1.03,.14,'dark iron',12)
    p.cone(x,y,h-.18,r*.78,r*.78,.22,'light brick',12);p.cone(x,y,h+.041,r*.57,r*.57,.02,'charred timber',12)


def gantry(p,x,y):
    p.box(x,y,.28,1.9,1.65,.55,'foundation');p.beam((x,y,.4),(x,y,5.45),.40,.45,'oak framing')
    p.beam((x,y,.53),(x+1.1,y,4.2),.23,.25,'oak endgrain');p.beam((x-.9,y,5.33),(x+3.35,y,5.33),.28,.32,'oak framing')
    p.beam((x,y,2.88),(x+3.0,y,5.25),.21,.22,'oak endgrain');p.beam((x-.9,y,5.48),(x+3.25,y,5.5),.10,.10,'dark iron')
    p.beam((x+3.0,y-.03,5.28),(x+3.0,y-.03,2.05),.048,.05,'dark iron');p.beam((x+3.0,y,2.03),(x+3.22,y,1.78),.14,.14,'aged copper');p.box(x+3.2,y,1.88,.14,.18,.3,'dark iron')


def yard_shed(p,x,y,w,d,h):
    # Long barrel vault; open near arch reveals its timber formers and workbench.
    for side in (-1,1):
        p.box(x+side*(w/2-.13),y,h*.41,.25,d,h*.82,'brick');p.box(x+side*(w/2-.1),y-d*.5,h*.45,.49,.45,h*.9,'light brick')
    stations=14
    arch=lambda a,yy:(x+w*.55*cos(a),yy,h*.70+w*.38*sin(a))
    for j in range(stations):
        a=j*pi/stations;b=(j+1)*pi/stations;p.polygon([arch(a,y-d*.52),arch(b,y-d*.52),arch(b,y+d*.52),arch(a,y+d*.52)],('folded copper','folded copper','copper oxide','oxidized sheet','aged copper')[j%5])
        p.beam(arch(a,y-d*.52),arch(b,y-d*.52),.13,.17,'aged copper')
        for part in (0,.48,.96):
            yy=y-d*.46+part*d;p.beam(arch(a,yy),arch(b,yy),.08,.09,'iron plate')
    p.box(x,y+d*.49,h*.43,w,.20,h*.86,'brick');p.box(x,y+d*.38,1.3,1.7,.17,1.32,'charred timber');p.box(x,y+d*.26,1.13,1.09,.10,.64,'forge coals')
    p.box(x+.4,y-d*.17,.7,2,.6,.16,'oak endgrain')


def cradle(p,x,y):
    for side in (-1,1):p.beam((x+side*.65,y-3.1,.30),(x+side*.65,y+3.1,.30),.16,mat='oak framing')
    p.beam((x,y-2.9,.59),(x,y+3.1,.89),.20,.19,'charred timber')
    for j in range(10):
        yy=y-2.6+j*.61;width=1.45*(.26+.74*sin((j+.5)*pi/10))
        for sign in (-1,1):
            foot=(x,yy,.73+j*.025);mid=(x+sign*width*.67,yy,.94+j*.024);tip=(x+sign*width,yy,1.75+j*.041)
            p.beam(foot,mid,.14,.12,'new planks');p.beam(mid,tip,.14,.12,'oak endgrain')


def lattice(p, a, b, width, taper, bays):
    start, end = Vector(a), Vector(b)
    along = (end - start).normalized()
    u = along.cross(Vector((0,0,1)) if abs(along.z) < .9 else Vector((0,1,0))).normalized()
    v = along.cross(u)
    def section(t):
        center = start.lerp(end, t)
        radius = width * (1 - t * (1-taper)) / 2
        return [center + (u*dx + v*dy)*radius for dx,dy in ((-1,-1),(1,-1),(1,1),(-1,1))]
    for i in range(bays):
        near, far = section(i/bays), section((i+1)/bays)
        for j in range(4):
            k=(j+1)%4
            p.beam(near[j],far[j],.16,.16,'crane yellow')
            p.beam(near[j],near[k],.095,.10,'crane edge')
            p.beam(near[j],far[k],.102,.105,'crane yellow')


def yard_crane(x,y,z):
    p=Piece('Copperfall | riveters’ travelling lattice crane',x,y,z,-.14)
    for xx in (-.83,.83):
        p.box(xx,.1,.24,.28,6.1,.36,'dark iron')
        for yy in (-1.1,1.1):p.beam((xx,yy,.32),(xx,yy,1.08),.70,.70,'iron plate',9)
    p.box(0,0,1.03,2.5,3.0,.36,'crane yellow')
    lattice(p,(0,0,1.15),(.02,0,7.4),1.55,.73,5)
    p.box(0,0,7.40,2.05,2.4,.38,'crane yellow')
    p.box(-.79,.42,8.00,1.04,1.38,1.12,'iron plate')
    p.box(-.79,-.3,8.08,.76,.12,.57,'glass')
    lattice(p,(-.45,0,7.45),(6.8,-1.0,10.6),1.2,.48,7)
    p.beam((-1,0,8.4),(-.6,0,10.1),.15,mat='dark iron')
    p.beam((-.6,0,10.1),(6.23,-.92,10.56),.065,mat='dark iron')
    for dx in (-.18,.18):p.beam((6.55+dx,-1,10.48),(6.55+dx,-1,4.38),.06,mat='charred timber')
    p.box(6.55,-1,4.32,.67,.34,.40,'crane edge')
    p.beam((6.55,-1,4.22),(6.55,-1,3.52),.15,mat='dark iron')
    p.beam((6.55,-1,3.52),(6.88,-1,3.72),.15,mat='dark iron')
    p.finish()


def building_slip():
    # The whole ship is open to the sky. Closely spaced, curved oak frames trace
    # a single keel with only a few ceiling planks at one end of the vessel.
    p=Piece('Copperfall | Sovereign hull growing on the ways',.8,-4.7,-.80,-1.27)
    length=17.6
    for side in (-1,1):
        p.beam((side*.83,-9.6,.33),(side*.83,9.0,.33),.31,.38,'charred timber')
    def rib(j):
        fy=j/15; y=(fy-.5)*length
        width=2.38*(.14+.86*sin(pi*fy)**.67)
        sheer=.38+1.45*abs(2*fy-1)**2.6
        return y,width,sheer
    for j in range(16):
        y,w,b=rib(j); keel=(0,y,.86+b)
        p.box(0,y,.42,3.9,.43,.44,'oak framing')
        for hand in (-1,1):
            cross=[keel,(hand*w*.51,y,.99+b),(hand*w*.85,y,1.65+b),(hand*w,y,2.58+b),(hand*w*.96,y,3.06+b)]
            for lo,hi in zip(cross,cross[1:]):p.beam(lo,hi,.23,.26,'new planks')
            if j<15:
                ny,nw,nb=rib(j+1)
                p.beam(cross[-1],(hand*nw*.96,ny,3.06+nb),.16,.17,'oak endgrain')
                if j<4:p.beam(cross[1],(hand*nw*.51,ny,.99+nb),.31,.35,'oak framing')
        if j<15:
            ny,nw,nb=rib(j+1);p.beam(keel,(0,ny,.86+nb),.32,.33,'oak endgrain')
    p.finish()


def engine_works(port):
    for name,x,y,w,d,h,yaw in [
        ('Riveting hall',-5.8,2.5,5.0,7.15,3.15,-.96),
        ('Annealing shop',-9.7,-.1,3.2,5.85,2.35,-1.04),
        ('Plate bending hall',3.8,5.7,4.4,5.7,3.1,.23),
        ('Casting shop',7.2,5.4,2.35,4.9,2.6,.23)]:
        p=Piece(name,x,y,surface(port,x,y),yaw)
        yard_shed(p,0,0,w,d,h)
        for i in range(2):
            p.box(-.45+i*.86,-.1,h+.87,.70,2.75,.70,'iron plate')
            p.box(-.45+i*.86,-.11,h+1.26,.79,2.88,.12,'oxidized sheet')
        p.finish()
    p=Piece('Copperfall | furnace court and blast mains',-1.5,3.6,surface(port,-1.5,3.6))
    for xx,yy,r,h in ((-1.65,1.0,.72,8.9),(0,1.40,.60,7.65),(1.28,1.56,.47,6.43)):
        chimney(p,xx,yy,r,h)
        p.box(xx,yy-1.54,.76,1.17,.79,1.45,'light brick')
        p.box(xx,yy-1.95,.74,.85,.11,.93,'charred timber')
        p.box(xx,yy-2.016,.64,.64,.037,.55,'forge glow')
        for jj in (-1,0,1):p.box(xx+jj*.20,yy-2.05,.73,.052,.07,.75,'dark iron')
        for yoke in (.17,.62):p.cone(xx,yy,h*.34+yoke,r*.92,r*.92,.070,'forge glow',12)
        p.beam((xx,yy,2.7),(xx,yy-2.15,2.7),.52,mat='aged copper',sides=10)
        p.beam((xx,yy-2.15,2.7),(xx,yy-2.15,.68),.52,mat='oxidized sheet',sides=10)
    p.finish()
    building_slip()
    yard_crane(-4.0,-1.5,surface(port,-4.0,-1.5))


def build_architecture(port,sites):
    if port not in ('sunstep','copperfall'):
        return
    copper=port=='copperfall'
    if copper:
        engine_works(port)
    else:
        homes=[(-6.5,-1.5,2.5,4.4,2.25,-.46),(-3.6,-1.25,2.10,3.0,1.6,-.12),
               (1.7,1.95,2.85,3.75,2.55,.64),(4.2,1.3,1.78,2.79,1.62,.38),
               (7.3,-1.6,2.0,2.88,2.02,-.13)]
        for i,args in enumerate(homes):house(port,'Orchard lane '+str(i+1),*args)
        windmill(-6.2,6.15,surface(port,-6.2,6.15))
        house(port,'Mill granary',-8.9,3.3,2.0,3.60,1.8,.59)
    for role,site in sites.items():
        x,y,z=site['x'],site['y'],site.get('z',0)
        if role=='authority':
            house(port,'Yardmaster’s office' if copper else 'Vale’s counting hall',x,y,4.2,4.1,2.55 if copper else 3.12,-.13,industrial=copper,base=z)
            p=Piece('Bell lantern',x-1.42,y+1.0,z);p.cone(0,0,2.3,1.0,.75,2.92,'light brick' if copper else 'chalk plaster',8);p.cone(0,0,5.2,.74,.74,.68,'warm windows',8);p.cone(0,0,5.85,.91,0,1.5,'aged copper',8);p.finish()
        elif role=='market':
            house(port,'Exchange and stores',x-1.2,y+.72,3.25,3.7,2.8,-.1,industrial=copper,base=z)
            p=Piece('Produce stalls' if not copper else 'Metal exchange',x,y,z);stall(p,1.24,.45,'pear' if not copper else 'iron');p.finish()
        elif role=='shipyard':
            p=Piece('Copperfall • ship hall' if copper else 'Liftwrights’ timber slip',x,y,z,-.12);yard_shed(p,-1.55,.4,3.2,4.3,2.75);gantry(p,2.34,.88);cradle(p,.61,-.67);p.finish()
        elif role=='civic':
            p=Piece('Winter garden' if copper else 'Grafting arcade',x,y,z)
            if copper:
                panes=Piece('winter-glass-repaired',x,y,z)
                for i in range(7):
                    xx=-2.2+i*.71;p.beam((xx,-1.4,0),(xx,-1.4,1.7),.095,mat='verdigris');p.beam((xx,-1.4,1.7),(xx,0,2.85),.10,mat='aged copper');p.beam((xx,0,2.85),(xx,1.4,1.7),.10,mat='aged copper');p.beam((xx,1.4,1.7),(xx,1.4,0),.095,mat='verdigris')
                    if i<6:
                        panes.polygon([(xx+.06,-1.4,1.73),(xx+.64,-1.4,1.73),(xx+.64,0,2.86),(xx+.06,0,2.86)],'glass');panes.polygon([(xx+.06,0,2.86),(xx+.64,0,2.86),(xx+.64,1.4,1.73),(xx+.06,1.4,1.73)],'glass')
                panes.finish()
            else:
                for j in range(5):
                    xx=-2.2+j*1.04
                    for yy in (-1.03,1.03):p.box(xx,yy,1.05,.26,.26,2.1,'stone courses');p.beam((xx,yy,1.54),(xx+.58,yy,2.12),.18,mat='oak framing')
                    p.box(xx,0,2.2,.15,2.57,.19,'oak framing');p.box(xx+.28,.25,2.38,.84,1.75,.18,'leaf sun' if j%2 else 'leaf shadow')
                p.box(0,1.03,2.16,5.4,.24,.22,'oak framing');p.box(0,-1.03,2.16,5.4,.24,.22,'oak framing')
            p.finish()
        else:
            p=Piece('Rope store, crates and quay lamp',x,y,z)
            for j in range(3):
                xx=-1.15+.89*(j%2);yy=.54+.8*(j//2);p.box(xx,yy,.36,.84,.71,.7,'oak endgrain');p.beam((xx-.35,yy-.36,.1),(xx+.35,yy-.36,.61),.08,mat='new planks')
            p.beam((1.4,.32,0),(1.4,.32,2.4),.18,mat='charred timber');p.cone(1.4,.32,2.36,.28,.27,.37,'warm windows',6);p.cone(1.4,.32,2.72,.39,.03,.23,'aged copper',6);p.finish()
