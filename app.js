// ===== 交互行対応render =====
function render(){
  const body = document.getElementById("playerBody");
  body.innerHTML = "";

  const laneNames = {1:"レーン1",2:"レーン2",3:"レーン3",0:"控え"};

  [1,2,3,0].forEach(laneNum=>{
    const lanePlayers = players.filter(p => (p.lane ?? 0) === laneNum);
    if(lanePlayers.length === 0) return;

    const trLane = document.createElement("tr");
    trLane.classList.add("lane-header");
    trLane.innerHTML = `<td colspan="10">${laneNames[laneNum]} (${lanePlayers.length}/8)</td>`;
    body.appendChild(trLane);

    lanePlayers.sort((a,b)=>b.power-a.power);

    lanePlayers.forEach((p,i)=>{
      const index = players.findIndex(x => x === p);

      const tr = document.createElement("tr");

      // ⭐ ここが今回の修正（交互色）
      if(i % 2 === 1){
        tr.classList.add("tr-even");
      }

      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${p.power.toFixed(2)}M</td>
        <td>${p.range}/${p.style}</td>
        <td>${gearText(p.gearDetail)}</td>
        <td>${p.hero}</td>
        <td></td>
        <td>${p.formation}</td>
        <td>${(p.mythic*0.25 + p.legend*0.025).toFixed(3)}</td>
        <td><button onclick="editPlayer(${index})">編集</button></td>
        <td><button onclick="deletePlayer(${index})">削除</button></td>
      `;
      body.appendChild(tr);
    });
  });
}

// ===== 画像保存（安定版） =====
window.saveTableImage = async function() {
  const table = document.getElementById("playerTable");
  const container = document.querySelector(".table-container");

  const tableStyle = table.getAttribute("style") || "";
  const containerStyle = container.getAttribute("style") || "";

  try {
    container.style.display = "block";
    container.style.overflow = "visible";

    table.style.width = table.scrollWidth + "px";

    const canvas = await html2canvas(table, {
      scale: 1.5,
      scrollX: 0,
      scrollY: 0,
      windowWidth: table.scrollWidth,
      windowHeight: table.scrollHeight
    });

    const link = document.createElement("a");
    link.href = canvas.toDataURL();
    link.download = "expedition.png";
    link.click();

  } finally {
    table.setAttribute("style", tableStyle);
    container.setAttribute("style", containerStyle);
  }
};
