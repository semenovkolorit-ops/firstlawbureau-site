(function(){var h=document.getElementById('hdr'),b=document.getElementById('burger'),d=document.getElementById('ddb');
if(b)b.addEventListener('click',function(){var o=h.classList.toggle('open');b.setAttribute('aria-expanded',o)});
if(d)d.addEventListener('click',function(){d.setAttribute('aria-expanded',d.getAttribute('aria-expanded')!=='true')});
var p=document.querySelector('.pill');if(p){var f=function(){p.classList.toggle('on',scrollY>innerHeight*.7)};addEventListener('scroll',f,{passive:true});f();}})();