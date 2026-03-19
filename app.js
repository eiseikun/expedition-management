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

// ===== モーダル =====
window.openEditor = function(){
  document.getElementById("editor").style.display = "block";
  document.getElementById("modeIndicator").innerText = "追加モード";
  document.body.style.overflow = "hidden";
  document.body.classList.add("modal-open");

  document.querySelectorAll("#editor input").forEach(i=>i.value="");
  document.querySelectorAll("#editor select").forEach(s=>s.selectedIndex=0);
  document.querySelectorAll("#chaos select").forEach(s=>s.value="");

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

// ===== ルーン =====
function runeHTML(name,q,e){
  if(q==="none") return "";
  const cls = q==="mythic"?"rune rune-mythic":"rune rune-legend";
  return `<div class="${cls}">${name}<br>${e}</div>`;
}

// ===== 装備 =====
function gearText(gearDetail){
  const parts = ["武器","兜","お守り","鎧","指輪","靴"];
  return `
    <div class="gear-box">
      ${parts.map(p=>{
        const found = gearDetail?.find(g=>g.part===p);
        return `<div class="cell ${found?found.type:"empty"}"></div>`;
      }).join("")}
    </div>
  `;
}

// ===== 保存 =====
window.savePlayer = async function(){

  const gearDetail = [];
  document.querySelectorAll("#chaos select").forEach(s=>{
    if(s.value){
      gearDetail.push({part:s.dataset.part,type:s.value});
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
    sharpQ: document.getElementById("sharpQuality").value,
    sharpE: document.getElementById("sharpEnchant").value,
    arrowQ: document.getElementById("arrowQuality").value,
    arrowE: document.getElementById("arrowEnchant").value,
    formation: document.getElementById("formation").value,
    mythic: Number(document.getElementById("mythic").value),
    legend: Number(document.getElementById("legend").value),
    lane: Number(document.getElementById("lane").value)
  };

  // ✅ 入力チェック
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
  document.getElementById("sharpQuality").value = p.sharpQ;
  document.getElementById("sharpEnchant").value = p.sharpE;
  document.getElementById("arrowQuality").value = p.arrowQ;
  document.getElementById("arrowEnchant").value = p.arrowE;
  document.getElementById("formation").value = p.formation;
  document.getElementById("mythic").value = p.mythic;
  document.getElementById("legend").value = p.legend;
  document.getElementById("lane").value = p.lane;

  document.querySelectorAll("#chaos select").forEach(s=>{
    const found = p.gearDetail?.find(g=>g.part===s.dataset.part);
    s.value = found ? found.type : "";
  });

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
      const index = players.findIndex(x => x === p); // ✅ 安全化

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${formatPower(p.power)}</td>
        <td>${p.range}/${p.style}</td>
        <td>${gearText(p.gearDetail)}</td>
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
  const snapshot = await getDocs(collection(db,"players"));
  snapshot.forEach(d=>{
    players.push(d.data());
    playerDocs.push(d.id);
  });
  render();
}

load();
