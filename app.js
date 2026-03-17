import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// データ管理
let players = [];
let playerDocs = [];
let editIndex = null;
const PASSWORD="1234";

// 編集画面表示
window.unlockEdit = function(){
  const p = prompt("パスワード");
  if(p===PASSWORD){
    document.getElementById("editor").style.display="block";
  }
}

// 遠征チェック切替
window.toggleExpedition = function(i){
  players[i].expedition = !players[i].expedition;
  render();
}

// 聖物計算
function relicBuff(m,l){ return Number((m*0.25 + l*0.025).toFixed(3)); }

// ルーン表示
function runeHTML(name,quality,enchant){
  if(quality==="none")return "";
  const cls=quality==="mythic"?"rune rune-mythic":"rune rune-legend";
  return `<span class="${cls}">${name}(${enchant})</span>`;
}

// 装備表示
function gearText(gear,chaosArr){
  if(!chaosArr || chaosArr.length===0) return gear;
  return `${gear}/${chaosArr.join(',')}カオス`;
}

// 編集保存
window.savePlayer = async function(){
  const chaosSelect = Array.from(document.getElementById("chaos").selectedOptions).map(o=>o.value);
  let p = {
    name:document.getElementById("name").value,
    power:Number(document.getElementById("power").value),
    range:document.getElementById("range").value,
    style:document.getElementById("style").value,
    gear:document.getElementById("gear").value,
    chaos:chaosSelect,
    hero:document.getElementById("hero").value,
    sharpQ:document.getElementById("sharpQuality").value,
    sharpE:document.getElementById("sharpEnchant").value,
    arrowQ:document.getElementById("arrowQuality").value,
    arrowE:document.getElementById("arrowEnchant").value,
    formation:document.getElementById("formation").value,
    mythic:Number(document.getElementById("mythic").value),
    legend:Number(document.getElementById("legend").value),
    lane:Number(document.getElementById("lane").value),
    expedition:false
  }

  try {
    if(editIndex===null){
      const docRef = await addDoc(collection(db,"players"),p);
      players.push(p);
      playerDocs.push(docRef.id);
      console.log("保存成功:", docRef.id);
    } else {
      const ref = doc(db,"players",playerDocs[editIndex]);
      await updateDoc(ref,p);
      players[editIndex] = p;
      console.log("更新成功:", playerDocs[editIndex]);
      editIndex=null;
    }
    closeEditor();
    render();
  } catch(e) {
    console.error("Firestore保存エラー:", e);
    alert("保存に失敗しました。コンソールを確認してください。");
  }
}

// 編集画面閉じる
window.closeEditor=function(){
  document.getElementById("editor").style.display="none";
  editIndex=null;
}

// 編集画面呼び出し
window.editPlayer = function(i){
  const p = players[i];
  editIndex = i;

  document.getElementById("name").value=p.name;
  document.getElementById("power").value=p.power;
  document.getElementById("range").value=p.range;
  document.getElementById("style").value=p.style;
  document.getElementById("gear").value=p.gear;
  document.getElementById("hero").value=p.hero;
  document.getElementById("sharpQuality").value=p.sharpQ;
  document.getElementById("sharpEnchant").value=p.sharpE;
  document.getElementById("arrowQuality").value=p.arrowQ;
  document.getElementById("arrowEnchant").value=p.arrowE;
  document.getElementById("formation").value=p.formation;
  document.getElementById("mythic").value=p.mythic;
  document.getElementById("legend").value=p.legend;
  document.getElementById("lane").value=p.lane;

  // chaosマルチ選択反映
  Array.from(document.getElementById("chaos").options).forEach(opt=>opt.selected=p.chaos.includes(opt.value));

  document.getElementById("editor").style.display="block";
}

// プレイヤー削除
window.deletePlayer = async function(i){
  if(!confirm("削除しますか？")) return;
  const ref = doc(db,"players",playerDocs[i]);
  await deleteDoc(ref);
  players.splice(i,1);
  playerDocs.splice(i,1);
  render();
}

// 画像保存
window.saveTableImage = function(){
  const table = document.querySelector(".table-container");
  html2canvas(table,{scale:3}).then(canvas=>{
    const link = document.createElement("a");
    link.download="archer_table.png";
    link.href=canvas.toDataURL("image/png");
    link.click();
  });
}

// レーンごとに分けて表示
function render(){
  const body=document.getElementById("playerBody");
  body.innerHTML="";

  for(let laneNum=1; laneNum<=3; laneNum++){
    const lanePlayers = players.filter(p=>p.lane===laneNum);

    if(lanePlayers.length===0) continue;

    // レーンヘッダー
    const trLane = document.createElement("tr");
    trLane.classList.add("lane-header");
    trLane.innerHTML=`<td colspan="12">レーン${laneNum} (${lanePlayers.length}/8)</td>`;
    body.appendChild(trLane);

    // デフォルトは戦力降順
    lanePlayers.sort((a,b)=>b.power-a.power);

    lanePlayers.forEach((p,i)=>{
      const tr = document.createElement("tr");
      tr.innerHTML=`
        <td>${p.name}</td>
        <td>${(p.power>=1000000? (p.power/1000000).toFixed(1)+"M":p.power)}</td>
        <td>${p.range}/${p.style}</td>
        <td>${gearText(p.gear,p.chaos)}</td>
        <td>${p.hero}</td>
        <td>${runeHTML("鋭利",p.sharpQ,p.sharpE)+runeHTML("アロレ",p.arrowQ,p.arrowE)}</td>
        <td>${p.formation}</td>
        <td>${relicBuff(p.mythic,p.legend)}</td>
        <td>${p.lane}</td>
        <td><input type="checkbox" onchange="toggleExpedition(${players.indexOf(p)})" ${p.expedition?"checked":""}></td>
        <td><button onclick="editPlayer(${players.indexOf(p)})">編集</button></td>
        <td><button onclick="deletePlayer(${players.indexOf(p)})">削除</button></td>
      `;
      body.appendChild(tr);
    });
  }
}

// レーン内ソート
window.sortLane = function(type){
  for(let laneNum=1; laneNum<=3; laneNum++){
    const lanePlayers = players.filter(p=>p.lane===laneNum);
    if(type==="power"){
      lanePlayers.sort((a,b)=>b.power-a.power);
    }else if(type==="relic"){
      lanePlayers.sort((a,b)=>relicBuff(b.mythic,b.legend)-relicBuff(a.mythic,a.legend));
    }else if(type==="name"){
      lanePlayers.sort((a,b)=>a.name.localeCompare(b.name));
    }
    // 元配列にも反映
    lanePlayers.forEach(p=>{
      const idx = players.findIndex(x=>x===p);
      if(idx>-1) players[idx]=p;
    });
  }
  render();
}

// データロード
async function load(){
  try{
    const querySnapshot = await getDocs(collection(db,"players"));
    querySnapshot.forEach(d=>{
      players.push(d.data());
      playerDocs.push(d.id);
    });
    console.log("ロード完了:", players.length,"件");
    render();
  } catch(e){
    console.error("Firestoreロードエラー:", e);
  }
}

load();
