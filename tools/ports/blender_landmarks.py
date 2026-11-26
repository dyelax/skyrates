"""Architectural meshes for Glasshouse Reach and Meridian Spire, in town-local space."""
import math
import random

import bpy
from mathutils import Vector

TAU = 2 * math.pi
IVORY = "Warm limestone"
LIP = "Light-cut cornice"
SHADE = "Stone recess"
GOLD = "Gilt bronze"
BRASS = "Aged brass"
GLOW = "Lantern light"
WARM = "Warm glass"
GLASS = ["Sea-glass", "Turquoise glass", "Celadon glass", "Cobalt reflection"]
PALETTE = {
    "Vine stem": ("596746", .01, .81), "Vine leaf": ("648341", .02, .71),
    "Petal violet": ("a889c9", .0, .69), "Petal light": ("efceed", .0, .69),
    WARM: ("f6b55e", .09, .22),
    IVORY: ("cfc1a1", 0.03, .73), LIP: ("ebdfbf", .03, .62), SHADE: ("786e59", .08, .78),
    GOLD: ("d8ac60", .65, .33), BRASS: ("937345", .55, .45), GLOW: ("ffcb73", .12, .27),
    "Dark bronze": ("443e37", .48, .52), "Roof highlight": ("bed7c2", .24, .36),
    "Sea-glass": ("67a5a2", .14, .24), "Turquoise glass": ("8ab8b2", .14, .23),
    "Celadon glass": ("b0cbc0", .12, .24), "Cobalt reflection": ("709794", .12, .23),
    "Velvet foliage": ("455735", .01, .84), "Silver leaf": ("738349", .02, .76),
    "Wisteria violet": ("846a9d", .00, .82), "Wisteria lilac": ("aa86b5", .00, .76),
    "Pale wisteria": ("c9adc9", .00, .74), "Snowlight": ("e1e5d9", .01, .84),
    "Shutter": ("63594e", .35, .59), "Canvas": ("cdbd90", .02, .89),
    "Balloon blue": ("48768d", .15, .70), "Balloon panels": ("6895a1", .12, .66),
    "Wicker": ("917144", .02, .87), "Midnight glass": ("304856", .17, .36),
    "Door timber": ("605644", .02, .80),
}


VINE_COLORS = {"Vine stem", "Vine leaf", "Velvet foliage", "Silver leaf", "Petal light", "Wisteria violet",
               "Wisteria lilac", "Petal violet", "Pale wisteria"}
VINE_PAINT = "Wisteria petal and leaf colors"
PALETTE[VINE_PAINT] = ("ffffff", 0.0, .73)


def material(name):
    key = "Ports · " + name
    saved = bpy.data.materials.get(key)
    if saved:
        return saved
    shade, metal, roughness = PALETTE[name]
    # Hex strings are paint swatches. Blender's Principled inputs use linear RGB.
    rgb = [int(shade[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    rgba = [((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in rgb] + [1]
    mat = bpy.data.materials.new(key)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Roughness"].default_value = roughness
    if name == VINE_PAINT:
        attribute = mat.node_tree.nodes.new('ShaderNodeVertexColor')
        attribute.layer_name = 'Vine colors'
        mat.node_tree.links.new(attribute.outputs['Color'], bsdf.inputs['Base Color'])
    if name in GLASS:
        bsdf.inputs["Alpha"].default_value = .62 + .045*GLASS.index(name)
        bsdf.inputs["Transmission Weight"].default_value = .21
        bsdf.inputs["IOR"].default_value = 1.45
        bsdf.inputs["Coat Weight"].default_value = .36
        mat.surface_render_method = 'BLENDED'
    if name in (GLOW,WARM):
        bsdf.inputs["Emission Color"].default_value = rgba
        bsdf.inputs["Emission Strength"].default_value = 1.50 if name == WARM else 1.25
    return mat


class Mason:
    """Batch each structure into one GLB mesh, with local vertices and material slots."""

    def __init__(self, name, x, y, z, angle=0):
        self.name = name
        self.origin = (x, y, z)
        self.angle = angle
        self.verts, self.faces, self.slots = [], [], []
        self.materials = {}
        self.vine_colors = None

    def polygon(self, vertices, coat):
        start = len(self.verts)
        self.verts.extend(vertices)
        self.faces.append(tuple(range(start, start + len(vertices))))
        if self.vine_colors is not None:
            painted = coat in VINE_COLORS
            color = PALETTE[coat][0] if painted else "ffffff"
            self.vine_colors.extend([color] * len(vertices))
            if painted:
                coat = VINE_PAINT
        self.slots.append(self.materials.setdefault(coat, len(self.materials)))

    def solid(self, rings, coat, ends=True):
        for lo, hi in zip(rings, rings[1:]):
            for j in range(len(lo)):
                n = (j + 1) % len(lo)
                self.polygon((lo[j], lo[n], hi[n], hi[j]), coat)
        if ends:
            self.polygon(tuple(reversed(rings[0])), coat)
            self.polygon(rings[-1], coat)

    def block(self, center, dims, coat):
        x, y, z = center
        a, b, c = (n / 2 for n in dims)
        self.solid([[(x-a,y-b,k),(x+a,y-b,k),(x+a,y+b,k),(x-a,y+b,k)] for k in (z-c,z+c)], coat)

    def drum(self, x, y, tiers, coat, sides=24):
        self.solid([[(x+r*math.cos(TAU*i/sides),y+r*math.sin(TAU*i/sides),z)
                     for i in range(sides)] for z, r in tiers], coat)

    def rod(self, a, b, radius, coat, sides=6):
        a, b = Vector(a), Vector(b)
        if (b-a).length < .0001:
            return
        axis = (b-a).normalized()
        u = axis.cross(Vector((0,0,1)) if abs(axis.z)<.9 else Vector((1,0,0))).normalized()
        v = axis.cross(u)
        self.solid([[tuple(p+radius*(u*math.cos(TAU*j/sides)+v*math.sin(TAU*j/sides)))
                     for j in range(sides)] for p in (a,b)], coat)

    def line(self, points, radius, coat, sides=6):
        for a,b in zip(points,points[1:]):
            self.rod(a,b,radius,coat,sides)

    def bead(self, at, size, coat, rings=5, sides=8):
        x,y,z = at; sx,sy,sz = size
        self.solid([[(x+sx*max(.015,math.sin(math.pi*k/rings))*math.cos(TAU*j/sides),
                      y+sy*max(.015,math.sin(math.pi*k/rings))*math.sin(TAU*j/sides),
                      z-sz*math.cos(math.pi*k/rings)) for j in range(sides)] for k in range(rings+1)], coat)

    def finish(self):
        data=bpy.data.meshes.new(self.name)
        data.from_pydata(self.verts,[],self.faces)
        for name in self.materials:
            data.materials.append(material(name))
        data.polygons.foreach_set("material_index",self.slots)
        if self.vine_colors:
            colors = data.color_attributes.new(name="Vine colors", type='BYTE_COLOR', domain='POINT')
            palette = {key: tuple(int(key[i:i+2],16)/255 for i in (0,2,4))+(1,) for key in set(self.vine_colors)}
            colors.data.foreach_set("color_srgb", [v for color in self.vine_colors for v in palette[color]])
        data.update()
        obj=bpy.data.objects.new(self.name,data)
        bpy.context.collection.objects.link(obj)
        obj.location=self.origin
        obj.rotation_euler.z=self.angle
        return obj


def arch(m, x, cy, floor, width, height, coat, radius):
    # An opening in a wall normal to X, with upright jambs and a true arched lintel.
    r=width/2
    spring=floor+height-r
    pts=[(x,cy-r,floor)]
    pts.extend((x,cy-r*math.cos(math.pi*i/12),spring+r*math.sin(math.pi*i/12)) for i in range(13))
    pts.append((x,cy+r,floor))
    m.line(pts,radius,coat)


def conservatory(name,x,y,z,length,r,wall,heading=0):
    m=Mason(name,x,y,z,heading)
    a=length/2; floor=.34; spring=floor+wall*.80; n=max(5,round(length/1.24))
    m.block((0,0,-.48),(length+.36,r*2+.38,1.47),IVORY)
    m.block((0,0,.24),(length+.58,r*2+.62,.22),LIP)
    roof=lambda u,t:(u,r*math.cos(t),spring+r*1.12*math.sin(t))
    cols=12
    for i in range(n):
        x0=-a+length*i/n; x1=-a+length*(i+1)/n
        for j in range(cols):
            t0=math.pi*j/cols;t1=math.pi*(j+1)/cols
            coat=GLASS[2 if j in (2,3,8) else 0 if j<7 else 1]
            m.polygon((roof(x0,t0),roof(x0,t1),roof(x1,t1),roof(x1,t0)),coat)
        for side in (-1,1):
            v=r*side
            m.polygon(((x0,v,floor),(x1,v,floor),(x1,v,spring),(x0,v,spring)),GLASS[(i+side)%3])
            mid=(x0+x1)/2; h=(x1-x0)/2
            # Slender trefoil arches at each window; retain a dark interior below.
            pane=[(x0+.10,v+side*.035,floor+.1),(x0+.10,v+side*.035,spring-.62)]
            pane.extend((mid-.89*h*math.cos(math.pi*j/10),v+side*.04,spring-.62+.48*math.sin(math.pi*j/10)) for j in range(11))
            pane.append((x1-.10,v+side*.035,floor+.1))
            m.line(pane,.045,GOLD)
            if i%4==1:
                yy=v+side*.054
                m.polygon(((mid-.31,yy,floor+.39),(mid+.31,yy,floor+.39),
                           (mid+.31,yy,spring-.57),(mid,yy,spring-.33),(mid-.31,yy,spring-.57)),WARM)
                m.rod((mid,yy+side*.02,floor+.38),(mid,yy+side*.02,spring-.33),.027,BRASS)
            m.block((mid,v+side*.055,floor+.30),(x1-x0-.2,.035,.20),GLOW if i%4==1 else SHADE)
    for i in range(n+1):
        u=-a+length*i/n
        m.line([roof(u,math.pi*j/cols) for j in range(cols+1)],.082 if i%2==0 else .052,GOLD)
        for v in (-r,r):
            m.rod((u,v,floor),(u,v,spring),.098,BRASS,8)
            m.block((u,v,spring-.03),(.28,.28,.19),GOLD)
    for j in range(cols+1):
        t=math.pi*j/cols
        m.rod(roof(-a,t),roof(a,t),.062 if j%3==0 else .031,BRASS)
    rng=random.Random(len(name)*977)
    for i in range(n):
        u=-a+(i+.53)*length/n
        for sign in (-1,1):
            v=sign*r*.58
            m.block((u,v,.51),(length/n*.90,.55,.38),"Wicker")
            for k in range(3):
                px=u+rng.uniform(-.28,.28);py=v+rng.uniform(-.19,.19);h=rng.uniform(.43,1.18)
                m.rod((px,py,.64),(px+.05,py,h+.69),.042,"Velvet foliage")
                m.bead((px,py,h+.63),(.23,.26,.38),rng.choice(["Velvet foliage","Silver leaf"]),3,5)
                if i%3==2: m.bead((px,py,h+.89),(.14,.14,.16),"Wisteria lilac",3,5)
    for u,sign in ((-a,-1),(a,1)):
        m.polygon([(u,-r,floor),(u,r,floor)]+[roof(u,math.pi*j/cols) for j in range(cols+1)],GLASS[1])
        for k in range(-3,4):
            v=k*r/4
            h=spring+r*1.12*math.sqrt(1-(v/r)**2)
            m.rod((u+sign*.045,v,floor),(u+sign*.045,v,h),.048,BRASS)
        m.block((u+sign*.066,0,1.16),(.08,1.06,1.61),"Door timber")
        arch(m,u+sign*.14,0,floor,1.2,2.04,GOLD,.084)
        m.rod((u,0,spring+r*1.12),(u,0,spring+r*1.12+.65),.075,GOLD)
        m.bead((u,0,spring+r*1.12+.6),(.13,.13,.17),GOLD)
    for sign in (-1,1):
        for i in range(3):
            m.block((sign*(a+.42+.37*i),0,.12-.17*i),(.56,1.90+.22*i,.22),LIP)
    m.finish()


def orbit(m, at, r, normal, coat, tube=.07, steps=40):
    c=Vector(at);n=Vector(normal).normalized()
    u=n.cross(Vector((0,0,1)) if abs(n.z)<.91 else Vector((1,0,0))).normalized();v=n.cross(u)
    m.line([tuple(c+r*(u*math.cos(TAU*i/steps)+v*math.sin(TAU*i/steps))) for i in range(steps+1)],tube,coat)


def dial(m,z,r):
    orbit(m,(0,0,z),r,(0,1,.15),GOLD,.12)
    orbit(m,(0,0,z),r*.92,(1,.3,.55),BRASS,.09)
    orbit(m,(0,0,z),r,(.3,.4,1),GOLD,.08)
    m.rod((-.8*r,-.5*r,z-r),(.8*r,.5*r,z+r),.075,GOLD)
    m.bead((0,0,z),(.21,.21,.21),GLOW)
    m.rod((0,0,z-r),(0,0,z+r+.68),.085,GOLD)
    m.drum(0,0,[(z+r+.22,.2),(z+r+.92,.015)],GOLD,8)


def lantern(x,y,z):
    m=Mason("The keeper's brass lantern",x,y,z)
    m.drum(0,0,[(-.65,3.05),(.15,3.05),(.27,3.18),(.44,3.15),(.55,2.83),(1.44,2.75)],IVORY)
    m.drum(0,0,[(1.38,2.95),(1.57,2.99),(1.71,2.73)],LIP)
    m.drum(0,0,[(1.61,1.78),(2.0,1.68),(7.70,.90),(9.25,1.15)],IVORY,12)
    for i in range(8):
        co,si=math.cos(TAU*i/8),math.sin(TAU*i/8)
        m.rod((1.72*co,1.72*si,1.7),(.95*co,.95*si,8.9),.14,BRASS)
    for h,r in ((1.82,1.84),(2.27,1.76),(8.36,1.17),(8.87,1.39)):
        m.drum(0,0,[(h-.09,r*.94),(h,r),(h+.12,r)],GOLD)
    m.drum(0,0,[(9.05,1.12),(9.64,2.04),(9.88,2.15),(10.04,2.09)],BRASS)
    m.drum(0,0,[(10.0,1.72),(10.24,1.9),(11.8,1.70)],GLASS[1],16)
    m.drum(0,0,[(10.26,1.86),(10.7,1.84),(11.09,1.83)],GLOW,16)
    for i in range(12):
        co,si=math.cos(TAU*i/12),math.sin(TAU*i/12)
        m.rod((1.94*co,1.94*si,10.05),(1.76*co,1.76*si,11.86),.105,GOLD)
    m.drum(0,0,[(11.78,1.98),(12.01,1.95),(12.52,1.02),(12.79,.40)],GOLD)
    dial(m,13.88,1.30);m.finish()


# All stems, leaflets and blossoms are batched into their host structure's
# mesh. The repeated folded shapes share these same material slots in glTF.
def leaflet(m, base, angle, length, width, droop, coat):
    x,y,z=base
    dx,dy=math.cos(angle),math.sin(angle)
    shoulder=(x+dx*length*.45, y+dy*length*.45, z+length*.12)
    left=(shoulder[0]-dy*width, shoulder[1]+dx*width, shoulder[2])
    right=(shoulder[0]+dy*width, shoulder[1]-dx*width, shoulder[2]-.018)
    tip=(x+dx*length,y+dy*length,z-droop)
    m.polygon((base,right,tip),coat)
    m.polygon((base,tip,left),coat)


def leaf_spray(rng,m,base,angle,length):
    x,y,z=base
    dx,dy=math.cos(angle),math.sin(angle)
    rise=rng.uniform(.09,.22)*length
    tip=(x+dx*length,y+dy*length,z+rise)
    m.rod(base,tip,.012,"Velvet foliage",3)
    for i,t in enumerate((.20,.47,.72)):
        size=length*(.38-i*.034)
        for sign in (-1,1):
            a=angle+sign*rng.uniform(.66,1.16)
            start=(x+dx*length*t,y+dy*length*t,z+rise*t)
            leaflet(m,start,a,size,.235*size,rng.uniform(.04,.19)*size,rng.choice(("Velvet foliage","Silver leaf","Vine leaf")))
    leaflet(m,tip,angle,length*.24,length*.059,length*.025,"Silver leaf")


def pea_flower(m,base,angle,size,shade):
    # A pea blossom faces outward. The raised, notched banner catches skylight
    # above a paler pair of wings and a folded keel.
    x,y,z=base
    co,si=math.cos(angle),math.sin(angle)
    def point(out,side,up):
        return (x+size*(co*out-si*side),y+size*(si*out+co*side),z+size*up)
    throat=point(.36,0,-.13)
    left,notch,right=point(.61,.67,.42),point(.77,0,.34),point(.64,-.67,.37)
    m.polygon((throat,left,notch),shade)
    m.polygon((throat,notch,right),shade)
    tip=point(1.02,0,-.29)
    m.polygon((base,point(.57,.47,.09),tip),"Petal light")
    m.polygon((base,tip,point(.55,-.46,-.18)),"Wisteria violet")


def raceme(rng,m,base,length,width):
    x,y,z=base
    leanx,leany=rng.uniform(-.14,.14),rng.uniform(-.095,.095)
    twist=rng.uniform(0,TAU)
    def rachis(t):
        return (x+length*(leanx*t+.054*math.sin(math.pi*t+twist)-.054*math.sin(twist)),
                y+length*(leany*t+.044*math.sin(TAU*t)*t), z-length*t)
    m.line([rachis(t) for t in (0,.46,.79,1)],max(.009,width*.09),"Vine stem",3)
    density=max(10,round(length/.047))
    for i in range(density):
        t=(i+.55)/density
        a=twist+i*2.39996+rng.uniform(-.29,.29)
        # An open collar, a dense middle and an uneven strand of lower buds.
        taper=(1-t)**.60
        r=width*taper*(.8+.52*math.sin(math.pi*t))*rng.uniform(.77,1.14)
        sx,sy,sz=rachis(t)
        base=(sx+math.cos(a)*r*.78,sy+math.sin(a)*r*.78,sz)
        color=rng.choice(("Wisteria lilac","Petal violet","Pale wisteria","Wisteria lilac"))
        pea_flower(m,base,a,width*(.45+1.1*taper)*rng.uniform(.78,1.2),color)


def drape(rng,m,x,y,height,length):
    # Two twisting leaders weave between the posts, with occasional breaks
    # between hanging racemes so their pointed ends silhouette separately.
    segments=max(4,round(length/.52))
    for lane in range(2):
        nodes=[]
        for i in range(segments+1):
            u=x+length*i/segments
            phase=i*.83+lane*math.pi
            v=y+math.cos(phase)*.18
            h=height+.10*math.sin(phase)
            nodes.append((u,v,h))
            leaf_spray(rng,m,(u,v,h),rng.choice((-1,1))*rng.uniform(.6,2.3),rng.uniform(.62,.96))
            if rng.random()<(.90 if lane==0 else .60):
                raceme(rng,m,(u,v,h),rng.uniform(.62,1.34),rng.uniform(.135,.20))
        m.line(nodes,.029,"Vine stem",4)


def pergola(x,y,z):
    rng=random.Random(331);m=Mason("Wisteria walk and glass cupola",x,y,z,-.18)
    m.vine_colors=[]
    for x0 in (-3.6,-1.2,1.2,3.6):
        for y0 in (-1.55,1.55):
            m.drum(x0,y0,[(-.25,.3),(.2,.34),(.38,.23),(2.8,.19),(2.99,.34)],IVORY,10)
    for yy in (-1.55,1.55):
        m.block((0,yy,3.02),(7.9,.23,.27),GOLD)
        drape(rng,m,-3.78,yy,3.24,7.7)
    for i in range(14):m.block((-3.7+i*.56,0,3.13),(.13,3.58,.12),BRASS)
    m.finish()


def observatory(name,x,y,z,r):
    m=Mason(name,x,y,z,.18)
    m.drum(0,0,[(-.55,r*1.17),(.18,r*1.19),(.31,r*1.1),(1.60,r),(1.75,r*1.09),(1.93,r*1.09)],IVORY)
    for i in range(12):
        a=TAU*i/12
        u,v=math.cos(a)*r,math.sin(a)*r
        m.rod((u,v,.24),(u,v,1.72),.14,LIP,8)
        if i%2:
            m.bead((u,v,.91),(.29,.29,.52),"Midnight glass",5,8)
    h=1.90;R=r*1.04
    def globe(lon,lat):
        return R*math.cos(lat)*math.cos(lon),R*math.cos(lat)*math.sin(lon),h+R*math.sin(lat)
    for i in range(32):
        lon=i*TAU/32; end=(i+1)*TAU/32
        for j in range(10):
            a=j*math.pi/20;b=(j+1)*math.pi/20
            coat=(WARM if i==25 and j in (2,3,4) else "Midnight glass") if i in (24,25,26) else ("Snowlight" if (i+j)%4 else IVORY)
            m.polygon((globe(lon,a),globe(end,a),globe(end,b),globe(lon,b)),coat)
        if i%4==0 or i==27:m.line([globe(lon,j*math.pi/20) for j in range(11)],.10 if i in (24,27) else .065,GOLD)
    for lat in (.05,.44,.88): m.line([globe(TAU*i/40,lat) for i in range(41)],.07,BRASS)
    m.finish()


def spire(x,y,z):
    m=Mason("Ivory meridian transit spire",x,y,z)
    m.drum(0,0,[(-.6,2.45),(.10,2.50),(.3,2.61),(.53,2.32),(1.25,2.15),(1.36,2.27)],IVORY,16)
    tiers=[(1.3,1.78),(3.2,1.66),(8.7,1.23),(13.6,.73),(16.3,.39),(17.2,.26)]
    m.drum(0,0,tiers,"Shutter",12)
    # Split axial ribs are structural masonry. Between each is an actual deep
    # viewing slit with narrow bronze mullions, visible from every side.
    for i in range(8):
        a=i*TAU/8
        for sign in (-1,1):
            rings=[]
            for k,r in tiers:
                u=a+sign*(.10+.03*(k<4));width=.10 if k>12 else .115
                rings.append([((r+extra)*math.cos(u+angle),(r+extra)*math.sin(u+angle),k)
                              for extra,angle in ((-.04,-width),(.23,-width),(.23,width),(-.04,width))])
            m.solid(rings,LIP if i%3 else IVORY)
        if i%2==0:
            co,si=math.cos(a+.38),math.sin(a+.38)
            m.rod((co*1.8,si*1.8,2.7),(co*1.44,si*1.44,7.0),.06,GOLD)
            m.bead((co*1.50,si*1.50,6.45),(.12,.12,.34),GLOW,4,6)
    # Ivory lancet hood and deep blue glazing on each main face of the tower.
    for j in range(4):
        angle=j*TAU/4+.12
        n=Vector((math.cos(angle),math.sin(angle),0)); side=Vector((-n.y,n.x,0))
        def facept(u,h,relief=0):
            stone_radius=1.78-(h-1.3)*.083
            return tuple(n*(stone_radius+.18+relief)+side*u+Vector((0,0,h)))
        for base,ht,half in ((1.5,1.56,.36),(4.20,3.15,.27),(9.18,2.23,.18)):
            outline=[facept(-half,base),facept(half,base),facept(half,base+.74*ht),facept(0,base+ht),facept(-half,base+.74*ht)]
            m.polygon(outline,"Midnight glass")
            m.line(outline[1:]+[outline[0]],.075,LIP)
            m.rod(facept(0,base,.02),facept(0,base+.93*ht,.02),.035,GOLD)
    for h,r in ((1.35,2.13),(3.35,1.91),(8.5,1.53),(13.55,.97),(16.50,.56)):
        m.drum(0,0,[(h-.09,r*.94),(h,r),(h+.11,r)],GOLD,24)
    m.drum(0,0,[(16.68,.48),(17.5,.32),(18.06,.21)],IVORY,12)
    m.drum(0,0,[(17.56,.52),(17.74,.64),(17.89,.49)],GOLD)
    dial(m,19.51,1.62)
    m.rod((-2.25,0,19.56),(2.20,0,19.56),.11,GOLD)
    m.bead((-2.26,0,19.56),(.22,.22,.22),GOLD)
    m.finish()


def sky_balloon(x,y,z):
    m=Mason("Silk survey balloon and suspended gondola",x,y,z)
    m.drum(0,0,[(-.18,1.05),(.15,1.12),(.36,.98)],IVORY)
    m.block((0,0,.62),(.44,.44,.67),BRASS)
    basket=3.2
    m.drum(0,0,[(basket-.32,.45),(basket,.64),(basket+.43,.69)],"Wicker",8)
    m.drum(0,0,[(basket+.39,.73),(basket+.50,.73)],GOLD,8)
    for i in range(4):
        co,si=math.cos(TAU*i/4+.4),math.sin(TAU*i/4+.4)
        m.rod((co*.55,si*.55,basket+.4),(co*1.0,si*1.0,6.12),.055,BRASS)
    def silk(i,j):
        a=i*TAU/20;t=j*math.pi/12
        rr=max(.025,2.15*math.sin(t)*(1-.125*math.cos(t)))
        return rr*math.cos(a),rr*math.sin(a),7.9-2.65*math.cos(t)
    for i in range(20):
        for j in range(12):
            m.polygon((silk(i,j),silk(i+1,j),silk(i+1,j+1),silk(i,j+1)),
                      "Balloon panels" if i%4 in (0,1) else "Balloon blue")
        if i%2==0:m.line([silk(i,j) for j in range(13)],.043,GOLD)
    for j in (3,6,9):m.line([silk(i,j) for i in range(21)],.06,GOLD)
    for i in range(4):
        co,si=math.cos(i*TAU/4),math.sin(i*TAU/4)
        m.rod((co*.8,si*.8,.39),(co*.43,si*.43,basket),.036,"Dark bronze")
    m.finish()


def round_pavilion(name,x,y,z,r,glass=False):
    m=Mason(name,x,y,z)
    m.drum(0,0,[(-.52,r*1.12),(.09,r*1.14),(.3,r*1.01)],IVORY)
    for i in range(8):
        a=i*TAU/8;u,v=r*.83*math.cos(a),r*.83*math.sin(a)
        m.drum(u,v,[(.2,.25),(.4,.3),(.6,.19),(2.4,.145),(2.55,.25)],IVORY,8)
    m.drum(0,0,[(2.5,r*1.02),(2.68,r*1.08)],GOLD)
    m.drum(0,0,[(2.66,r*1.06),(3.02,r*.83),(3.42,r*.57),(3.75,r*.22),(3.9,.08)],GLASS[1] if glass else "Canvas",16)
    for i in range(12):
        a=i*TAU/12;co,si=math.cos(a),math.sin(a)
        m.line([(r*1.06*co,r*1.06*si,2.7),(.63*r*co,.63*r*si,3.35),(0,0,3.93)],.052,GOLD)
    m.finish()


def build_architecture(port,sites):
    from port_landscape import surface
    ground = lambda x,y: surface(port,x,y)
    def site(id):
        s=sites[id]
        return s['x'],s['y'],s['z']
    if port == "glasshouse":
        conservatory("Great propagation hall",-1.5,1.1,ground(-1.5,1.1),12.7,2.70,2.67,.34)
        conservatory("Upper winterhouse",1.9,7.15,ground(1.9,7.15),9.1,2.05,2.22,.40)
        conservatory("Lower fernery",*site('civic'),7.2,1.77,1.69,.31)
        conservatory("Exchange orangery",*site('market'),7.3,1.75,1.55,.24)
        arcaded_terrace("Lower propagation arcade",-.6,-4.51,ground(-.6,-4.51)-.52,9.1,1.44,-.13)
        for x,y,seed,spread in [(-7.5,-1.62,21,1.47),(5.9,-4.65,27,1.68),(-8.0,5.0,13,1.56),(8.9,2.2,9,1.79),(3.3,-9.0,4,1.30)]:
            wisteria_stand(x,y,ground(x,y),seed,spread)
        lantern(*site('authority'))
        lx,ly,lz=site('authority')
        practical('Keeper’s signal lantern',lx,ly,lz+11.03,145,1.2)
        practical('Propagation hall lamps',-1.5,-.1,ground(-1.5,1.1)+1.85,105,2.2)
        pergola(-3.3,-5.5,ground(-3.3,-5.5))
        round_pavilion("Glaziers' landing pavilion",*site('shipyard'),1.68,True)
        round_pavilion("Lantern quay kiosk",*site('dockworker'),1.07,True)
        rng=random.Random(7342)
        for n,(x,y,length) in enumerate([(-5.4,-2.85,7.8),(2.9,4.4,4.6),(8.0,-6.6,4.0),(-10.5,4.0,5.1)]):
            m=Mason("Trailing wisteria "+str(n+1),x,y,ground(x,y),-.15)
            m.vine_colors=[]
            m.block((length/2,0,.5),(length,.67,1.0),IVORY)
            drape(rng,m,0,-.3,1.14,length)
            m.finish()
    elif port == "meridian":
        spire(4.6,2.1,ground(4.6,2.1))
        practical('Spire reading lamps',3.8,.8,ground(4.6,2.1)+3.4,65,1.1)
        observatory("Gilded transit observatory",-2.2,1.2,ground(-2.2,1.2),3.38)
        observatory("Authority's chart dome",*site('authority'),1.83)
        arcaded_terrace("Arcades of the transit plinth",.7,-3.72,ground(.7,-3.72)-.42,10.7,2.1,-.20)
        arcaded_terrace("Arcades of the north observatory",-5.6,2.9,ground(-5.6,2.9)-.68,6.55,1.5,1.42)
        sky_balloon(*site('civic'))
        round_pavilion("Survey exchange canopy",*site('market'),1.65)
        round_pavilion("Sounding yard canopy",*site('shipyard'),1.85)
        m=Mason("Quayside armillary",*site('dockworker'))
        m.drum(0,0,[(-.2,.96),(.12,1.06),(.36,.91),(.52,.62),(1.2,.40)],IVORY)
        dial(m,2.2,.85);m.finish()


def practical(name, x, y, z, energy, size):
    light = bpy.data.lights.new(name, 'POINT')
    light.energy = energy
    light.color = (1.0, .56, .22)
    light.shadow_soft_size = size
    obj = bpy.data.objects.new(name, light)
    bpy.context.collection.objects.link(obj)
    obj.location = (x, y, z)


def wisteria_stand(x,y,z,seed,spread):
    rng=random.Random(seed)
    m=Mason("Century wisteria "+str(seed),x,y,z,rng.uniform(-.5,.5))
    m.vine_colors=[]
    m.drum(0,0,[(-.25,.91),(.14,1.02),(.40,.92),(.50,1.0)],IVORY)
    m.line([(0,0,.45),(.16,-.08,1.5),(-.11,.08,2.5),(.24,0,3.1)],.20,"Door timber",7)
    for i in range(8):
        a=i*TAU/8+rng.uniform(-.16,.16)
        h=rng.uniform(2.72,3.64)
        length=spread*rng.uniform(.75,1.17)
        def limb(t,bend=0):
            v=a+bend
            return (length*t*math.cos(v),length*t*math.sin(v),h-(1-t)*.36)
        m.line([(.10,0,2.05),limb(.45,-.14),limb(.82),limb(1,.12)],.067,"Door timber",5)
        for j in range(5):
            t=.42+.13*j
            root=limb(t)
            twig=a+(1 if j%2 else -1)*rng.uniform(.47,1.04)
            reach=rng.uniform(.38,.78)
            tip=(root[0]+reach*math.cos(twig),root[1]+reach*math.sin(twig),root[2]+rng.uniform(-.32,.20))
            m.rod(root,tip,.021,"Vine stem",4)
            leaf_spray(rng,m,root,twig+.70,rng.uniform(.67,1.08))
            leaf_spray(rng,m,tip,twig-.57,rng.uniform(.64,.99))
            raceme(rng,m,tip,rng.uniform(.65,1.37),rng.uniform(.153,.225))
            if j in (1,4):
                fork=(tip[0]+.22*math.cos(twig+.9),tip[1]+.22*math.sin(twig+.9),tip[2]-.05)
                m.rod(tip,fork,.015,"Vine stem",3)
                raceme(rng,m,fork,rng.uniform(.46,.82),rng.uniform(.11,.16))
    m.finish()


def arcaded_terrace(name,x,y,z,length,rise,angle=0):
    m=Mason(name,x,y,z,angle)
    n=max(3,round(length/1.70)); span=length/n; radius=span*.38
    for i in range(n+1):
        u=-length/2+span*i
        m.block((u,0,rise*.39),(.47,1.04,rise*.90),IVORY)
        m.block((u,0,.18),(.73,1.28,.38),LIP)
        m.block((u,0,rise*.73),(.62,1.17,.23),LIP)
        if i==n:continue
        mid=u+span/2; spring=rise*.70
        for k in range(9):
            a=k*math.pi/9;b=(k+1)*math.pi/9
            ring=lambda t,r:(mid+r*math.cos(t),spring+r*math.sin(t))
            outline=[ring(a,radius),ring(a,radius+.24),ring(b,radius+.24),ring(b,radius)]
            m.solid([[ (xx,side,zz) for xx,zz in outline] for side in (-.57,.57)], LIP if k%3 else IVORY)
    m.block((0,0,rise+.24),(length+.84,1.75,.31),LIP)
    m.block((0,0,rise+.44),(length+.65,1.58,.14),GOLD)
    for i in range(n*2+1):
        u=-length/2+length*i/(n*2)
        m.drum(u,-.67,[(rise+.48,.13),(rise+.59,.15),(rise+.88,.088),(rise+.98,.13)],IVORY,6)
    m.block((0,-.67,rise+1.03),(length+.55,.28,.18),LIP)
    m.finish()
