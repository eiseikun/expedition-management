import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===== Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyCfLhFHEMcgqfkr6Dhp4SwLC1A8dmcMWWE",
  authDomain: "expedition-management-date.firebaseapp.com",
  projectId: "expedition-management-date",
  storageBucket: "expedition-management-date.firebasestorage.app",
  messagingSenderId: "394248951408",
  appId: "1:394248951408:web:21eed0b45aa19a18e146b5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== データ =====
let players = [];
let playerDocs = [];
let editIndex = null;

// ===== ルーン定義 =====
const runeOptions = {
  守護: ["ダメ軽減","HP増加"],
  迅速: ["移動速度UP","回避率UP"]
};

// ===== 効果更新 =====
function updateEnchant(nameSelect, enchantSelect){
  const effects = runeOptions[nameSelect.value] || [];
  enchantSelect.innerHTML = effects.map(e=>`<option>${e}</option>`).join("");
}

// ===== 選択ルーン追加 =====
window.addSelectRune = function(rune = {name:"守護", q:"none", e:""}){
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

// ===== 自由ルーン追加 =====
window.addFreeRune = function(rune = {name:"", q:"none", e:""}){
  const div = document.createElement("div");
  div.className = "rune-row";

  div.innerHTML = `
    <input placeholder="ルーン名" class="rune-name" value="${rune.name}">
    <select class="rune-q">
      <option value="none">なし</option>
      <option value="legend">レジェンド</option>
      <option value="mythic">ミシック</option>
    </select>
    <input placeholder="効果" class="rune-e" value="${rune.e}">
    <button onclick="this.parentNode.remove()">削除</button>
  `;

  div.querySelector(".rune-q").value = rune.q;
  document.getElementById("runeContainer").appendChild(div);
};

// ===== モーダル =====
window.openEditor = function(){
  document.getElementById("editor").style.display = "block";
  document.getElementById("modeIndicator").innerText = "追加モード";

  document.querySelectorAll("#editor input").forEach(i=>i.value="");
  document.querySelectorAll("#editor select").forEach(s=>s.selectedIndex=0);
  document.querySelectorAll("#chaos select").forEach(s=>s.value="");

  document.getElementById("sharpQuality").value = "none";
  document.getElementById("arrowQuality").value = "none";

  document.getElementById("runeContainer").innerHTML = "";

  editIndex = null;
};

window.closeEditor = function(){
  document.getElementById("editor").style.display = "none";
  document.getElementById("modeIndicator").innerText = "通常モード";
};

// ===== 計算 =====
function relicBuff(m,l){
  return Number((m*0.25 + l*0.025).toFixed(3));
}

// ===== ルーン表示 =====
function runeHTML(name,q,e){
  if(q==="none") return "";

  let cls = "rune ";
  if(q==="mythic") cls += "rune-mythic";
  else if(q==="legend") cls += "rune-legend";

  return `<div class="${cls}">${name}<br>${e}</div>`;
}

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
    <option value="epic">エピック</option>
  </select>
</div>
`).join("");

// ===== 保存 =====
window.savePlayer = async function(){

  const runes = [];

  // 固定ルーン
  const sharpQ = document.getElementById("sharpQuality").value;
  if(sharpQ !== "none"){
    runes.push({name:"鋭利", q:sharpQ, e:document.getElementById("sharpEnchant").value});
  }

  const arrowQ = document.getElementById("arrowQuality").value;
  if(arrowQ !== "none"){
    runes.push({name:"アロレ", q:arrowQ, e:document.getElementById("arrowEnchant").value});
  }

  // 追加ルーン
  document.querySelectorAll("#runeContainer .rune-row").forEach(row=>{
    const nameEl = row.querySelector(".rune-name");
    const q = row.querySelector(".rune-q").value;
    const eEl = row.querySelector(".rune-e");

    const name = nameEl.value;
    const e = eEl.value;

    if(name && q !== "none"){
      runes.push({name, q, e});
    }
  });

  // 装備
  const gearDetail = [];
  document.querySelectorAll("#chaos div").forEach(div=>{
    const setEl = div.querySelector("[data-type='set']");
    const qEl = div.querySelector("[data-type='quality']");
    if(setEl.value && qEl.value){
      gearDetail.push({
        part:setEl.dataset.part,
        set:setEl.value,
        type:qEl.value
      });
    }
  });

  const p = {
    name: document.getElementById("name").value.trim(),
    power: Number(document.getElementById("power").value),
    range: document.getElementById("range").value,
    style: document.getElementById("style").value,
    gear: document.getElementById("gear").value,
    gearDetail,
    hero: document.getElementById("hero").value,
    formation: document.getElementById("formation").value,
    mythic: Number(document.getElementById("mythic").value),
    legend: Number(document.getElementById("legend").value),
    lane: Number(document.getElementById("lane").value),
    runes
  };

  if(!p.name || isNaN(p.power)){
    alert("名前と戦力は必須です");
    return;
  }

  try{
    if(editIndex===null){
      const docRef = await addDoc(collection(db,"players"), p);
      players.push(p);
      playerDocs.push(docRef.id);
    }else{
      await updateDoc(doc(db,"players",playerDocs[editIndex]), p);
      players[editIndex] = p;
      editIndex = null;
    }
  }catch(e){
    alert("保存失敗");
    return;
  }

  closeEditor();
  render();
};

// ===== 表示 =====
function formatPower(val){ return val.toFixed(2)+"M"; }

function render(){
  const body = document.getElementById("playerBody");
  body.innerHTML = "";

  const laneNames = {1:"レーン1",2:"レーン2",3:"レーン3",0:"控え"};

  [1,2,3,0].forEach(l=>{
    const list = players.filter(p=>p.lane===l);
    if(!list.length) return;

    const trLane = document.createElement("tr");
    trLane.classList.add("lane-header");
    trLane.innerHTML = `<td colspan="10">${laneNames[l]} (${list.length})</td>`;
    body.appendChild(trLane);

    list.sort((a,b)=>b.power-a.power);

    list.forEach(p=>{
      const i = players.findIndex(x=>x===p);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${formatPower(p.power)}</td>
        <td>${p.range}/${p.style}</td>
        <td>${p.hero}</td>
        <td>${p.runes.map(r=>runeHTML(r.name,r.q,r.e)).join("")}</td>
        <td>${p.formation}</td>
        <td>${relicBuff(p.mythic,p.legend)}</td>
        <td><button onclick="editPlayer(${i})">編集</button></td>
        <td><button onclick="deletePlayer(${i})">削除</button></td>
      `;
      body.appendChild(tr);
    });
  });
}

// ===== 初期ロード =====
async function load(){
  const snapshot = await getDocs(collection(db,"players"));
  snapshot.forEach(d=>{
    players.push(d.data());
    playerDocs.push(d.id);
  });
  render();
}

load();
