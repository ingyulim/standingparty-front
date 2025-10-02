const API_BASE = "https://ul4jxnpezi.execute-api.ap-northeast-2.amazonaws.com";

// 5x5 셀에서 데이터 읽어오기 (title + question)
function getGridFromTable() {
  const grid = [];
  for (let i = 0; i < 5; i++) {
    const row = [];
    for (let j = 0; j < 5; j++) {
      const titleVal = document.getElementById(`title-${i}-${j}`).value.trim();
      const questionVal = document.getElementById(`question-${i}-${j}`).value.trim();
      if (!titleVal || !questionVal) {
        alert(`(${i + 1}, ${j + 1}) 칸의 제목/질문이 비어 있습니다.`);
        return null;
      }
      row.push({ title: titleVal, question: questionVal });
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
    // getGridFromTable에서 alert 처리함
    return;
  }

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
      
      // 3초 후 메시지 제거
      setTimeout(() => {
        resultDiv.style.display = "none";
      }, 3000);
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
    const res = await fetch(`${API_BASE}/bingo`, {
      method: "GET",
    });

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
          document.getElementById(`title-${i}-${j}`).value =
            grid[i][j].title || "";
          document.getElementById(`question-${i}-${j}`).value =
            grid[i][j].question || "";
        }
      }
    }

    document.getElementById("bingo-result").textContent =
      "📝 기존 빙고 불러오기 완료";
  } catch (err) {
    console.error("기존 빙고 불러오기 오류:", err);
    document.getElementById("bingo-result").textContent =
      "❌ 서버 오류로 빙고 불러오기 실패";
  }
}

// 페이지 로드시 자동 실행
document.addEventListener("DOMContentLoaded", () => {
  loadBingoForEdit();
});
