function showToast(message, type = 'success') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  const roomId = params.get("roomId");
  const phone = params.get("phone");
  const code = params.get("code");
  const nickname = params.get("nickname");

  if (!roomId || !phone || !code || !nickname) {
    showToast("잘못된 접근입니다.", "error");
    setTimeout(() => location.href = "index.html", 1000);
    return;
  }

  document.getElementById("userInfo").textContent = `✅ ${nickname} (#${code}) 로 입장`;
  window.currentUserCode = code;

  let missionActive = false;
  let bingoActive = false;
  try {
    const rooms = await callAPI("/rooms", "GET");
    const currentRoom = rooms.find(r => (r.id || r.roomId) === roomId);
    if (currentRoom) {
      document.getElementById("roomTitle").textContent = currentRoom.title || "Standing Party";
      missionActive = currentRoom.missionActive === true || currentRoom.missionActive === "true";
      bingoActive = currentRoom.bingoActive === true || currentRoom.bingoActive === "true";
    }
  } catch (e) {
    console.warn("방 정보 불러오기 실패", e);
  }

  window.currentMissionActive = missionActive;
  window.currentBingoActive = bingoActive;

  if (missionActive) {
    document.getElementById("missionsTabBtn").style.display = "inline-block";
    loadMissions();
  } else {
    document.getElementById("missionsTabBtn").remove();
    document.getElementById("tab-missions").remove();
  }

  if (bingoActive) {
    document.getElementById("bingoTabBtn").style.display = "inline-block";
    loadBingo();
  } else {
    document.getElementById("bingoTabBtn").remove();
    document.getElementById("tab-bingo").remove();
  }

  loadParticipants();

  // 전화번호를 시드로 사용한 셔플 함수
  function shuffleWithSeed(array, seed) {
    const arr = [...array];
    
    // 전화번호 문자열을 해시값으로 변환
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & 0xffffffff; // 32bit 정수로 변환
    }
    hash = Math.abs(hash);
    
    // LCG (Linear Congruential Generator) 방식
    let state = hash;
    const lcg = () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
    
    // Fisher-Yates 셔플
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(lcg() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    
    return arr;
  }

  // 빙고 로딩 함수 (랜덤 미션 순서 방식)
  async function loadBingo() {
    try {
      // 전역 빙고 데이터 가져오기
      const bingoData = await callAPI("/bingo", "GET");
      const { title, description, grid } = bingoData;
      console.log("🎲 빙고 데이터:", bingoData);
      
      // 내 빙고 완료 상태 가져오기
      const myBingoData = await callAPI(`/bingo/my?roomId=${roomId}&phone=${phone}`, "GET");
      const completed = myBingoData.completed || [];
      console.log("✅ 완료된 칸:", completed);
      
      // 빙고판은 모두 동일하게 유지
      const fixedGrid = grid;
      
      // 미션과 위치 매핑 생성 (미션 -> 빙고 위치)
      const missionMap = [];
      for (let i = 0; i < fixedGrid.length; i++) {
        for (let j = 0; j < fixedGrid[i].length; j++) {
          missionMap.push({
            mission: fixedGrid[i][j],
            row: i,
            col: j,
            position: `${i}-${j}`
          });
        }
      }
      
      // 미션 순서만 전화번호 기반으로 셔플
      const shuffledMissions = shuffleWithSeed(missionMap, phone);
      console.log("🔀 셔플된 미션 순서:", shuffledMissions);
      
      const bingoGridEl = document.getElementById("bingoGrid");
      bingoGridEl.innerHTML = `
        <h3>${title || '빙고'}</h3>
        <p>${description || ''}</p>
        
        <!-- 빙고판 (모든 참여자 동일, 빈칸으로 표시) -->
        <div class="bingo-table">
          ${fixedGrid.map((row, i) => `
            <div class="bingo-row">
              ${row.map((cell, j) => {
                const position = `${i}-${j}`;
                const isCompleted = completed.includes(position);
                return `
                  <div class="bingo-cell ${isCompleted ? 'completed' : 'locked'}">
                    ${isCompleted ? '✅' : '🔒'}
                  </div>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>
        
        <!-- 미션 리스트 (참여자마다 순서 다름) -->
        <div class="bingo-mission-list">
          <h4>🎯 빙고 미션</h4>
          ${shuffledMissions.map((item, index) => {
            const { mission, row, col, position } = item;
            const isCompleted = completed.includes(position);
            
            // mission이 객체인 경우 처리
            let missionTitle, missionQuestion;
            if (typeof mission === 'object' && mission !== null) {
              missionTitle = mission.title || '';
              missionQuestion = mission.question || '';
            } else {
              missionTitle = mission || '';
              missionQuestion = '';
            }
            
            const escapedTitle = String(missionTitle).replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const escapedQuestion = String(missionQuestion).replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const displayText = missionQuestion ? `${missionTitle} - ${missionQuestion}` : missionTitle;
            
            return `
              <div class="bingo-mission-item ${isCompleted ? 'completed' : ''}"
                ${isCompleted ? '' : `onclick="completeBingoMission(${row}, ${col}, '${escapedTitle}', '${escapedQuestion}', ${mission.requirePhoto ? 'true' : 'false'})" style="cursor: pointer;"`}>
                <div class="mission-number">#${index + 1}</div>
                <div class="mission-text">${missionTitle}</div>
                <div class="check-mark">${isCompleted ? '✅' : '⭕'}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch (err) {
      console.error("빙고 불러오기 실패:", err);
      document.getElementById("bingoGrid").innerHTML = "<p>빙고를 불러올 수 없습니다.</p>";
    }
  }

  // S3 업로드 함수
  async function uploadToS3(file, type = "bingo") {
    const filename = `${Date.now()}_${file.name}`;
    const contentType = file.type || 'application/octet-stream';
    const query = `/upload-url?type=${type}&roomId=${roomId}&phone=${phone}&filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`;
    const res = await callAPI(query, "GET");
    const { uploadUrl, fileUrl } = res;
    
    // S3에 직접 업로드
    const uploadResponse = await fetch(uploadUrl, { 
      method: "PUT", 
      body: file,
      headers: {
        "Content-Type": contentType
      }
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`S3 업로드 실패: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }
    
    return fileUrl;
  }

  // 모달 관련 전역 변수
  let currentBingoMission = null;

  // 빙고 미션 모달 열기
  window.completeBingoMission = (row, col, title, question, photoRequired = false) => {
    currentBingoMission = { row, col, title, question, photoRequired };
    
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalQuestion').textContent = question || '미션을 완료하셨나요?';
    document.getElementById('modalAnswer').value = '';
    
    // 사진 섹션 전체 표시/숨김
    const photoSection = document.getElementById('photoSection');
    const photoUploadBtn = document.getElementById('photoUploadBtn');
    
    if (photoRequired) {
      photoSection.style.setProperty('display', 'block', 'important');
      photoUploadBtn.style.setProperty('display', 'inline-block', 'important');
      document.getElementById('modalPhotoRequired').checked = true;
    } else {
      photoSection.style.setProperty('display', 'none', 'important');
    }
    
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('modalPhoto').value = '';
    
    const modal = document.getElementById('bingoModal');
    modal.style.setProperty('display', 'flex', 'important');
  };

  // 모달 닫기
  window.closeBingoModal = () => {
    const modal = document.getElementById('bingoModal');
    modal.style.setProperty('display', 'none', 'important');
    currentBingoMission = null;
  };

  // 빙고 사진 선택 시 미리보기
  const photoInput = document.getElementById('modalPhoto');
  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          document.getElementById('photoPreviewImg').src = event.target.result;
          document.getElementById('photoPreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 미션 사진 선택 시 미리보기
  const missionPhotoInput = document.getElementById('missionModalPhoto');
  if (missionPhotoInput) {
    missionPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          document.getElementById('missionPhotoPreviewImg').src = event.target.result;
          document.getElementById('missionPhotoPreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 빙고 답변 제출
  window.submitBingoAnswer = async () => {
    if (!currentBingoMission) return;

    const answer = document.getElementById('modalAnswer').value.trim();
    if (!answer) {
      showToast("답변을 입력해주세요", "error");
      return;
    }

    // 사진 필수 체크
    let photoUrl = null;
    if (currentBingoMission.photoRequired) {
      const file = document.getElementById('modalPhoto').files[0];
      if (!file) {
        showToast("사진을 첨부해주세요", "error");
        return;
      }
      try {
        console.log("📸 사진 업로드 중...");
        photoUrl = await uploadToS3(file, "bingo");
        console.log("✅ 사진 업로드 완료:", photoUrl);
      } catch (err) {
        console.error("사진 업로드 실패:", err);
        showToast("사진 업로드 실패", "error");
        return;
      }
    }

    const { row, col } = currentBingoMission;

    try {
      console.log("🎯 빙고 미션 제출:", { roomId, phone, row, col, answer, photoUrl });
      const result = await callAPI("/bingo/submit", "POST", { 
        roomId, 
        phone, 
        row,
        col,
        answer,
        photoUrl
      });
      console.log("✅ 빙고 제출 응답:", result);
      
      closeBingoModal();
      showToast("빙고 미션 완료! 칸이 열렸습니다 🎉", "success");
      loadBingo();
    } catch (err) {
      console.error("❌ 빙고 제출 실패:", err);
      showToast("빙고 제출 실패: " + err.message, "error");
    }
  };

  async function loadParticipants() {
    try {
      const data = await callAPI(`/participants?roomId=${roomId}`, "GET");
      const list = data?.participants || data || [];
      const div = document.getElementById("participantList");
      div.innerHTML = "";
      document.getElementById("participantCount").textContent = list.length;

      if (!Array.isArray(list) || list.length === 0) {
        div.innerHTML = "<p>참여자가 없습니다.</p>";
        return;
      }

      list.forEach((p) => {
        const name = p.nickname?.S || p.nickname || "이름없음";
        const code = p.code?.S || p.code || "----";
        const pt = p.points?.N || p.points || "0";
        const gender = p.gender?.S || p.gender || "-";
        const genderIcon = gender === "M" ? "👨" : gender === "F" ? "👩" : "👤";
        const genderText = gender === "M" ? "남자" : gender === "F" ? "여자" : "";
        const el = document.createElement("div");
        const genderClass = gender === "M" ? "participant-male" : gender === "F" ? "participant-female" : "";
        el.className = `card-item ${genderClass}`;
        const isMe = (code === window.currentUserCode);
        
        // 본인인 경우 미션 탭에 점수 표시
        if (isMe) {
          const myPointsEl = document.getElementById('myPoints');
          if (myPointsEl) {
            myPointsEl.textContent = pt + '점';
          }
        }
        
        // 미션이 활성화되어 있을 때만 본인 점수 표시
        const pointsDisplay = (isMe && window.currentMissionActive) ? `<strong style="color: #FFD700; font-size: 1.3em; font-weight: bold; text-shadow: 0 0 10px #FFD700;">${pt}점</strong>` : "";

        el.innerHTML = `${genderIcon} ${name} (#${code}) · ${genderText}${pointsDisplay ? ` · ${pointsDisplay}` : ""}`;
        div.appendChild(el);
      });
    } catch (err) {
      console.error("참여자 불러오기 실패:", err);
    }
  }

  async function loadMissions() {
    try {
      // 캐시 방지를 위한 타임스탬프 추가
      const timestamp = Date.now();
      const data = await callAPI(`/missions/my?roomId=${roomId}&phone=${phone}&t=${timestamp}`, "GET");
      console.log("🎯 미션 데이터:", data);
      
      // data가 배열인지 확인하고, 아니면 배열로 변환
      const missions = Array.isArray(data) ? data : (data?.missions || []);
      console.log("🎯 파싱된 미션:", missions);
      
      const missionList = document.getElementById("missionList");
      missionList.innerHTML = "";
      
      if (!Array.isArray(missions) || missions.length === 0) {
        missionList.innerHTML = "<p>등록된 미션이 없습니다.</p>";
        document.getElementById("missionCount").textContent = "0";
        return;
      }

      document.getElementById("missionCount").textContent = missions.length;

      let completedCount = 0;
      missions.forEach((m, index) => {
        const isDone = m.done === true || m.completed === true || m.status === 'completed';
        if (isDone) completedCount++;

        const missionDiv = document.createElement("div");
        missionDiv.className = `bingo-mission-item ${isDone ? 'completed' : ''}`;
        
        missionDiv.innerHTML = `
          <div class="mission-number">#${index + 1}</div>
          <div class="mission-text">
            <div style="font-weight: bold;">${m.title}</div>
            <div style="font-size: 13px; color: #FFD700; margin-top: 4px;">${m.points >= 0 ? '+' : ''}${m.points}점</div>
          </div>
          <div class="check-mark">${isDone ? '✅' : '⭕'}</div>
        `;
        
        // 미완료 미션은 클릭 가능하도록
        if (!isDone) {
          missionDiv.style.cursor = 'pointer';
          missionDiv.onclick = () => openMissionModal(m);
        }
        missionList.appendChild(missionDiv);
      });

      updateMissionProgress(completedCount, missions.length);
    } catch (err) {
      console.error("미션 불러오기 실패:", err);
      document.getElementById("missionList").innerHTML = "<p>미션을 불러올 수 없습니다.</p>";
    }
  }

  function updateMissionProgress(completed, total) {
    const progressText = document.getElementById("missionProgressText");
    const progressFill = document.getElementById("missionProgressFill");
    
    if (progressText) {
      progressText.textContent = `${completed} / ${total} 완료`;
    }
    
    if (progressFill) {
      const percentage = total > 0 ? (completed / total) * 100 : 0;
      progressFill.style.width = `${percentage}%`;
    }
  }

  // 미션 모달 관련 전역 변수
  let currentMission = null;

  // 미션 모달 열기
  window.openMissionModal = (mission) => {
    currentMission = mission;
    
    document.getElementById('missionModalTitle').textContent = mission.title;
    document.getElementById('missionModalDescription').textContent = mission.description || '상대방 코드를 입력하세요';
    document.getElementById('missionModalCode').value = '';
    
    // 사진 첨부 섹션 표시/숨김
    const photoInput = document.getElementById('missionModalPhoto');
    const photoPreview = document.getElementById('missionPhotoPreview');
    
    if (mission.photoRequired) {
      if (photoInput) photoInput.parentElement.style.display = 'block';
    } else {
      if (photoInput) photoInput.parentElement.style.display = 'none';
    }
    
    // 초기화
    if (photoInput) photoInput.value = '';
    if (photoPreview) photoPreview.style.display = 'none';
    
    const modal = document.getElementById('missionModal');
    modal.style.setProperty('display', 'flex', 'important');
  };

  // 미션 모달 닫기
  window.closeMissionModal = () => {
    const modal = document.getElementById('missionModal');
    modal.style.setProperty('display', 'none', 'important');
    document.getElementById('missionPhotoPreview').style.display = 'none';
    document.getElementById('missionModalPhoto').value = '';
    currentMission = null;
  };

  // 미션 답변 제출
  window.submitMissionAnswer = async () => {
    if (!currentMission) return;

    const codeInput = document.getElementById('missionModalCode').value.trim();
    if (!codeInput) {
      showToast("상대방 코드를 입력해주세요", "error");
      return;
    }

    let imageUrl = null;
    const file = document.getElementById('missionModalPhoto').files[0];

    if (file) {
      try {
        console.log("📸 미션 사진 업로드 중...");
        imageUrl = await uploadToS3(file, "mission");
        console.log("✅ 미션 사진 업로드 완료:", imageUrl);
      } catch (err) {
        console.error("사진 업로드 실패:", err);
        showToast("사진 업로드 실패", "error");
        return;
      }
    }

    try {
      // missionId 앞에 mission- prefix 추가
      const missionIdWithPrefix = currentMission.id.startsWith('mission-') 
        ? currentMission.id 
        : `mission-${currentMission.id}`;
      
      const payload = {
        roomId,
        missionId: missionIdWithPrefix,
        phone,
        targetCode: codeInput,
        imageUrl // ✅ 사진 URL 함께 전송
      };
      
      console.log("🎯 미션 제출:", payload);
      const res = await callAPI("/missions/submit", "POST", payload);
      console.log("✅ 미션 제출 응답:", res);
      
      // 즉시 포인트 업데이트 (서버 재요청 없이)
      const myPointsEl = document.getElementById('myPoints');
      if (myPointsEl) {
        const currentPoints = parseInt(myPointsEl.textContent) || 0;
        const newPoints = currentPoints + (res.points || 0);
        myPointsEl.textContent = newPoints + '점';
      }
      
      closeMissionModal();
      showToast("미션 완료! " + (res.points >= 0 ? "+" : "") + res.points + "점", "success");
      loadMissions();
    } catch (err) {
      console.error("❌ 미션 제출 실패:", err);
      showToast(err.message || "제출 실패", "error");
    }
  };
});

function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((el) => el.classList.add("hidden"));
  document.getElementById(`tab-${name}`).classList.remove("hidden");
  document.getElementById(`${name}TabBtn`).classList.add("active");
}

