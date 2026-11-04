"use strict";
// Price Gap — in-store price comparison (US vs CN/KR/JP). Strings and size data below; product data lives in data/items.json.
const CUR={CN:"CNY",KR:"KRW",JP:"JPY",US:"USD"};
const LOC={CN:"zh-CN",KR:"ko-KR",JP:"ja-JP",EN:"en-US"};
const SEG={
 B:{CN:"男童 8-20岁",KR:"남아 8~20세",JP:"ボーイズ 8-20歳",EN:"Boys 8-20"},
 G:{CN:"女童 7-16岁",KR:"여아 7~16세",JP:"ガールズ 7-16歳",EN:"Girls 7-16"},
 W:{CN:"女士",KR:"여성",JP:"レディース",EN:"Women"},
 M:{CN:"男士",KR:"남성",JP:"メンズ",EN:"Men"},
 U:{CN:"男女同款",KR:"남녀공용",JP:"ユニセックス",EN:"Unisex"}};
const SPEC_T={CN:"材质与洗护",KR:"소재 · 관리",JP:"素材・お手入れ",EN:"Materials & care"};
const toIn=r=>r.split("–").map(v=>(Math.round(v/2.54*2)/2)).join("–")+'"',toLb=r=>r.split("–").map(v=>Math.round(v*2.2046)).join("–");
const SIZE_B8=[["S","8","136–138","25–28",'53.5–54.5"',"55–62"],["M","10–12","140–149","28–39",'55–58.5"',"63–87"],["L","14–16","150–161","40–52",'59–63.5"',"88–115"],["XL","18–20","163–174","52–62",'64–68.5"',"116–138"]];
const SIZE_G7=[["S","7","130–134","23–25"],["M","8","136–138","25–28"],["M","10","140–142","28–33"],["L","12","144–147","33–39"],["L","14","149–154","39–45"],["XL","16","155–159","45–50"]].map(([z,n,h,w])=>[z,n,h,w,toIn(h),toLb(w)]);
const SZ_T={
 CN:{sec:"尺码参考（官方）",size:"尺码",h:"身高 cm",w:"体重 kg",rev:"美国官网评价：成人女性的购买尺码",revsrc:"摘自美国官网评价（Polo Bear 毛衣）",r:[["约152cm · 43kg","XL","故意选宽松"],["平时穿女装 XS","L","刚好合身"]],note:"尺码为大致参考。",gnote:"大童尺码版型较宽松，想要修身效果可选小一码。"},
 KR:{sec:"사이즈 가이드 (공식)",size:"사이즈",h:"키 cm",w:"몸무게 kg",rev:"미국 공식몰 리뷰: 성인 여성 구매 사이즈",revsrc:"미국 공식몰 리뷰 요약 (폴로 베어 스웨터)",r:[["약 152cm · 43kg","XL","일부러 넉넉하게"],["평소 여성복 XS","L","딱 맞음"]],note:"사이즈는 대략적인 기준입니다.",gnote:"큰 사이즈일수록 넉넉하게 나와요. 슬림하게 입으려면 한 사이즈 작게도 괜찮아요."},
 JP:{sec:"サイズの目安（公式）",size:"サイズ",h:"身長 cm",w:"体重 kg",rev:"アメリカ公式サイトのレビュー：大人の女性が買ったサイズ",revsrc:"アメリカ公式サイトのレビューより要約",r:[["約152cm・43kg","XL","あえてゆったり"],["普段はレディースXS","L","ぴったり"]],note:"サイズは目安です。",gnote:"大きいサイズほどゆったりめの作り。すっきり着たいなら1サイズ下げるのもあり。"},
 EN:{sec:"Size guide (official)",size:"Size",h:"Height",w:"Weight lb",rev:"From US reviews: adult women's picks",revsrc:"Summarized from US site reviews",r:[["5'0\", 95 lb","XL","roomy on purpose"],["usually women's XS","L","fits well"]],note:"Sizes are approximate.",gnote:"Older sizes are cut more generously; size down for a leaner fit."}};
const TIP={
 head:{CN:"店员建议",KR:"매장 직원 팁",JP:"店頭スタッフより",EN:"Staff tip"},
 who:{CN:"成人女性",KR:"성인 여성",JP:"大人の女性",EN:"Adult women"},
 foot:{CN:"根据店员经验，仅供参考。",KR:"매장 직원 경험에 따른 참고 기준입니다.",JP:"スタッフの経験による目安です。",EN:"Based on staff experience; a rough guide."},
 B:{CN:[["身高约153cm以下","M"],["约153–165cm（最常见）","L"],["约165cm以上","XL"]],KR:[["키 약 153cm 미만","M"],["약 153–165cm (가장 많음)","L"],["약 165cm 이상","XL"]],JP:[["身長 約153cm未満","M"],["約153〜165cm（いちばん多い）","L"],["約165cm以上","XL"]],EN:[["Under about 5'0\" (153 cm)","M"],["About 153–165 cm (most common)","L"],["About 5'5\" (165 cm) and up","XL"]]},
 LXL:{CN:[["成人女性多选","L / XL"]],KR:[["성인 여성은 주로","L / XL"]],JP:[["大人の女性はだいたい","L / XL"]],EN:[["Adult women usually pick","L / XL"]]},
 XLsnug:{CN:[["版型偏修身，大多数人选","XL (16)"]],KR:[["핏이 타이트한 편이라 대부분","XL (16)"]],JP:[["タイトな作りなので、ほとんどの方が","XL（16）"]],EN:[["Snug cut, so most choose","XL (16)"]]},
 XL:{CN:[["成人女性多选","XL (16)"]],KR:[["성인 여성은 대부분","XL (16)"]],JP:[["大人の女性はだいたい","XL（16）"]],EN:[["Adult women usually choose","XL (16)"]]}
};
const HIT={B:["L"],LXL:["L","XL"],XLsnug:["XL"],XL:["XL"]};
const T={
 CN:{scan:"扫描条码",pick:"演示：请选择商品（代替扫描）",home:"中国官网",us:"美国",times:"中国价格约为美国的",save:"在美国购买便宜",ok:"同款同色",ref:"同款 · 颜色不同（参考）",nf:"中国官网未找到",none:"在中国官网未找到此商品。",others:"其他国家官网价格如下。",nowhere:"在中国、韩国、日本官网均未找到此商品。",country:{US:"美国",CN:"中国",KR:"韩国",JP:"日本"},diff:"颜色不同",pre:"税前",inc:"含销售税",store:"店内价",notes:(r,t)=>`汇率 ${r}。各国官网价格含当地增值税。${t}比较对象为官网标价，仅供参考。`,off:"美国价格为税前，销售税另计。",on:p=>`美国价格含${p}%销售税。`,at:d=>`（${d}汇率）`,na:"—",tabs:{all:"全部",B:"男童",G:"女童",A:"成人"}},
 KR:{scan:"바코드 스캔",pick:"데모: 상품을 선택하세요 (스캔 대신)",home:"한국 공식몰",us:"미국",times:"한국 가격은 미국의 약",save:"미국에서 구매 시",ok:"동일 상품 · 동일 색상",ref:"동일 상품 · 다른 색상 (참고)",nf:"한국 공식몰에서 찾지 못함",none:"한국 공식몰에서 이 상품을 찾지 못했습니다.",others:"다른 나라 공식몰 가격은 아래와 같습니다.",nowhere:"중국·한국·일본 공식몰에서 이 상품을 찾지 못했습니다.",country:{US:"미국",CN:"중국",KR:"한국",JP:"일본"},diff:"다른 색상",pre:"세전",inc:"판매세 포함",store:"매장가",notes:(r,t)=>`환율 ${r}. 각국 공식몰 가격은 현지 부가세 포함. ${t}공식몰 표시 가격 비교이며 참고용입니다.`,off:"미국 가격은 세전이며 판매세는 별도입니다. ",on:p=>`미국 가격은 판매세 ${p}% 포함. `,at:d=>` (${d} 기준)`,na:"—",tabs:{all:"전체",B:"남아",G:"여아",A:"성인"}},
 JP:{scan:"バーコードを読み取る",pick:"デモ：商品を選んでください（スキャンの代わり）",home:"日本公式サイト",us:"アメリカ",times:"日本の価格はアメリカの約",save:"アメリカで買うと",ok:"同じ商品・同じ色",ref:"同じ商品・色違い（参考）",nf:"日本公式サイトで見つからず",none:"日本公式サイトでは見つかりませんでした。",others:"ほかの国の公式サイトの価格はこちら。",nowhere:"中国・韓国・日本の公式サイトでは見つかりませんでした。",country:{US:"アメリカ",CN:"中国",KR:"韓国",JP:"日本"},diff:"色違い",pre:"税抜",inc:"売上税込み",store:"店頭価格",notes:(r,t)=>`為替 ${r}。各国公式サイトの価格は現地の消費税・付加価値税込み。${t}公式サイト表示価格の比較で、参考値です。`,off:"アメリカの価格は税抜で、売上税は別です。",on:p=>`アメリカの価格は売上税${p}%込み。`,at:d=>`（${d}時点のレート）`,na:"—",tabs:{all:"すべて",B:"ボーイズ",G:"ガールズ",A:"大人"}},
 EN:{scan:"Scan barcode",pick:"Demo: pick a product (instead of scanning)",home:"China online",us:"United States",times:"China price vs. US",save:"Less in the US",ok:"Same item, same color",ref:"Same item, different color (reference)",nf:"Not found online in China",none:"Not found on China's official site.",others:"Prices on other official sites:",nowhere:"Not found on the China, Korea or Japan official sites.",country:{US:"US",CN:"China",KR:"Korea",JP:"Japan"},diff:"diff. color",pre:"before tax",inc:"incl. sales tax",store:"in-store",notes:(r,t)=>`Rate ${r}. Overseas online prices include local VAT. ${t}Listed online prices, for reference only.`,off:"US prices are before sales tax. ",on:p=>`US price includes ${p}% sales tax. `,at:d=>` (as of ${d})`,na:"—",tabs:{all:"All",B:"Boys",G:"Girls",A:"Adult"}}
};
const SAVE_SUFFIX={CN:"",KR:" 저렴",JP:"お得",EN:""};
const LIST={CN:"从商品列表选择",KR:"상품 목록에서 선택",JP:"商品一覧から選ぶ",EN:"Browse items"};
const PICK={CN:"请选择商品",KR:"상품을 선택하세요",JP:"商品を選んでください",EN:"Pick a product"};
const FLAG={CN:"🇨🇳",KR:"🇰🇷",JP:"🇯🇵",US:"🇺🇸"};
const HL={CN:"#c4303f",KR:"#2b5eae",JP:"#b0386c",EN:"#c4303f"};
const DOT={ok:"var(--ok)",ref:"var(--ref)",nf:"var(--warn)"};
const APP_VERSION="2026.11.03b";

// ---------- storage helpers (never throw)
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

// ---------- exchange rates: 1 USD = x
const FX_DEFAULT={rates:{USD:1,CNY:1/0.1503,JPY:156.79,KRW:1325.93},date:"2026-11-01",src:"初期値",fetchedDay:""};
let FX=ls.get("pg-fx",FX_DEFAULT);
const todayKey=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
async function getJSON(url){const c=new AbortController();const t=setTimeout(()=>c.abort(),8000);try{const r=await fetch(url,{cache:"no-store",signal:c.signal});if(!r.ok)throw new Error(r.status);return await r.json()}finally{clearTimeout(t)}}
async function fetchFX(force){
 if(!navigator.onLine)return false;
 if(!force&&FX.fetchedDay===todayKey())return false;
 const sources=[
  async()=>{const j=await getJSON("https://api.frankfurter.dev/v1/latest?base=USD&symbols=CNY,JPY,KRW");return {r:j.rates,date:j.date,src:"Frankfurter (ECB)"}},
  async()=>{const j=await getJSON("https://api.frankfurter.app/latest?from=USD&to=CNY,JPY,KRW");return {r:j.rates,date:j.date,src:"Frankfurter (ECB)"}},
  async()=>{const j=await getJSON("https://open.er-api.com/v6/latest/USD");const d=new Date(j.time_last_update_unix*1000);return {r:j.rates,date:d.toISOString().slice(0,10),src:"ExchangeRate-API"}}
 ];
 for(const s of sources){try{const {r,date,src}=await s();if(r&&r.CNY>1&&r.JPY>50&&r.KRW>500){FX={rates:{USD:1,CNY:r.CNY,JPY:r.JPY,KRW:r.KRW},date,src,fetchedDay:todayKey()};ls.set("pg-fx",FX);return true}}catch(e){}}
 return false;
}
const RATES=()=>FX.rates;
const conv=(v,f,t)=>v/RATES()[f]*RATES()[t];

// ---------- state
let DATA=null,ITEMS=[],SPECS={},NOTES={};
let C="CN",cur="CNY",sel=null,tab="all",assignCode=null;
{const s=ls.get("pg",{});if(s.C)C=s.C;if(s.cur)cur=s.cur}
let BC={};          // barcode -> item id (shipped file + this device)
const $=id=>document.getElementById(id);
const fmt=(v,c)=>new Intl.NumberFormat(LOC[C],{style:"currency",currency:c,maximumFractionDigits:c==="USD"?2:0,minimumFractionDigits:c==="USD"?2:0}).format(v);
const save=()=>ls.set("pg",{C,cur});
const home=()=>C==="EN"?"CN":C;
const grp=i=>i.g==="B"?"B":i.g==="G"?"G":"A";
const dateStr=s=>{const [y,m,d]=String(s).split("-").map(Number);return new Intl.DateTimeFormat(LOC[C],{year:"numeric",month:"long",day:"numeric"}).format(new Date(y,(m||1)-1,d||1))};
const img=id=>`img/${encodeURIComponent(id)}.jpg`;

function paint(){
 const t=T[C];document.documentElement.lang=LOC[C];document.documentElement.style.setProperty("--hl",HL[C]);
 [...$("seg").children].forEach(b=>b.setAttribute("aria-pressed",b.dataset.c===C));
 $("cur").value=cur;$("scanBtn").textContent=t.scan;$("listBtn").textContent=LIST[C];$("pickT").textContent=assignCode?`バーコード ${assignCode} を登録する商品を選んでください`:PICK[C];
 $("tabs").innerHTML=["all","B","G","A"].map(k=>`<button data-t="${k}" aria-pressed="${k===tab}">${t.tabs[k]}</button>`).join("");
 const h=home();
 $("picker").innerHTML=ITEMS.filter(i=>tab==="all"||grp(i)===tab).map(i=>{const hp=i.p[h];const x=hp?(conv(hp,CUR[h],"USD")/i.us).toFixed(1)+"×":"";return `<button class="item" data-id="${i.id}"><img src="${img(i.id)}" alt="" loading="lazy">${i.name[C]}<span class="pr">US$${i.us.toFixed(2)} ${x?`<span class="x">${FLAG[h]} ${x}</span>`:""}</span></button>`}).join("");
 staffInfo();
 render();
}
function sizeBlock(i){
 const s=SZ_T[C],en=C==="EN",chart=i.g==="B"?SIZE_B8:i.g==="G"?SIZE_G7:null;if(!chart)return "";
 const tipKey=i.tip||(i.g==="B"?"B":null);
 const hit=new Set([...(i.rev?s.r.map(r=>r[1]):[]),...(tipKey?HIT[tipKey]:[])]);
 const rows=chart.map(([z,n,h,w,hi,wl])=>`<tr class="${hit.has(z)?"hit":""}"><td><b>${z}</b> <span class="c">(${n})</span></td><td class="n">${en?hi:h}</td><td class="n">${en?wl:w}</td></tr>`).join("");
 const tip=tipKey?`<div class="rev"><div class="sec">${TIP.head[C]}｜${TIP.who[C]}</div>${TIP[tipKey][C].map(([a,z])=>`<div class="rv"><span>${a}</span><span class="arrow">→</span><b>${z}</b></div>`).join("")}<div class="tipfoot">${TIP.foot[C]}</div></div>`:"";
 const rev=i.rev?`<div class="rev"><div class="sec">${s.rev}</div>${s.r.map(([who,z,f])=>`<div class="rv"><span>${who}</span><span class="arrow">→</span><b>${z}</b><span class="c">${f}</span></div>`).join("")}<div class="tipfoot">${s.revsrc}</div></div>`:"";
 return `<div class="size"><div class="sec">${s.sec}</div><table><thead><tr><th>${s.size}</th><th class="n">${s.h}</th><th class="n">${s.w}</th></tr></thead><tbody>${rows}</tbody></table>${tip}${rev}<div class="demo-n">${i.g==="G"?s.gnote+" ":""}${s.note}</div></div>`;
}
function render(){
 if(!sel){$("result").innerHTML="";return}
 const i=ITEMS.find(x=>x.id===sel);if(!i){$("result").innerHTML="";return}
 const t=T[C],h=home();
 const store=parseFloat($("store").value),taxOn=$("taxOn").checked,tr=parseFloat($("taxRate").value)||0;
 const useStore=isFinite(store)&&store>0;let us=useStore?store:i.us;if(taxOn)us*=1+tr/100;
 const usTag=(useStore?t.store+" · ":"")+(taxOn?t.inc:t.pre);
 const hp=i.p[h],st=hp?i.m[h]:"nf",any=["CN","KR","JP"].some(c=>i.p[c]);
 let mid;
 if(hp){
  const hIn=conv(hp,CUR[h],cur),uIn=conv(us,"USD",cur),ratio=(hIn/uIn).toFixed(1),pct=Math.round((1-uIn/hIn)*100);
  mid=`<div class="prices"><div><div class="lab">${FLAG[h]} ${t.home}</div><div class="amt home">${fmt(hIn,cur)}</div><div class="small">${cur!==CUR[h]?fmt(hp,CUR[h]):"&nbsp;"}</div></div>
  <div><div class="lab">${FLAG.US} ${t.us}</div><div class="amt us">${cur==="USD"?"":"≈ "}${fmt(uIn,cur)}</div><div class="small">US$${us.toFixed(2)} · ${usTag}</div></div></div>
  <div class="gap"><div><div class="k">${t.times}</div><div class="v">${ratio}<small>×</small></div></div><div class="r"><div class="k">${t.save}</div><div class="v">${pct>0?pct+"%":"—"}${pct>0&&SAVE_SUFFIX[C]?`<span class="k">${SAVE_SUFFIX[C]}</span>`:""}</div></div></div>`;
 } else mid=`<div class="none">${any?t.none+" "+t.others:t.nowhere}</div>`;
 const rows=["US","CN","KR","JP"].map(c=>{const v=c==="US"?us:i.p[c];return `<tr class="${c===h?"me":c==="US"?"us":""}"><td class="c">${FLAG[c]} ${t.country[c]}${c!=="US"&&i.m[c]==="ref"?`<span class="tag">${t.diff}</span>`:""}</td><td class="n">${v?fmt(v,CUR[c]):t.na}</td><td class="n">${v?fmt(conv(v,CUR[c],cur),cur):""}</td></tr>`}).join("");
 const rc=cur==="USD"?CUR[h]:cur,rateShow=`1 USD ≈ `+new Intl.NumberFormat(LOC[C],{style:"currency",currency:rc,maximumFractionDigits:rc==="CNY"?2:0,minimumFractionDigits:rc==="CNY"?2:0}).format(RATES()[rc])+t.at(dateStr(FX.date));
 const spec=i.spec&&i.us>=100&&SPECS[i.spec]?`<div class="spec"><div class="sec">${SPEC_T[C]}</div><dl>${SPECS[i.spec][C].map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl></div>`:"";
 const note=i.note&&NOTES[i.note]?`<div class="flagnote">${NOTES[i.note][C]}</div>`:"";
 $("result").innerHTML=`<div class="card"><div class="head"><img class="photo" src="${img(i.id)}" alt="${i.name.EN}">
  <div class="prod"><div class="eyebrow">${SEG[i.g][C]}${i.nostyle?"":" · "+i.id}</div><h2>${i.name[C]}</h2><div class="status"><span class="dot" style="background:${DOT[st]}"></span>${t[st]}</div></div></div>
  ${mid}<div class="tbl"><table><tbody>${rows}</tbody></table></div>${note}${spec}${sizeBlock(i)}
  <div class="notes">${t.notes(rateShow,taxOn?t.on(tr):t.off)}</div></div>`;
 fit();
}
function fit(){document.querySelectorAll('.amt').forEach(el=>{let f=38;el.style.fontSize=f+'px';while(el.scrollWidth>el.clientWidth&&f>16){f-=1;el.style.fontSize=f+'px'}});
 const a=[...document.querySelectorAll('.amt')];if(a.length===2){const m=Math.min(...a.map(e=>parseFloat(e.style.fontSize)));a.forEach(e=>e.style.fontSize=m+'px')}}
function staffInfo(){
 const r=FX.rates;
 $("rates").textContent=`為替（1ドル）：${r.CNY.toFixed(3)}元・${r.JPY.toFixed(2)}円・${Math.round(r.KRW).toLocaleString()}ウォン ／ ${FX.date}時点（${FX.src}）。毎日最初に開いたとき、ネットにつながっていれば自動で更新します。`;
 const local=ls.get("pg-bc",{});
 $("bcInfo").textContent=`登録済みバーコード：${Object.keys(BC).length}件（この端末で登録：${Object.keys(local).length}件）`;
 const pc=DATA&&DATA.priceChecked||{};
 $("ver").textContent=`価格データ：${DATA?DATA.version:"-"}（中国 ${pc.CN||"-"}・日本 ${pc.JP||"-"}・韓国 ${pc.KR||"-"} 確認）／アプリ ${APP_VERSION}`;
}
function setNet(){$("net").textContent=navigator.onLine?"":"オフライン"}

// ---------- barcode handling
const norm=s=>String(s||"").replace(/\D/g,"");
function lookup(code){
 const c=norm(code);if(!c)return null;
 if(BC[c])return BC[c];
 // UPC-A (12) and EAN-13 with a leading 0 are the same code
 if(c.length===13&&c[0]==="0"&&BC[c.slice(1)])return BC[c.slice(1)];
 if(c.length===12&&BC["0"+c])return BC["0"+c];
 return null;
}
function handleCode(code){
 const c=norm(code);if(!c)return;
 closeScan();
 const id=lookup(c);
 if(id&&ITEMS.some(i=>i.id===id)){sel=id;assignCode=null;$("assignWrap").hidden=true;$("pickWrap").hidden=true;render();$("result").scrollIntoView({behavior:"smooth",block:"start"});return}
 assignCode=c;
 $("assignWrap").innerHTML=`<div class="assign"><div>未登録のバーコード：<b>${c}</b></div><div>下の一覧からこの商品を選ぶと、次からはスキャンだけで表示されます。</div><div><button class="mini" id="assignCancel" style="border-color:var(--line)">やめる</button></div></div>`;
 $("assignWrap").hidden=false;$("pickWrap").hidden=false;paint();
 $("assignCancel").onclick=()=>{assignCode=null;$("assignWrap").hidden=true;paint()};
}
function assign(id){
 const local=ls.get("pg-bc",{});local[assignCode]=id;ls.set("pg-bc",local);BC[assignCode]=id;assignCode=null;$("assignWrap").hidden=true;
}

// ---------- camera scanning (ZXing, loaded on first use and cached for offline)
const ZX_URL="https://unpkg.com/@zxing/browser@0.1.5/umd/zxing-browser.min.js";
let zxReady=null,controls=null;
function loadZX(){if(window.ZXingBrowser)return Promise.resolve();if(zxReady)return zxReady;zxReady=new Promise((ok,ng)=>{const s=document.createElement("script");s.src=ZX_URL;s.onload=ok;s.onerror=()=>{zxReady=null;ng(new Error("zxing"))};document.head.appendChild(s)});return zxReady}
async function openScan(){
 $("scan").hidden=false;$("manual").value="";$("scanMsg").textContent="カメラを準備中…";
 try{
  await loadZX();
  const reader=new ZXingBrowser.BrowserMultiFormatReader();
  controls=await reader.decodeFromConstraints({video:{facingMode:{ideal:"environment"}}},$("video"),(res)=>{if(res){if(navigator.vibrate)navigator.vibrate(60);handleCode(res.getText())}});
  $("scanMsg").textContent="枠の中にバーコードを合わせてください。読めないときは番号を手入力できます。";
 }catch(e){
  $("scanMsg").textContent=window.ZXingBrowser?"カメラを使えませんでした。設定でカメラを許可するか、番号を手入力してください。":"読み取り機能を読み込めませんでした（初回はネット接続が必要です）。番号を手入力してください。";
 }
}
function closeScan(){try{controls&&controls.stop()}catch(e){}controls=null;$("scan").hidden=true}

// ---------- events
function bind(){
 window.addEventListener('resize',fit);
 $("seg").addEventListener("click",e=>{const b=e.target.closest("button");if(b){C=b.dataset.c;cur=C==="EN"?"USD":CUR[C];save();paint()}});
 $("cur").addEventListener("change",e=>{cur=e.target.value;save();render()});
 $("scanBtn").addEventListener("click",openScan);
 $("scanClose").addEventListener("click",closeScan);
 $("manualGo").addEventListener("click",()=>handleCode($("manual").value));
 $("manual").addEventListener("keydown",e=>{if(e.key==="Enter")handleCode($("manual").value)});
 $("listBtn").addEventListener("click",()=>{$("pickWrap").hidden=!$("pickWrap").hidden});
 $("tabs").addEventListener("click",e=>{const b=e.target.closest("button");if(b){tab=b.dataset.t;paint()}});
 $("picker").addEventListener("click",e=>{const b=e.target.closest(".item");if(!b)return;if(assignCode)assign(b.dataset.id);sel=b.dataset.id;$("pickWrap").hidden=true;paint();$("result").scrollIntoView({behavior:"smooth",block:"start"})});
 ["store","taxOn","taxRate"].forEach(id=>$(id).addEventListener("input",render));
 $("fxBtn").addEventListener("click",async()=>{$("fxBtn").textContent="更新中…";const ok=await fetchFX(true);$("fxBtn").textContent=ok?"更新しました":(navigator.onLine?"取得できませんでした":"オフラインです");setTimeout(()=>$("fxBtn").textContent="為替を今すぐ更新",2500);paint()});
 $("exportBtn").addEventListener("click",async()=>{const txt=JSON.stringify({codes:BC},null,1);const ta=$("bcText");ta.hidden=false;ta.value=txt;try{await navigator.clipboard.writeText(txt);$("exportBtn").textContent="コピーしました"}catch(e){ta.select();$("exportBtn").textContent="下の文字をコピーしてください"}setTimeout(()=>$("exportBtn").textContent="バーコード登録を書き出す",2500)});
 $("importBtn").addEventListener("click",()=>{const ta=$("bcText");if(ta.hidden||!ta.value.trim()){ta.hidden=false;ta.value="";ta.placeholder="書き出した文字をここに貼り付けて、もう一度「読み込む」を押してください";return}try{const j=JSON.parse(ta.value);const codes=j.codes||j;const local=ls.get("pg-bc",{});let n=0;for(const[k,v]of Object.entries(codes)){const c=norm(k);if(c&&ITEMS.some(i=>i.id===v)){local[c]=v;BC[c]=v;n++}}ls.set("pg-bc",local);$("importBtn").textContent=`${n}件 読み込みました`;ta.value="";ta.hidden=true;staffInfo()}catch(e){$("importBtn").textContent="形式が正しくありません"}setTimeout(()=>$("importBtn").textContent="読み込む",2500)});
 window.addEventListener("online",async()=>{setNet();if(await fetchFX(false))paint()});
 window.addEventListener("offline",setNet);
 document.addEventListener("visibilitychange",async()=>{if(document.visibilityState==="visible"&&await fetchFX(false))paint()});
}

// ---------- start
async function start(){
 bind();setNet();
 try{DATA=await (await fetch("data/items.json?t="+Date.now(),{cache:"no-store"})).json()}catch(e){$("result").innerHTML='<p class="small">商品データを読み込めませんでした。一度ネットにつないで開き直してください。</p>';return}
 ITEMS=DATA.items;SPECS=DATA.specs;NOTES=DATA.notes;
 try{const b=await (await fetch("data/barcodes.json?t="+Date.now(),{cache:"no-store"})).json();for(const[k,v]of Object.entries(b.codes||{}))BC[norm(k)]=v}catch(e){}
 Object.assign(BC,ls.get("pg-bc",{}));
 sel=ITEMS[0]&&ITEMS[0].id;
 paint();
 if(await fetchFX(false))paint();
 if("serviceWorker" in navigator){navigator.serviceWorker.register("sw.js").catch(()=>{})}
}
start();
