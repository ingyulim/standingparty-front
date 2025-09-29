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
  
  // 기존 fetchRooms 함수는 fetchRoomsInternal을 호출하도록 변경
  async function fetchRooms() {
    await fetchRoomsInternal();
  }
  
  async function toggleMission(roomId, isActive) {
    try {
      await callAPI("/admin/missions/active", "POST", {
        roomId,
        active: isActive,
      });
      alert(`미션 ${isActive ? "활성화" : "비활성화"} 완료`);
      
      // 상태 변경 후 방 목록 새로고침
      fetchRooms();
    } catch (err) {
      alert("에러: " + err.message);
    }
  }
  
  // 방 삭제 함수
  async function deleteRoom(roomId) {
    if (!confirm(`방 ${roomId}를 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    
    try {
      await callAPI(`/rooms/${roomId}`, "DELETE");
      alert("방이 삭제되었습니다.");
      fetchRooms(); // 목록 새로고침
    } catch (err) {
      alert("방 삭제 실패: " + err.message);
    }
  }

  // 참여자 목록 표시
  async function showParticipants(roomId) {
    const participantsSection = document.getElementById(`participants-${roomId}`);
    const participantsList = participantsSection.querySelector('.participants-list');
    
    participantsSection.classList.remove('hidden');
    participantsList.innerHTML = "로딩중...";
    
    try {
      const data = await callAPI(`/participants?roomId=${roomId}`, "GET");
      const participants = data?.participants || data || [];
      
      if (participants.length === 0) {
        participantsList.innerHTML = "<p>참여자가 없습니다.</p>";
        return;
      }
      
      participantsList.innerHTML = participants.map(p => {
        const nickname = p.nickname?.S || p.nickname || "(닉네임 없음)";
        const phone = p.phone?.S || p.phone || "";
        const code = p.code?.S || p.code || "";
        const points = p.points?.N || p.points || 0;
        
        return `
          <div class="participant-item">
            <div class="participant-info">
              <strong>${nickname}</strong>
              <span class="participant-code">#${code}</span>
              <span class="participant-points">포인트: ${points}점</span>
            </div>
            <div class="participant-actions">
              <button class="btn-participant-delete" 
                      onclick="deleteParticipant('${roomId}', '${phone}', '${nickname}')"
                      title="참여자 삭제">삭제</button>
            </div>
          </div>
        `;
      }).join('');
      
    } catch (err) {
      participantsList.innerHTML = `<p>참여자 목록 조회 실패: ${err.message}</p>`;
    }
  }

  // 참여자 목록 숨기기
  function hideParticipants(roomId) {
    const participantsSection = document.getElementById(`participants-${roomId}`);
    participantsSection.classList.add('hidden');
  }

  // 참여자 삭제
  async function deleteParticipant(roomId, phone, nickname) {
    if (!confirm(`참여자 ${nickname}을(를) 정말 삭제하시겠습니까?`)) {
      return;
    }
    
    try {
      await callAPI(`/participants/${roomId}/${phone}`, "DELETE");
      alert(`참여자 ${nickname}이(가) 삭제되었습니다.`);
      loadParticipants(roomId); // 목록 새로고침
      loadParticipantCount(roomId); // 참여자 수 업데이트
    } catch (err) {
      alert("참여자 삭제 실패: " + err.message);
    }
  }

  // 전역 함수로 등록
  window.deleteRoom = deleteRoom;
  window.showParticipants = showParticipants;
  window.hideParticipants = hideParticipants;
  window.deleteParticipant = deleteParticipant;
  
  // fetchRooms 내부 함수들을 전역으로 노출
  let loadParticipantCount, loadParticipants;
  
  async function fetchRoomsInternal() {
    const roomList = document.getElementById("roomList");
    if (!roomList) return;

    try {
      const rooms = await callAPI("/rooms", "GET");
      console.log("[room response]", rooms);

      if (!rooms || rooms.length === 0) {
        roomList.innerHTML = "📭 등록된 방이 없습니다.";
        return;
      }

      roomList.innerHTML = "";

      // 방 카드를 렌더링하는 함수
      const renderRoomCard = (room) => {
        const { id, name: roomName, title } = room;
        const missionActive = room.missionActive === true || room.missionActive === "true";

        const roomCard = document.createElement("div");
        roomCard.className = "room-card";

        const missionStatus = missionActive ? "🎯 미션 활성" : "⚪ 미션 비활성";
        const missionClass = missionActive ? "mission-active" : "mission-inactive";

        roomCard.innerHTML = `
          <div class="room-header">
            <h4>방 ${title}</h4>
            <div class="room-actions">
              <button class="btn-delete" onclick="deleteRoom('${id}')" title="방 삭제">🗑️</button>
            </div>
          </div>
          
          <div class="room-info">
            <div class="info-row">
              <span class="label">참가자</span>
              <span class="value" id="count-${id}">로딩중...</span>
            </div>
            <div class="info-row">
              <span class="label">미션 상태</span>
              <span class="value ${missionClass}">${missionStatus}</span>
            </div>
          </div>
          
          <div class="room-controls">
            <button class="btn-mission ${missionActive ? 'active' : ''}" 
                    onclick="toggleMission('${id}', ${!missionActive})">
              ${missionActive ? '미션 비활성화' : '미션 활성화'}
            </button>
          </div>
          
          <div id="participants-${id}" class="participants-section">
            <div class="participants-header">
              <h5>참여자 목록</h5>
            </div>
            <div class="participants-list"></div>
          </div>
        `;

        roomList.appendChild(roomCard);
        
        // 참여자 수와 참여자 목록을 비동기로 로드
        loadParticipantCount(id);
        loadParticipants(id);
      };
      
      // 참여자 수를 비동기로 로드하는 함수
      loadParticipantCount = async (roomId) => {
        try {
          const participants = await callAPI(`/participants?roomId=${roomId}`, "GET");
          const count = participants?.participants?.length || participants?.length || 0;
          const countElement = document.getElementById(`count-${roomId}`);
          if (countElement) {
            countElement.textContent = `${count}명`;
          }
        } catch (e) {
          const countElement = document.getElementById(`count-${roomId}`);
          if (countElement) {
            countElement.textContent = "0명";
          }
        }
      };
      
      // 참여자 목록을 로드하는 함수
      loadParticipants = async (roomId) => {
        const participantsSection = document.getElementById(`participants-${roomId}`);
        const participantsList = participantsSection.querySelector('.participants-list');
        
        participantsList.innerHTML = "로딩중...";
        
        try {
          const data = await callAPI(`/participants?roomId=${roomId}`, "GET");
          const participants = data?.participants || data || [];
          
          if (participants.length === 0) {
            participantsList.innerHTML = "<p>참여자가 없습니다.</p>";
            return;
          }
          
          participantsList.innerHTML = participants.map(p => {
            const nickname = p.nickname?.S || p.nickname || "(닉네임 없음)";
            const phone = p.phone?.S || p.phone || "";
            const code = p.code?.S || p.code || "";
            const points = p.points?.N || p.points || 0;
            
            return `
              <div class="participant-item">
                <div class="participant-info">
                  <div class="participant-code">${nickname} (코드: ${code})</div>
                  <div class="participant-points">포인트: ${points}점</div>
                </div>
                <button class="btn-participant-delete" onclick="deleteParticipant('${roomId}', '${phone}', '${nickname}')">
                  삭제
                </button>
              </div>
            `;
          }).join('');
        } catch (err) {
          console.error("참여자 목록 로딩 실패:", err);
          participantsList.innerHTML = "❌ 참여자 목록을 불러오지 못했습니다.";
        }
      };
      
      // 모든 방 카드를 먼저 렌더링
      rooms.forEach(renderRoomCard);
    } catch (err) {
      console.error("방 목록 오류:", err);
      roomList.innerHTML = "❌ 방 목록을 불러오지 못했습니다.";
    }
  }
  
  // fetchRooms 함수는 위에서 이미 정의됨
  
  // 전역으로 노출
  window.loadParticipantCount = loadParticipantCount;
  window.loadParticipants = loadParticipants;

  // ✅ 페이지 로드시 방 목록 로딩
  document.addEventListener("DOMContentLoaded", () => {
    fetchRooms();
  });
  