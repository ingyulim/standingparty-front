const API_BASE = "https://ul4jxnpezi.execute-api.ap-northeast-2.amazonaws.com";

// 5x5 셀에서 데이터 읽어오기 (title + question + requirePhoto)
function getGridFromTable() {
  const grid = [];
  for (let i = 0; i < 5; i++) {
    const row = [];
    for (let j = 0; j < 5; j++) {
      const titleVal = document.getElementById(`title-${i}-${j}`).value.trim();
      const questionVal = document.getElementById(`question-${i}-${j}`).value.trim();
      const requirePhoto = document.getElementById(`photo-${i}-${j}`).checked;

      if (!titleVal || !questionVal) {
        alert(`(${i + 1}, ${j + 1}) 칸의 제목/질문이 비어 있습니다.`);
        return null;
      }
      row.push({ title: titleVal, question: questionVal, requirePhoto });
    }
    grid.push(row);
  }
  return grid;
}

// 등록 요청
async function uploadBingo() {
  const title = document.getElementById("bingo-title").value.trim();
  const description = document.getElementById("bingo-description").value.trim();
  const grid = getGridFromTable();

  if (!title || !description) {
    alert("제목과 설명을 모두 입력해주세요.");
    return;
  }
  if (!grid) return;

  try {
    console.log("빙고 등록 시도:", { title, description, grid });
    const res = await fetch(`${API_BASE}/bingo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, grid })
    });
    const result = await res.json();
    console.log("빙고 등록 응답:", result);
    
    const resultDiv = document.getElementById("bingo-result");
    if (res.ok) {
      resultDiv.textContent = "✅ 빙고가 성공적으로 등록되었습니다!";
      resultDiv.style.color = "#2ed573";
      resultDiv.style.background = "#f0fff4";
      resultDiv.style.padding = "12px";
      resultDiv.style.borderRadius = "8px";
      resultDiv.style.marginTop = "16px";
      resultDiv.style.display = "block";
      setTimeout(() => { resultDiv.style.display = "none"; }, 3000);
    } else {
      resultDiv.textContent = "❌ 등록 실패: " + (result.message || "");
      resultDiv.style.color = "#e53e3e";
      resultDiv.style.background = "#fff5f5";
      resultDiv.style.padding = "12px";
      resultDiv.style.borderRadius = "8px";
      resultDiv.style.marginTop = "16px";
      resultDiv.style.display = "block";
    }
  } catch (err) {
    console.error("빙고 등록 오류:", err);
    const resultDiv = document.getElementById("bingo-result");
    resultDiv.textContent = "❌ 서버 오류가 발생했습니다: " + err.message;
    resultDiv.style.color = "#e53e3e";
    resultDiv.style.background = "#fff5f5";
    resultDiv.style.padding = "12px";
    resultDiv.style.borderRadius = "8px";
    resultDiv.style.marginTop = "16px";
    resultDiv.style.display = "block";
  }
}

// 기존 빙고 불러와서 폼에 채우기
async function loadBingoForEdit() {
  try {
    const res = await fetch(`${API_BASE}/bingo`, { method: "GET" });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById("bingo-result").textContent =
        "❌ 기존 빙고 불러오기 실패: " + (data.message || "");
      return;
    }

    const { title, description, grid } = data;
    document.getElementById("bingo-title").value = title || "";
    document.getElementById("bingo-description").value = description || "";

    // 기존 빙고 값 주입
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (grid[i] && grid[i][j]) {
          document.getElementById(`title-${i}-${j}`).value = grid[i][j].title || "";
          document.getElementById(`question-${i}-${j}`).value = grid[i][j].question || "";
          document.getElementById(`photo-${i}-${j}`).checked = !!grid[i][j].requirePhoto;
        }
      }
    }
    document.getElementById("bingo-result").textContent = "📝 기존 빙고 불러오기 완료";
  } catch (err) {
    console.error("기존 빙고 불러오기 오류:", err);
    document.getElementById("bingo-result").textContent = "❌ 서버 오류로 빙고 불러오기 실패";
  }
}

// 참여자 제출 내역 불러오기
async function loadBingoSubmissions(roomId) {
  try {
    const res = await fetch(`${API_BASE}/bingo/submissions?roomId=${roomId}`);
    
    if (!res.ok) {
      throw new Error(`API 오류: ${res.status}`);
    }
    
    const data = await res.json();
    const list = Array.isArray(data.submissions) ? data.submissions : (Array.isArray(data) ? data : []);

    const container = document.getElementById("submissionList");
    if (!container) {
      console.error("❌ submissionList 컨테이너를 찾을 수 없습니다.");
      return;
    }
    
    container.innerHTML = "";

    if (list.length === 0) {
      container.innerHTML = "<p style='color: #999; text-align: center; padding: 20px;'>제출 내역이 없습니다.</p>";
      return;
    }

    list.forEach((s) => {
      const div = document.createElement("div");
      div.className = "card-item";
      div.style.cssText = "margin-bottom: 16px; padding: 16px; background: #f7fafc; border-radius: 8px; border: 1px solid #e2e8f0; overflow: visible;";

      const nickname = s.nickname || "(닉네임 없음)";
      const question = s.question || `위치: (${s.row ?? "-"}, ${s.col ?? "-"})`;
      const answer = s.answer || "(답변 없음)";
      const photoUrl = s.photoUrl ? encodeURI(s.photoUrl) : null;

      div.innerHTML = `
        <strong style="font-size: 16px; color: #2d3748;">${nickname}</strong><br/>
        <span style="color: #4a5568;">❓ 질문: ${question}</span><br/>
        <span style="color: #2d3748;">💬 답변: ${answer}</span><br/>
        ${photoUrl ? `<img src="${photoUrl}" style="max-width: 150px; width: auto; height: auto; display: block; margin-top: 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="window.openImageModal('${photoUrl}')" onerror="this.style.display='none'; this.nextSibling.style.display='block';" /><span style="display:none; color: #e53e3e; font-size: 12px;">❌ 이미지 로드 실패</span>` : ""}
      `;

      // 반려 버튼 추가
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "❌ 반려";
      deleteButton.className = "btn btn-danger";
      deleteButton.style.cssText = "margin-top: 12px; padding: 8px 16px; background: #e53e3e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;";
      deleteButton.onclick = async () => {
        if (confirm("이 제출을 반려하시겠습니까?")) {
          await deleteSubmission({
            roomId,
            row: s.row,
            col: s.col,
            phone: s.phone,
            photoUrl: s.photoUrl
          });
          loadBingoSubmissions(roomId);
        }
      };
      div.appendChild(deleteButton);

      container.appendChild(div);
    });
  } catch (err) {
    console.error("제출 내역 불러오기 실패", err);
    const container = document.getElementById("submissionList");
    if (container) {
      container.innerHTML = "<p style='color: #e53e3e; text-align: center; padding: 20px;'>❌ 제출 내역 불러오기 실패</p>";
    }
  }
}

// 개별 제출 반려
async function deleteSubmission({ roomId, row, col, phone, photoUrl }) {
  try {
    const res = await fetch(`${API_BASE}/bingo/submissions/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, row, col, phone, photoUrl })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    alert("✅ 반려 완료");
  } catch (err) {
    alert("❌ 반려 실패: " + err.message);
  }
}

// 전체 제출 삭제
async function handleBulkDelete() {
  if (!confirm("정말로 이 방의 모든 제출 답변을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;

  try {
    const roomId = new URLSearchParams(location.search).get("roomId");
    const res = await fetch(`${API_BASE}/bingo/submissions/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, bulkDelete: true })
    });

    const result = await res.json();
    alert(result.message || "삭제 완료");
    loadBingoSubmissions(roomId);
  } catch (err) {
    alert("❌ 삭제 중 오류 발생: " + err.message);
  }
}

// 이미지 모달 열기
window.openImageModal = (imageUrl) => {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 9999; cursor: pointer;';
  
  const img = document.createElement('img');
  img.src = imageUrl;
  img.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);';
  
  modal.appendChild(img);
  modal.onclick = () => modal.remove();
  document.body.appendChild(modal);
};

// 페이지 로드시 자동 실행
document.addEventListener("DOMContentLoaded", () => {
  const roomIdFromQuery = new URLSearchParams(location.search).get("roomId");
  
  if (roomIdFromQuery) {
    // 특정 방의 제출 내역 보기 모드 - 빙고 등록 폼 숨기기
    const bingoForm = document.getElementById('bingoForm');
    const bingoResult = document.getElementById('bingo-result');
    const sectionTitle = document.querySelector('.section-title');
    const submissionList = document.getElementById('submissionList');
    
    if (bingoForm) bingoForm.style.display = 'none';
    if (bingoResult) bingoResult.style.display = 'none';
    if (sectionTitle) sectionTitle.textContent = '📋 빙고 제출 내역';
    
    // 제출 내역 컨테이너 높이 확장
    if (submissionList) {
      submissionList.style.maxHeight = 'none';
      submissionList.style.minHeight = '400px';
    }
    
    // 전체 삭제 버튼 표시
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
      bulkDeleteBtn.style.display = 'block';
    }
    
    loadBingoSubmissions(roomIdFromQuery);
  } else {
    // 빙고 관리 모드 - 제출 내역 섹션 숨기기
    loadBingoForEdit();
    
    const submissionSection = document.getElementById("submissionList")?.closest('.form-group');
    if (submissionSection) {
      submissionSection.style.display = 'none';
    }
  }
});
