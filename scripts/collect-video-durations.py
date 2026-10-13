"""Collect public YouTube duration metadata only. Never retrieve media streams.

python scripts/collect-video-durations.py [--cache-root PATH] [--network]
Without --network this deterministically regenerates the small app index.
"""
import argparse, concurrent.futures, datetime, gzip, json, pathlib, re, threading, urllib.request, fcntl, hashlib, tempfile

parser=argparse.ArgumentParser()
parser.add_argument('--cache-root')
parser.add_argument('--network',action='store_true')
args=parser.parse_args()
repo=pathlib.Path(__file__).resolve().parent.parent
# Kernel lock: a second collector must never overwrite a newer duration index.
lock=open(pathlib.Path(tempfile.gettempdir())/('curiveo-durations-'+hashlib.sha256(str(repo).encode()).hexdigest()[:12]+'.lock'),'w')
try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
except BlockingIOError:raise SystemExit('Another duration collector is already running.')
catalog=json.loads((repo/'src/data/catalog.json').read_text())
ids={v['id'] for v in catalog['videos']}
source=repo/'data/video-metadata/durations.json'
source.parent.mkdir(parents=True,exist_ok=True)
data=json.loads(source.read_text()) if source.exists() else {'schemaVersion':1,'videos':{}}
entries=data['videos']
decoder=json.JSONDecoder()
now=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')

def clock(text):
    if not re.fullmatch(r'\d{1,3}:\d{2}(?::\d{2})?',text): return None
    parts=[int(v) for v in text.split(':')]
    if any(v>=60 for v in parts[1:]):return None
    value=0
    for part in parts:value=value*60+part
    return value if 0<value<=86400 else None

def walk(obj,url,checked):
    if isinstance(obj,dict):
        legacy=obj.get('playlistVideoRenderer') or obj.get('videoRenderer')
        if legacy and legacy.get('videoId') in ids:
            text=legacy.get('lengthText',{})
            value=clock(text.get('simpleText','') or ''.join(v.get('text','') for v in text.get('runs',[])))
            if value and legacy['videoId'] not in entries:
                entries[legacy['videoId']]={'seconds':value,'sourceUrl':url,'checkedAt':checked,'method':'public-playlist-duration-label'}
        model=obj.get('lockupViewModel')
        if model and model.get('contentId') in ids:
            video_id=model['contentId']
            overlays=model.get('contentImage',{}).get('thumbnailViewModel',{}).get('overlays',[])
            for overlay in overlays:
                for badge in overlay.get('thumbnailBottomOverlayViewModel',{}).get('badges',[]):
                    value=clock(badge.get('thumbnailBadgeViewModel',{}).get('text',''))
                    if value and video_id not in entries:
                        entries[video_id]={'seconds':value,'sourceUrl':url,'checkedAt':checked,'method':'public-playlist-duration-label'}
        for value in obj.values():walk(value,url,checked)
    elif isinstance(obj,list):
        for value in obj:walk(value,url,checked)

if args.cache_root:
    for path in pathlib.Path(args.cache_root).rglob('PL*.html'):
        if not re.fullmatch(r'PL[\w-]+\.html',path.name):continue
        text=path.read_text(errors='replace')
        match=re.search(r'(?:var\s+)?ytInitialData\s*=\s*',text)
        if not match:continue
        try:obj=decoder.raw_decode(text[match.end():])[0]
        except ValueError:continue
        checked=datetime.datetime.fromtimestamp(path.stat().st_mtime,datetime.timezone.utc).isoformat(timespec='seconds')
        walk(obj,'https://www.youtube.com/playlist?list='+path.stem,checked)

def save():
    data['updatedAt']=now()
    data['videos']={id:entries[id] for id in sorted(entries) if id in ids}
    temporary=source.with_suffix('.tmp')
    temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');temporary.replace(source)
    index={id:entry['seconds'] for id,entry in data['videos'].items()}
    target=repo/'src/data/video-durations.json';temporary=target.with_suffix('.tmp')
    temporary.write_text(json.dumps(index,separators=(',',':'))+'\n');temporary.replace(target)

save()
print('Known public durations:',len(entries),'/',len(ids),flush=True)
stop=threading.Event()

def fetch(video_id):
    if stop.is_set():return video_id,None,'stopped'
    url='https://www.youtube.com/watch?v='+video_id
    try:
        request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept-Encoding':'gzip'})
        with urllib.request.urlopen(request,timeout=18) as response:
            stream=gzip.GzipFile(fileobj=response) if response.headers.get('Content-Encoding')=='gzip' else response
            text=''
            for _ in range(64):
                chunk=stream.read(32768)
                if not chunk:break
                text+=chunk.decode('utf8',errors='replace')
                match=re.search(r'(?:var\s+)?ytInitialPlayerResponse\s*=\s*',text)
                if not match:continue
                try:player=decoder.raw_decode(text[match.end():])[0]
                except ValueError:continue
                details=player.get('videoDetails',{})
                if details.get('videoId')!=video_id:return video_id,None,'metadata-id-mismatch'
                value=int(details.get('lengthSeconds',0))
                if 0<value<=86400:return video_id,{'seconds':value,'sourceUrl':url,'checkedAt':now(),'method':'public-watch-videoDetails'},None
                return video_id,None,'duration-unavailable'
        return video_id,None,'public-metadata-unavailable'
    except urllib.error.HTTPError as error:
        if error.code in (403,429):stop.set()
        return video_id,None,'HTTP '+str(error.code)
    except Exception as error:return video_id,None,type(error).__name__

if args.network:
    # A playlist supplies dozens of durations in one public-page request.
    playlists=list(dict.fromkeys(s['sourceUrl'] for s in catalog['series'] if s['sourceUrl'].startswith('https://www.youtube.com/playlist?') and any(id not in entries for id in s['videoIds'])))
    def fetch_playlist(url):
        if stop.is_set():return url,None,'stopped'
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept-Encoding':'gzip'}),timeout=18) as response:
                stream=gzip.GzipFile(fileobj=response) if response.headers.get('Content-Encoding')=='gzip' else response
                text=stream.read(4000000).decode('utf8',errors='replace')
                match=re.search(r'(?:var\s+)?ytInitialData\s*=\s*',text)
                return url,decoder.raw_decode(text[match.end():])[0] if match else None,None
        except urllib.error.HTTPError as error:
            if error.code in (403,429):stop.set()
            return url,None,'HTTP '+str(error.code)
        except Exception as error:return url,None,type(error).__name__
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        pending={};it=iter(playlists)
        def submit_playlist():
            if stop.is_set():return
            url=next(it,None)
            if url:pending[pool.submit(fetch_playlist,url)]=url
        for _ in range(4):submit_playlist()
        count=0
        while pending:
            finished,_=concurrent.futures.wait(pending,return_when=concurrent.futures.FIRST_COMPLETED)
            for future in finished:
                pending.pop(future);url,obj,error=future.result()
                if obj:walk(obj,url,now())
                count+=1
                if count%5==0:save();print('Public playlists',count,'/',len(playlists),'known',len(entries),flush=True)
                submit_playlist()
    save()
    # Prioritize complete learning routes and then the remaining catalogue. Four requests at a time.
    series={s['id']:s for s in catalog['series']}
    route_ids=[id for route in catalog.get('routes',[]) for step in route['steps'] for id in step.get('videoIds',series[step['seriesId']]['videoIds'])]
    queue=list(dict.fromkeys(route_ids+[v['id'] for v in catalog['videos']]))
    queue=[id for id in queue if id not in entries]
    failures={}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        pending={}
        it=iter(queue)
        def submit():
            if stop.is_set():return
            id=next(it,None)
            if id:pending[pool.submit(fetch,id)]=id
        for _ in range(4):submit()
        count=0
        while pending:
            finished,_=concurrent.futures.wait(pending,return_when=concurrent.futures.FIRST_COMPLETED)
            for future in finished:
                pending.pop(future)
                id,entry,error=future.result()
                if entry:entries[id]=entry
                elif error!='stopped':failures[id]=error
                count+=1
                if count%20==0:save();print('Checked',count,'known',len(entries),'unavailable',len(failures),flush=True)
                submit()
    data['unavailable']=failures
    save()
    print('Finished: known',len(entries),'/',len(ids),'unavailable',len(failures),'rate-limit stop',stop.is_set(),flush=True)
