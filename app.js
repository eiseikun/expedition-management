/* ===============================
Firebase 初期化
=============================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
getFirestore,
collection,
addDoc,
getDocs,
doc,
updateDoc,
deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
グローバル変数
=============================== */

let players=[]
let playerDocs=[]
let editIndex=null

const PASSWORD="1234"

/* ===============================
表示フォーマット
=============================== */

/* 戦力をM表示 */

function powerView(power){

return (power/1000000).toFixed(1)+"M"

}

/* 聖物バフ計算 */

function relicBuff(m,l){

return ((m*0.25 + l*0.025)*100).toFixed(2)+"%"

}

/* ===============================
編集モード
=============================== */

window.unlockEdit=function(){

const p=prompt("パスワード")

if(p===PASSWORD){

document.getElementById("editor").style.display="block"

document.getElementById("modeIndicator").innerText="編集モード"
document.getElementById("modeIndicator").className="mode-view mode-edit"

}

}

/* ===============================
閲覧モード
=============================== */

window.closeEditor=function(){

document.getElementById("editor").style.display="none"

document.getElementById("modeIndicator").innerText="通常モード"
document.getElementById("modeIndicator").className="mode-view"

editIndex=null

}

/* ===============================
プレイヤー表描画
=============================== */

function render(){

const body=document.getElementById("playerBody")

body.innerHTML=""

/* レーン順 */

const laneOrder=["1","2","3","控え"]

laneOrder.forEach(lane=>{

/* レーンタイトル */

let title=document.createElement("tr")

title.innerHTML=`
<td colspan="12" style="background:#333;font-weight:bold">
レーン ${lane}
</td>
`

body.appendChild(title)

/* プレイヤー表示 */

players.forEach((p,i)=>{

if(p.lane==lane){

let tr=document.createElement("tr")

tr.innerHTML=`

<td>${p.name}</td>

<td>${powerView(p.power)}</td>

<td>${p.range}/${p.style}</td>

<td>${p.gear}</td>

<td>${p.hero}</td>

<td>-</td>

<td>${p.formation}</td>

<td>${relicBuff(p.mythic,p.legend)}</td>

<td>${p.lane || "-"}</td>

<td>
<input type="checkbox"
onchange="toggleExpedition(${i})"
${p.expedition?"checked":""}>
</td>

<td>
<button onclick="editPlayer(${i})">編集</button>
</td>

<td>
<button onclick="deletePlayer(${i})">削除</button>
</td>

`

body.appendChild(tr)

}

})

})

}

/* ===============================
プレイヤー編集
=============================== */

window.editPlayer=function(i){

const p=players[i]

editIndex=i

document.getElementById("name").value=p.name
document.getElementById("power").value=p.power

document.getElementById("range").value=p.range
document.getElementById("style").value=p.style

document.getElementById("hero").value=p.hero
document.getElementById("lane").value=p.lane

document.getElementById("formation").value=p.formation

document.getElementById("mythic").value=p.mythic
document.getElementById("legend").value=p.legend

}

/* ===============================
プレイヤー保存
=============================== */

window.savePlayer=async function(){

let p={

name:document.getElementById("name").value,

power:Number(document.getElementById("power").value),

range:document.getElementById("range").value,
style:document.getElementById("style").value,

hero:document.getElementById("hero").value,

lane:document.getElementById("lane").value,

formation:document.getElementById("formation").value,

mythic:Number(document.getElementById("mythic").value),
legend:Number(document.getElementById("legend").value)

}

if(editIndex===null){

const docRef=await addDoc(collection(db,"players"),p)

playerDocs.push(docRef.id)

players.push(p)

}else{

const ref=doc(db,"players",playerDocs[editIndex])

await updateDoc(ref,p)

players[editIndex]=p

editIndex=null

}

render()

}

/* ===============================
遠征チェック
=============================== */

window.toggleExpedition = async function(i){

players[i].expedition = !players[i].expedition

const ref = doc(db,"players",playerDocs[i])

await updateDoc(ref,{
expedition:players[i].expedition
})

}

/* ===============================
プレイヤー削除
=============================== */

window.deletePlayer = async function(i){

if(!confirm("削除しますか？")) return

const ref = doc(db,"players",playerDocs[i])

await deleteDoc(ref)

players.splice(i,1)
playerDocs.splice(i,1)

render()

}

/* ===============================
戦力ソート
=============================== */

window.sortByPower=function(){

players.sort((a,b)=>b.power-a.power)

render()

}

/* ===============================
聖物ソート
=============================== */

window.sortByRelic=function(){

players.sort((a,b)=>{

return (b.mythic*0.25 + b.legend*0.025) -

(a.mythic*0.25 + a.legend*0.025)

})

render()

}

/* ===============================
画像保存
=============================== */

window.saveTableImage = function () {

const table = document.querySelector(".table-container")

html2canvas(table,{
scale:4,
backgroundColor:"#111"
})

.then(canvas => {

const link = document.createElement("a")

link.download = "expedition_table.png"

link.href = canvas.toDataURL("image/png")

link.click()

})

}

/* ===============================
データ読み込み
=============================== */

async function load(){

const querySnapshot=await getDocs(collection(db,"players"))

querySnapshot.forEach(d=>{

players.push(d.data())

playerDocs.push(d.id)

})

render()

}

load()
