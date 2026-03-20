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
// ===== 320追加 =====
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

// ===== 装備 =====
function gearText(gearDetail, gearType){

  const parts = ["武器","兜","お守り","鎧","指輪","靴"];

  const setMark = {
    神託: "神",
    ドラグーン: "ド",
    グリフォン: "グ"
  };

  return `
    <div class="gear-box">
      ${parts.map(p=>{
        const found = gearDetail?.find(g=>g.part===p);

        // ★旧データ対応
        const set = found?.set || gearType;

        const text = setMark[set] || "";

        return `<div class="cell ${found?found.type:"empty"}">${text}</div>`;
      }).join("")}
    </div>
  `;
}

// ===== 保存 =====
window.savePlayer = async function(){

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
    sharpQ: document.getElementById("sharpQuality").value,
    sharpE: document.getElementById("sharpEnchant").value,
    arrowQ: document.getElementById("arrowQuality").value,
    arrowE: document.getElementById("arrowEnchant").value,
    formation: document.getElementById("formation").value,
    mythic: Number(document.getElementById("mythic").value),
    legend: Number(document.getElementById("legend").value),
    lane: Number(document.getElementById("lane").value)
  };

  //入力チェック
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
       // ===== 0320追加 ===== 
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

// ===== 画像保存（完全版） =====
window.saveTableImage = async function(){
  const original = document.getElementById("captureArea");
  const clone = original.cloneNode(true);
  const rows = clone.querySelectorAll("tr");
  let hide = false;

  rows.forEach(row=>{
    if(row.classList.contains("lane-header")){
      if(row.innerText.includes("控え")){
        hide = true;
        row.remove(); // 控えヘッダー削除
        return;
      }else{
        hide = false;
      }
    }
    if(hide){
      row.remove(); // 控えプレイヤー削除
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
        <td>${gearText(p.gearDetail, p.gear)}</td>
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
