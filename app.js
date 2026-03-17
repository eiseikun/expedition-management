// --- Firebase初期化 ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const playersRef = db.collection("players");

// --- DOM Elements ---
const addPlayerBtn = document.getElementById("addPlayerBtn");
const modal = document.getElementById("modal");
const closeModalBtn = document.getElementById("closeModal");
const playerForm = document.getElementById("playerForm");
const toast = document.getElementById("toast");
const lanesContainer = document.getElementById("lanesContainer");
const exportBtn = document.getElementById("exportBtn");

// --- モーダル制御 ---
addPlayerBtn.addEventListener("click", () => modal.classList.remove("hidden"));
closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));

// --- プレイヤー保存 ---
playerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    name: document.getElementById("name").value,
    power: Number(document.getElementById("power").value),
    lane: Number(document.getElementById("lane").value),
    tactics: {
      distance: document.getElementById("tacticsDistance").value,
      pattern: document.getElementById("tacticsPattern").value
    },
    equipment: {
      type: document.getElementById("equipmentType").value,
      chaos: {
        weapon: document.getElementById("chaosWeapon").checked,
        amulet: document.getElementById("chaosAmulet").checked,
        ring: document.getElementById("chaosRing").checked,
        helmet: document.getElementById("chaosHelmet").checked,
        armor: document.getElementById("chaosArmor").checked,
        boots: document.getElementById("chaosBoots").checked
      }
    },
    rune1: document.getElementById("rune1").value,
    rune2: document.getElementById("rune2").value,
    artifactMythic: Number(document.getElementById("artifactMythic").value),
    artifactLegend: Number(document.getElementById("artifactLegend").value),
    artifactRate: Number(document.getElementById("artifactMythic").value)*0.25 + Number(document.getElementById("artifactLegend").value)*0.025
  };

  await playersRef.add(data);
  modal.classList.add("hidden");
  showToast("保存完了");
  loadPlayers();
});

// --- トースト表示 ---
function showToast(msg){
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(()=>toast.classList.add("hidden"), 2000);
}

// --- プレイヤー表示 ---
async function loadPlayers(){
  const snapshot = await playersRef.get();
  const allPlayers = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
  
  document.querySelectorAll(".players").forEach(div => div.innerHTML=""); // クリア
  for(let lane=1; lane<=3; lane++){
    const laneDiv = document.querySelector(`.lane[data-lane='${lane}'] .players`);
    allPlayers.filter(p=>p.lane===lane).sort((a,b)=>b.power-a.power).forEach(p=>{
      const card = document.createElement("div");
      card.className = "player-card";
      card.innerHTML = `
        <b>${p.name}</b><br>
        戦力:${p.power}<br>
        戦術:${p.tactics.distance} - ${p.tactics.pattern}<br>
        装備:${p.equipment.type}<br>
        カオス: ${Object.entries(p.equipment.chaos).filter(([k,v])=>v).map(([k])=>k).join(",") || "-"}<br>
        ルーン:${p.rune1},${p.rune2}<br>
        聖物:${p.artifactRate.toFixed(3)}%
      `;
      laneDiv.appendChild(card);
    });
  }
}

// --- 画像保存 ---
exportBtn.addEventListener("click", ()=>{
  html2canvas(lanesContainer).then(canvas=>{
    const link = document.createElement("a");
    link.download = "lanes.png";
    link.href = canvas.toDataURL();
    link.click();
  });
});

// --- 初期読み込み ---
loadPlayers();
