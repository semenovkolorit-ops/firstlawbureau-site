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
window.flbTrack=function(t){try{var d=Object.assign({type:t,page:location.pathname,lang:lang},cur);
 var body=JSON.stringify(d);if(navigator.sendBeacon){navigator.sendBeacon('/api/e',new Blob([body],{type:'application/json'}))}else{fetch('/api/e',{method:'POST',headers:{'content-type':'application/json'},body:body,keepalive:true})}}catch(e){}};
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a,button');if(!a)return;var h=a.getAttribute('href')||'';
 if(a.hasAttribute('data-book-open'))return flbTrack('book');
 if(a.id==='bk-go')return flbTrack('book_go');
 if(/t\.me\//.test(h)||/telegram/i.test(a.textContent)&&a.closest('.dk,.tile,.acts,.pill,.soc'))return flbTrack('tg');
 if(/wa\.me\//.test(h)||a.hasAttribute('data-wa'))return flbTrack('wa');
 if(/^mailto:/.test(h))return flbTrack('mail');
 if(/^tel:/.test(h))return flbTrack('call');
 if(/linkedin\.com/.test(h))return flbTrack('li');
 if(/instagram\.com/.test(h))return flbTrack('ig');
},true);
var rq=document.getElementById('request');if(rq)rq.addEventListener('toggle',function(){if(rq.open)flbTrack('form_open')});
}catch(e){}})();
