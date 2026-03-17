import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase
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

// データ
let players = [];
let playerDocs = [];
let editIndex = null;
const PASSWORD = "1234";

// 編集画面表示
window.unlockEdit = function(){
  const p = prompt("パスワード");
  if(p===PASSWORD){
    document.getElementById("editor").style.display="block";
    document.body.classList.add("mode-edit");
    document.getElementById("modeIndicator").textContent="編集画面";
  }
}

// 装備カオス表示
function getGearText(){
  const gear = document.getElementById("gear").value;
  const checkboxes = document.querySelectorAll("#gearChaosContainer input[type=checkbox]");
  const chaosParts = [];
  checkboxes.forEach(cb => { if(cb.checked) chaosParts.push(cb.value); });
  if(chaosParts.length===0) return gear;
  return gear + "/" + chaosParts.join(",");
}

// 聖物計算
function relicBuff(m,l){ return Number((m*0.25 + l*0.025).toFixed(3)); }

// ルーン表示
function runeHTML(name,quality,enchant){
  if(quality==="none") return "";
  const cls = quality==="mythic"?"rune rune-mythic":"rune rune-legend";
  return `<span class="${cls}">${name}(${enchant})</span>`;
}

// レンダリング
function render(){
  const body = document.getElementById("playerBody");
  body.innerHTML="";
  players.forEach((p,i)=>{
    const rune = runeHTML("鋭利",p.sharpQ,p.sharpE)+runeHTML("アロレ",p.arrowQ,p.arrowE);
    const tr = document.createElement("tr");
    tr.innerHTML=`
      <td>${p.name}</td>
      <td>${p.power>=1000000?(p.power/1000000).toFixed(1)+"M":p.power}</td>
      <td>${p.range}/${p.style}</td>
      <td>${p.gearText}</td>
      <td>${p.hero}</td>
      <td>${rune}</td>
      <td>${p.formation}</td>
      <td>${relicBuff(p.mythic,p.legend)}%</td>
      <td><input type="checkbox" onchange="toggleExpedition(${i})" ${p.expedition?"checked":""}></td>
      <td>${p.lane||""}</td>
      <td><button onclick="editPlayer(${i})">編集</button></td>
      <td><button onclick="deletePlayer(${i})">削除</button></td>
    `;
    body.appendChild(tr);
  });
}

// 編集
window.editPlayer=function(i){
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
  document.getElementById("lane").value=p.lane||"";
  // 装備カオス反映
  const chaosParts = p.gearText.split("/")[1]?.split(",")||[];
  document.querySelectorAll("#gearChaosContainer input[type=checkbox]").forEach(cb=>{
    cb.checked = chaosParts.includes(cb.value);
  });
  document.getElementById("editor").style.display="block";
  document.body.classList.add("mode-edit");
  document.getElementById("modeIndicator").textContent="編集画面";
}

// 保存
window.savePlayer=async function(){
  const gearText = getGearText();
  let p={
    name:document.getElementById("name").value,
    power:Number(document.getElementById("power").value),
    range:document.getElementById("range").value,
    style:document.getElementById("style").value,
    gear:document.getElementById("gear").value,
    gearText:gearText,
    hero:document.getElementById("hero").value,
    sharpQ:document.getElementById("sharpQuality").value,
    sharpE:document.getElementById("sharpEnchant").value,
    arrowQ:document.getElementById("arrowQuality").value,
    arrowE:document.getElementById("arrowEnchant").value,
    formation:document.getElementById("formation").value,
    mythic:Number(document.getElementById("mythic").value),
    legend:Number(document.getElementById("legend").value),
    lane:document.getElementById("lane").value,
    expedition:false
  };

  if(editIndex===null){
    const docRef = await addDoc(collection(db,"players"),p);
    players.push(p);
    playerDocs.push(docRef.id);
  }else{
    const ref = doc(db,"players",playerDocs[editIndex]);
    await updateDoc(ref,p);
    players[editIndex]=p;
    editIndex=null;
  }
  render();
  alert("保存しました");
  closeEditor();
}

// 閉じる
window.closeEditor=function(save=true){
  if(!save) alert("変更は保存されませんでした");
  document.getElementById("editor").style.display="none";
  editIndex=null;
  document.body.classList.remove("mode-edit");
  document.getElementById("modeIndicator").textContent="通常モード";
}

// 削除
window.deletePlayer = async function(i){
  if(!confirm("削除しますか？")) return;
  const ref = doc(db,"players",playerDocs[i]);
  await deleteDoc(ref);
  players.splice(i,1);
  playerDocs.splice(i,1);
  render();
}

// 遠征チェック
window.toggleExpedition=function(i){
  players[i].expedition=!players[i].expedition;
}

// 並び替え
window.sortByPower=function(){ players.sort((a,b)=>b.power-a.power); render(); }
window.sortByRelic=function(){ players.sort((a,b)=>relicBuff(b.mythic,b.legend)-relicBuff(a.mythic,a.legend)); render(); }

// 画像保存
window.saveTableImage=function(){
  const table = document.querySelector(".table-container");
  html2canvas(table,{scale:3}).then(canvas=>{
    const link = document.createElement("a");
    link.download="archer_table.png";
    link.href=canvas.toDataURL("image/png");
    link.click();
  });
}

// Firestore読み込み
async function load(){
  const querySnapshot=await getDocs(collection(db,"players"));
  querySnapshot.forEach(d=>{
    const data=d.data();
    players.push(data);
    playerDocs.push(d.id);
  });
  render();
}
load();
