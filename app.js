import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc, onSnapshot, writeBatch, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===== Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyCflhFHEMcgqfkr6Dhp4SwlC1A8dmcMwWE",
  authDomain: "expedition-management-date.firebaseapp.com",
  projectId: "expedition-management-date",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== データ =====
let players = [];
let playerDocs = [];
let editIndex = null;

// ===== UI状態（再描画されても消えないように保持）=====
let clanoutOpen = false;           // クラン外の開閉状態
let openWeekIds = new Set();       // 開いている週ブロックのdocId
let expeditionFirstLoad = true;    // 初回ロードかどうか（最新週を自動で開くため）
let openTagEditKey = null;         // 編集中の火力内訳セル（docId|matchNumber|playerName）


// ===== ページ切替 =====
window.showPage = async function(n){
  const page1 = document.getElementById("captureArea");
  const page2 = document.getElementById("page2");
  const page3 = document.getElementById("page3");
  const topButtons = document.getElementById("topButtons");

  page1.style.display = (n === 1) ? "block" : "none";
  page2.style.display = (n === 2) ? "block" : "none";
  page3.style.display = (n === 3) ? "block" : "none";
  topButtons.style.display = (n === 1) ? "flex" : "none";

  if(n === 3) renderRuneSettings();
};

// ===== モーダル =====
window.openEditor = function(){
  document.body.classList.add("modal-open");
  document.getElementById("editor").style.display = "block";
  document.getElementById("modeIndicator").innerText = "追加モード";

  document.querySelectorAll("#editor input").forEach(i=>i.value="");
  document.querySelectorAll("#editor select").forEach(s=>s.selectedIndex=0);
  document.getElementById("runeContainer").innerHTML = "";
  editIndex = null;
};

window.closeEditor = function(){
  document.body.classList.remove("modal-open");
  document.getElementById("editor").style.display = "none";
  document.getElementById("modeIndicator").innerText = "通常モード";
};

// ===== トースト通知 =====
let toastTimer = null;
function showToast(msg){
  const el = document.getElementById("toast");
  if(!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove("show"), 2200);
}

// ===== ルーン(種類と効果は設定画面で管理・Firestoreに保存）=====
// 初回のみ、この内容でFirestoreに初期データを作成する（鋭利・アロレも通常のルーンとして統合）
const defaultRuneOptions = {
  鋭利: ["跳ね返り","主武器up","メイン会心率up","クリダメUP"],
  アロレ: ["固有","主武器UP","メイン会心ダメUP","クリダメ軽減"],
  炎毒の印: ["エレダメup","エレ会心率up","固有","クリダメup"],
  氷雷の印: ["エレダメup","エレ会心率up","固有","クリダメup"],
  ドラスト: ["キャノドラ"],
  苦痛の輪: ["サークルダメup","サークル会心ダメup","固有","クリダメ軽減"],
  炎毒の触: ["エレダメup","エレ会心ダメup","固有","クリダメ軽減"],
  氷雷の触: ["エレダメup","エレ会心ダメup","固有","クリダメ軽減"],
  ストポショ: ["無敵効果"]
};
let runeOptions = {}; // 実データはsubscribeRuneOptions()でFirestoreから読み込む

function subscribeRuneOptions(){
  onSnapshot(doc(db,"settings","runeOptions"), (snap)=>{
    if(snap.exists()){
      const data = snap.data();
      runeOptions = data.options || {};

      // 旧仕様（鋭利・アロレが固定欄だった頃）からの移行：一度だけ自動で追加する
      if(!data.migratedFixedRunes){
        if(!runeOptions["鋭利"]) runeOptions["鋭利"] = [...defaultRuneOptions["鋭利"]];
        if(!runeOptions["アロレ"]) runeOptions["アロレ"] = [...defaultRuneOptions["アロレ"]];
        setDoc(doc(db,"settings","runeOptions"), { options: runeOptions, migratedFixedRunes: true });
      }
    }else{
      // 初回だけ、これまでの固定リストで初期化
      runeOptions = { ...defaultRuneOptions };
      setDoc(doc(db,"settings","runeOptions"), { options: runeOptions, migratedFixedRunes: true });
    }
    refreshOpenRuneSelects();
    renderRuneSettings();
  });
}

async function saveRuneOptions(){
  await setDoc(doc(db,"settings","runeOptions"), { options: runeOptions, migratedFixedRunes: true }, { merge: true });
}

// 編集モーダルが開いた状態でルーン種類が更新された場合に、
// 表示中の「ルーン」プルダウンの中身を最新化する
function refreshOpenRuneSelects(){
  document.querySelectorAll("#runeContainer .rune-row .rune-name").forEach(sel=>{
    const current = sel.value;
    sel.innerHTML = Object.keys(runeOptions).map(n=>`<option>${n}</option>`).join("");
    if(Object.keys(runeOptions).includes(current)){
      sel.value = current;
    }
    const eSel = sel.closest(".rune-row").querySelector(".rune-e");
    updateEnchant(sel, eSel);
  });
}

function updateEnchant(nameSelect, enchantSelect, currentEffect){
  const effects = runeOptions[nameSelect.value] || [];
  let list = effects;
  if(currentEffect && !effects.includes(currentEffect)){
    list = [currentEffect, ...effects]; // 設定から消えた過去の効果もデータ保護のため一時表示
  }
  enchantSelect.innerHTML = list.map(e=>`<option>${e}</option>`).join("");
  if(currentEffect) enchantSelect.value = currentEffect;
}

// ===== 設定ページ：ルーン管理 =====
function renderRuneSettings(){
  const container = document.getElementById("runeSettingsContainer");
  if(!container) return;

  const names = Object.keys(runeOptions);
  if(names.length === 0){
    container.innerHTML = `<p class="no-effect">まだルーン種類がありません。上のフォームから追加してください。</p>`;
    return;
  }

  container.innerHTML = names.map(name=>{
    const effects = runeOptions[name] || [];
    return `
    <div class="rune-type-card">
      <div class="rune-type-card-header">
        <h4>${name}</h4>
        <button class="btn-delete-type" onclick="deleteRuneType('${escapeForAttr(name)}')">種類ごと削除</button>
      </div>
      <div class="rune-effect-chips">
        ${
          effects.length
          ? effects.map(e=>`
            <span class="rune-effect-chip">
              ${e}
              <button onclick="deleteRuneEffect('${escapeForAttr(name)}','${escapeForAttr(e)}')" title="削除">✕</button>
            </span>
          `).join("")
          : `<span class="no-effect">効果が未登録です</span>`
        }
      </div>
      <div class="add-effect-row">
        <input placeholder="新しい効果を追加" id="effectInput-${cssKey(name)}">
        <button onclick="addRuneEffect('${escapeForAttr(name)}')">追加</button>
      </div>
    </div>
    `;
  }).join("");
}

function escapeForAttr(str){
  return String(str).replace(/'/g, "\\'");
}
function cssKey(str){
  // id属性に使えるよう、日本語文字列を安全なキーに変換
  return encodeURIComponent(str).replace(/[^a-zA-Z0-9]/g,"");
}

window.addRuneType = async function(){
  const input = document.getElementById("newRuneTypeName");
  const name = input.value.trim();
  if(!name){
    showToast("ルーン名を入力してください");
    return;
  }
  if(runeOptions[name]){
    showToast("すでに同じ名前のルーンがあります");
    return;
  }
  runeOptions[name] = [];
  await saveRuneOptions();
  input.value = "";
  showToast(`「${name}」を追加しました`);
};

window.deleteRuneType = async function(name){
  if(!confirm(`「${name}」を削除しますか？（このルーンを使っているプレイヤーの表示名は残ります）`)) return;
  delete runeOptions[name];
  await saveRuneOptions();
  showToast(`「${name}」を削除しました`);
};

window.addRuneEffect = async function(name){
  const input = document.getElementById(`effectInput-${cssKey(name)}`);
  const effect = input.value.trim();
  if(!effect){
    showToast("効果を入力してください");
    return;
  }
  if(!runeOptions[name]) runeOptions[name] = [];
  if(runeOptions[name].includes(effect)){
    showToast("すでに同じ効果があります");
    return;
  }
  runeOptions[name].push(effect);
  await saveRuneOptions();
  showToast(`効果「${effect}」を追加しました`);
};

window.deleteRuneEffect = async function(name, effect){
  if(!runeOptions[name]) return;
  runeOptions[name] = runeOptions[name].filter(e=>e!==effect);
  await saveRuneOptions();
  showToast(`効果「${effect}」を削除しました`);
};

window.addRune = function(rune = null){
  if(!rune){
    if(Object.keys(runeOptions).length === 0){
      showToast("設定画面でルーンの種類を先に追加してください");
      return;
    }
    rune = { name: Object.keys(runeOptions)[0], q:"none", e:"" };
  }

  // 設定から削除済みの過去データでも表示だけは維持する（データ保護）
  const nameOptions = (rune.name && !Object.keys(runeOptions).includes(rune.name))
    ? [rune.name, ...Object.keys(runeOptions)]
    : Object.keys(runeOptions);

  const div = document.createElement("div");
  div.className = "rune-row";
  div.innerHTML = `
    <select class="rune-name">
      ${nameOptions.map(n=>`<option>${n}</option>`).join("")}
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
  nameSel.value = rune.name || nameOptions[0];
  qSel.value = rune.q || "none";
  updateEnchant(nameSel, eSel, rune.e);
  nameSel.onchange = () => updateEnchant(nameSel, eSel);
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
    updatedAt: editIndex !== null ? players[editIndex].updatedAt || "" : "",
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
    showToast("名前と戦力必須");
    return;
  }
  
  if(editIndex===null){
    await addDoc(collection(db,"players"), p);
  }else{
    await updateDoc(doc(db,"players",playerDocs[editIndex]), p);
    players[editIndex]=p;
    editIndex=null;
  }

  closeEditor();
  render();
  showToast("保存しました");
};

// ===== 編集 =====
window.editPlayer = function(order){
  const i = players.findIndex(p => p.order === order);
  if(i === -1) return;

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
  (p.runes || []).forEach(r=> addRune(r));
};

// ===== 削除 =====
window.deletePlayer = async function(order){
  const i = players.findIndex(p => p.order === order);
  if(i === -1) return;

  if(!confirm("削除しますか？")) return;

  await deleteDoc(doc(db,"players",playerDocs[i]));
  players.splice(i,1);
  playerDocs.splice(i,1);

  render(); // ← ついでにこれも追加
  showToast("削除しました");
};
  

// ===== 画像保存 =====
window.saveTableImage = async function(){
  const original = document.getElementById("captureArea");
  const clone = original.cloneNode(true);
  clone.querySelectorAll(".update-btn, .update-time").forEach(el => el.remove());
  const rows = clone.querySelectorAll("tr");
  let hide = false;
  rows.forEach(row=>{
    if(row.classList.contains("lane-header")){
      if(
        row.innerText.includes("控え") ||
        row.innerText.includes("引退")
      ){
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
  const y = window.scrollY;
  const body=document.getElementById("playerBody");
  body.innerHTML="";
  const total = 8;
  const laneNames={1:"レーン1",2:"レーン2",3:"レーン3",0:"控え","-1":"クラン外"};

  [1,2,3,0,-1].forEach(l=>{
    const list=players.filter(p=>p.lane===l);
    if(!list.length)return;
    
    const tr=document.createElement("tr");
    tr.className="lane-header";
    if(l === -1){
      tr.classList.add("clanout-header");
    }
    if(l === 0 || l === -1){
      tr.innerHTML = `<td colspan="11">${laneNames[l]} (${list.length})</td>`;
    }else{
      tr.innerHTML = `<td colspan="11">${laneNames[l]} (${list.length} / ${total})</td>`;
    }
    
    body.appendChild(tr);
    list.sort((a,b)=>a.order - b.order);
    // クラン外は前回の開閉状態を維持（毎回勝手に閉じないように）
    const hidden = (l === -1) && !clanoutOpen;
    tr.innerHTML = `
    <td colspan="11" class="${l === -1 ? 'toggle-clanout' : ''}">
    ${laneNames[l]} ${
      (l === 0 || l === -1)
      ? `(${list.length})`
      : `(${list.length} / ${total})`
    }
    ${l === -1 ? (clanoutOpen ? ' ▲' : ' ▼') : ''}
    </td>
    `;
    
    list.forEach(p=>{
      const i=players.indexOf(p);
      const row=document.createElement("tr");
      if(p.lane === -1){
        row.classList.add("clanout-row");
      }
      if(hidden){
        row.style.display = "none";
      }
      if(p.lane === 1){
        row.classList.add("lane-1");
      }else if(p.lane === 2){
        row.classList.add("lane-2");
      }else if(p.lane === 3){
        row.classList.add("lane-3");
      }
      row.innerHTML=`
      <td class="name-cell">
      <div class="player-name">${p.name}</div>
      <div class="update-row">
      <button class="update-btn" onclick="updatePlayer(${p.order})">更新</button>
      ${p.updatedAt ? `<span class="update-time">${p.updatedAt}</span>` : ""}
      </div>
      </td>
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
        <td><div class="rune-list">${(p.runes||[]).map(r=>runeHTML(r.name,r.q,r.e)).join("")}</div></td>
        <td>${p.formation}</td>
        <td>${relicBuff(p.mythic,p.legend)}</td>
        <td>
        <button onclick="moveUp(${p.order})">↑</button>
        <button onclick="moveDown(${p.order})">↓</button>
        </td>
        <td><button onclick="editPlayer(${p.order})">編集</button></td>
        <td><button onclick="deletePlayer(${p.order})">削除</button></td>
      `;
      body.appendChild(row);
    });
  });
  // 再描画でスクロール位置が飛ばないように復元
  window.scrollTo(0, y);
}
// ===== クラン外開閉処理 =====
document.addEventListener("click", function(e){

  const toggle = e.target.closest(".toggle-clanout");
  if(!toggle) return;

  clanoutOpen = !clanoutOpen;

  const hiddenRows = document.querySelectorAll(".clanout-row");
  hiddenRows.forEach(row=>{
    row.style.display = clanoutOpen ? "" : "none";
  });

  toggle.innerHTML = toggle.innerHTML.includes("▼")
    ? toggle.innerHTML.replace("▼","▲")
    : toggle.innerHTML.replace("▲","▼");

});
// ===== 初期ロード =====
function subscribePlayers(){

  onSnapshot(collection(db,"players"), (snap)=>{

    players = [];
    playerDocs = [];

    snap.forEach(d=>{
      players.push({
        id: d.id,
        ...d.data()
      });

      playerDocs.push(d.id);
    });

    // order重複防止
    const used = new Set();

    players.forEach((p,i)=>{
      if(p.order === undefined){
        p.order = i;
      }

      while(used.has(p.order)){
        p.order += 1;
      }

      used.add(p.order);
    });

    render();
  });
}


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
  "精霊": "#ff85c0",
  "植物の守り手": "#389e0d",
  "その他": "#8c8c8c"
};
const damageShortNames = {
  "メイン武器": "メイン",
  "エレメント": "エレ",
  "ストライク": "スト",
  "植物の守り手": "植物"
};

window.addMatch = async function(matchNumber){
  if(players.length === 0){
  showToast("プレイヤーが読み込まれていません。ページ1を開いてください");
  return;
}
  const date = document.getElementById("weekDate").value;
  if(!date) return showToast("日付を選択して");
  const matchPlayers = players
  .filter(p => p.lane >= 1 && p.lane <= 3)
  .sort((a,b)=>a.order - b.order)
  .map(p=>({
      name: p.name,
      lane: p.lane,
      style: p.range, // ←画像に合わせて戦術じゃなく距離に変更OK
      damageTypes: []
    }));
  const snap = await getDocs(query(collection(db,"expeditions"), where("date","==",date)));
  const existing = snap.docs[0];

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

};
// ===== 指定週に回戦追加（強化版）=====
window.addMatchToWeek = async function(docId, matchNumber){

  const ref = doc(db, "expeditions", docId);
  const target = await getDoc(ref);

  if(!target.exists()) return;

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
  showToast(`${matchNumber}回戦を追加しました`);
};
// ===== 週保存（1回戦のみ作成）=====
window.saveWeek = async function(){
  if(players.length === 0){
    showToast("プレイヤーが読み込まれていません。ページ1を開いてください");
    return;
  }
  const date = document.getElementById("weekDate").value;
  if(!date) return showToast("日付を選択して");
  
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
  const snap = await getDocs(query(collection(db,"expeditions"), where("date","==",date)));
  const existing = snap.docs[0];
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
  showToast("週を保存しました");
};

  // 2ページ目データ削除
window.deleteMatch = async function(matchNumber){
  const date = document.getElementById("weekDate").value;
if(!date) return showToast("日付を選択して");
  const snap = await getDocs(query(collection(db,"expeditions"), where("date","==",date)));
  const docSnap = snap.docs[0];
  if(!docSnap){
    showToast("この週のデータがありません");
    return;
  }
  const data = docSnap.data();
  data.matches = data.matches.filter(m=>m.matchNumber !== matchNumber);
  await updateDoc(doc(db,"expeditions",docSnap.id), data);
};


// ===== 2ページ目表示032121更新 =====

// 表示（横テーブル＋レーン区切り）
function subscribeExpeditions(){
  onSnapshot(collection(db,"expeditions"), (snap)=>{
    const container = document.getElementById("expeditionContainer");
    const y = window.scrollY;
    container.innerHTML = "";
    const docs = snap.docs.sort(
      (a,b)=> new Date(b.data().date) - new Date(a.data().date)
    );
    // 初回ロード時だけ最新週を自動で開く。以降はユーザーの開閉状態を維持する。
    if(expeditionFirstLoad){
      if(docs[0]) openWeekIds.add(docs[0].id);
      expeditionFirstLoad = false;
    }
    docs.forEach((d,index)=>{
      const exp = d.data();
    const weekDiv = document.createElement("div");
    weekDiv.className = "week-block";
    const header = document.createElement("div");

header.innerHTML = `
  <div class="week-header-row date-row">
    <h3>${formatRange(exp.date)}</h3>
    <button class="btn-save" onclick="saveWeekImage(this)">週全体保存📷</button>
    <button class="btn-save" onclick="saveMatchImage(this,1)">1回戦保存📷</button>
    <button class="btn-save" onclick="saveMatchImage(this,2)">2回戦保存📷</button>
    <button class="btn-save" onclick="saveMatchImage(this,3)">3回戦保存📷</button>
  </div>
  <div class="week-header-row add-row">
    <button class="btn-add" onclick="addMatchToWeek('${d.id}',1)">1回戦追加🖋</button>
    <button class="btn-add" onclick="addMatchToWeek('${d.id}',2)">2回戦追加🖋</button>
    <button class="btn-add" onclick="addMatchToWeek('${d.id}',3)">3回戦追加🖋</button>
  </div>
  <div class="week-header-row delete-row">
    <button class="btn-delete" onclick="deleteMatchByWeek('${d.id}',1)">1回戦削除</button>
    <button class="btn-delete" onclick="deleteMatchByWeek('${d.id}',2)">2回戦削除</button>
    <button class="btn-delete" onclick="deleteMatchByWeek('${d.id}',3)">3回戦削除</button>
    <button class="btn-delete" onclick="deleteWeek('${d.id}')">週ごと削除</button>
  </div>
`;
    header.style.cursor = "pointer";

    const content = document.createElement("div");
    const isOpen = openWeekIds.has(d.id);
    if(!isOpen){
      content.style.display = "none";
    }
    // 閉じてる週はボタン非表示
    if(!isOpen){
      header.querySelectorAll("button").forEach(btn => {
        btn.style.display = "none";
      });
    }
    header.onclick = (e) => {
      const willOpen = content.style.display === "none";
      content.style.display = willOpen ? "block" : "none";
      header.querySelectorAll("button").forEach(btn => {
        btn.style.display = willOpen ? "inline-block" : "none";
      });
      if(willOpen){
        openWeekIds.add(d.id);
      }else{
        openWeekIds.delete(d.id);
      }
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
      header1 += `
      <th colspan="3">
      ${mn}回戦<br>
      <div class="lane-grid">
      <span class="row-title no-export">更新</span>
      <button class="lane-btn lane1" onclick="event.stopPropagation(); resetLane('${d.id}',${mn},1)">レーン1</button>
      <button class="lane-btn lane2" onclick="event.stopPropagation(); resetLane('${d.id}',${mn},2)">レーン2</button>
      <button class="lane-btn lane3" onclick="event.stopPropagation(); resetLane('${d.id}',${mn},3)">レーン3</button>
      </div>
      </th>
      `;
      header2 += `
      <th>名前</th>
      <th>戦術</th>
      <th>火力内訳</th>
      `;
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
<td data-match-number="${mn}">${p?.name || ""}</td>

<td data-match-number="${mn}">
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
            ${damageShortNames[type] || type}
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

    // 火力内訳を編集中だった場合はそのセルを再度開いた状態に戻す
    if(openTagEditKey){
      const target = Array.from(
        container.querySelectorAll("td[data-doc-id]")
      ).find(td =>
        `${td.dataset.docId}|${td.dataset.matchNumber}|${td.dataset.playerName}` === openTagEditKey
      );
      if(target){
        const view = target.querySelector(".tag-view");
        if(view) window.enableEdit(view);
      }else{
        openTagEditKey = null;
      }
    }

    window.scrollTo(0, y);
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

  const container = parent.closest("td");
  if(container){
    openTagEditKey = `${container.dataset.docId}|${container.dataset.matchNumber}|${container.dataset.playerName}`;
  }
};
window.toggleDamageCheckbox = async function(docId, matchNumber, playerName, checkbox){
  const ref = doc(db,"expeditions",docId);
  const snap = await getDoc(ref);
  const docData = snap.data();
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
  ? active.map(t => `
      <span class="tag active tag-${t.size}" 
        style="background:${damageColors[t.type] || 'gray'};">
        ${damageShortNames[t.type] || t.type}
      </span>
    `).join("")
  : '<span class="no-tag">未設定</span>';

  // Firestore 更新
  const ref = doc(db,"expeditions",docId);
  const snap = await getDoc(ref);
  const docData = snap.data();
  const match = docData.matches.find(m=>m.matchNumber === matchNumber);
  const player = match.players.find(p=>p.name === playerName);

  player.damageTypes = active; // ここでサイズ反映
  await updateDoc(ref, docData);

  editDiv.style.display = "none";
  viewDiv.style.display = "block";
  openTagEditKey = null;
};

// クリックで外側を閉じる処理はそのまま
document.addEventListener("click", function(e){
  if(e.target.closest(".tag-edit") || e.target.closest(".tag-view")) return;
  document.querySelectorAll(".tag-edit").forEach(edit => {
    edit.style.display = "none";
    const view = edit.previousElementSibling;
    if(view) view.style.display = "block";
  });
  openTagEditKey = null;
});

// ===== レーン単位リセット（←追加）=====
window.resetLane = async function(docId, matchNumber, lane){

  const ref = doc(db,"expeditions",docId);
  const snap = await getDoc(ref);
  const data = snap.data();

  const match = data.matches.find(m=>m.matchNumber === matchNumber);
  if(!match) return;

  // 指定レーン削除
  match.players = match.players.filter(p=>p.lane !== lane);

  // 最新playersから再生成
  const lanePlayers = players
    .filter(p=>p.lane === lane)
    .sort((a,b)=>a.order - b.order)
    .map(p=>({
      name: p.name,
      lane: p.lane,
      style: p.range,
      damageTypes: []
    }));

  match.players.push(...lanePlayers);

  await updateDoc(ref, data);

};

// 回戦削除（週指定）
window.deleteMatchByWeek = async function(docId, matchNumber){

  if(!confirm("この回戦を削除しますか？")) return;

  const ref = doc(db,"expeditions",docId);
  const snap = await getDoc(ref);
  const data = snap.data();

  data.matches = data.matches.filter(m=>m.matchNumber !== matchNumber);

  await updateDoc(ref, data);
};

// 週ごと削除
window.deleteWeek = async function(docId){

  if(!confirm("この週を全部削除しますか？")) return;

  await deleteDoc(doc(db,"expeditions",docId));
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
    showToast("金曜日を選択してください");
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
window.updatePlayer = async function(order){
  const i = players.findIndex(p => p.order === order);
  if(i === -1) return;

  const now = new Date().toLocaleDateString();

  players[i].updatedAt = now;

  await updateDoc(
    doc(db,"players",playerDocs[i]),
    players[i]
  );

  render();
};

// 1ページ目並べ替えの中身
// ===== 並び替え（上）=====
window.moveUp = async function(order){
  const target = players.find(p => p.order === order);
  if(!target) return;

  const sameLane = players
    .filter(p => p.lane === target.lane)
    .sort((a,b)=>a.order - b.order);

  const index = sameLane.findIndex(p => p.order === order);
  if(index <= 0) return;

  const a = sameLane[index];
  const b = sameLane[index - 1];

  // 入れ替え
  const temp = a.order;
  a.order = b.order;
  b.order = temp;

  // Firestore更新（1回の書き込みにまとめて再描画のチラつきを防ぐ）
  const batch = writeBatch(db);
  batch.update(doc(db,"players",a.id), { order: a.order });
  batch.update(doc(db,"players",b.id), { order: b.order });
  await batch.commit();
};
// ===== 並び替え（下）=====
window.moveDown = async function(order){
  const target = players.find(p => p.order === order);
  if(!target) return;

  const sameLane = players
    .filter(p => p.lane === target.lane)
    .sort((a,b)=>a.order - b.order);

  const index = sameLane.findIndex(p => p.order === order);
  if(index === sameLane.length - 1) return;

  const a = sameLane[index];
  const b = sameLane[index + 1];

  const temp = a.order;
  a.order = b.order;
  b.order = temp;

  const batch = writeBatch(db);
  batch.update(doc(db,"players",a.id), { order: a.order });
  batch.update(doc(db,"players",b.id), { order: b.order });
  await batch.commit();
};
// ===== 週ごと画像保存 =====
window.saveWeekImage = async function(btn){
  // 対象の週ブロック取得
  const original = btn.closest(".week-block");
  // クローン
  const clone = original.cloneNode(true);
  // 不要なボタン削除
  clone.querySelectorAll("button").forEach(b => b.remove());
  clone.querySelectorAll(".no-export").forEach(el => el.remove());
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
  clone.querySelectorAll(".no-export").forEach(el => el.remove());
  clone.querySelectorAll("td, th").forEach(cell=>{
  const match = cell.getAttribute("data-match-number");
  if(match && match !== String(matchNumber)){
    cell.style.display = "none";
  }
});
  clone.querySelectorAll("tr").forEach(row=>{
    const visibleTd = Array.from(row.querySelectorAll("td"))
      .some(td => td.style.display !== "none");

    if(!visibleTd && !row.querySelector("th")){
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

subscribePlayers();
subscribeExpeditions();
subscribeRuneOptions();
