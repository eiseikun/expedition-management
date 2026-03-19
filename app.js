import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===== Firebase設定 =====
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

// ===== モーダル =====
window.openEditor = function(){
  document.getElementById("editor").style.display = "block";
  document.body.style.overflow = "hidden";
};

window.closeEditor = function(){
  document.getElementById("editor").style.display = "none";
  document.body.style.overflow = "auto";
};

// ===== 補助 =====
function relicBuff(m,l){
  return Number((m*0.25 + l*0.025).toFixed(3));
}

function runeHTML(name,q,e){
  if(q==="none") return "";
  const cls = q==="mythic"?"rune rune-mythic":"rune rune-legend";
  return `<span class="${cls}">${name}(${e})</span>`;
}

function gearText(gearDetail){
  const parts = ["武器","兜","お守り","鎧","指輪","靴"];
  gearDetail = Array.isArray(gearDetail) ? gearDetail : [];
  return `
    <div class="gear-box">
      ${parts.map(p=>{
        const found = gearDetail.find(g=>g.part===p);
        if(found){
          return `<div class="cell ${found.type}"></div>`;
        }else{
          return `<div class="cell empty"></div>`;
        }
      }).join("")}
    </div>
  `;
}

function formatPower(val){
  return val.toFixed(2) + "M";
}

// ===== 保存 =====
window.savePlayer = async function(){
  const gearDetail = [];
  document.querySelectorAll("#chaos select").forEach(s=>{
    if(s.value){
      gearDetail.push({
        part: s.dataset.part,
        type: s.value
      });
    }
  });

  let p = {
    name: document.getElementById("name").value,
    power: Number(document.getElementById("power").value),
    range: document.getElementById("range").value,
    style: document.getElementById("style").value,
    gear: document.getElementById("gear").value,
    gearDetail: gearDetail,
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
    const found = (p.gearDetail || []).find(g=>g.part===s.dataset.part);
    s.value = found ? found.type : "";
  });

  document.getElementById("editor").style.display = "block";
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

// ===== 画像保存（安定版） =====
window.saveTableImage = async function() {
  const table = document.getElementById("playerTable");
  const container = document.querySelector(".table-container");

  const tableStyle = table.getAttribute("style") || "";
  const containerStyle = container.getAttribute("style") || "";

  // ⭐ キャプチャ専用CSS
  const style = document.createElement("style");
  style.innerHTML = `
    #playerTable { background:#111 !important; }
    #playerTable tr { background:#141414 !important; }
    #playerTable .tr-even { background:#1b1b1b !important; }
    #playerTable th { background:#2c2c2c !important; color:#fff !important; }
  `;
  document.head.appendChild(style);

  try {
    container.style.display = "block";
    container.style.overflow = "visible";

    const canvas = await html2canvas(table, {
      scale: 1.5,
      backgroundColor: "#111"
    });

    canvas.toBlob(async blob => {
      const file = new File([blob], "expedition.png", { type: "image/png" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "expedition.png";
        link.click();
      }
    });

  } finally {
    document.head.removeChild(style);
    table.setAttribute("style", tableStyle);
    container.setAttribute("style", containerStyle);

    // ⭐ これ超重要（元に戻す）
    container.style.overflow = "auto";
  }
};

// ===== 描画（←ここが重要修正済み） =====
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

    lanePlayers.forEach((p,i)=>{
      const index = players.findIndex(x => x === p);

      const tr = document.createElement("tr");

      // ⭐ nth-childの代わり（今回の修正）
      if(i % 2 === 1){
        tr.classList.add("tr-even");
      }

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
  const querySnapshot = await getDocs(collection(db,"players"));
  querySnapshot.forEach(d=>{
    players.push(d.data());
    playerDocs.push(d.id);
  });
  render();
}

load();
