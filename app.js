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
window.showPage = async function(n){
  const page1 = document.getElementById("captureArea");
  const page2 = document.getElementById("page2");
  const topButtons = document.getElementById("topButtons");

  page1.style.display = (n === 1) ? "block" : "none";
  page2.style.display = (n === 2) ? "block" : "none";
  topButtons.style.display = (n === 1) ? "flex" : "none";

  if(players.length === 0){
    await load();
  }

  if(n === 2) loadExpeditions();
};

// ===== モーダル =====
window.openEditor = function(){
  document.getElementById("editor").style.display = "block";
  document.getElementById("modeIndicator").innerText = "追加モード";

  document.querySelectorAll("#editor input").forEach(i=>i.value="");
  document.querySelectorAll("#editor select").forEach(s=>s.selectedIndex=0);
  editIndex = null;
};

window.closeEditor = function(){
  document.getElementById("editor").style.display = "none";
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

// ===== 表示用関数 =====
function gearText(gearDetail){
  const mark = {神託:"神",ドラグーン:"ド",グリフォン:"グ"};
  return `<div class="gear-box">${parts.map(p=>{
    const g = gearDetail?.find(x=>x.part===p);
    return `<div class="cell ${g?.type||"empty"}">${g?mark[g.set]:""}</div>`;
  }).join("")}</div>`;
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
    
    order: editIndex === null ? Date.now() : players[editIndex].order,
    
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

  document.querySelectorAll("#chaos div").forEach(div=>{
    const part = div.querySelector("[data-type='set']").dataset.part;
    const g = p.gearDetail?.find(x=>x.part===part);
    div.querySelector("[data-type='set']").value = g?.set || "";
    div.querySelector("[data-type='quality']").value = g?.type || "";
  });

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
      }else hide=false;
    }
    if(hide) row.remove();
  });

  clone.querySelectorAll("tr").forEach(row=>{
    const cells = row.querySelectorAll("th, td");
    if(cells.length >= 11){
      cells[10]?.remove();
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

  const canvas = await html2canvas(clone,{scale:3, backgroundColor:"#111", width:clone.scrollWidth});
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
      tr.innerHTML = `<td colspan="11">${laneNames[l]} (${list.length})</td>`;
    }else{
      tr.innerHTML = `<td colspan="11">${laneNames[l]} (${list.length} / ${total})</td>`;
    }
    body.appendChild(tr);

    list.sort((a,b)=>a.order - b.order);

    list.forEach(p=>{
      const i=players.indexOf(p);
      const row=document.createElement("tr");
      if(p.lane === 1){
        row.classList.add("lane-1");
      }else if(p.lane === 2){
        row.classList.add("lane-2");
      }else if(p.lane === 3){
        row.classList.add("lane-3");
      }
      row.innerHTML=`
        <td>${p.name}</td>
        <td>${formatPower(p.power)}</td>
        <td>
        <span class="strategy-label ${
          p.range === "近距離" ? "strategy-close" :
          p.range === "中距離" ? "strategy-mid" :
          "strategy-long"
        }">
        ${p.range} / ${p.style}
        </span>
        </td>
        <td>${gearText(p.gearDetail)}</td>
        <td>${p.hero}</td>
        <td>${(p.runes||[]).map(r=>runeHTML(r.name,r.q,r.e)).join("")}</td>
        <td>${p.formation}</td>
        <td>${relicBuff(p.mythic,p.legend)}</td>
        <td>
        <button onclick="moveUp(${i})">↑</button>
        <button onclick="moveDown(${i})">↓</button>
        </td>
        <td><button onclick="editPlayer(${i})">編集</button></td>
        <td><button onclick="deletePlayer(${i})">削除</button></td>
      `;
      body.appendChild(row);
    });
  });
}
// ===== 初期ロード =====
async function load(){
  const snap = await getDocs(collection(db,"players"));
  snap.forEach(d=>{
    players.push(d.data());
    playerDocs.push(d.id);
  });
  
 players.forEach((p,i)=>{
    if(p.order === undefined){
      p.order = i;
    }
  });
  render();
}

load();
// ============================
// ===== ここから2ページ目 =====
// ============================
// タグ・火力色設定（ページ2用）
const damageColors = {
  "メイン武器": "#ff4d4f",
  "エレメント": "#4096ff",
  "爆発": "#ff7a45",
  "ストライク": "#69c0ff",
  "メテオ": "#ad4e00",
  "サークル": "#b37feb",
  "精霊": "#7cb305",
  "植物の守り手": "#389e0d",
  "その他": "#8c8c8c"
};

window.addMatch = async function(matchNumber){
  if(players.length === 0){
  alert("プレイヤーが読み込まれていません。ページ1を開いてください");
  return;
}
  const date = document.getElementById("weekDate").value;
  if(!date) return alert("日付を選択して");
  const matchPlayers = players
  .filter(p => p.lane >= 1 && p.lane <= 3)
  .sort((a,b)=>a.order - b.order)
  .map(p=>({
      name: p.name,
      lane: p.lane,
      style: p.range, // ←画像に合わせて戦術じゃなく距離に変更OK
      damageTypes: []
    }));
  const snap = await getDocs(collection(db,"expeditions"));
  const existing = snap.docs.find(d=>d.data().date === date);

  if(existing){
    const data = existing.data();

    // 同じ回戦あれば上書き
    const idx = data.matches.findIndex(m=>m.matchNumber === matchNumber);
    if(idx >= 0){
      data.matches[idx] = { matchNumber, players: matchPlayers };
    }else{
      data.matches.push({ matchNumber, players: matchPlayers });
    }

    await updateDoc(doc(db,"expeditions",existing.id), data);

  }else{
    await addDoc(collection(db,"expeditions"), {
      date,
      matches: [{ matchNumber, players: matchPlayers }]
    });
  }

  loadExpeditions();
};
// ===== 指定週に回戦追加（強化版）=====
window.addMatchToWeek = async function(docId, matchNumber){

  const ref = doc(db, "expeditions", docId);
  const snap = await getDocs(collection(db, "expeditions"));
  const target = snap.docs.find(d => d.id === docId);

  if(!target) return;

  const data = {
  ...target.data(),
  matches: [...target.data().matches]
};

  // 既存チェック
  const existsIndex = data.matches.findIndex(m => m.matchNumber === matchNumber);
  const matchPlayers = players
    .filter(p => p.lane >= 1 && p.lane <= 3)
    .sort((a,b)=>a.order - b.order)
    .map(p=>({
      name: p.name,
      lane: p.lane,
      style: p.range,
      damageTypes: []
    }));
 if(existsIndex >= 0){
  const oldMatch = data.matches[existsIndex];
  const newPlayers = matchPlayers.map(p=>{
    const old = oldMatch.players.find(op => op.name === p.name);
    return {
      ...p,
      damageTypes: old?.damageTypes || []
    };
  });
  data.matches[existsIndex] = {
    matchNumber,
    players: newPlayers
  };
}else{
  data.matches.push({
    matchNumber,
    players: matchPlayers
  });
}
  await updateDoc(ref, data);
  loadExpeditions();
};
// ===== 週保存（1回戦のみ作成）=====
window.saveWeek = async function(){
  if(players.length === 0){
    alert("プレイヤーが読み込まれていません。ページ1を開いてください");
    return;
  }
  const date = document.getElementById("weekDate").value;
  if(!date) return alert("日付を選択して");
  
  // プレイヤーデータ作成
  const matchPlayers = players
    .filter(p => p.lane >= 1 && p.lane <= 3)
    .sort((a,b)=>a.order - b.order)
    .map(p=>({
      name: p.name,
      lane: p.lane,
      style: p.range,
      damageTypes: []
    }));
  const snap = await getDocs(collection(db,"expeditions"));
  const existing = snap.docs.find(d=>d.data().date === date);
  if(existing){
    const data = existing.data();

    // 1回戦があれば上書き、なければ追加
    const idx = data.matches.findIndex(m=>m.matchNumber === 1);
    if(idx >= 0){
      data.matches[idx] = { matchNumber: 1, players: matchPlayers };
    }else{
      data.matches.push({ matchNumber: 1, players: matchPlayers });
    }
    await updateDoc(doc(db,"expeditions",existing.id), data);
  }else{
    // 新規作成（1回戦だけ）
    await addDoc(collection(db,"expeditions"), {
      date,
      matches: [{ matchNumber: 1, players: matchPlayers }]
    });
  }
  loadExpeditions();
};

  // 2ページ目データ削除
window.deleteMatch = async function(matchNumber){
  const date = document.getElementById("weekDate").value;
if(!date) return alert("日付を選択して");
  const snap = await getDocs(collection(db,"expeditions"));
  const docSnap = snap.docs.find(d=>d.data().date === date);
  if(!docSnap){
    alert("この週のデータがありません");
    return;
  }
  const data = docSnap.data();
  data.matches = data.matches.filter(m=>m.matchNumber !== matchNumber);
  await updateDoc(doc(db,"expeditions",docSnap.id), data);
  loadExpeditions();
};


// ===== 2ページ目表示032121更新 =====

// 表示（横テーブル＋レーン区切り）
async function loadExpeditions(){

  const container = document.getElementById("expeditionContainer");
  container.innerHTML = "";

  const snap = await getDocs(collection(db,"expeditions"));
  const docs = snap.docs.sort(
    (a,b)=> new Date(b.data().date) - new Date(a.data().date)
  );
  docs.forEach(d=>{
    const exp = d.data();

    const weekDiv = document.createElement("div");
    weekDiv.className = "week-block";
    const header = document.createElement("div");

header.innerHTML = `
  <div class="week-header-row date-row">
    <h3>${formatRange(exp.date)}</h3>
    <button onclick="saveWeekImage(this)">全体</button>
  </div>
  <div class="week-header-row add-row">
    <button onclick="addMatchToWeek('${d.id}',1)">1回戦追加</button>
    <button onclick="addMatchToWeek('${d.id}',2)">2回戦追加</button>
    <button onclick="addMatchToWeek('${d.id}',3)">3回戦追加</button>
  </div>
  <div class="week-header-row delete-row">
    <button onclick="deleteMatchByWeek('${d.id}',1)">1回戦削除</button>
    <button onclick="deleteMatchByWeek('${d.id}',2)">2回戦削除</button>
    <button onclick="deleteMatchByWeek('${d.id}',3)">3回戦削除</button>
    <button onclick="deleteWeek('${d.id}')">週ごと削除</button>
  </div>
`;
    header.style.cursor = "pointer";

    const content = document.createElement("div");

    header.onclick = (e) => {
      if(e.target.tagName === "BUTTON") return;
      content.style.display =
        (content.style.display === "none") ? "block" : "none";
    };

    const table = document.createElement("table");

    // ===== ヘッダー =====
    // ★追加：存在する回戦を取得
    const matchNumbers = exp.matches.map(m => m.matchNumber);
    matchNumbers.sort((a,b)=>a-b);
    // ★ヘッダー生成
    let header1 = `<tr><th>レーン</th>`;
    let header2 = `<tr><th></th>`;

    matchNumbers.forEach(mn=>{
      header1 += `<th colspan="3">${mn}回戦</th>`;
      header2 += `<th>名前</th><th>戦術</th><th>火力内訳</th>`;
    });
    header1 += `</tr>`;
    header2 += `</tr>`;
    table.innerHTML = header1 + header2;

    const lanes = [1,2,3];

    lanes.forEach(lane=>{

      // ★そのレーンの最大人数を取得
      let max = 0;
      matchNumbers.forEach(mn=>{
        const match = exp.matches.find(m=>m.matchNumber === mn);
        const count = match ? match.players.filter(p=>p.lane === lane).length : 0;
        if(count > max) max = count;
      });

      // ★人数分ループ（縦に増やす）
      for(let i=0;i<max;i++){
        const row = document.createElement("tr");
        if(lane === 1){
          row.classList.add("lane-1");
        }else if(lane === 2){
          row.classList.add("lane-2");
        }else if(lane === 3){
          row.classList.add("lane-3");
        }
        // レーン表示（最初の行だけ）
        if(i === 0){
          row.innerHTML += `<td rowspan="${max}">${lane}</td>`;
        }
        
        matchNumbers.forEach(mn=>{
          const match = exp.matches.find(m=>m.matchNumber === mn);
          const lanePlayers = match
            ? match.players.filter(p=>p.lane === lane)
            : [];

          const p = lanePlayers[i];
          row.setAttribute("data-match-number", mn);
          
          const damageList = ["メイン武器","エレメント","爆発","ストライク","メテオ","サークル","精霊","植物の守り手","その他"];
          row.innerHTML += `
<td>${p?.name || ""}</td>
<td>
${p ? `
<span class="strategy-label ${
  p.style === "近距離" ? "strategy-close" :
  p.style === "中距離" ? "strategy-mid" :
  "strategy-long"
}">
${p.style}
</span>
` : ""}
</td>
<td 
  data-doc-id="${d.id}" 
  data-match-number="${mn}" 
  data-player-name="${p?.name || ""}"
>
${p ? `
<div class="tag-view" onclick="enableEdit(this)">
  ${
    p.damageTypes && p.damageTypes.length > 0
    ? p.damageTypes.map(t => {
        const type = typeof t === "string" ? t : t.type;
        const size = typeof t === "string" ? "medium" : t.size;

        return `
          <span class="tag active tag-${size}" 
            style="background:${damageColors[type] || 'gray'}; color:white; padding:2px 6px; border-radius:4px; margin-right:2px;">
            ${type}
          </span>
        `;
      }).join("")
    : '<span class="no-tag">未設定</span>'
  }
</div>

<div class="tag-edit" style="display:none;">
  <div class="dropdown-box">
   ${damageList.map(type => {
  const found = p.damageTypes?.find(t => 
    (typeof t === "string" ? t : t.type) === type
  );
  const size = found
    ? (typeof found === "string" ? "medium" : found.size)
    : "medium";
  return `
    <label class="dropdown-item" onclick="event.stopPropagation()">
      <input type="checkbox"
        value="${type}"
        ${found ? "checked" : ""}
        onclick="event.stopPropagation()"
      />
      ${type}
      <select class="size-select">
        <option value="small" ${size==="small"?"selected":""}>小</option>
        <option value="medium" ${size==="medium"?"selected":""}>中</option>
        <option value="large" ${size==="large"?"selected":""}>大</option>
      </select>
    </label>
  `;
}).join("")}
  </div>
  <button onclick="event.stopPropagation(); closeTagEdit(this)">OK</button>
</div>

` : ""}
</td>
`;
        });
        table.appendChild(row);
      }
    });
    content.appendChild(table);
    weekDiv.appendChild(header);
    weekDiv.appendChild(content);
    container.appendChild(weekDiv);
  });
}
window.enableEdit = function(el){
  const parent = el.parentNode;
  document.querySelectorAll(".tag-edit").forEach(edit => {
    edit.style.display = "none";
    edit.previousElementSibling.style.display = "block";
  });
  parent.querySelector(".tag-view").style.display = "none";
  parent.querySelector(".tag-edit").style.display = "block";
};
window.toggleDamageCheckbox = async function(docId, matchNumber, playerName, checkbox){
  const ref = doc(db,"expeditions",docId);
  const snap = await getDocs(collection(db,"expeditions"));
  const docData = snap.docs.find(d=>d.id === docId).data();
  const match = docData.matches.find(m=>m.matchNumber === matchNumber);
  const player = match.players.find(p=>p.name === playerName);

  if(!player.damageTypes) player.damageTypes = [];

  if(checkbox.checked){
    if(!player.damageTypes.some(t=>t.type===checkbox.value)){
      player.damageTypes.push({ type: checkbox.value, size: "medium" });
    }
  }else{
    player.damageTypes = player.damageTypes.filter(v=>v.type !== checkbox.value);
  }

  await updateDoc(ref, docData);
};

window.closeTagEdit = async function(button){
  const editDiv = button.parentNode;
  const viewDiv = editDiv.previousElementSibling;

  const container = viewDiv.closest("td");
  const docId = container.dataset.docId;
  const matchNumber = parseInt(container.dataset.matchNumber);
  const playerName = container.dataset.playerName;

  const tags = editDiv.querySelectorAll("input[type=checkbox]");
  const active = [];
  tags.forEach(cb => {
    if(cb.checked){
      const sizeSel = cb.closest("label").querySelector("select.size-select");
      const size = sizeSel ? sizeSel.value : "medium";
      active.push({ type: cb.value, size });
    }
  });

  // 表示更新
  viewDiv.innerHTML = active.length > 0
    ? active.map(t => `<span class="tag active tag-${t.size}" style="background:${damageColors[t.type] || 'gray'};">${t.type}</span>`).join("")
    : '<span class="no-tag">未設定</span>';

  // Firestore 更新
  const ref = doc(db,"expeditions",docId);
  const snap = await getDocs(collection(db,"expeditions"));
  const docData = snap.docs.find(d=>d.id === docId).data();
  const match = docData.matches.find(m=>m.matchNumber === matchNumber);
  const player = match.players.find(p=>p.name === playerName);

  player.damageTypes = active; // ここでサイズ反映
  await updateDoc(ref, docData);

  editDiv.style.display = "none";
  viewDiv.style.display = "block";
};

// クリックで外側を閉じる処理はそのまま
document.addEventListener("click", function(e){
  if(e.target.closest(".tag-edit") || e.target.closest(".tag-view")) return;
  document.querySelectorAll(".tag-edit").forEach(edit => {
    edit.style.display = "none";
    const view = edit.previousElementSibling;
    if(view) view.style.display = "block";
  });
});
                
// 回戦削除（週指定）
window.deleteMatchByWeek = async function(docId, matchNumber){

  if(!confirm("この回戦を削除しますか？")) return;

  const ref = doc(db,"expeditions",docId);
  const snap = await getDocs(collection(db,"expeditions"));
  const data = snap.docs.find(d=>d.id === docId).data();

  data.matches = data.matches.filter(m=>m.matchNumber !== matchNumber);

  await updateDoc(ref, data);
  loadExpeditions();
};

// 週ごと削除
window.deleteWeek = async function(docId){

  if(!confirm("この週を全部削除しますか？")) return;

  await deleteDoc(doc(db,"expeditions",docId));
  loadExpeditions();
};
// 日付
function formatRange(dateStr){
  const start = new Date(dateStr);
  const end = new Date(start);
  end.setDate(start.getDate() + 2);

  const y = start.getFullYear();
  const m1 = start.getMonth() + 1;
  const d1 = start.getDate();

  const m2 = end.getMonth() + 1;
  const d2 = end.getDate();

  if(m1 === m2){
    return `${y}/${m1}/${d1}〜${d2}`;
  }else{
    return `${y}/${m1}/${d1}〜${m2}/${d2}`;
  }
}
// 金曜だけ選択可能
document.getElementById("weekDate").addEventListener("input", function(){
  if(!this.value) return;
  const date = new Date(this.value);
  const day = date.getDay(); // 0=日〜6=土
  if(day !== 5){
    alert("金曜日を選択してください");
    this.value = "";
  }
});
flatpickr("#weekDate", {
  locale: "ja",
  dateFormat: "Y-m-d",
  enable: [
    function(date){
      return date.getDay() === 5;
    }
  ],
  onDayCreate: function(dObj, dStr, fp, dayElem){
    const date = dayElem.dateObj;
    if(date.getDay() === 5){
      dayElem.style.background = "#4caf50";
      dayElem.style.color = "white";
      dayElem.style.borderRadius = "50%";
    }
  }
});

// 1ページ目並べ替えの中身
window.moveUp = async function(i){
  const p = players[i];

  const sameLane = players
    .map((p,idx)=>({p,idx}))
    .filter(x=>x.p.lane === p.lane)
    .sort((a,b)=>a.p.order - b.p.order);

  const index = sameLane.findIndex(x=>x.idx === i);
  if(index === 0) return;

  const a = sameLane[index];
  const b = sameLane[index-1];

  // 順番入れ替え
  const temp = players[a.idx].order;
  players[a.idx].order = players[b.idx].order;
  players[b.idx].order = temp;

  // Firestore保存
  await updateDoc(doc(db,"players",playerDocs[a.idx]), players[a.idx]);
  await updateDoc(doc(db,"players",playerDocs[b.idx]), players[b.idx]);

  render();
};

window.moveDown = async function(i){
  const p = players[i];

  const sameLane = players
    .map((p,idx)=>({p,idx}))
    .filter(x=>x.p.lane === p.lane)
    .sort((a,b)=>a.p.order - b.p.order);

  const index = sameLane.findIndex(x=>x.idx === i);
  if(index === sameLane.length-1) return;

  const a = sameLane[index];
  const b = sameLane[index+1];

  const temp = players[a.idx].order;
  players[a.idx].order = players[b.idx].order;
  players[b.idx].order = temp;

  await updateDoc(doc(db,"players",playerDocs[a.idx]), players[a.idx]);
  await updateDoc(doc(db,"players",playerDocs[b.idx]), players[b.idx]);

  render();
};
// ===== 週ごと画像保存 =====
window.saveWeekImage = async function(btn){
  // 対象の週ブロック取得
  const original = btn.closest(".week-block");
  // クローン
  const clone = original.cloneNode(true);
  // 不要なボタン削除
  clone.querySelectorAll("button").forEach(b => b.remove());
  
  // スタイル
  clone.style.width = original.scrollWidth + "px";
  clone.style.background = "#111";
  clone.style.color = "white";
  clone.style.position = "absolute";
  clone.style.top = "-9999px";

  document.body.appendChild(clone);

  // 画像化
  const canvas = await html2canvas(clone,{
    scale:3,
    backgroundColor:"#111",
    width:clone.scrollWidth
  });

  document.body.removeChild(clone);

  // 保存 or 共有）
  canvas.toBlob(async blob=>{
    const file = new File([blob], "expedition-week.png", {type:"image/png"});

    if(navigator.share && navigator.canShare({files:[file]})){
      await navigator.share({files:[file]});
    }else{
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "expedition-week.png";
      link.click();
    }
  });
};
// ===== 回戦ごと画像保存 =====
window.saveMatchImage = async function(btn, matchNumber){
  const original = btn.closest(".week-block");
  const clone = original.cloneNode(true);
  clone.querySelectorAll("button").forEach(b => b.remove());
  const rows = clone.querySelectorAll("tr");
  let keep = false;
  rows.forEach(row=>{
    const match = row.getAttribute("data-match-number");
    if(match === String(matchNumber)){
      keep = true;
    }else if(match !== null){
      keep = false;
    }
    if(!keep && !row.querySelector("th")){
      row.remove();
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
    backgroundColor:"#111"
  });

  document.body.removeChild(clone);

  canvas.toBlob(async blob=>{
    const file = new File([blob], `match-${matchNumber}.png`, {type:"image/png"});

    if(navigator.share && navigator.canShare({files:[file]})){
      await navigator.share({files:[file]});
    }else{
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `match-${matchNumber}.png`;
      link.click();
    }
  });
};
