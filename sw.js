(()=>{var n="https://tec.mletter.cn";var r="luna_sw",i="../offline.html",o="../offline.jpg",d="../images/error.svg",f=n;console.log("load sw.js",f);self.addEventListener("install",e=>{e.waitUntil(caches.open(r).then(t=>{t.add(new Request(i,{cache:"reload"})),t.add(new Request(o,{cache:"reload"})),t.add(new Request(d,{cache:"reload"}))}))});self.addEventListener("activate",e=>{e.waitUntil((async()=>{"navigationPreload"in self.registration&&await self.registration.navigationPreload.enable()})()),self.clients.claim()});self.skipWaiting();self.addEventListener("fetch",e=>{(e.request.url.startsWith(self.location.origin)||e.request.url.match(/^https:\/\/cdn\.jsdelivr\.net/))&&e.respondWith((async()=>{let t=await caches.open(r);try{let a=await fetch(e.request);return a.status===200&&await t.put(e.request,a.clone()),a}catch{let s=await t.match(e.request);return s||await t.match(i)}})())});})();
