import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===== Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "expedition-management-date.firebaseapp.com",
  projectId: "expedition-management-date",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== データ =====
let players = [];
let playerDocs = [];
let editIndex = null;

// ===== ページ切替 =====
window.showPage = function(n){
  const pages = [document.getElementById("captureArea"), document.getElementById("page2")];
  pages.forEach((p,i)=>{
    p.style.display = (i === n-1) ? "block" : "none";
  });
};
// ===== モーダル =====
window.openEditor = function(){
  document.getElementById("editor").style.display = "block";
  document.getElementById("modeIndicator").innerText = "追加モード";
  document.body.dataset.prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  document.body.classList.add("modal-open");
  // 初期化
  document.querySelectorAll("#editor input").forEach(i=>i.value="");
  document.querySelectorAll("#editor select").forEach(s=>s.selectedIndex=0);
  document.getElementById("runeContainer").innerHTML = "";
  editIndex = null;
};
window.closeEditor = function(){
  document.getElementById("editor").style.display = "none";
  document.body.classList.remove("modal-open");
  // ★ 元に戻す
  document.body.style.overflow = document.body.dataset.prevOverflow || "auto";
  document.getElementById("modeIndicator").innerText = "通常モード";
};

// ===== ルーン =====
const runeOptions = {
  炎毒の印: ["エレダメup","エレ会心率up","固有","クリダメup"],
  氷雷の印: ["エレダメup","エレ会心率up","固有","クリダメup"],
  ドラスト: ["キャノドラ"],
  苦痛の輪: ["サークルダメup","サークル会心ダメup","固有","クリダメ軽減"],
  炎毒の触: ["エレダメup","エレ会心ダメup","固有","クリダメ軽減"],
  氷雷の触: ["エレダメup","エレ会心ダメup","固有","クリダメ軽減"],
  ストポショ: ["無敵効果"]
  
};

function updateEnchant(nameSelect, enchantSelect){
  const effects = runeOptions[nameSelect.value] || [];
  enchantSelect.innerHTML = effects.map(e=>`<option>${e}</option>`).join("");
}

window.addSelectRune = function(rune = {name:"炎毒の印", q:"none", e:""}){
  const div = document.createElement("div");
  div.className = "rune-row";
  div.innerHTML = `
    <select class="rune-name">
      ${Object.keys(runeOptions).map(n=>`<option>${n}</option>`).join("")}
    </select>
    <select class="rune-q">
      <option value="none">なし</option>
      <option value="legend">レジェンド</option>
      <option value="mythic">ミシック</option>
    </select>
    <select class="rune-e"></select>
    <button onclick="this.parentNode.remove()">削除</button>
  `;
  const nameSel = div.querySelector(".rune-name");
  const qSel = div.querySelector(".rune-q");
  const eSel = div.querySelector(".rune-e");
  nameSel.value = rune.name;
  qSel.value = rune.q;
  updateEnchant(nameSel, eSel);
  eSel.value = rune.e;
  nameSel.onchange = () => updateEnchant(nameSel, eSel);
  document.getElementById("runeContainer").appendChild(div);
};

window.addFreeRune = function(rune = {name:"", q:"none", e:""}){
  const div = document.createElement("div");
  div.className = "rune-row";
  div.innerHTML = `
    <input class="rune-name" placeholder="ルーン名" value="${rune.name}">
    <select class="rune-q">
      <option value="none">なし</option>
      <option value="legend">レジェンド</option>
      <option value="mythic">ミシック</option>
    </select>
    <input class="rune-e" placeholder="効果" value="${rune.e}">
    <button onclick="this.parentNode.remove()">削除</button>
  `;
  div.querySelector(".rune-q").value = rune.q;
  document.getElementById("runeContainer").appendChild(div);
};

// ===== 装備 =====
const parts = ["武器","兜","お守り","鎧","指輪","靴"];

document.getElementById("chaos").innerHTML = parts.map(p=>`
<div>
  <label>${p}</label>
  <select data-part="${p}" data-type="set">
    <option value="">なし</option>
    <option>神託</option>
    <option>ドラグーン</option>
    <option>グリフォン</option>
  </select>
  <select data-part="${p}" data-type="quality">
    <option value="">なし</option>
    <option value="chaos">カオス</option>
    <option value="mythic">ミシック</option>
    <option value="legend">レジェンド</option>
  </select>
</div>
`).join("");

// ===== 表示 =====
function gearText(gearDetail){
  const mark = {神託:"神",ドラグーン:"ド",グリフォン:"グ"};

  return `
  <div class="gear-box">
    ${parts.map(p=>{
      const g = gearDetail?.find(x=>x.part===p);
      return `<div class="cell ${g?.type||"empty"}">${g?mark[g.set]:""}</div>`;
    }).join("")}
  </div>`;
}

function runeHTML(name,q,e){
  if(q==="none") return "";
  let cls = "rune ";
  if(q==="mythic") cls+="rune-mythic";
  else if(q==="legend") cls+="rune-legend";
  return `<div class="${cls}">${name}<br>${e}</div>`;
}

// ===== 保存 =====
window.savePlayer = async function(){

  const runes = [];

  if(document.getElementById("sharpQuality").value!=="none"){
    runes.push({
      name:"鋭利",
      q:document.getElementById("sharpQuality").value,
      e:document.getElementById("sharpEnchant").value
    });
  }

  if(document.getElementById("arrowQuality").value!=="none"){
    runes.push({
      name:"アロレ",
      q:document.getElementById("arrowQuality").value,
      e:document.getElementById("arrowEnchant").value
    });
  }

  document.querySelectorAll("#runeContainer .rune-row").forEach(row=>{
    const name = row.querySelector(".rune-name").value;
    const q = row.querySelector(".rune-q").value;
    const e = row.querySelector(".rune-e").value;
    if(name && q!=="none") runes.push({name,q,e});
  });

  const gearDetail = [];
  document.querySelectorAll("#chaos div").forEach(div=>{
    const set = div.querySelector("[data-type='set']").value;
    const type = div.querySelector("[data-type='quality']").value;
    const part = div.querySelector("[data-type='set']").dataset.part;
    if(set && type) gearDetail.push({part,set,type});
  });

  const p = {
    name: document.getElementById("name").value.trim(),
    power: Number(document.getElementById("power").value),
    range: document.getElementById("range").value,
    style: document.getElementById("style").value,
    hero: document.getElementById("hero").value,
    formation: document.getElementById("formation").value,
    mythic: Number(document.getElementById("mythic").value),
    legend: Number(document.getElementById("legend").value),
    lane: Number(document.getElementById("lane").value),
    gearDetail,
    runes
  };

  if(!p.name || isNaN(p.power)){
    alert("名前と戦力必須");
    return;
  }

  if(editIndex===null){
    const docRef = await addDoc(collection(db,"players"), p);
    players.push(p);
    playerDocs.push(docRef.id);
  }else{
    await updateDoc(doc(db,"players",playerDocs[editIndex]), p);
    players[editIndex]=p;
    editIndex=null;
  }

  closeEditor();
  render();
};

// ===== 編集 =====
window.editPlayer = function(i){
  const p = players[i];

  openEditor();
  editIndex = i;

  document.getElementById("name").value = p.name;
  document.getElementById("power").value = p.power;
  document.getElementById("range").value = p.range;
  document.getElementById("style").value = p.style;
  document.getElementById("hero").value = p.hero;
  document.getElementById("formation").value = p.formation;
  document.getElementById("mythic").value = p.mythic;
  document.getElementById("legend").value = p.legend;
  document.getElementById("lane").value = p.lane;

  // 装備復元
  document.querySelectorAll("#chaos div").forEach(div=>{
    const part = div.querySelector("[data-type='set']").dataset.part;
    const g = p.gearDetail?.find(x=>x.part===part);

    div.querySelector("[data-type='set']").value = g?.set || "";
    div.querySelector("[data-type='quality']").value = g?.type || "";
  });

  // ルーン復元
  document.getElementById("runeContainer").innerHTML = "";
  document.getElementById("sharpQuality").value = "none";
  document.getElementById("arrowQuality").value = "none";

  (p.runes || []).forEach(r=>{
    if(r.name === "鋭利"){
      document.getElementById("sharpQuality").value = r.q;
      document.getElementById("sharpEnchant").value = r.e;
    }else if(r.name === "アロレ"){
      document.getElementById("arrowQuality").value = r.q;
      document.getElementById("arrowEnchant").value = r.e;
    }else if(runeOptions[r.name]){
      addSelectRune(r);
    }else{
      addFreeRune(r);
    }
  });
};

// ===== 削除 =====
window.deletePlayer = async function(i){
  if(!confirm("削除しますか？")) return;
  await deleteDoc(doc(db,"players",playerDocs[i]));
  players.splice(i,1);
  playerDocs.splice(i,1);
  render();
};

// ===== 画像保存 =====
window.saveTableImage = async function(){
  const original = document.getElementById("captureArea");
  const clone = original.cloneNode(true);

  const rows = clone.querySelectorAll("tr");
  let hide = false;
  rows.forEach(row=>{
    if(row.classList.contains("lane-header")){
      if(row.innerText.includes("控え")){
        hide = true;
        row.remove();
        return;
      }else{
        hide = false;
      }
    }
    if(hide) row.remove();
  });

  clone.querySelectorAll("tr").forEach(row=>{
    const cells = row.querySelectorAll("th, td");
    if(cells.length >= 10){
      cells[9]?.remove();
      cells[8]?.remove();
    }
  });

  clone.style.width = original.scrollWidth + "px";
  clone.style.background = "#111";
  clone.style.color = "white";
  clone.style.position = "absolute";
  clone.style.top = "-9999px";

  document.body.appendChild(clone);

  const canvas = await html2canvas(clone,{
    scale:3,
    backgroundColor:"#111",
    width:clone.scrollWidth
  });

  document.body.removeChild(clone);
  canvas.toBlob(async blob=>{
    const file=new File([blob],"expedition.png",{type:"image/png"});

    if(navigator.share && navigator.canShare({files:[file]})){
      await navigator.share({files:[file]});
    }else{
      const link=document.createElement("a");
      link.href=URL.createObjectURL(blob);
      link.download="expedition.png";
      link.click();
    }
  });
};

// ===== 表示 =====
function formatPower(v){return v.toFixed(2)+"M";}
function relicBuff(m,l){return Number((m*0.25 + l*0.025).toFixed(3));}

function render(){
  const body=document.getElementById("playerBody");
  body.innerHTML="";
  const total = 8;
  const laneNames={1:"レーン1",2:"レーン2",3:"レーン3",0:"控え"};

  [1,2,3,0].forEach(l=>{
    const list=players.filter(p=>p.lane===l);
    if(!list.length)return;

    const tr=document.createElement("tr");
    tr.className="lane-header";
    if(l === 0){
      tr.innerHTML = `<td colspan="10">${laneNames[l]} (${list.length})</td>`;
    }else{
      tr.innerHTML = `<td colspan="10">${laneNames[l]} (${list.length} / ${total})</td>`;
    }
    body.appendChild(tr);

    list.sort((a,b)=>b.power-a.power);

    list.forEach(p=>{
      const i=players.indexOf(p);

      const row=document.createElement("tr");
      row.innerHTML=`
        <td>${p.name}</td>
        <td>${formatPower(p.power)}</td>
        <td>${p.range}/${p.style}</td>
        <td>${gearText(p.gearDetail)}</td>
        <td>${p.hero}</td>
        <td>${(p.runes||[]).map(r=>runeHTML(r.name,r.q,r.e)).join("")}</td>
        <td>${p.formation}</td>
        <td>${relicBuff(p.mythic,p.legend)}</td>
        <td><button onclick="editPlayer(${i})">編集</button></td>
        <td><button onclick="deletePlayer(${i})">削除</button></td>
      `;
      body.appendChild(row);
    });
  });
}

// ===== 初期ロード =====
async function load(){
  const snap=await getDocs(collection(db,"players"));
  snap.forEach(d=>{
    players.push(d.data());
    playerDocs.push(d.id);
  });
  render();
}

load();// ←ここまでが1ページ目のロード処理

// ===== 2ページ目: 遠征管理 =====
let expeditions = []; // Firebaseから取得
let currentWeek = 1;

// 2ページ目表示・非表示に合わせてボタンも制御
const topButtons = document.querySelector(".top-buttons");

// Firebaseから遠征データ読み込み
async function loadExpeditions() {
  expeditions = [];
  const snap = await getDocs(collection(db, "expeditions"));
  snap.forEach(d => expeditions.push({ id: d.id, ...d.data() }));
  renderExpedition();
}

function getPlayersByLane(lane) {
  return players.filter(p => p.lane === lane);
}

// 遠征テーブル描画
function renderExpedition() {
  const tbody = document.getElementById("page2Body");
  tbody.innerHTML = "";

  // 週データ取得 or 新規作成
  let weekData = expeditions.find(w => w.week === currentWeek);
  if (!weekData) {
    weekData = { week: currentWeek, matches: [] };
    for (let i = 1; i <= 3; i++) {
      const matchPlayers = [];
      [1,2,3].forEach(lane => {
        getPlayersByLane(lane).forEach(p => matchPlayers.push({ name: p.name, lane: lane, damageMarked: false }));
      });
      weekData.matches.push({ matchNumber: i, players: matchPlayers });
    }
    expeditions.push(weekData);
  }

  // 週ラベル更新
  document.getElementById("weekLabel").innerText = `第${currentWeek}週`;

  weekData.matches.forEach(match => {
    const header = document.createElement("tr");
    header.innerHTML = `<th colspan="3">第${match.matchNumber}試合</th>`;
    tbody.appendChild(header);

    match.players.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${["控え","レーン1","レーン2","レーン3"][p.lane]}</td>
        <td><input type="checkbox" ${p.damageMarked ? "checked" : ""} onchange="toggleDamage(${currentWeek}, ${match.matchNumber}, '${p.name}', this.checked)"></td>
      `;
      tbody.appendChild(tr);
    });
  });
}

// チェックボックス変更時
async function toggleDamage(week, matchNumber, playerName, checked) {
  const weekData = expeditions.find(w => w.week === week);
  if (!weekData) return;
  const match = weekData.matches.find(m => m.matchNumber === matchNumber);
  if (!match) return;
  const player = match.players.find(p => p.name === playerName);
  if (!player) return;

  player.damageMarked = checked;

  // Firebase更新
  if (weekData.id) {
    const docRef = doc(db, "expeditions", weekData.id);
    await updateDoc(docRef, { matches: weekData.matches });
  } else {
    const docRef = await addDoc(collection(db, "expeditions"), weekData);
    weekData.id = docRef.id;
  }
}

// 週切替
window.nextWeek = () => { currentWeek++; renderExpedition(); }
window.prevWeek = () => { if(currentWeek>1){ currentWeek--; renderExpedition(); } }

// ページ切替修正版（2ページ目でボタン非表示）
window.showPage = function(n){
  const pages = [document.getElementById("captureArea"), document.getElementById("page2")];
  pages.forEach((p,i)=>{
    p.style.display = (i === n-1) ? "block" : "none";
  });

  // 2ページ目ならボタン非表示
  if(n===2){
    topButtons.style.display = "none";
  } else {
    topButtons.style.display = "flex";
  }
};

loadExpeditions();
