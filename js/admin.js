// js/admin.js

async function createRoom() {
    const roomName = document.getElementById("roomName").value;
    const result = document.getElementById("result");
  
    if (!roomName) {
      result.textContent = "방 제목을 입력하세요.";
      return;
    }
  
    try {
      const res = await callAPI("/rooms", "POST", { title: roomName });
      result.textContent = `방 생성 성공: ${JSON.stringify(res)}`;
      fetchRooms(); // 생성 후 리스트 갱신
    } catch (err) {
      result.textContent = `오류 발생: ${err.message}`;
    }
  }
  
  async function upsertMission() {
    const result = document.getElementById("missionResult");
    const roomId = document.getElementById("missionRoomId").value.trim();
    const missionId = document.getElementById("missionId").value.trim();
    const title = document.getElementById("missionTitle").value.trim();
    const description = document.getElementById("missionDesc").value.trim();
    const points = parseInt(document.getElementById("missionPoints").value.trim(), 10);
  
    if (!roomId || !missionId || !title || isNaN(points)) {
      result.textContent = "모든 필드를 정확히 입력해주세요.";
      return;
    }
  
    try {
      const payload = { roomId, missionId, title, description, points };
      const res = await callAPI("/admin/missions", "POST", payload);
      result.textContent = `미션 저장 성공: ${JSON.stringify(res)}`;
    } catch (err) {
      result.textContent = `미션 저장 오류: ${err.message}`;
    }
  }
  
  async function setMissionActive(isActive) {
    const result = document.getElementById("missionResult");
    const roomId = document.getElementById("missionToggleRoomId").value.trim();
  
    if (!roomId) {
      result.textContent = "roomId를 입력하세요.";
      return;
    }
  
    try {
      const payload = { roomId, active: isActive };
      const res = await callAPI("/admin/missions/active", "POST", payload);
      result.textContent = `미션 ${isActive ? "활성화" : "비활성화"} 성공: ${JSON.stringify(res)}`;
    } catch (err) {
      result.textContent = `상태 변경 오류: ${err.message}`;
    }
  }
  
  async function fetchRooms() {
    const roomList = document.getElementById("roomList");
    if (!roomList) return;
  
    try {
      const rooms = await callAPI("/rooms", "GET");
      roomList.innerHTML = "";
  
      console.log("[room response]", rooms); // 🔍 디버깅용
  
      rooms.forEach((r) => {
        // API 응답에서 다양한 필드명 지원
        const title = r.title || r.name || "(제목 없음)";
        const id = r.id || r.roomId || "(ID 없음)";
        const div = document.createElement("div");
        div.className = "room-row";
  
        div.innerHTML = `
          <b>${title}</b> (${id})
          <button onclick="toggleMission('${id}', true')">🟢 미션 ON</button>
          <button onclick="toggleMission('${id}', false')">🔴 미션 OFF</button>
        `;
  
        roomList.appendChild(div);
      });
    } catch (err) {
      console.error("방 목록 오류:", err);
      roomList.innerHTML = "❌ 방 목록을 불러오지 못했습니다.";
    }
  }
  
  async function toggleMission(roomId, isActive) {
    try {
      await callAPI("/admin/missions/active", "POST", {
        roomId,
        active: isActive,
      });
      alert(`미션 ${isActive ? "활성화" : "비활성화"} 완료`);
    } catch (err) {
      alert("에러: " + err.message);
    }
  }
  
  // ✅ 페이지 로드시 방 목록 로딩
  document.addEventListener("DOMContentLoaded", () => {
    fetchRooms();
  });
  