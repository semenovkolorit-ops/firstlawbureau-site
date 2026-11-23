(function(){try{
var S=window.sessionStorage,p=new URLSearchParams(location.search),k='flb_src';
var cur=null;try{cur=JSON.parse(S.getItem(k)||'null')}catch(e){}
var src=p.get('utm_source')||(p.get('gclid')?'google-ads':'')||(p.get('fbclid')?'facebook':'')||(p.get('li_fat_id')?'linkedin':'');
if(src||!cur){var r=document.referrer,rh='';try{rh=r?new URL(r).hostname:''}catch(e){}
 if(rh&&rh.indexOf('firstlawbureau.com')>=0)rh='';
 cur={src:src||(rh?rh.replace(/^www\./,''):''),medium:p.get('utm_medium')||'',campaign:p.get('utm_campaign')||'',ref:rh};
 try{S.setItem(k,JSON.stringify(cur))}catch(e){}}
window.FLB_SRC=cur;
var lang=document.documentElement.lang||'';
var AM={"family-law/": "family", "simeine-pravo/": "family", "criminal-defence/": "criminal", "kryminalnyi-zakhyst/": "criminal", "business/": "business", "biznes/": "business", "litigation/": "litigation", "spory/": "litigation", "notary/": "notary", "notariat/": "notary", "inheritance/": "inheritance", "spadshchyna/": "inheritance", "real-estate/": "real-estate", "nerukhomist/": "real-estate", "family-law/children/": "family", "simeine-pravo/dity/": "family", "family-law/child-abduction/": "family", "simeine-pravo/vykradennia-dytyny/": "family", "family-law/property/": "family", "simeine-pravo/podil-maina/": "family", "family-law/divorce/": "family", "simeine-pravo/rozluchennia/": "family", "family-law/child-support/": "family", "simeine-pravo/alimenty/": "family"},AN={"en": {"family": "Family law", "criminal": "Criminal defence", "business": "Business and corporate law", "litigation": "Civil and commercial law", "notary": "Notarial documents and legalisation", "inheritance": "Inheritance", "real-estate": "Real estate and construction"}, "uk": {"family": "Сімейне право", "criminal": "Кримінальний захист", "business": "Бізнес і корпоративне право", "litigation": "Цивільне та господарське право", "notary": "Нотаріат і легалізація", "inheritance": "Спадщина", "real-estate": "Нерухомість і будівництво"}},BOT="";
var path=location.pathname.replace(/^\/(uk\/)?/,'').replace(/index\.html$/,'');
var area=AM[path]||'';
document.addEventListener('toggle',function(e){var d=e.target;if(d&&d.classList&&d.classList.contains('svc')&&d.open&&d.id)area=d.id.replace(/^svc-/,'')},true);
function beacon(u,d){try{var body=JSON.stringify(d);if(navigator.sendBeacon){navigator.sendBeacon(u,new Blob([body],{type:'application/json'}))}else{fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:body,keepalive:true})}}catch(e){}}
function code(){var a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',s='',b=new Uint8Array(6);(window.crypto||window.msCrypto).getRandomValues(b);for(var i=0;i<6;i++)s+=a[b[i]%a.length];return 'FLB-'+s}
function lead(ch,c){beacon('/api/lead',Object.assign({code:c,channel:ch,area:area,page:location.pathname,lang:lang},cur))}
window.flbTrack=function(t,c){beacon('/api/e',Object.assign({type:t,page:location.pathname,lang:lang,area:area,code:c||''},cur))};
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a,button');if(!a)return;var h=a.getAttribute('href')||'',c;
 if(a.hasAttribute('data-book-open'))return flbTrack('book');
 if(a.id==='bk-go'){c=code();lead('book',c);return flbTrack('book_go',c)}
 if(/wa\.me\//.test(h)){c=code();var b0=a.getAttribute('data-h')||a.href;a.setAttribute('data-h',b0);try{var u=new URL(b0),t=u.searchParams.get('text')||'',an=(AN[lang]||AN.en)[area];
   var pre=(lang==='uk'?'Запит ':'Request ')+c+(an?' · '+an:'')+'. ';u.searchParams.set('text',pre+t);a.href=u.toString()}catch(x){}
   lead('wa',c);return flbTrack('wa',c)}
 if(/t\.me\//.test(h)||/telegram/i.test(a.textContent)&&a.closest('.dk,.tile,.acts,.pill,.soc')){
   var t0=a.getAttribute('data-h')||h;if(BOT&&/t\.me\/\+/.test(t0)){a.setAttribute('data-h',t0);c=code();a.href='https://t.me/'+BOT+'?start='+c;lead('tg',c);return flbTrack('tg',c)}
   return flbTrack('tg')}
 if(/^mailto:/.test(h))return flbTrack('mail');
 if(/^tel:/.test(h))return flbTrack('call');
 if(/linkedin\.com/.test(h))return flbTrack('li');
 if(/instagram\.com/.test(h))return flbTrack('ig');
},true);
var rq=document.getElementById('request');if(rq)rq.addEventListener('toggle',function(){if(rq.open)flbTrack('form_open')});
}catch(e){}})();
