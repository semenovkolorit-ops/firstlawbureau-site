(function(){var h=document.getElementById('hdr'),b=document.getElementById('burger'),d=document.getElementById('ddb');
if(b)b.addEventListener('click',function(){var o=h.classList.toggle('open');b.setAttribute('aria-expanded',o)});
if(d)d.addEventListener('click',function(){d.setAttribute('aria-expanded',d.getAttribute('aria-expanded')!=='true')});})();