"""Explicit observation facts, dependencies and floor placement regions."""
FACTS={
 6:{'mat':'水滴の跡は、青い傘・黄色の傘・折り畳み傘の順。'},
 10:{'card':'番号カードに「1234」と書いてある。'},
 11:{'mirror':'曇りが取れると「2406」が読める。'},
 14:{'note':'乾かしたメモには「かごの底」と書いてある。'},
 22:{'microwave':'電源が入った電子レンジは「12:00」を示している。'},
 26:{'books':'背表紙の番号は 1・2・3・4。'},
 29:{'calendar':'星印が付いた日付は 7月14日。'},
 31:{'notice':'不在票に「リビングの本棚を確認」とある。'},
 33:{'note':'メモには「脱衣かごの底」と書いてある。'},
 41:{'clock':'時計の針は3時。','cat':'猫は右を向いている。','tv':'TVの画面は青色。'},
 43:{'magnets':'磁石の矢印は 赤 → 青 → 緑 → 黄。','fridge':'並べた磁石がパンケースを指している。'},
 44:{'label':'伝票の重さは 2kg。','boxes':'量った重さは 赤1kg・青2kg・緑3kg。'},
 45:{'wall':'ライトに照らされた影は「315」。'},
 46:{'receipt':'レシートの裏に「リビングの上段収納」と書いてある。'},
}
HINTS={1:'パパは退屈そう。部屋に読めるものはあるかな。',2:'リモコンに反応がない。電池と、手が届く高さを考えよう。',3:'猫の気を引けるものを探そう。',4:'時計の上に何か光っている。床からは届かない。',5:'重い物を動かすには、手が滑らない工夫が必要。',6:'玄関の水滴の跡をよく見よう。',10:'郵便受けに番号の手掛かりがありそう。',11:'鏡の曇りを取る方法は？',14:'濡れた紙は、そのままでは読めない。',20:'高い箱を安全に下ろす方法を考えよう。',23:'椅子は座る以外にも使えそう。',26:'教科書の背表紙を見比べよう。',29:'カレンダーの印に注目。',30:'毛布と洗濯ばさみで何を作れる？',41:'時計・猫・TVをそれぞれ観察してみよう。',44:'伝票と実際の重さを比べよう。',45:'紙と光でできる影を考えよう。',50:'家族の様子を見て、一人ずつ困り事を解決しよう。'}

def annotate(boards):
 for b in boards:
  es={e['id']:e for e in b['entities']};b['observations']=FACTS.get(b['stage'],{});b['gentleHint']=HINTS.get(b['stage'],'見えている物と家族の様子を観察し、手に入れた道具の使い道を考えよう。')
  if b['stage'] in [41,44]:b['puzzle']['mode']='boxColor'
  barrier=None
  for i,s in enumerate(b['steps']):
   if s['kind']=='combine':s['inputItems']=['battery'];s['inputTarget']='bag'
   if s['kind']=='dry':s['inputItems']=['dryer']
   s['requires']=[] if i==0 else [i-1]
   if s['kind']=='pickup':
    s['requires']=[] if barrier is None else [barrier]
   else:barrier=i
   if b['stage']==41:s['requires']=[] if i<3 else [0,1,2]
   if s['kind']=='place' and any(es.get(k,{}).get('asset')=='stool' for k in s['use']):
    s['dropZone']={'center':([755,605] if b['stage']==2 else [765,615]),'radius':[65,24],'label':'時計の下の床'}
   if s['kind']=='read' or s['gain'] in b['observations'] or b['stage']==41 and s['kind']=='inspect':
    fact=b['observations'].get(s['target']) or b['observations'].get(s['gain'])
    if fact:s['clue']=fact
