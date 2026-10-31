"""Persist a validation record only after a complete, current browser run."""
import csv,hashlib,json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

root=Path(__file__).resolve().parents[1]
results=root/'test-results/v012'
summary=json.loads((results/'summary.json').read_text())
guards=json.loads((results/'guards.json').read_text())
boards=json.loads((root/'scenario/storyboards.json').read_text())
assert summary['stages']==50 and {s['stage'] for s in summary['results']}==set(range(1,51))
assert not summary['errors'] and not guards['errors']
assert summary['actions']==sum(len(b['steps']) for b in boards)==268
assert summary['failures']==sum(len(b['failures']) for b in boards)==53
assert json.loads((results/'failures.json').read_text())==[]
for s in summary['results']:
    assert len(s['steps'])==len(boards[s['stage']-1]['steps'])
    assert all(step['verified'] and step['renderedFrameCount']>1 for step in s['steps'])
    assert (results/f'stage-{s["stage"]:02d}.json').stat().st_mtime>(root/'index.html').stat().st_mtime
assert (results/'guards.json').stat().st_mtime>(root/'index.html').stat().st_mtime
audio=json.loads((results/'audio-analysis.json').read_text())
audio.update(source_unchanged=True,source_sha256='214d0e266fa1be0e1385bfa607a6ef5139f58b46d4b51112b4d113f017c73353',codec='AAC',bitrate_kbps=128.5,sample_rate=44100,channels=2,listening_assessment='not performed')
record=dict(version='0.12.0',tested_at=datetime.now(ZoneInfo('Asia/Tokyo')).isoformat(),artifact_sha256=hashlib.sha256((root/'index.html').read_bytes()).hexdigest(),method='Chromium real scene-object clicks with requestAnimationFrame geometry/pose observations; automated, not human playtesting',results=summary,guards=guards,audio=audio,limitations=['Human listening and musical loop quality are unverified.','Key-pose animation is not bespoke full animation for every action.','Mechanical passage does not establish fun, art direction perfection or all possible free-form action orders.','GitHub Pages deployment is separate from local validation.'])
(root/'docs/VALIDATION_0.12.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
with (root/'docs/STAGE_AUDIT_0.12.csv').open('w',newline='',encoding='utf-8-sig') as f:
    writer=csv.writer(f,lineterminator="\n");writer.writerow(['stage','physical_actions','actual_target_clicks','measured_movement_and_poses','bounds_and_scale_checks','clear','failure_routes','retry'])
    for s in summary['results']:
        writer.writerow([s['stage'],len(s['steps']),len(s['steps']),'PASS','PASS','PASS',len(s['failures']),'PASS'])
print('Saved current validation: 50 stages, 268 actions, 53 failures + Retry; interaction guards and 100 viewport checks.')
