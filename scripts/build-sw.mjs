import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
const paths = files("dist").filter((x) => !x.endsWith("sw.js"));
const hash = createHash("sha256");
for (const path of paths) hash.update(readFileSync(path));
const version = hash.digest("hex").slice(0, 12);
const urls = paths.map((path) => "./" + path.slice(5));
writeFileSync(
  "dist/sw.js",
  `const CACHE='curiveo-${version}';const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('curiveo-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith('/curiveo/'))return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('./index.html'))));return;}
event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));});
`,
);
console.log(`Service worker: ${urls.length} local assets, ${version}`);
