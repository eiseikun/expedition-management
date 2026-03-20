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

// ===== 追加ルーンUI =====
window.addRune = function(rune = {name:"", q:"none", e:""}){
  const div = document.createElement("div");
  div.className = "rune-row";

  div.innerHTML = `
    <input placeholder="ルーン名" class="rune-name" value="${rune.name}">
    <select class="rune-q">
      <option value="none">なし</option>
      <option value="legend">レジェンド</option>
      <option value="mythic">ミシック</option>
      <option value="epic">エピック</option>
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
  document.body.style.overflow = "hidden";
  document.body.classList.add("modal-open");

  document.querySelectorAll("#editor input").forEach(i=>i.value="");
  document.querySelectorAll("#editor select").forEach(s=>s.selectedIndex=0);
  document.querySelectorAll("#chaos select").forEach(s=>s.value="");

  // 固定ルーン初期化
  document.getElementById("sharpQuality").value = "none";
  document.getElementById("arrowQuality").value = "none";

  // 追加ルーン初期化
  document.getElementById("runeContainer").innerHTML = "";

  editIndex = null;
};

window.closeEditor = function(){
  document.getElementById("editor").style.display = "none";
  document.getElementById("modeIndicator").innerText = "通常モード";
  document.body.style.overflow = "auto";
  document.body.classList.remove("modal-open");
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
  else if(q==="epic") cls += "rune-epic";

  return `<div class="${cls}">${name}<br>${e}</div>`;
}

// ===== 装備パーツ =====
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

// ===== 装備表示 =====
function gearText(gearDetail, gearType){
  const setMark = { 神託:"神", ドラグーン:"ド", グリフォン:"グ" };

  return `
    <div class="gear-box">
      ${parts.map(p=>{
        const found = gearDetail?.find(g=>g.part===p);
        const set = found?.set || gearType;
        const text = setMark[set] || "";
        return `<div class="cell ${found?found.type:"empty"}">${text}</div>`;
      }).join("")}
    </div>
  `;
}

// ===== 保存 =====
window.savePlayer = async function(){

  const runes = [];

  // 固定ルーン
  const sharpQ = document.getElementById("sharpQuality").value;
  if(sharpQ !== "none"){
    runes.push({
      name:"鋭利",
      q: sharpQ,
      e: document.getElementById("sharpEnchant").value
    });
  }

  const arrowQ = document.getElementById("arrowQuality").value;
  if(arrowQ !== "none"){
    runes.push({
      name:"アロレ",
      q: arrowQ,
      e: document.getElementById("arrowEnchant").value
    });
  }

  // 追加ルーン
  document.querySelectorAll("#runeContainer .rune-row").forEach(row=>{
    const name = row.querySelector(".rune-name").value;
    const q = row.querySelector(".rune-q").value;
    const e = row.querySelector(".rune-e").value;

    if(name && q !== "none"){
      runes.push({name, q, e});
    }
  });

  // 装備
  const gearDetail = [];
  document.querySelectorAll("#chaos div").forEach(div=>{
    const setEl = div.querySelector("[data-type='set']");
    const qEl = div.querySelector("[data-type='quality']");

    const part = setEl.dataset.part;
    const set = setEl.value;
    const type = qEl.value;

    if(set && type){
      gearDetail.push({part, type, set});
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
      const ref = doc(db,"players",playerDocs[editIndex]);
      await updateDoc(ref, p);
      players[editIndex] = p;
      editIndex = null;
    }
  }catch(e){
    alert("保存に失敗しました");
    console.error(e);
    return;
  }

  closeEditor();
  render();
};

// ===== 編集 =====
window.editPlayer = function(i){
  const p = players[i];
  editIndex = i;

  document.getElementById("name").value = p.name;
  document.getElementById("power").value = p.power;
  document.getElementById("range").value = p.range;
  document.getElementById("style").value = p.style;
  document.getElementById("gear").value = p.gear;
  document.getElementById("hero").value = p.hero;
  document.getElementById("formation").value = p.formation;
  document.getElementById("mythic").value = p.mythic;
  document.getElementById("legend").value = p.legend;
  document.getElementById("lane").value = p.lane;

  // 装備復元
  document.querySelectorAll("#chaos div").forEach(div=>{
    const setEl = div.querySelector("[data-type='set']");
    const qEl = div.querySelector("[data-type='quality']");
    const part = setEl.dataset.part;

    const found = p.gearDetail?.find(g=>g.part===part);

    if(found){
      setEl.value = found.set || p.gear;
      qEl.value = found.type;
    }else{
      setEl.value = "";
      qEl.value = "";
    }
  });

  // ルーン復元
  document.getElementById("sharpQuality").value = "none";
  document.getElementById("arrowQuality").value = "none";
  document.getElementById("runeContainer").innerHTML = "";

  if(p.runes){
    p.runes.forEach(r=>{
      if(r.name === "鋭利"){
        document.getElementById("sharpQuality").value = r.q;
        document.getElementById("sharpEnchant").value = r.e;
      }else if(r.name === "アロレ"){
        document.getElementById("arrowQuality").value = r.q;
        document.getElementById("arrowEnchant").value = r.e;
      }else{
        addRune(r);
      }
    });
  }

  document.getElementById("editor").style.display = "block";
  document.getElementById("modeIndicator").innerText = "編集モード";
  document.body.style.overflow = "hidden";
  document.body.classList.add("modal-open");
};

// ===== 削除 =====
window.deletePlayer = async function(i){
  if(!confirm("削除しますか？")) return;

  try{
    const ref = doc(db,"players",playerDocs[i]);
    await deleteDoc(ref);

    players.splice(i,1);
    playerDocs.splice(i,1);
  }catch(e){
    alert("削除に失敗しました");
    return;
  }

  render();
};

// ===== 表示 =====
function formatPower(val){
  return val.toFixed(2)+"M";
}

function render(){
  const body = document.getElementById("playerBody");
  body.innerHTML = "";

  const laneNames = {1:"レーン1",2:"レーン2",3:"レーン3",0:"控え"};

  [1,2,3,0].forEach(laneNum=>{
    const lanePlayers = players.filter(p=>p.lane===laneNum);
    if(lanePlayers.length===0) return;

    const trLane = document.createElement("tr");
    trLane.classList.add("lane-header");
    trLane.innerHTML = `<td colspan="10">${laneNames[laneNum]} (${lanePlayers.length})</td>`;
    body.appendChild(trLane);

    lanePlayers.sort((a,b)=>b.power-a.power);

    lanePlayers.forEach((p)=>{
      const index = players.findIndex(x => x === p);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${formatPower(p.power)}</td>
        <td>${p.range}/${p.style}</td>
        <td>${gearText(p.gearDetail, p.gear)}</td>
        <td>${p.hero}</td>
        <td>${p.runes?.map(r => runeHTML(r.name, r.q, r.e)).join("") || ""}</td>
        <td>${p.formation}</td>
        <td>${relicBuff(p.mythic,p.legend)}</td>
        <td><button onclick="editPlayer(${index})">編集</button></td>
        <td><button onclick="deletePlayer(${index})">削除</button></td>
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
