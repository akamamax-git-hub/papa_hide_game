/* One floor/depth model for people, furniture, carried props and supports. */
const SceneGeometry=(()=>{
 const rooms={living:{floor:520},child:{floor:520},kitchen:{floor:520},bath:{floor:520},laundry:{floor:520},hall:{floor:520},entrance:{floor:520,step:670},garden:{floor:500},outside:{floor:500}};
 const slope=.0013,intercept=1-650*slope;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function room(id=state?.room){return rooms[id]||rooms.living;}
 function scale(y){return clamp(intercept+slope*y,.75,1.2);}
 function floorOf(e,seen=new Set()){
  if(!e||seen.has(e.id))return 650;seen.add(e.id);
  if(Number.isFinite(e.contactFloor))return e.contactFloor;
  if(state.actors[e.id])return e.y;
  if(e.holder&&e.place==='hand')return state.actors[e.holder]?.y||650;
  if(e.parent)return floorOf(state.entities[e.parent],seen);
  if(e.id==='console'&&e.place==='room')return floorOf(World.node(e.container),seen);
  if(Number.isFinite(e.motionFloor))return e.motionFloor;
  if(['wall','wallLow'].includes(e.slot)||e.asset==='window')return room(e.room).floor+45;
  return e.y||650;
 }
 function footwear(roomId,y){return ['garden','outside'].includes(roomId)||roomId==='entrance'&&y>=room('entrance').step?'outdoor':'indoor';}
 function projected(e){return e.id!=='door'&&e.asset!=='window';}
 function resize(e,h,w){const k=projected(e)?scale(floorOf(e)):1;e.baseH=h/k;e.baseW=w/k;e.h=h;e.w=w;}
 function sizeObjects(){for(const e of Object.values(state.entities)){
  if(!e.asset||e.id==='console'&&e.place!=='hand')continue;
  e.baseH??=e.h;e.baseW??=e.w;
  const k=projected(e)?scale(floorOf(e)):1;
  e.h=e.baseH*k*(e.sizeFactor??1);e.w=e.baseW*k*(e.sizeFactor??1);
 }}
 function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;
 }return yes;}
 function supportPlane(e){const f=World.frame(e),uv=CATALOG[e.asset].supportPlanes?.[0]||CATALOG[e.asset].supportPlane||({stool:[[.12,.04],[.83,.04],[.95,.20],[.22,.20]],chair:[[.12,.49],[.83,.49],[.95,.64],[.22,.64]],ladder:[[.25,.27],[.75,.27],[.79,.34],[.21,.34]]}[e.asset]);
  return uv.map(([x,y])=>({x:f.left+f.w*x,y:f.top+f.h*y}));
 }
 function supportPlanes(e){const f=World.frame(e),uv=CATALOG[e.asset].supportPlanes;return uv?uv.map(poly=>poly.map(([x,y])=>({x:f.left+f.w*x,y:f.top+f.h*y}))):[supportPlane(e)];}
 function supportContains(e,p){return supportPlanes(e).some(poly=>inside(p,poly)||poly.some((a,i)=>{const b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y)<=3;}));}
 function feet(a){const f=World.frame(a),m=CATALOG[World.actorAsset(a)];return (m.supportFeet||[[.5,1]]).map(([u,v])=>({x:f.left+f.w*(a.facing===-1?1-u:u),y:f.top+f.h*v}));}
 function standOn(a,e){const old=feet(a),p={x:old.reduce((n,p)=>n+p.x,0)/old.length,y:old.reduce((n,p)=>n+p.y,0)/old.length},centers=supportPlanes(e).map(poly=>({x:poly.reduce((n,p)=>n+p.x,0)/poly.length,y:poly.reduce((n,p)=>n+p.y,0)/poly.length})),c=centers.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  for(const pose of ['idle','climb']){a.y=e.y;a.elevation=0;World.pose(a.id,pose);const f=World.frame(a),m=CATALOG[World.actorAsset(a)],uv=m.supportFeet||[[.5,1]],u=uv.reduce((n,p)=>n+(a.facing===-1?1-p[0]:p[0]),0)/uv.length,v=uv.reduce((n,p)=>n+p[1],0)/uv.length;a.x=c.x-(u-.5)*f.w;a.elevation=e.y-c.y-f.h*(1-v);if(feet(a).every(p=>supportContains(e,p)))break;}
 }
 function supportCenter(e){const p=supportPlane(e);return {x:p.reduce((n,v)=>n+v.x,0)/p.length,y:p.reduce((n,v)=>n+v.y,0)/p.length};}
 const solid=new Set(['cabinet','tv','sofa','table','shelf','upperCab','desk','bed','tub','vanity','washer','bench','shed','locker','wardrobe','fridge','fort']);
 function obstacles(skip){return Object.values(state.entities).filter(e=>e.room===state.room&&e.visible&&e.place==='room'&&!e.parent&&solid.has(e.asset)&&e.id!==skip).map(e=>{
  const f=World.frame(e),d=clamp(f.h*.13,18,42);return {id:e.id,left:f.left+f.w*.1-8,right:f.left+f.w*.9+8,top:e.y-d*.7,bottom:e.y+d*.2};
 });}
 function walkable(p,skip){return p.x>=45&&p.x<=1155&&p.y>=room().floor&&p.y<=755&&!obstacles(skip).some(r=>p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y<r.bottom);}
 function path(from,to,skip){
  const blocks=obstacles(skip),clear=p=>p.x>=45&&p.x<=1155&&p.y>=room().floor&&p.y<=755&&!blocks.some(r=>p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y<r.bottom);
  const line=(a,b)=>{const n=Math.max(2,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/12));return Array.from({length:n},(_,i)=>({x:a.x+(b.x-a.x)*(i+1)/n,y:a.y+(b.y-a.y)*(i+1)/n})).every(clear);};
  if(line(from,to))return [to];
  const cell=22,points=[from,to];for(const r of blocks)for(const x of [r.left-12,r.right+12])for(const y of [r.top-12,r.bottom+12])if(clear({x,y}))points.push({x,y});
  const cost=points.map(()=>Infinity),prev=[],used=new Set();cost[0]=0;
  for(let k=0;k<points.length;k++){
   let u=-1;for(let i=0;i<points.length;i++)if(!used.has(i)&&(u<0||cost[i]<cost[u]))u=i;
   if(u<0||!Number.isFinite(cost[u]))break;if(u===1){const out=[];for(let v=1;v!==0;v=prev[v])out.unshift(points[v]);return out;}used.add(u);
   for(let v=0;v<points.length;v++)if(!used.has(v)&&line(points[u],points[v])){const n=cost[u]+Math.hypot(points[u].x-points[v].x,points[u].y-points[v].y);if(n<cost[v]){cost[v]=n;prev[v]=u;}}
  }
  // A final contact can lie just inside a furniture footprint; approach its edge.
  const side={x:to.x,y:clamp(to.y+cell,room().floor,755)};return line(from,side)?[side,to]:[to];
 }
 function overlapsActor(id,x,y,h,w,elevation){const box={left:x-w*.28,right:x+w*.28,top:y-elevation-h*.78,bottom:y-elevation-h*.15};
  return Object.values(state.actors).some(a=>{if(a.id===id||!a.visible||a.room!==state.room||!World.human.has(a.id))return false;const f=World.frame(a),l=f.left+f.w*.22,r=f.left+f.w*.78,t=f.top+f.h*.2,b=f.top+f.h*.85;return Math.min(box.right,r)-Math.max(box.left,l)>12&&Math.min(box.bottom,b)-Math.max(box.top,t)>h*.2;});
 }
 return {slope,intercept,scale,room,floorOf,footwear,resize,sizeObjects,inside,supportPlane,supportPlanes,supportContains,feet,standOn,supportCenter,walkable,path,overlapsActor};
})();
