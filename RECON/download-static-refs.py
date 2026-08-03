from pathlib import Path
import re,urllib.request
root=Path("/root/.hermes/profiles/frontend/workspace/nodeck-clone/site")
files=[root/"index.html",root/"404/index.html"]+list((root/"assets").glob("*.js"))+list((root/"assets").glob("*.css"))
urls=set()
pat=re.compile(r"(?:https://www\.nodeck\.online)?/assets/[A-Za-z0-9_./~@%+\-=]+\.(?:webp|avif|png|jpg|jpeg|svg|woff2?|ttf|otf|ogg|mp3|wav|js|css|wasm|json)",re.I)
for f in files:
    try:s=f.read_text(errors="ignore")
    except:continue
    urls.update(pat.findall(s))
urls={u.replace("https://www.nodeck.online","") for u in urls}
miss=[u for u in sorted(urls) if not (root/u.lstrip("/")).exists()]
print("discovered",len(urls),"missing",len(miss))
for u in miss:
    try:
        req=urllib.request.Request("https://www.nodeck.online"+u,headers={"User-Agent":"Mozilla/5.0","Referer":"https://www.nodeck.online/"})
        with urllib.request.urlopen(req,timeout=60) as r:b=r.read();ct=r.headers.get("content-type")
        p=root/u.lstrip("/");p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b);print("OK",u,len(b),ct)
    except Exception as e: print("ERR",u,e)
