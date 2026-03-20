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

// ===== モーダル =====
window.openEditor = function(){
  document.getElementById("editor").style.display = "block";
  document.body.classList.add("modal-open");

  document.querySelectorAll("#editor input").forEach(i=>i.value="");
  document.querySelectorAll("#editor select").forEach(s=>s.selectedIndex=0);
  document.getElementById("runeContainer").innerHTML = "";

  editIndex = null;
};

window.closeEditor = function(){
  document.getElementById("editor").style.display = "none";
  document.body.classList.remove("modal-open");
};

// ===== ルーン =====
const runeOptions = {
  守護: ["ダメ軽減","HP増加"],
  迅速: ["移動速度UP","回避率UP"]
};

function updateEnchant(nameSelect, enchantSelect){
  const effects = runeOptions[nameSelect.value] || [];
  enchantSelect.innerHTML = effects.map(e=>`<option>${e}</option>`).join("");
}

window.addSelectRune = function(){
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
  const eSel = div.querySelector(".rune-e");

  updateEnchant(nameSel, eSel);
  nameSel.onchange = () => updateEnchant(nameSel, eSel);

  document.getElementById("runeContainer").appendChild(div);
};

window.addFreeRune = function(){
  const div = document.createElement("div");
  div.className = "rune-row";

  div.innerHTML = `
    <input class="rune-name" placeholder="ルーン名">
    <select class="rune-q">
      <option value="none">なし</option>
      <option value="legend">レジェンド</option>
      <option value="mythic">ミシック</option>
    </select>
    <input class="rune-e" placeholder="効果">
    <button onclick="this.parentNode.remove()">削除</button>
  `;

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
    <option value="epic">エピック</option>
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

// ===== 編集（←これが無かった） =====
window.editPlayer = function(i){
  const p = players[i];
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

  openEditor();
};

// ===== 削除 =====
window.deletePlayer = async function(i){
  if(!confirm("削除する？")) return;
  await deleteDoc(doc(db,"players",playerDocs[i]));
  players.splice(i,1);
  playerDocs.splice(i,1);
  render();
};

// ===== 画像保存 =====
window.saveTableImage = async function(){
  const original = document.getElementById("captureArea");
  const clone = original.cloneNode(true);

  clone.querySelectorAll("tr").forEach(row=>{
    const cells = row.querySelectorAll("th, td");
    if(cells.length >= 9){
      cells[8]?.remove();
      cells[7]?.remove();
    }
  });

  clone.style.position="absolute";
  clone.style.top="-9999px";
  document.body.appendChild(clone);

  const canvas = await html2canvas(clone,{scale:3});
  document.body.removeChild(clone);

  const link=document.createElement("a");
  link.href=canvas.toDataURL();
  link.download="expedition.png";
  link.click();
};

// ===== 表示 =====
function formatPower(v){return v.toFixed(2)+"M";}
function relicBuff(m,l){return Number((m*0.25 + l*0.025).toFixed(3));}

function render(){
  const body=document.getElementById("playerBody");
  body.innerHTML="";

  const laneNames={1:"レーン1",2:"レーン2",3:"レーン3",0:"控え"};

  [1,2,3,0].forEach(l=>{
    const list=players.filter(p=>p.lane===l);
    if(!list.length)return;

    const tr=document.createElement("tr");
    tr.className="lane-header";
    tr.innerHTML=`<td colspan="10">${laneNames[l]} (${list.length})</td>`;
    body.appendChild(tr);

    list.sort((a,b)=>b.power-a.power);

    list.forEach(p=>{
      const i=players.indexOf(p);
      const row=document.createElement("tr");

      row.innerHTML=`
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

load();
