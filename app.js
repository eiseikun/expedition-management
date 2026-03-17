// app.js
document.addEventListener("DOMContentLoaded", () => {

  // --- Firebase初期化 ---
  const firebaseConfig = {
    apiKey: "AIzaSyCflhFHEMcgqfkr6Dhp4SwlC1A8dmcMwWE",
    authDomain: "expedition-management-date.firebaseapp.com",
    projectId: "expedition-management-date",
    storageBucket: "expedition-management-date.firebasestorage.app",
    messagingSenderId: "394248951408",
    appId: "1:394248951408:web:21eed0b45aa19a18e146b5",
    measurementId: "G-ZL04G3WF14"
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

  let isFormDirty = false;

  // --- モーダル制御 ---
  addPlayerBtn.addEventListener("click", () => openModal());
  closeModalBtn.addEventListener("click", () => {
    if(isFormDirty && !confirm("未保存です。閉じますか？")) return;
    modal.classList.add("hidden");
  });
  playerForm.addEventListener("input", () => isFormDirty = true);

  // --- モーダル開閉関数 ---
  function openModal(player=null){
    modal.classList.remove("hidden");
    isFormDirty = false;
    if(player){
      document.getElementById("modalTitle").textContent="プレイヤー編集";
      document.getElementById("playerId").value = player.id;
      document.getElementById("name").value = player.name;
      document.getElementById("power").value = player.power;
      document.getElementById("lane").value = player.lane;
      document.getElementById("tacticsDistance").value = player.tactics.distance;
      document.getElementById("tacticsPattern").value = player.tactics.pattern;
      document.getElementById("equipmentType").value = player.equipment.type;
      for(let k in player.equipment.chaos){
        document.getElementById("chaos"+capitalize(k)).checked = player.equipment.chaos[k];
      }
      document.getElementById("rune1").value = player.rune1;
      document.getElementById("rune2").value = player.rune2;
      document.getElementById("artifactMythic").value = player.artifactMythic;
      document.getElementById("artifactLegend").value = player.artifactLegend;
    } else {
      document.getElementById("modalTitle").textContent="プレイヤー追加";
      playerForm.reset();
      document.getElementById("playerId").value="";
    }
  }

  // --- 保存 ---
  playerForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const playerId = document.getElementById("playerId").value;
    const data = {
      name: document.getElementById("name").value,
      power: Number(document.getElementById("power").value),
      lane: Number(document.getElementById("lane").value),
      tactics:{
        distance: document.getElementById("tacticsDistance").value,
        pattern: document.getElementById("tacticsPattern").value
      },
      equipment:{
        type: document.getElementById("equipmentType").value,
        chaos:{
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
    if(playerId){
      await playersRef.doc(playerId).update(data);
    } else {
      await playersRef.add(data);
    }
    modal.classList.add("hidden");
    showToast("保存完了");
    loadPlayers();
    isFormDirty = false;
  });

  // --- トースト ---
  function showToast(msg){
    toast.textContent = msg;
    toast.classList.remove("hidden");
    setTimeout(()=>toast.classList.add("hidden"), 2000);
  }

  // --- capitalize ---
  function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

  // --- プレイヤー表示 ---
  async function loadPlayers(){
    const snapshot = await playersRef.get();
    const allPlayers = snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
    document.querySelectorAll(".players").forEach(div=>div.innerHTML="");
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
          聖物:${p.artifactRate.toFixed(3)}%<br>
          <button onclick="editPlayer('${p.id}')">編集</button>
          <button onclick="deletePlayer('${p.id}')">削除</button>
        `;
        laneDiv.appendChild(card);
      });
    }
  }

  // --- 編集・削除 ---
  window.editPlayer = async (id)=>{
    const doc = await playersRef.doc(id).get();
    openModal({id,...doc.data()});
  };
  window.deletePlayer = async (id)=>{
    if(confirm("削除しますか？")) {
      await playersRef.doc(id).delete();
      loadPlayers();
    }
  };

  // --- 画像保存 ---
  exportBtn.addEventListener("click", ()=>{
    html2canvas(lanesContainer).then(canvas=>{
      const link = document.createElement("a");
      link.download="lanes.png";
      link.href=canvas.toDataURL();
      link.click();
    });
  });

  // --- 初期読み込み ---
  loadPlayers();

}); // DOMContentLoaded 終わり
