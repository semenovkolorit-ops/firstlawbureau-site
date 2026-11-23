import { EmailMessage } from "cloudflare:email";
const TO = "firstlawbureau@gmail.com", FROM = "site@firstlawbureau.com";
const LBL = {code:"Код заявки",name:"Ім'я",channel:"Канал зв'язку",contact:"Контакт",area:"Напрям",where:"Країна",urgent:"Терміново",lang:"Мова сайту",page:"Сторінка",src:"Джерело",when:"Час"};
const TYPES = new Set(["tg","wa","book","book_go","mail","call","form_open","li","ig"]);
const AREA = {family:"Сімейне право",criminal:"Кримінальний захист",business:"Бізнес і корпоративне право",litigation:"Цивільне та господарське право",notary:"Нотаріат і легалізація",inheritance:"Спадщина","real-estate":"Нерухомість"};
const CH = {wa:"WhatsApp",tg:"Telegram",book:"Онлайн-запис (календар)",form:"Форма на сайті",manual:"Додано вручну"};
const ST = {click:"Клік — чекаємо, чи напише клієнт",new:"Нова",taken:"Взяли в роботу",booked:"Консультацію призначено",done:"Консультацію проведено",contract:"Договір",lost:"Відмова / не продовжили",expired:"Не написав"};
const ST_SHORT = {click:"Клік",new:"Нова",taken:"В роботі",booked:"Консультація призначена",done:"Консультація проведена",contract:"Договір",lost:"Відмова",expired:"Не написав"};
const BTN = {
  click:[["Написав","new"],["Не написав","expired"]],
  new:[["Взяли в роботу","taken"],["Відмова","lost"]],
  taken:[["Консультацію призначено","booked"],["Відмова","lost"]],
  booked:[["Консультацію проведено","done"],["Відмова","lost"]],
  done:[["Договір","contract"],["Без договору","lost"]],
  contract:[["Повернути в роботу","taken"]], lost:[["Повернути в роботу","taken"]], expired:[["Все ж написав","new"]]};
const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const wrap = s => s.replace(/.{1,76}/g, "$&\r\n");
const cut = (v, n) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
const json = (o, s = 200) => new Response(JSON.stringify(o), {status: s, headers: {"content-type": "application/json"}});
const okOrigin = req => { const o = req.headers.get("origin") || ""; return !o || /^https:\/\/(www\.)?firstlawbureau\.com$/.test(o); };
const rnd = n => { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (const b of crypto.getRandomValues(new Uint8Array(n))) s += a[b % a.length]; return s; };
const newCode = () => "FLB-" + rnd(6);
const CODE_RE = /^FLB-[A-Z0-9]{6}$/;
const now = () => new Date().toISOString();
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const areaName = a => AREA[a] || a || "—";

async function log(env, e) {
  try { await env.DB.prepare("INSERT INTO events (ts,type,code,page,lang,src,medium,campaign,referrer,country,area,channel) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(now(), e.type, e.code||null, e.page||null, e.lang||null, e.src||null, e.medium||null, e.campaign||null, e.referrer||null, e.country||null, e.area||null, e.channel||null).run(); } catch (_) {}
}
const getLead = (env, code) => env.DB.prepare("SELECT * FROM leads WHERE code=?").bind(code).first();
async function addLead(env, l) {
  await env.DB.prepare("INSERT OR IGNORE INTO leads (code,ts,channel,area,src,medium,campaign,referrer,country,lang,page,status,status_ts) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(l.code, now(), l.channel, l.area||null, l.src||null, l.medium||null, l.campaign||null, l.referrer||null, l.country||null, l.lang||null, l.page||null, l.status, now()).run();
  await env.DB.prepare("INSERT INTO lead_log (code,ts,status,by) VALUES (?,?,?,?)").bind(l.code, now(), l.status, "site").run();
}
async function setStatus(env, code, status, by) {
  await env.DB.prepare("UPDATE leads SET status=?, status_ts=?, reminded=0, owner=COALESCE(?,owner) WHERE code=?").bind(status, now(), by && status !== "expired" ? by : null, code).run();
  await env.DB.prepare("INSERT INTO lead_log (code,ts,status,by) VALUES (?,?,?,?)").bind(code, now(), status, by || "system").run();
}
const cfg = async (env, k) => (await env.DB.prepare("SELECT v FROM config WHERE k=?").bind(k).first())?.v;
const setCfg = (env, k, v) => env.DB.prepare("INSERT OR REPLACE INTO config (k,v) VALUES (?,?)").bind(k, String(v)).run();

// ---------- Telegram ----------
async function tg(env, method, body) {
  if (!env.TG_TOKEN) return null;
  try { const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/${method}`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)}); return await r.json(); } catch (_) { return null; }
}
const kb = (code, status) => ({inline_keyboard: [(BTN[status] || []).map(([t, s]) => ({text: t, callback_data: `s:${code}:${s}`}))]});
function cardText(l, extra) {
  const src = [l.src, l.medium, l.campaign].filter(Boolean).join(" / ") || (l.referrer ? "з сайту " + l.referrer : "прямий захід");
  const lines = [`Заявка ${l.code} · ${CH[l.channel] || l.channel}`, `Напрям: ${areaName(l.area)}`];
  if (extra) lines.push(...extra);
  lines.push(`Джерело: ${src}`, `Країна: ${l.country || "—"} · мова сайту: ${l.lang || "—"}`);
  if (l.channel === "wa") lines.push("Клієнт мав написати у WhatsApp на +380 98 032 24 56 з цим кодом.");
  if (l.channel === "book") lines.push("Клієнт перейшов до календаря запису. Перевірте нові записи в Google Календарі.");
  lines.push("", `Статус: ${ST[l.status] || l.status}`);
  return lines.join("\n");
}
async function sendCard(env, l, extra) {
  const chat = await cfg(env, "chat"); if (!chat) return;
  const r = await tg(env, "sendMessage", {chat_id: chat, text: cardText(l, extra), reply_markup: kb(l.code, l.status), disable_web_page_preview: true});
  if (r?.ok) await env.DB.prepare("UPDATE leads SET tg_msg=? WHERE code=?").bind(r.result.message_id, l.code).run();
}
async function refreshCard(env, code, oldText, who) {
  const l = await getLead(env, code), chat = await cfg(env, "chat"); if (!l || !l.tg_msg || !chat) return;
  let text = oldText ? oldText.replace(/\n\nСтатус: [\s\S]*$/, "") : cardText(l).replace(/\n\nСтатус: [\s\S]*$/, "");
  text += `\n\nСтатус: ${ST[l.status] || l.status}` + (l.owner ? `\nВідповідальний: ${l.owner}` : "") + (who ? `\nОновив: ${who}, ${new Date().toISOString().slice(0,16).replace("T"," ")} UTC` : "");
  await tg(env, "editMessageText", {chat_id: chat, message_id: l.tg_msg, text, reply_markup: kb(code, l.status), disable_web_page_preview: true});
}
const T_CLIENT = {
  uk: c => `Дякуємо! Ваш запит ${c} отримано.\n\nНапишіть тут коротко, з чим потрібна допомога, — адвокат бюро відповість у цьому чаті. Можна також поділитися номером телефону кнопкою нижче.`,
  en: c => `Thank you! Your request ${c} has been received.\n\nPlease describe briefly what you need help with — the bureau's lawyer will reply in this chat. You can also share your phone number using the button below.`};
const T_SHARE = {uk: "Поділитися номером телефону", en: "Share my phone number"};
const T_GOT = {uk: "Дякуємо, передали бюро. Адвокат відповість тут.", en: "Thank you, we have passed this to the bureau. The lawyer will reply here."};
const who = u => [u?.first_name, u?.last_name].filter(Boolean).join(" ") || u?.username || "—";

async function onTg(env, up) {
  const chat = await cfg(env, "chat");
  if (up.callback_query) {
    const q = up.callback_query, m = /^s:(FLB-[A-Z0-9]{6}):([a-z]+)$/.exec(q.data || "");
    if (!m || String(q.message?.chat?.id) !== String(chat) || !ST[m[2]]) return tg(env, "answerCallbackQuery", {callback_query_id: q.id});
    await setStatus(env, m[1], m[2], who(q.from));
    await refreshCard(env, m[1], q.message.text, who(q.from));
    return tg(env, "answerCallbackQuery", {callback_query_id: q.id, text: ST_SHORT[m[2]]});
  }
  const msg = up.message; if (!msg) return;
  const text = msg.text || "";
  // group
  if (msg.chat.type !== "private") {
    const b = /^\/bind(?:@\w+)?\s+(\S+)/.exec(text);
    if (b) { if (b[1] === env.BIND_KEY) { await setCfg(env, "chat", msg.chat.id); return tg(env, "sendMessage", {chat_id: msg.chat.id, text: "Готово: заявки з сайту приходитимуть у цей чат.\n\nКоманди:\n/new напрям — додати заявку вручну (якщо клієнт написав напряму)\n/today — заявки за сьогодні"}); } return; }
    if (String(msg.chat.id) !== String(chat)) return;
    const n = /^\/new(?:@\w+)?\s*(.*)$/s.exec(text);
    if (n) { const l = {code: newCode(), channel: "manual", area: cut(n[1], 80) || null, status: "new"}; await addLead(env, l); await sendCard(env, {...l, ts: now()}, [`Додав: ${who(msg.from)}`]); return; }
    if (/^\/today/.test(text)) {
      const r = (await env.DB.prepare("SELECT status, COUNT(*) n FROM leads WHERE ts>=datetime('now','start of day') GROUP BY status").all()).results;
      return tg(env, "sendMessage", {chat_id: chat, text: r.length ? "Заявки за сьогодні:\n" + r.map(x => `${ST_SHORT[x.status] || x.status}: ${x.n}`).join("\n") : "Сьогодні заявок ще немає."});
    }
    const rep = msg.reply_to_message?.message_id;
    if (rep) {
      let target = (await env.DB.prepare("SELECT chat, code FROM relay WHERE msg=?").bind(rep).first());
      if (!target) { const l = await env.DB.prepare("SELECT client_chat chat, code FROM leads WHERE tg_msg=?").bind(rep).first(); if (l?.chat) target = l; }
      if (target?.chat) {
        const r = await tg(env, "copyMessage", {chat_id: target.chat, from_chat_id: msg.chat.id, message_id: msg.message_id});
        await tg(env, "setMessageReaction", {chat_id: msg.chat.id, message_id: msg.message_id, reaction: [{type: "emoji", emoji: r?.ok ? "👍" : "🤷"}]});
        if (r?.ok) { const l = await getLead(env, target.code); if (l && ["new", "click"].includes(l.status)) await setStatus(env, target.code, "taken", who(msg.from)); }
      }
    }
    return;
  }
  // private chat with a client
  const st = /^\/start(?:\s+(FLB-[A-Z0-9]{6}))?/.exec(text);
  const lang = (msg.from?.language_code || "").startsWith("uk") || (msg.from?.language_code || "").startsWith("ru") ? "uk" : "en";
  const uname = msg.from?.username ? "@" + msg.from.username : "";
  if (st) {
    let code = st[1], l = code ? await getLead(env, code) : null;
    if (!l) { code = code || newCode(); await addLead(env, {code, channel: "tg", status: "new", lang}); l = await getLead(env, code); }
    await env.DB.prepare("UPDATE leads SET client_chat=?, channel='tg' WHERE code=?").bind(msg.chat.id, code).run();
    if (l.status === "click") await setStatus(env, code, "new", null);
    l = await getLead(env, code);
    await tg(env, "sendMessage", {chat_id: msg.chat.id, text: T_CLIENT[l.lang === "uk" ? "uk" : lang](code), reply_markup: {keyboard: [[{text: T_SHARE[l.lang === "uk" ? "uk" : lang], request_contact: true}]], resize_keyboard: true, one_time_keyboard: true}});
    if (l.tg_msg) await refreshCard(env, code, null, null);
    else await sendCard(env, l, [`Клієнт у Telegram: ${who(msg.from)} ${uname}`.trim(), "Відповідайте реплаєм на цю картку або на повідомлення клієнта — бот перешле відповідь клієнту."]);
    return;
  }
  const l = await env.DB.prepare("SELECT * FROM leads WHERE client_chat=? ORDER BY ts DESC LIMIT 1").bind(msg.chat.id).first();
  let code = l?.code;
  if (!code) { code = newCode(); await addLead(env, {code, channel: "tg", status: "new", lang}); await env.DB.prepare("UPDATE leads SET client_chat=? WHERE code=?").bind(msg.chat.id, code).run(); await sendCard(env, await getLead(env, code), [`Клієнт у Telegram: ${who(msg.from)} ${uname}`.trim(), "Відповідайте реплаєм — бот перешле відповідь клієнту."]); }
  if (!chat) return;
  const seen = await env.DB.prepare("SELECT 1 FROM relay WHERE chat=? LIMIT 1").bind(msg.chat.id).first();
  const head = msg.contact ? `${code} · ${who(msg.from)} поділився номером: +${String(msg.contact.phone_number).replace(/^\+/, "")}` : `${code} · повідомлення від ${who(msg.from)} ${uname}`.trim();
  const h = await tg(env, "sendMessage", {chat_id: chat, text: head});
  if (h?.ok) await env.DB.prepare("INSERT OR REPLACE INTO relay (msg,chat,code) VALUES (?,?,?)").bind(h.result.message_id, msg.chat.id, code).run();
  if (!msg.contact) { const c = await tg(env, "copyMessage", {chat_id: chat, from_chat_id: msg.chat.id, message_id: msg.message_id}); if (c?.ok) await env.DB.prepare("INSERT OR REPLACE INTO relay (msg,chat,code) VALUES (?,?,?)").bind(c.result.message_id, msg.chat.id, code).run(); }
  if (!seen || msg.contact) await tg(env, "sendMessage", {chat_id: msg.chat.id, text: T_GOT[(l?.lang === "uk") ? "uk" : lang], reply_markup: {remove_keyboard: true}});
}

async function cron(env) {
  const chat = await cfg(env, "chat");
  const old = (await env.DB.prepare("SELECT code FROM leads WHERE status='click' AND status_ts < datetime('now','-24 hours')").all()).results;
  for (const r of old) { await setStatus(env, r.code, "expired", null); await refreshCard(env, r.code, null, null); }
  if (!chat) return;
  const late = (await env.DB.prepare("SELECT code, status FROM leads WHERE reminded=0 AND ((status='new' AND status_ts < datetime('now','-12 hours')) OR (status='taken' AND status_ts < datetime('now','-3 days')) OR (status='booked' AND status_ts < datetime('now','-7 days')))").all()).results;
  for (const r of late) {
    const l = await getLead(env, r.code);
    await tg(env, "sendMessage", {chat_id: chat, text: `Нагадування: заявка ${r.code} (${areaName(l.area)}) — статус «${ST_SHORT[r.status]}» без змін. Оновіть статус кнопками на картці.`, reply_parameters: l.tg_msg ? {message_id: l.tg_msg, allow_sending_without_reply: true} : undefined});
    await env.DB.prepare("UPDATE leads SET reminded=1 WHERE code=?").bind(r.code).run();
  }
}

// ---------- stats page ----------
async function stats(env) {
  const q = s => env.DB.prepare(s).all().then(r => r.results);
  const [tot, src, ctry, last, fun, bych, leads] = await Promise.all([
    q("SELECT type, SUM(ts>=datetime('now','-7 days')) d7, SUM(ts>=datetime('now','-30 days')) d30, COUNT(*) total FROM events GROUP BY type ORDER BY total DESC"),
    q("SELECT COALESCE(NULLIF(src,''),'(прямий / невідомо)') s, COUNT(*) n, SUM(type='form') leads FROM events WHERE ts>=datetime('now','-30 days') GROUP BY s ORDER BY n DESC LIMIT 20"),
    q("SELECT COALESCE(country,'?') c, COUNT(*) n FROM events WHERE ts>=datetime('now','-30 days') GROUP BY c ORDER BY n DESC LIMIT 20"),
    q("SELECT ts,type,code,area,country,channel,src,page FROM events ORDER BY id DESC LIMIT 100"),
    q("SELECT status, SUM(ts>=datetime('now','-30 days')) d30, COUNT(*) total FROM leads GROUP BY status"),
    q("SELECT COALESCE(NULLIF(src,''),'(прямий / невідомо)') s, COUNT(*) n, SUM(status NOT IN ('click','expired')) real, SUM(status IN ('booked','done','contract')) cons, SUM(status='contract') contr FROM leads GROUP BY s ORDER BY n DESC LIMIT 30"),
    q("SELECT code,ts,channel,area,src,country,status,owner,status_ts FROM leads ORDER BY ts DESC LIMIT 300")]);
  const NAMES = {form:"Заявка з форми",tg:"Клік Telegram",wa:"Клік WhatsApp",book:"Відкрили запис",book_go:"Перейшли до календаря",mail:"Клік email",call:"Клік телефон",form_open:"Відкрили форму",li:"Клік LinkedIn",ig:"Клік Instagram"};
  const fmt = (k, v) => k === "type" ? (NAMES[v] || v) : (k === "ts" || k === "status_ts") ? String(v || "").slice(0, 16).replace("T", " ") : k === "status" ? (ST_SHORT[v] || v) : k === "channel" ? (CH[v] || v) : k === "area" ? areaName(v) : v;
  const t = (rows, cols) => "<div class=w><table><tr>" + cols.map(c => `<th>${c[1]}</th>`).join("") + "</tr>" + (rows.length ? rows.map(r => "<tr>" + cols.map(c => `<td class="${c[0] === "status" ? "s-" + esc(r.status) : ""}">${esc(fmt(c[0], r[c[0]]) ?? "")}</td>`).join("") + "</tr>").join("") : `<tr><td colspan=${cols.length}>Поки немає даних</td></tr>`) + "</table></div>";
  const order = ["click", "new", "taken", "booked", "done", "contract", "lost", "expired"];
  const fm = Object.fromEntries(fun.map(r => [r.status, r]));
  const tiles = order.map(s => `<div class=tile><b>${fm[s]?.d30 || 0}</b><span>${ST_SHORT[s]}</span><small>усього ${fm[s]?.total || 0}</small></div>`).join("");
  return `<!doctype html><meta charset=utf-8><meta name=robots content=noindex><meta name=viewport content="width=device-width,initial-scale=1"><title>FLB — заявки</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#f5f6f8;color:#141a22}main{max-width:1200px;margin:auto;padding:28px 18px}h1{font:700 24px Georgia,serif;color:#182b52}h2{font:700 18px Georgia,serif;margin:30px 0 8px;color:#182b52}.w{overflow-x:auto}table{width:100%;border-collapse:collapse;background:#fff}th,td{padding:8px 10px;border-bottom:1px solid #dce1e9;text-align:left;font-size:14px;white-space:nowrap}th{background:#182b52;color:#fff;font-weight:600}.n{color:#5e6c82}.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}.tile{background:#fff;border-top:2px solid #b9975b;padding:12px}.tile b{display:block;font:700 26px Georgia,serif;color:#182b52}.tile span{display:block;font-size:13px}.tile small{color:#5e6c82}.s-contract{color:#1a7f37;font-weight:700}.s-lost,.s-expired{color:#8a8f98}.s-new{color:#b45309;font-weight:700}</style>
<main><h1>First International Law Bureau — заявки</h1><p class=n>Відвідуваність — у Cloudflare Web Analytics. Тут — заявки з сайту та їхні статуси, які бюро оновлює в Telegram. Без імен і контактів клієнтів. Час UTC.</p>
<h2>Заявки за 30 днів за статусом</h2><div class=tiles>${tiles}</div>
<h2>Звідки приходять заявки (усі)</h2>${t(bych, [["s","Джерело"],["n","Усього"],["real","Реальних"],["cons","Дійшли до консультації"],["contr","Договорів"]])}
<h2>Усі заявки</h2>${t(leads, [["code","Код"],["ts","Дата"],["channel","Канал"],["area","Напрям"],["src","Джерело"],["country","Країна"],["status","Статус"],["owner","Відповідальний"],["status_ts","Статус змінено"]])}
<h2>Дії відвідувачів</h2>${t(tot, [["type","Подія"],["d7","7 днів"],["d30","30 днів"],["total","Усього"]])}
<h2>Джерела відвідувачів (30 днів)</h2>${t(src, [["s","Джерело"],["n","Подій"],["leads","Заявок з форми"]])}
<h2>Країни (30 днів)</h2>${t(ctry, [["c","Країна"],["n","Подій"]])}
<h2>Останні 100 дій</h2>${t(last, [["ts","Час"],["type","Подія"],["code","Код"],["area","Напрям"],["country","Країна"],["channel","Канал"],["src","Джерело"],["page","Сторінка"]])}</main>`;
}

export default {
  async scheduled(ev, env, ctx) { ctx.waitUntil(cron(env)); },
  async fetch(req, env, ctx) {
    const url = new URL(req.url), cf = req.cf || {};
    if (url.pathname === "/api/stats") {
      if (url.searchParams.get("k") !== env.STATS_KEY) return new Response("Not found", {status: 404});
      return new Response(await stats(env), {headers: {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex"}});
    }
    if (url.pathname === "/api/tg-setup") {
      if (url.searchParams.get("k") !== env.STATS_KEY || !env.TG_TOKEN) return new Response("Not found", {status: 404});
      const me = await tg(env, "getMe", {}); if (me?.ok) await setCfg(env, "bot", me.result.username);
      const wh = await tg(env, "setWebhook", {url: `https://firstlawbureau.com/api/tg`, secret_token: env.TG_SECRET, allowed_updates: ["message", "callback_query"]});
      await tg(env, "setMyCommands", {commands: [{command: "new", description: "Додати заявку вручну: /new напрям"}, {command: "today", description: "Заявки за сьогодні"}], scope: {type: "all_group_chats"}});
      await tg(env, "setMyCommands", {commands: [{command: "start", description: "Start / Почати"}], scope: {type: "all_private_chats"}});
      await tg(env, "setMyDescription", {description: "First International Law Bureau — Ukrainian law for clients abroad. Write your question here and the bureau's lawyer will reply.\n\nПерше адвокатське міжнародне бюро — напишіть запитання, і адвокат бюро відповість тут."});
      return json({me, wh, chat: await cfg(env, "chat")});
    }
    if (url.pathname === "/api/cfg") {
      if (req.method === "GET") return json({bot: env.TG_TOKEN ? (await cfg(env, "bot")) || null : null});
    }
    if (url.pathname === "/api/tg") {
      if (req.method !== "POST" || req.headers.get("x-telegram-bot-api-secret-token") !== env.TG_SECRET) return new Response("no", {status: 403});
      let up; try { up = await req.json(); } catch { return new Response("ok"); }
      ctx.waitUntil(onTg(env, up).catch(() => {}));
      return new Response("ok");
    }
    if (req.method !== "POST" || !okOrigin(req)) return json({ok:false}, 405);
    let d; try { d = await req.json(); } catch { return json({ok:false}, 400); }
    const meta = {page: cut(d.page,300), lang: cut(d.lang,5), src: cut(d.src,80), medium: cut(d.medium,80), campaign: cut(d.campaign,80), referrer: cut(d.ref,200), country: cf.country || ""};
    if (url.pathname === "/api/e") {
      const type = cut(d.type, 20); if (!TYPES.has(type)) return json({ok:false}, 400);
      await log(env, {...meta, type, area: cut(d.area, 40) || null, code: CODE_RE.test(d.code || "") ? d.code : null}); return json({ok:true});
    }
    if (url.pathname === "/api/lead") {
      const code = String(d.code || ""), channel = cut(d.channel, 10);
      if (!CODE_RE.test(code) || !["wa", "tg", "book"].includes(channel)) return json({ok:false}, 400);
      const recent = await env.DB.prepare("SELECT COUNT(*) n FROM leads WHERE ts>=datetime('now','-1 hour')").first();
      if ((recent?.n || 0) > 60) return json({ok:false}, 429);
      if (await getLead(env, code)) return json({ok:true});
      const l = {...meta, code, channel, area: cut(d.area, 40) || null, status: "click"};
      await addLead(env, l);
      if (channel !== "tg") ctx.waitUntil(sendCard(env, {...l, ts: now()}));
      return json({ok:true});
    }
    if (url.pathname !== "/api/request") return json({ok:false}, 404);
    if (d.website) return json({ok:true, code:newCode()});
    const f = {}; for (const k of Object.keys(LBL)) f[k] = cut(d[k], k === "page" ? 300 : 200);
    if (!f.contact) return json({ok:false, error:"contact"}, 400);
    f.code = newCode();
    f.src = [meta.src, meta.medium, meta.campaign].filter(Boolean).join(" / ") || (meta.referrer ? "ref: " + meta.referrer : "direct");
    f.when = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
    const body = Object.keys(LBL).filter(k => f[k]).map(k => `${LBL[k]}: ${f[k]}`).join("\n") + (meta.country ? `\nКраїна за IP: ${meta.country}` : "");
    const subj = `[${f.code}] Заявка з сайту: ${f.area || "консультація"} — ${f.name || f.contact}`;
    const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contact) ? `Reply-To: ${f.contact}\r\n` : "";
    const raw = `From: =?UTF-8?B?${b64("Сайт ПАМБ")}?= <${FROM}>\r\nTo: <${TO}>\r\n${replyTo}Subject: =?UTF-8?B?${b64(subj)}?=\r\nMessage-ID: <${crypto.randomUUID()}@firstlawbureau.com>\r\nDate: ${new Date().toUTCString()}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap(b64(body))}`;
    await log(env, {...meta, type: "form", code: f.code, area: f.area, channel: f.channel});
    const lead = {...meta, code: f.code, channel: "form", area: f.area || null, status: "new"};
    await addLead(env, lead);
    ctx.waitUntil(sendCard(env, {...lead, ts: now()}, [`Ім'я: ${f.name || "—"}`, `Зв'язатися: ${f.channel || "—"} · ${f.contact}`, f.where ? `Де живе: ${f.where}` : "", f.urgent ? "ТЕРМІНОВО" : ""].filter(Boolean)));
    try { await env.MAIL.send(new EmailMessage(FROM, TO, raw)); return json({ok:true, code:f.code}); }
    catch (e) { return json({ok:false, error:String(e.message || e)}, 500); }
  }
};
