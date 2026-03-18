import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
let ids=[];
let editIndex=null;
let selectedIndex=null;
let sortAsc=true;

window.openEditor=()=>{
document.getElementById("editor").style.display="flex";
editIndex=null;
}

window.savePlayer=async()=>{

let data={
name:name.value,
power:Number(power.value),
range:range.value,
style:style.value,
gear:gear.value,
hero:hero.value,
formation:formation.value,
mythic:Number(mythic.value||0),
legend:Number(legend.value||0),
lane:Number(lane.value)
};

if(editIndex==null){
await addDoc(collection(db,"players"),data);
}else{
await updateDoc(doc(db,"players",ids[editIndex]),data);
}

window.closeEditor=()=>{
document.getElementById("editor").style.display="none";
}
  
load();
}

function relic(p){
return (p.mythic*0.25 + p.legend*0.025).toFixed(2)+"%";
}

function powerText(p){
return p+"M";
}

window.sortPlayers=()=>{
sortAsc=!sortAsc;
render();
}

function render(){

let body=document.getElementById("playerBody");
body.innerHTML="";

let keyword=search.value.toLowerCase();

let list=players.filter(p=>p.name.toLowerCase().includes(keyword));

list.sort((a,b)=> sortAsc ? b.power-a.power : a.power-b.power);

list.forEach((p)=>{

let i = players.indexOf(p);

let tr=document.createElement("tr");

tr.innerHTML=`
<td>${p.name}</td>
<td>${powerText(p.power)}</td>
<td>${p.range}/${p.style}</td>
<td>${p.gear}</td>
<td>${p.hero}</td>
<td>${p.formation}</td>
<td>${relic(p)}</td>
`;

tr.onclick=()=>openMenu(i);

body.appendChild(tr);

});
}

async function load(){

players=[];
ids=[];

const snap=await getDocs(collection(db,"players"));

snap.forEach(d=>{
players.push(d.data());
ids.push(d.id);
});

render();
}

function openMenu(i){
selectedIndex=i;
menuName.innerText=players[i].name;
menu.style.display="flex";
}

window.closeMenu=()=>{
menu.style.display="none";
}

window.moveLaneFromMenu=async(l)=>{
await updateDoc(doc(db,"players",ids[selectedIndex]),{lane:l});
closeMenu();
load();
}

window.editFromMenu=()=>{
editIndex=selectedIndex;
let p=players[selectedIndex];

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
closeMenu();
}

window.deleteFromMenu=async()=>{
if(confirm("削除しますか？")){
await deleteDoc(doc(db,"players",ids[selectedIndex]));
load();
}
closeMenu();
}

window.saveTableImage=()=>{
html2canvas(document.getElementById("table")).then(canvas=>{
let a=document.createElement("a");
a.href=canvas.toDataURL();
a.download="table.png";
a.click();
});
}

load();
