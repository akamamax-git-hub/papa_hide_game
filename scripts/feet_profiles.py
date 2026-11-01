"""Read painted sole contacts; never modify source/generated images."""
from PIL import Image

def annotate(catalog,sheets,root):
 images={}
 for name,m in catalog.items():
  if not name.startswith('boy_'):continue
  if m['sheet'] not in images:images[m['sheet']]=Image.open(root/sheets[m['sheet']]).convert('RGBA')
  im=images[m['sheet']];x,y,w,h=m['rect'];pix=im.load();top=int(h*.85);seen=set();parts=[]
  for yy in range(top,h):
   for xx in range(w):
    if (xx,yy) in seen or pix[x+xx,y+yy][3]<190:continue
    stack=[(xx,yy)];comp=[];seen.add((xx,yy))
    while stack:
     a,b=stack.pop();comp.append((a,b))
     for nx,ny in [(a+1,b),(a-1,b),(a,b+1),(a,b-1)]:
      if nx<0 or nx>=w or ny<top or ny>=h or (nx,ny) in seen or pix[x+nx,y+ny][3]<190:continue
      seen.add((nx,ny));stack.append((nx,ny))
    if len(comp)<20:continue
    bottom=max(b for a,b in comp);sole=[a for a,b in comp if b>=bottom-2];parts.append([round(sum(sole)/len(sole)/w,4),round((bottom+1)/h,4)])
  m['supportFeet']=parts or [[.5,1]]
