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

let collapsed={1:false,2:false,3:false,4:false};

function relicBuff(m,l){
return (m*0.25 + l*0.025).toFixed(3);
}

function powerText(v){
return Number(v).toFixed(2)+"M";
}

window.openEditor=function(){
document.getElementById("editor").style.display="flex";
}

window.closeEditor=function(){
document.getElementById("editor").style.display="none";
editIndex=null;
}

window.savePlayer=async function(){

let p={
name:name.value,
power:Number(power.value),
range:range.value,
style:style.value,
gear:gear.value,
hero:hero.value,
formation:formation.value,
mythic:Number(mythic.value),
legend:Number(legend.value),
lane:Number(lane.value)
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

name.value=p.name;
power.value=p.power;
range.value=p.range;
style.value=p.style;
gear.value=p.gear;
hero.value=p.hero;
formation.value=p.formation;
mythic.value=p.mythic;
legend.value=p.legend;
lane.value=p.lane;

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

function playerMenu(i){

let action=prompt("edit または delete");

if(action==="edit") editPlayer(i);

if(action==="delete"){

if(confirm("削除しますか？")) deletePlayer(i);

}

}

function toggleLane(lane){
collapsed[lane]=!collapsed[lane];
render();
}

let dragIndex=null;

function setupDrag(row,i){

row.draggable=true;

row.addEventListener("dragstart",()=>{
dragIndex=i;
row.classList.add("dragging");
});

row.addEventListener("dragend",()=>{
row.classList.remove("dragging");
});

}

function setupLongPress(row,i){

let timer;

row.addEventListener("touchstart",()=>{
timer=setTimeout(()=>playerMenu(i),600);
});

row.addEventListener("touchend",()=>clearTimeout(timer));

row.addEventListener("mousedown",()=>{
timer=setTimeout(()=>playerMenu(i),600);
});

row.addEventListener("mouseup",()=>clearTimeout(timer));

}

function render(){

const body=playerBody;

body.innerHTML="";

const keyword=search.value.toLowerCase();

for(let lane=1;lane<=4;lane++){

let lanePlayers=players.filter(p=>p.lane===lane && p.name.toLowerCase().includes(keyword));

let laneName=lane===4?"控え":"レーン"+lane;

let arrow=collapsed[lane]?"▶":"▼";

let tr=document.createElement("tr");

tr.classList.add("lane-header");

tr.innerHTML=`<td colspan="7">${arrow} ${laneName} (${lanePlayers.length}${lane!==4?"/8":""})</td>`;

tr.onclick=()=>toggleLane(lane);

tr.ondragover=(e)=>e.preventDefault();

tr.ondrop=async()=>{

if(dragIndex!==null){

players[dragIndex].lane=lane;

await updateDoc(doc(db,"players",playerDocs[dragIndex]),{lane:lane});

render();

}

};

body.appendChild(tr);

if(collapsed[lane]) continue;

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

`;

setupDrag(row,i);
setupLongPress(row,i);

body.appendChild(row);

});

}

}

async function load(){

const snapshot=await getDocs(collection(db,"players"));

snapshot.forEach(d=>{

players.push(d.data());
playerDocs.push(d.id);

});

render();

}

load();

window.saveTableImage=async function(){

const canvas=await html2canvas(document.querySelector(".table-container"),{scale:3});

canvas.toBlob(blob=>{

const link=document.createElement("a");

link.href=URL.createObjectURL(blob);

link.download="expedition.png";

link.click();

});

}
