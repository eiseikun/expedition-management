import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase設定
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

let players = [];
let playerDocs = [];
let editIndex = null;

// ===== 追加モード =====
window.openEditor = function(){
  document.getElementById("editor").style.display = "block";
  document.getElementById("modeIndicator").innerText = "追加モード";
  document.getElementById("modeIndicator").style.background = "#2e7d32";

  document.querySelectorAll("#editor input").forEach(i => i.value = "");
  document.querySelectorAll("#editor select").forEach(s => s.selectedIndex = 0);
  document.querySelectorAll("#chaos input").forEach(cb=>cb.checked=false);

  editIndex = null;
};

// ===== 聖物 =====
function relicBuff(m,l){
  return Number((m*0.25 + l*0.025).toFixed(3));
}

// ===== ルーン =====
function runeHTML(name,q,e){
  if(q==="none") return "";
  const cls = q==="mythic"?"rune rune-mythic":"rune rune-legend";
  return `<span class="${cls}">${name}(${e})</span>`;
}

// ===== 装備（完成版） =====
function gearText(gear, chaosArr, chaosType){
  const parts = ["武器","お守り","指輪","兜","鎧","靴"];
  chaosArr = Array.isArray(chaosArr) ? chaosArr : [];

  return `
    <div class="gear-box">
      ${parts.map(p=>{
        if(chaosArr.includes(p)){
          return `<div class="cell ${chaosType || "chaos"}"></div>`;
        }else{
          return `<div class="cell empty"></div>`;
        }
      }).join("")}
    </div>
  `;
}

// ===== 保存 =====
window.savePlayer = async function(){
  const chaosSelect = Array.from(document.querySelectorAll("#chaos input:checked")).map(cb => cb.value);

  let p = {
    name: document.getElementById("name").value,
    power: Number(document.getElementById("power").value),
    range: document.getElementById("range").value,
    style: document.getElementById("style").value,
    gear: document.getElementById("gear").value,
    chaos: chaosSelect,
    chaosType: document.getElementById("chaosType").value,
    hero: document.getElementById("hero").value,
    sharpQ: document.getElementById("sharpQuality").value,
    sharpE: document.getElementById("sharpEnchant").value,
    arrowQ: document.getElementById("arrowQuality").value,
    arrowE: document.getElementById("arrowEnchant").value,
    formation: document.getElementById("formation").value,
    mythic: Number(document.getElementById("mythic").value),
    legend: Number(document.getElementById("legend").value),
    lane: Number(document.getElementById("lane").value)
  };

  if(editIndex === null){
    const docRef = await addDoc(collection(db,"players"), p);
    players.push(p);
    playerDocs.push(docRef.id);
  }else{
    const ref = doc(db,"players",playerDocs[editIndex]);
    await updateDoc(ref, p);
    players[editIndex] = p;
    editIndex = null;
  }

  closeEditor();
  render();
};

// ===== 閉じる =====
window.closeEditor = function(){
  document.getElementById("editor").style.display = "none";
  document.getElementById("modeIndicator").innerText = "通常モード";
  document.getElementById("modeIndicator").style.background = "transparent";
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
  document.getElementById("sharpQuality").value = p.sharpQ;
  document.getElementById("sharpEnchant").value = p.sharpE;
  document.getElementById("arrowQuality").value = p.arrowQ;
  document.getElementById("arrowEnchant").value = p.arrowE;
  document.getElementById("formation").value = p.formation;
  document.getElementById("mythic").value = p.mythic;
  document.getElementById("legend").value = p.legend;
  document.getElementById("lane").value = p.lane;
  document.getElementById("chaosType").value = p.chaosType || "chaos";

  document.querySelectorAll("#chaos input").forEach(cb=>{
    cb.checked = (p.chaos || []).includes(cb.value);
  });

  document.getElementById("editor").style.display = "block";
  document.getElementById("modeIndicator").innerText = "編集モード";
  document.getElementById("modeIndicator").style.background = "#d32f2f";
};

// ===== 削除 =====
window.deletePlayer = async function(i){
  if(!confirm("削除しますか？")) return;

  const ref = doc(db,"players",playerDocs[i]);
  await deleteDoc(ref);

  players.splice(i,1);
  playerDocs.splice(i,1);
  render();
};

// ===== 描画 =====
function render(){
  const body = document.getElementById("playerBody");
  body.innerHTML = "";

  const laneNames = {1:"レーン1",2:"レーン2",3:"レーン3",0:"控え"};

  [1,2,3,0].forEach(laneNum=>{
    const lanePlayers = players.filter(p => (p.lane ?? 0) === laneNum);
    if(lanePlayers.length === 0) return;

    const trLane = document.createElement("tr");
    trLane.classList.add("lane-header");

    const limitText = laneNum === 0 ? "" : ` (${lanePlayers.length}/8)`;

    trLane.innerHTML = `<td colspan="10">${laneNames[laneNum]}${limitText}</td>`;
    body.appendChild(trLane);

    lanePlayers.sort((a,b)=>b.power-a.power);

    lanePlayers.forEach(p=>{
      const index = players.findIndex(x => x === p);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${p.power>=1000000? (p.power/1000000).toFixed(1)+"M":p.power}</td>
        <td>${p.range}/${p.style}</td>
        <td>${gearText(p.gear,p.chaos,p.chaosType)}</td>
        <td>${p.hero}</td>
        <td>${runeHTML("鋭利",p.sharpQ,p.sharpE)+runeHTML("アロレ",p.arrowQ,p.arrowE)}</td>
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
  const querySnapshot = await getDocs(collection(db,"players"));
  querySnapshot.forEach(d=>{
    players.push(d.data());
    playerDocs.push(d.id);
  });
  render();
}

load();
