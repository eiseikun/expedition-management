import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ===============================
Firebase設定
=============================== */
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

/* ===============================
プレイヤー情報
=============================== */
let players = [];
let playerDocs = [];
let editIndex = null;
const PASSWORD="1234";

/* ===============================
編集モード切替
=============================== */
window.unlockEdit = function(){
  const p=prompt("パスワード")
  const editor = document.getElementById("editor")
  const modeIndicator = document.getElementById("modeIndicator")
  if(p===PASSWORD){
    editor.style.display = editor.style.display==="block"?"none":"block"
    document.body.classList.toggle("mode-edit")
    modeIndicator.textContent = editor.style.display==="block"?"編集モード":"通常モード"
  }
}

/* ===============================
遠征チェック
=============================== */
window.toggleExpedition = function(i){
  players[i].expedition = !players[i].expedition
}

/* ===============================
戦力表示 (M付き)
=============================== */
function powerView(val){
  if(val>=1000000) return (val/1000000).toFixed(1)+"M"
  if(val>=1000) return (val/1000).toFixed(1)+"k"
  return val
}

/* ===============================
聖物バフ
=============================== */
function relicBuff(m,l){
  return Number((m*0.25 + l*0.025).toFixed(3))
}

/* ===============================
ルーンHTML作成
=============================== */
function runeHTML(name,quality,enchant){
  if(quality==="none") return ""
  const cls = quality==="mythic"?"rune rune-mythic":"rune rune-legend"
  return `<span class="${cls}">${name}(${enchant})</span>`
}

/* ===============================
装備表示
=============================== */
function gearHTML(gear,chaosParts){
  if(!chaosParts || chaosParts.length===0) return gear
  return `${gear}/${chaosParts.join(",")}カオス`
}

/* ===============================
テーブル描画
=============================== */
function render(){
  const body=document.getElementById("playerBody")
  body.innerHTML=""
  players.forEach((p,i)=>{
    let rune = runeHTML("鋭利",p.sharpQ,p.sharpE) + runeHTML("アロレ",p.arrowQ,p.arrowE)
    let tr=document.createElement("tr")
    tr.innerHTML=`
<td>${p.name}</td>
<td>${powerView(p.power)}</td>
<td>${p.range}/${p.style}</td>
<td>${gearHTML(p.gear,p.chaosParts)}</td>
<td>${p.hero}</td>
<td>${rune}</td>
<td>${p.formation}</td>
<td>${relicBuff(p.mythic,p.legend)}</td>
<td>${p.lane||"-"}</td>
<td><input type="checkbox" onchange="toggleExpedition(${i})" ${p.expedition?"checked":""}></td>
<td><button onclick="editPlayer(${i})">編集</button></td>
<td><button onclick="deletePlayer(${i})">削除</button></td>
`
    body.appendChild(tr)
  })
}

/* ===============================
編集画面に反映
=============================== */
window.editPlayer=function(i){
  const p=players[i]
  editIndex=i
  document.getElementById("name").value = p.name
  document.getElementById("power").value = p.power
  document.getElementById("range").value = p.range
  document.getElementById("style").value = p.style
  document.getElementById("gear").value = p.gear
  document.getElementById("hero").value = p.hero
  document.getElementById("sharpQuality").value = p.sharpQ
  document.getElementById("sharpEnchant").value = p.sharpE
  document.getElementById("arrowQuality").value = p.arrowQ
  document.getElementById("arrowEnchant").value = p.arrowE
  document.getElementById("formation").value = p.formation
  document.getElementById("mythic").value = p.mythic
  document.getElementById("legend").value = p.legend
  document.getElementById("lane").value = p.lane||""

  const parts = p.chaosParts||[]
  document.getElementById("chaosWeapon").checked = parts.includes("武器")
  document.getElementById("chaosHelmet").checked = parts.includes("兜")
  document.getElementById("chaosArmor").checked = parts.includes("鎧")
  document.getElementById("chaosBoots").checked = parts.includes("靴")
  document.getElementById("chaosGloves").checked = parts.includes("手袋")
  document.getElementById("chaosAccessory").checked = parts.includes("アクセ")
}

/* ===============================
プレイヤー保存
=============================== */
window.savePlayer=async function(){
  const chaosParts=[]
  if(document.getElementById("chaosWeapon").checked) chaosParts.push("武器")
  if(document.getElementById("chaosHelmet").checked) chaosParts.push("兜")
  if(document.getElementById("chaosArmor").checked) chaosParts.push("鎧")
  if(document.getElementById("chaosBoots").checked) chaosParts.push("靴")
  if(document.getElementById("chaosGloves").checked) chaosParts.push("手袋")
  if(document.getElementById("chaosAccessory").checked) chaosParts.push("アクセ")

  const p={
    name: document.getElementById("name").value,
    power: Number(document.getElementById("power").value),
    range: document.getElementById("range").value,
    style: document.getElementById("style").value,
    gear: document.getElementById("gear").value,
    chaosParts: chaosParts,
    hero: document.getElementById("hero").value,
    sharpQ: document.getElementById("sharpQuality").value,
    sharpE: document.getElementById("sharpEnchant").value,
    arrowQ: document.getElementById("arrowQuality").value,
    arrowE: document.getElementById("arrowEnchant").value,
    formation: document.getElementById("formation").value,
    mythic: Number(document.getElementById("mythic").value),
    legend: Number(document.getElementById("legend").value),
    lane: document.getElementById("lane").value
  }

  if(editIndex===null){
    await addDoc(collection(db,"players"),p)
    players.push(p)
  }else{
    const ref=doc(db,"players",playerDocs[editIndex])
    await updateDoc(ref,p)
    players[editIndex]=p
    editIndex=null
  }
  render()
  closeEditor()
}

/* ===============================
編集画面閉じる
=============================== */
window.closeEditor=function(){
  document.getElementById("editor").style.display="none"
  editIndex=null
  document.body.classList.remove("mode-edit")
  document.getElementById("modeIndicator").textContent="通常モード"
}

/* ===============================
削除
=============================== */
window.deletePlayer=async function(i){
  if(!confirm("削除しますか？")) return
  const ref = doc(db,"players",playerDocs[i])
  await deleteDoc(ref)
  players.splice(i,1)
  playerDocs.splice(i,1)
  render()
}

/* ===============================
並び替え
=============================== */
window.sortByPower=function(){
  players.sort((a,b)=>b.power-a.power)
  render()
}
window.sortByRelic=function(){
  players.sort((a,b)=>relicBuff(b.mythic,b.legend)-relicBuff(a.mythic,a.legend))
  render()
}

/* ===============================
テーブル画像保存
=============================== */
window.saveTableImage=function(){
  const table = document.querySelector(".table-container")
  html2canvas(table,{scale:3}).then(canvas=>{
    const link = document.createElement("a")
    link.download = "expedition_table.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  })
}

/* ===============================
データロード
=============================== */
async function load(){
  const querySnapshot = await getDocs(collection(db,"players"))
  querySnapshot.forEach(d=>{
    players.push(d.data())
    playerDocs.push(d.id)
  })
  render()
}
load()
