import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
getFirestore,
collection,
addDoc,
getDocs,
doc,
updateDoc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

let players=[]
let playerDocs=[]
let editIndex=null

const PASSWORD="1234"

window.unlockEdit=function(){

const p=prompt("パスワード")

if(p===PASSWORD){

document.getElementById("editor").style.display="block"

}

}

function relicBuff(m,l){

return Number((m*0.25 + l*0.025).toFixed(3))

}

function runeHTML(name,quality,enchant){

if(quality==="none")return ""

const cls=quality==="mythic"?"rune rune-mythic":"rune rune-legend"

return `<span class="${cls}">${name}(${enchant})</span>`

}

function render(){

const body=document.getElementById("playerBody")
body.innerHTML=""

players.forEach((p,i)=>{

let rune=
runeHTML("鋭利",p.sharpQ,p.sharpE)+
runeHTML("アロレ",p.arrowQ,p.arrowE)

let tr=document.createElement("tr")

tr.innerHTML=`

<td>${p.name}</td>
<td>${p.power}</td>
<td>${p.range}/${p.style}</td>
<td>${p.gear} (${p.chaos})</td>
<td>${p.hero}</td>
<td>${rune}</td>
<td>${p.formation}</td>
<td>${relicBuff(p.mythic,p.legend)}</td>
<td><button onclick="editPlayer(${i})">編集</button></td>

`

body.appendChild(tr)

})

}

window.editPlayer=function(i){

const p=players[i]

editIndex=i

document.getElementById("name").value=p.name
document.getElementById("power").value=p.power
document.getElementById("range").value=p.range
document.getElementById("style").value=p.style
document.getElementById("gear").value=p.gear
document.getElementById("chaos").value=p.chaos
document.getElementById("hero").value=p.hero

document.getElementById("sharpQuality").value=p.sharpQ
document.getElementById("sharpEnchant").value=p.sharpE

document.getElementById("arrowQuality").value=p.arrowQ
document.getElementById("arrowEnchant").value=p.arrowE

document.getElementById("formation").value=p.formation
document.getElementById("mythic").value=p.mythic
document.getElementById("legend").value=p.legend

}

window.savePlayer=async function(){

let p={

name:document.getElementById("name").value,
power:Number(document.getElementById("power").value),

range:document.getElementById("range").value,
style:document.getElementById("style").value,

gear:document.getElementById("gear").value,
chaos:document.getElementById("chaos").value,

hero:document.getElementById("hero").value,

sharpQ:document.getElementById("sharpQuality").value,
sharpE:document.getElementById("sharpEnchant").value,

arrowQ:document.getElementById("arrowQuality").value,
arrowE:document.getElementById("arrowEnchant").value,

formation:document.getElementById("formation").value,

mythic:Number(document.getElementById("mythic").value),
legend:Number(document.getElementById("legend").value)

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

}

async function load(){

const querySnapshot=await getDocs(collection(db,"players"))

querySnapshot.forEach(d=>{

players.push(d.data())
playerDocs.push(d.id)

})

render()

}

window.sortByPower=function(){

players.sort((a,b)=>b.power-a.power)
render()

}

window.sortByRelic=function(){

players.sort((a,b)=>relicBuff(b.mythic,b.legend)-relicBuff(a.mythic,a.legend))
render()

}

window.saveTableImage=function(){

const table=document.querySelector("#playerTable")

html2canvas(table,{scale:2}).then(canvas=>{

const link=document.createElement("a")
link.download="clan_table.png"
link.href=canvas.toDataURL()
link.click()

})

}

load()
