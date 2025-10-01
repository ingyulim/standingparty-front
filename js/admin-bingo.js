const API_BASE = "https://ul4jxnpezi.execute-api.ap-northeast-2.amazonaws.com";

// 5x5 셀에서 데이터 읽어오기
function getGridFromTable() {
  const grid = [];
  for (let i = 0; i < 5; i++) {
    const row = [];
    for (let j = 0; j < 5; j++) {
      const value = document.getElementById(`cell-${i}-${j}`).value.trim();
      if (!value) return null;  // 하나라도 비면 null 반환
      row.push(value);
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

  if (!grid) {
    alert("모든 빙고 칸을 채워주세요. 빈칸이 있습니다.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/bingo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, grid })
    });

    const result = await res.json();
    if (res.ok) {
      document.getElementById("bingo-result").textContent = "✅ 등록 완료";
    } else {
      document.getElementById("bingo-result").textContent = "❌ 등록 실패: " + (result.message || "");
    }
  } catch (err) {
    console.error("빙고 등록 오류:", err);
    document.getElementById("bingo-result").textContent = "❌ 서버 오류가 발생했습니다.";
  }
}

// 기존 빙고 불러와서 폼에 채우기
async function loadBingoForEdit() {
  try {
    const res = await fetch(`${API_BASE}/bingo`, {
      method: "GET"
    });

    const data = await res.json();
    if (!res.ok) {
      document.getElementById("bingo-result").textContent = "❌ 기존 빙고 불러오기 실패: " + (data.message || "");
      return;
    }

    const { title, description, grid } = data;

    document.getElementById("bingo-title").value = title || "";
    document.getElementById("bingo-description").value = description || "";

    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const input = document.getElementById(`cell-${i}-${j}`);
        if (input && grid[i] && grid[i][j]) {
          input.value = grid[i][j];
        }
      }
    }

    document.getElementById("bingo-result").textContent = "📝 기존 빙고 불러오기 완료";

  } catch (err) {
    console.error("기존 빙고 불러오기 오류:", err);
    document.getElementById("bingo-result").textContent = "❌ 서버 오류로 빙고 불러오기 실패";
  }
}

// 페이지 로드시 자동 실행
document.addEventListener("DOMContentLoaded", () => {
  loadBingoForEdit();
});
