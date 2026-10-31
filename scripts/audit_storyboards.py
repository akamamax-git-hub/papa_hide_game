"""Independent structural/inventory audit; does not stand in for browser testing."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
boards=json.loads((root/'scenario/storyboards.json').read_text())
catalog=json.loads((root/'scenario/sprite-catalog.json').read_text())['sprites']
sources=json.loads((root/'scenario/Stage01-50_シナリオ企画表.json').read_text())
actors=dict(zip(['息子','パパ','猫','ママ','妹','おばあちゃん','おじいちゃん','宅配員','郵便屋さん','修理屋さん','となりの子','カラス','犬','宅配ロボット','ロボット掃除機'],['boy','papa','cat','mama','sister','grandma','grandpa','courier','postman','repair','neighbor','crow','dog','robot','vacuum']))
issues=[]
for b,source in zip(boards,sources):
 es={e['id']:dict(e) for e in b['entities']};cast={actors[x] for x in source['characters']};bag=set();room=b['room']
 for e in es.values():
  if e['asset'] not in catalog:issues.append([b['stage'],'missing asset',e['id']])
  if e.get('parent') and e['parent'] not in es:issues.append([b['stage'],'missing parent',e['id']])
 for i,s in enumerate(b['steps']):
  if s['target'] not in es and s['target'] not in cast and s['target']!='door':issues.append([b['stage'],i,'missing target',s['target']])
  if s['actor'] not in cast:issues.append([b['stage'],i,'missing actor',s['actor']])
  for item in s['use']:
   if item not in es:issues.append([b['stage'],i,'missing item',item])
   elif item not in bag and es[item]['asset'] not in ['stool','chair','ladder','scale']:issues.append([b['stage'],i,'unacquired required item',item])
  if s['gain']:bag.add(s['gain'])
  if s['kind'] in ['give','place','throw','order','assemble','carry']:bag.difference_update(s['use'])
 for f in b['failures']:
  if f['target'] not in es and f['target'] not in cast and f['target']!='door':issues.append([b['stage'],'missing failure target',f['target']])
if issues:
 for x in issues:print(x)
 raise SystemExit(1)
print(f'PASS: {len(boards)} storyboards, {sum(len(b["steps"]) for b in boards)} actions; all actors, targets, assets, parents and acquisition prerequisites resolved.')
