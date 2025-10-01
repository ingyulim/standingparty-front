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

  // 방 미션 상태를 부드럽게 업데이트하는 함수
  async function updateRoomMissionStatus(roomId, isActive) {
    // 모든 방 카드를 순회하며 해당 roomId를 찾기
    const roomCards = document.querySelectorAll('.room-card');
    let targetCard = null;

    for (const card of roomCards) {
      // 여러 방법으로 roomId 찾기
      if (card.dataset.roomId === roomId ||
          card.querySelector(`[id="count-${roomId}"]`) ||
          card.textContent.includes(roomId)) {
        targetCard = card;
        break;
      }
    }

    if (targetCard) {
      const toggleBtn = targetCard.querySelector('.btn-mission');

      // 버튼 상태는 이미 toggleMissionFromButton에서 업데이트되었으므로 애니메이션만
      if (toggleBtn && toggleBtn.dataset.currentState !== String(isActive)) {
        toggleBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
          toggleBtn.style.transform = 'scale(1)';
        }, 150);
      }

      // 미션 상태 텍스트 업데이트
      const statusElement = targetCard.querySelector('.mission-active, .mission-inactive');
      if (statusElement) {
        statusElement.textContent = isActive ? '🎯 미션 활성' : '⚪ 미션 비활성';
        statusElement.className = `value ${isActive ? 'mission-active' : 'mission-inactive'}`;
      }
    } else {
      console.warn(`Room card not found for roomId: ${roomId}`);
    }
  }

  // 토스트 알림 함수
  function showToast(message, type = 'info') {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }

    // 토스트 생성
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // 스타일 적용
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '14px',
      zIndex: '1000',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease',
      maxWidth: '300px',
      wordWrap: 'break-word'
    });

    // 타입별 색상
    const colors = {
      success: '#4CAF50',
      error: '#f44336',
      info: '#2196F3'
    };
    toast.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(toast);

    // 애니메이션
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);

    // 자동 제거
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  // 뒤로가기 부드러운 전환 함수
  function goBackWithTransition() {
    // 페이드 아웃 효과
    document.body.style.transition = 'opacity 0.3s ease';
    document.body.style.opacity = '0';

    setTimeout(() => {
      location.href = 'index.html';
    }, 300);
  }

  // 버튼에서 미션 토글 (현재 상태를 버튼 data에서 읽어옴)
  function toggleMissionFromButton(button) {
    const roomId = button.dataset.roomId;
    const currentState = button.dataset.currentState === 'true';
    const newState = !currentState;

    // 버튼의 현재 상태를 즉시 업데이트
    button.dataset.currentState = newState;
    button.textContent = newState ? '미션 비활성화' : '미션 활성화';
    button.classList.toggle('active', newState);

    // API 호출
    toggleMission(roomId, newState);
  }

  async function toggleMission(roomId, isActive) {
    try {
      // API 호출
      await callAPI("/admin/missions/active", "POST", {
        roomId,
        active: isActive,
      });

      // 상태 업데이트 (약간의 지연을 두어 DOM이 완전히 업데이트되도록)
      setTimeout(async () => {
        await updateRoomMissionStatus(roomId, isActive);
      }, 100);

      // 사용자에게 부드러운 알림
      showToast(`미션 ${isActive ? "활성화" : "비활성화"}되었습니다`, "success");
    } catch (err) {
      showToast("오류가 발생했습니다: " + err.message, "error");
    }
  }

  // 빙고 토글 버튼에서 호출
  function toggleBingoFromButton(button) {
    const roomId = button.dataset.roomId;
    const currentState = button.dataset.currentState === 'true';
    const newState = !currentState;

    // 버튼의 현재 상태를 즉시 업데이트
    button.dataset.currentState = newState;
    button.textContent = newState ? '빙고 비활성화' : '빙고 활성화';
    button.classList.toggle('active', newState);

    // API 호출
    toggleBingo(roomId, newState);
  }

  async function toggleBingo(roomId, isActive) {
    try {
      console.log(`빙고 토글: roomId=${roomId}, isActive=${isActive}`);
      // API 호출
      const response = await callAPI("/bingo/active", "POST", {
        roomId,
        bingoActive: isActive,
      });
      console.log("빙고 토글 응답:", response);

      // 방 목록 새로고침하여 최신 상태 반영
      setTimeout(() => {
        fetchRooms();
      }, 500);

      showToast(`빙고 ${isActive ? "활성화" : "비활성화"}되었습니다`, "success");
    } catch (err) {
      console.error("빙고 활성화 오류:", err);
      showToast("빙고 활성화 오류: " + err.message, "error");
    }
  }
  
  // 방 삭제 함수
  async function deleteRoom(roomId) {
    if (!confirm(`방 ${roomId}를 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    
    // 비밀번호 확인
    const password = prompt('관리자 비밀번호를 입력하세요:');
    if (!password) return;
    
    try {
      // 백엔드에서 비밀번호 확인 후 삭제
      await callAPI(`/rooms/${roomId}`, "DELETE", { password });
      showToast("방이 삭제되었습니다.", "success");
      fetchRooms(); // 목록 새로고침
    } catch (err) {
      showToast("방 삭제 실패: " + err.message, "error");
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
        const gender = p.gender?.S || p.gender || "-";
        const genderIcon = gender === "M" ? "👨" : gender === "F" ? "👩" : "👤";
        const genderText = gender === "M" ? "남자" : gender === "F" ? "여자" : "";
        const genderClass = gender === "M" ? "participant-male" : gender === "F" ? "participant-female" : "";
        
        return `
          <div class="participant-item ${genderClass}">
            <div class="participant-info">
              <strong>${genderIcon} ${nickname}</strong>
              <span class="participant-code">#${code} · ${genderText}</span>
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
    
    // 비밀번호 확인
    const password = prompt('관리자 비밀번호를 입력하세요:');
    if (!password) return;
    
    try {
      // 백엔드에서 비밀번호 확인 후 삭제
      await callAPI(`/participants/${roomId}/${phone}`, "DELETE", { password });
      showToast(`참여자 ${nickname}이(가) 삭제되었습니다.`, "success");
      loadParticipants(roomId); // 목록 새로고침
      loadParticipantCount(roomId); // 참여자 수 업데이트
    } catch (err) {
      showToast("참여자 삭제 실패: " + err.message, "error");
    }
  }

  // 전역 함수로 등록
  window.deleteRoom = deleteRoom;
  window.showParticipants = showParticipants;
  window.hideParticipants = hideParticipants;
  window.deleteParticipant = deleteParticipant;
  window.toggleMissionFromButton = toggleMissionFromButton;
  window.toggleBingoFromButton = toggleBingoFromButton;
  
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
        const bingoActive = room.bingoActive === true || room.bingoActive === "true";
        console.log(`방 ${id}: missionActive=${missionActive}, bingoActive=${bingoActive}`);

        const roomCard = document.createElement("div");
        roomCard.className = "room-card";
        roomCard.dataset.roomId = id; // 방 ID를 data 속성으로 저장

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
                    data-room-id="${id}"
                    data-current-state="${missionActive}"
                    onclick="toggleMissionFromButton(this)">
              ${missionActive ? '미션 비활성화' : '미션 활성화'}
            </button>
            <button class="btn-bingo ${bingoActive ? 'active' : ''}"
                    data-room-id="${id}"
                    data-current-state="${bingoActive}"
                    onclick="toggleBingoFromButton(this)">
              ${bingoActive ? '빙고 비활성화' : '빙고 활성화'}
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
            const gender = p.gender?.S || p.gender || "-";
            const genderIcon = gender === "M" ? "👨" : gender === "F" ? "👩" : "👤";
            const genderText = gender === "M" ? "남자" : gender === "F" ? "여자" : "";
            const genderClass = gender === "M" ? "participant-male" : gender === "F" ? "participant-female" : "";
            
            return `
              <div class="participant-item ${genderClass}">
                <div class="participant-info">
                  <div class="participant-code">${genderIcon} ${nickname} (코드: ${code}) · ${genderText}</div>
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
  