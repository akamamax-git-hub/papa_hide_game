"""Hand-authored painted-image contacts and real hiding compartments.

These are local coordinates in the painted sprite, not offsets from a parent.
The game console is authored here before play; a final-step handler never spawns it.
"""
PROFILES = {
 'cabinet':dict(touch=[.50,.55],inside=[.50,.73],region=[.15,.49,.70,.43]),
 'tv':dict(touch=[.50,.81],inside=[.51,.81],region=[.20,.65,.61,.28]),
 'shelf':dict(touch=[.66,.84],inside=[.50,.82],region=[.18,.70,.64,.23]),
 'desk':dict(touch=[.70,.72],inside=[.70,.78],region=[.49,.69,.37,.21]),
 'vanity':dict(touch=[.78,.74],inside=[.50,.78],region=[.22,.64,.57,.29]),
 'bench':dict(touch=[.50,.53],inside=[.50,.58],region=[.20,.43,.62,.35]),
 'fridge':dict(touch=[.24,.43],inside=[.32,.59],region=[.12,.42,.40,.35]),
 'wardrobe':dict(touch=[.54,.51],inside=[.44,.78],region=[.18,.63,.61,.29]),
 'parcel':dict(touch=[.50,.20],inside=[.50,.54],region=[.17,.30,.66,.48]),
 'basket':dict(touch=[.50,.26],inside=[.50,.42],region=[.13,.33,.77,.21]),
 'panel':dict(touch=[.80,.50],inside=[.50,.56],region=[.20,.20,.61,.68]),
 'shed':dict(touch=[.58,.64],inside=[.50,.70],region=[.26,.49,.49,.39]),
 'locker':dict(touch=[.65,.26],inside=[.47,.57],region=[.19,.40,.57,.36]),
 'breadbox':dict(touch=[.50,.29],inside=[.50,.68],region=[.17,.45,.68,.44]),
 'sofa':dict(touch=[.72,.61],inside=[.72,.66],region=[.53,.50,.40,.34]),
 'umbrellas':dict(touch=[.5,.5],inside=[.5,.8],region=[.2,.5,.6,.45]),
 'boxes':dict(touch=[.50,.25],inside=[.50,.58],region=[.37,.32,.26,.51]),
 'robot':dict(touch=[.67,.42],inside=[.67,.70],region=[.53,.60,.30,.20]),
 'umbrellaStand':dict(touch=[.5,.4],inside=[.5,.73],region=[.1,.4,.8,.55]),
 'upperCab':dict(touch=[.46,.31],inside=[.50,.34],region=[.23,.28,.54,.22]),
}

HANDS = {
 'idle':[.87,.60], 'walk1':[.88,.57], 'walk2':[.89,.56],
 'pickup':[.94,.91], 'reach':[.96,.43], 'high':[.63,.08],
 'carry':[.93,.48], 'push':[.96,.35], 'climb':[.61,.48],
 'light':[.96,.34], 'pour':[.79,.46], 'dig':[.93,.78],
 'offer':[.95,.39], 'read':[.88,.46], 'open':[.96,.60],
 'happy':[.93,.13], 'receive':[.94,.41], 'sit':[.64,.47],
 'drink':[.64,.33], 'sleep':[.66,.53], 'eat':[.62,.38],
}

def annotate(boards):
    for b in boards:
        entities={e['id']:e for e in b['entities']}
        # Attach the secret button to the drawn panel, rather than pressing blank wood.
        if b['stage']==12:
            entities['key']['parent']='duck';entities['key']['mount']=[.5,1.05]
            next(s for s in b['steps'] if s['target']=='tap')['reveal']=['key']
        if b['stage'] in [7,9]:entities['intercom']['asset']='intercom'
        if b['stage']==30:entities['blanket']['mount']=[.53,.60]
        if b['stage']==23:entities['cab']['asset']='upperCab'
        if b['stage'] in [25,39]:entities['pantry']['asset']='shelf'
        if b['stage']==37:next(s for s in b['steps'] if s['kind']=='wait')['change']['grandpa']='idle'
        if b['stage']==47:entities['key']['position']=[570,385]
        if b['stage']==13:
            next(s for s in b['steps'] if s['gain']=='key')['use']=['tongs']
            b['entities'].append(dict(id='lockbox',label='洗面台の鍵付き箱',asset='parcel',parent='sink',slot='inside',room=None,mount=[.5,.80],worldHeight=70))
            entities['lockbox']=b['entities'][-1]
            b['steps'][0]['reveal']=['lockbox'];b['steps'][-1]['target']='lockbox'
        if b['stage']==14:
            entities['note'].update(slot='surface',mount=[.5,.22],exposed=True)
        if b['stage']==10:entities['umbrella']['asset']='umbrella_blue'
        if b['stage']==2:entities['battery']['mount']=[.5,.5]
        if b['stage']==28:next(s for s in b['steps'] if s['kind']=='light')['reveal']=['box']
        if b['stage']==32:next(s for s in b['steps'] if s['kind']=='place')['reveal']=['key']
        if b['stage']==47:b['hidden']=['key']
        if b['stage']==30:
            entities['panel']['control']='starButton'
        for step in b['steps']:
            if step['kind']=='code':entities[step['target']]['control']='combinationLock'
        # All routes end in an explicit acquisition, including the former last-code shortcut.
        if b['steps'][-1]['kind']!='collect':
            target=b['steps'][-1]['target']
            b['steps'].append(dict(kind='collect',target=target,gain=None,use=[],actor='boy',room=None,move={},reveal=[],change={},reparent={},text='開いた収納からゲーム機を取る'))
        target=b['steps'][-1]['target']
        hiding=target
        if b['stage']==3:hiding='sofa'
        if b['stage']==6:
            b['entities'].append(dict(id='stand',label='傘立て',asset='umbrellaStand',slot='left',room=None,parent=None))
            entities['umbrellas']['parent']='stand';entities['umbrellas']['slot']='standing'
            # Umbrellas are visibly standing in the rack, not concealed in a cabinet.
            entities['umbrellas']['exposed']=True
            b['steps'][2]['target']='stand';b['steps'][2]['move']={'stand':'middle'}
            b['steps'][-1]['target']='stand';target=hiding='stand'
        # Each sortable object has its own sprite and contact, including the
        # objects that travel together as one BAG entry.
        group_def = {6:('umbrellas',['umbrella_blue','umbrella_yellow','umbrella_folded'],[2,0,1],140,160,None),
                     26:('books',['book1','book2','book3','book4'],[2,0,3,1],150,60,[.50,.58]),
                     43:('magnets',['magnet_red','magnet_blue','magnet_green','magnet_yellow'],[3,2,0,1],100,24,[.50,.35])}.get(b['stage'])
        if group_def:
            group_id,parts,sequence,width,height,mount=group_def;g=entities[group_id]
            g.update(parts=parts,groupWidth=width,groupHeight=height,grip=[(sequence.index(0)+.5)/len(parts),.5])
            if mount:g['orderMount']=mount
            for index,asset in enumerate(parts):
                ph=90 if asset=='umbrella_folded' else height
                b['entities'].append(dict(id=asset,label={'umbrella_blue':'青い傘','umbrella_yellow':'黄色の傘','umbrella_folded':'折り畳み傘'}.get(asset,asset.replace('book','教科書 ').replace('magnet_red','赤いマグネット').replace('magnet_blue','青いマグネット').replace('magnet_green','緑のマグネット').replace('magnet_yellow','黄色いマグネット')),asset=asset,parent=group_id,slot='surface',room=None,mount=[(sequence.index(index)+.5)/len(parts),1-ph/(2*height)],exposed=True))
        if 'boxes' in entities:
            for color,label,u in [('red','赤',1/6),('blue','青',.5),('green','緑',5/6)]:
                b['entities'].append(dict(id='boxes__'+color,label=label+'い箱',asset='box_'+color,slot='surface',room=None,parent='boxes',mount=[u,.5],exposed=True,color=color))
            hiding='boxes__blue';target='boxes'
            if 'label' in entities:entities['label'].update(parent='boxes__blue',mount=[.5,.12])
        asset=entities.get(hiding,{}).get('asset') if hiding!='stand' else 'umbrellaStand'
        if hiding=='robot':asset='robot'
        if hiding=='boxes__blue':asset='parcel'
        profile=PROFILES[asset]
        inside=profile['inside'];region=profile['region']
        if b['stage']==11:
            inside=[.66,.24];region=[.57,.12,.17,.32]
            for s in b['steps']:
                if s['kind'] in ['inspect','read']:s['contactUV']=[.35,.24]
        if b['stage'] in [8,38,46]:inside=[.50,.31];region=[.16,.15,.68,.35]
        b['console']=dict(id='console',container=hiding,uv=inside,region=region,
                          reveal='opened',cover=None,fixed=False,contactTarget=target)
        if b['stage']==3:
            b['console'].update(reveal='cover',cover='cushion')
            entities['cushion']['mount']=inside
        if b['stage'] in [5,31,36]:b['console'].update(reveal='inspected',fixed=True)
        if b['stage']==5:b['console'].update(uv=[.06,.915],region=[-.06,.80,.24,.20])
        if b['stage'] in [31,36]:b['console'].update(uv=[.50,.95],region=[.20,.88,.60,.12])
        if b['stage']==6:b['console'].update(reveal='moved',fixed=True,uv=[.5,.87],region=[.1,.7,.8,.28])
        # A physical control has a known, visibly drawn point.
        for e in b['entities']:
            e['contact']=PROFILES.get(e['asset'],{}).get('touch',[.50,.50])
            parent=entities.get(e.get('parent'))
            if e['slot']=='inside' and parent and parent['asset'] in PROFILES and 'mount' not in e:
                e['mount']=PROFILES[parent['asset']]['inside']
        for i,step in enumerate(b['steps']):
            step['contactObject']=step['gain'] if step['gain'] and step['kind']=='pickup' else step['target']
            step['revealGame']=False
            if step['kind']=='use' and any(entities.get(i,{}).get('asset') in ['remote','robotRemote'] for i in step['use']):step['ranged']=True
            if step['kind']=='light' and entities.get(step['target'],{}).get('asset')=='bed':step['contactUV']=[.25,.94]
            if step['target']==hiding and step['kind'] in ['open','code','inspect','collect','pull','push']:
                step['revealGame']=True
            if b['stage']==3 and step['kind']=='lift':step['revealGame']=True
            if b['stage']==6 and step['kind']=='push':step['revealGame']=True
        # Physical supports: no arbitrary levitation or unreachable ceiling contacts.
        for e in b['entities']:
            if e['asset']=='clock':e['position']=[830,350]
            if e['asset'] in ['switch','breaker','calendar','intercom','sensor','chime']:e['position']=[410,435]
            if e['asset']=='panel' and e['slot']=='wall':e['position']=[410,435]
        b['handAnchors']=HANDS
        if b['stage']==4:
            next(s for s in b['steps'] if s['kind']=='place')['move']={'stool':'wallSupport'}
        if b['stage']==23:
            next(s for s in b['steps'] if s['kind']=='push')['move']={'chair':[305,620]}


        if b['stage']==2:
            b['entities'].append(dict(id='stool',label='踏み台',asset='stool',slot='floorLeft',room=None,parent=None,contact=[.5,.5]))
            def prep(kind,target,text,**kw):
                return dict(kind=kind,target=target,text=text,gain=kw.get('gain'),use=kw.get('use',[]),actor='boy',room=None,move=kw.get('move',{}),reveal=[],change={},reparent={},contactObject=target,revealGame=False)
            b['steps'][1:1]=[prep('pickup','stool','踏み台を取る',gain='stool'),prep('place','clock','時計の下の床へ踏み台を置く',use=['stool'],move={'stool':'wallSupport'}),prep('climb','stool','踏み台に上がって時計に手を伸ばす',use=['stool'])]

        if b['stage']==2:
            entities['sofa']['position']=[530,615]
            next(s for s in b['steps'] if s['kind']=='use')['move']={'papa':[530,655]}

        if b['stage']==48:b['steps'][0]['placements']={'paper':{'parent':'table','mount':[.5,.16]}}

        if b['stage']==2:next(s for s in b['steps'] if s['kind']=='place')['move']={'stool':[755,605]}

        if b['stage']==19:b['failures'][0].update(kind='shoo',move={'crow':[1210,210]})

        if b['stage']==19:
            b['actorPerches']={'crow':{'parent':'bench','mount':[.56,.12]}}
            s=next(s for s in b['steps'] if s['kind']=='place');s.update(target='bench',contactObject='bench',placeUV=[.75,.12],move={'crow':[640,620]})

        if b['stage']==29:
            entities['calendar'].update(parent='desk',slot='surface',mount=[.30,-.10],exposed=True)
            b['steps'][0]['text']='机のカレンダーをよく見る'
