import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc }

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

let players=[];
let playerDocs=[];
let editIndex=null;

function relicBuff(m,l){

return (m*0.25 + l*0.025).toFixed(3);

}

function powerText(v){

return Number(v).toFixed(2) + "M";

}

window.openEditor=function(){

document.getElementById("editor").style.display="block";

}

window.closeEditor=function(){

document.getElementById("editor").style.display="none";

editIndex=null;

}

window.savePlayer=async function(){

let p={

name:document.getElementById("name").value,
power:Number(document.getElementById("power").value),
range:document.getElementById("range").value,
style:document.getElementById("style").value,
gear:document.getElementById("gear").value,
hero:document.getElementById("hero").value,
formation:document.getElementById("formation").value,
mythic:Number(document.getElementById("mythic").value),
legend:Number(document.getElementById("legend").value),
lane:Number(document.getElementById("lane").value)

};

if(editIndex===null){

const ref=await addDoc(collection(db,"players"),p);

players.push(p);

playerDocs.push(ref.id);

}else{

const ref=doc(db,"players",playerDocs[editIndex]);

await updateDoc(ref,p);

players[editIndex]=p;

}

closeEditor();

render();

}

window.editPlayer=function(i){

editIndex=i;

let p=players[i];

document.getElementById("name").value=p.name;
document.getElementById("power").value=p.power;
document.getElementById("range").value=p.range;
document.getElementById("style").value=p.style;
document.getElementById("gear").value=p.gear;
document.getElementById("hero").value=p.hero;
document.getElementById("formation").value=p.formation;
document.getElementById("mythic").value=p.mythic;
document.getElementById("legend").value=p.legend;
document.getElementById("lane").value=p.lane;

openEditor();

}

window.deletePlayer=async function(i){

const ref=doc(db,"players",playerDocs[i]);

await deleteDoc(ref);

players.splice(i,1);
playerDocs.splice(i,1);

render();

}

window.sortPlayers=function(){

players.sort((a,b)=>b.power-a.power);

render();

}

window.screenshotMode=function(){

document.body.classList.toggle("screenshot-mode");

}

window.saveTableImage=async function(){

const table=document.querySelector(".table-container");

const canvas=await html2canvas(table,{scale:3});

canvas.toBlob(async blob=>{

const file=new File([blob],"expedition.png",{type:"image/png"});

if(navigator.share){

await navigator.share({files:[file]});

}else{

const link=document.createElement("a");

link.href=URL.createObjectURL(blob);

link.download="expedition.png";

link.click();

}

});

}

function render(){

const body=document.getElementById("playerBody");

body.innerHTML="";

const keyword=document.getElementById("search").value.toLowerCase();

for(let lane=1;lane<=4;lane++){

let lanePlayers=players.filter(p=>p.lane===lane && p.name.toLowerCase().includes(keyword));

let laneName=lane===4?"控え":"レーン"+lane;

let tr=document.createElement("tr");

tr.classList.add("lane-header");

tr.innerHTML=`<td colspan="10">${laneName} (${lanePlayers.length}${lane!==4?"/8":""})</td>`;

body.appendChild(tr);

lanePlayers.sort((a,b)=>b.power-a.power);

lanePlayers.forEach(p=>{

let i=players.indexOf(p);

let row=document.createElement("tr");

row.innerHTML=`

<td>${p.name}</td>
<td>${powerText(p.power)}</td>
<td>${p.range}/${p.style}</td>
<td>${p.gear}</td>
<td>${p.hero}</td>
<td>${p.formation}</td>
<td>${relicBuff(p.mythic,p.legend)}</td>
<td>${laneName}</td>
<td><button onclick="editPlayer(${i})">編集</button></td>
<td><button onclick="deletePlayer(${i})">削除</button></td>

`;

body.appendChild(row);

});

}

}

async function load(){

const snapshot=await getDocs(collection(db,"players"));

snapshot.forEach(docu=>{

players.push(docu.data());
playerDocs.push(docu.id);

});

render();

}

load();
