// ✅ participant.js 전체 코드 (기존 로직 + missionActive 대응 room.html 연동용)
document.addEventListener("DOMContentLoaded", async () => {
  const roomListDiv = document.getElementById("roomList");
  const joinForm = document.getElementById("joinForm");
  const resultDiv = document.getElementById("result");
  const extraFields = document.getElementById("extraFields");
  let selectedRoomId = null;

  const val = (v) => (v && typeof v === "object" && "S" in v ? v.S : v);
  const get = (obj, key) => val(obj?.[key]);
  const stripRoomPrefix = (s) => (s ? s.replace(/^ROOM#/, "") : s);
  const fmtTime = (s) => {
    const t = get({ s }, "s") || s;
    if (!t) return "";
    const d = new Date(t);
    if (isNaN(d.getTime())) return t;
    return d.toISOString().slice(0, 19).replace("T", " ");
  };

  // 🔹 방 목록 불러오기
  try {
    const rooms = await callAPI("/rooms", "GET");
    roomListDiv.innerHTML = "";

    if (!Array.isArray(rooms) || rooms.length === 0) {
      roomListDiv.innerHTML = `<p>현재 공개된 방이 없습니다.</p>`;
    } else {
      rooms.forEach((item) => {
        const pk = get(item, "PK");
        const id = get(item, "id") || stripRoomPrefix(pk) || "";
        const title = get(item, "title") || get(item, "name") || "제목없음";
        const createdAt = fmtTime(get(item, "createdAt"));

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "room-item";
        btn.dataset.id = id;
        btn.textContent = createdAt ? `${title} (${createdAt})` : title;

        btn.onclick = () => {
          selectedRoomId = id;
          document
            .querySelectorAll(".room-item")
            .forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
        };

        roomListDiv.appendChild(btn);
      });
    }
  } catch (err) {
    console.error(err);
    roomListDiv.textContent = "방 목록을 불러오는 중 오류가 발생했습니다.";
  }

  // 🔸 참여 제출
  joinForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const phone = document.getElementById("phone")?.value?.trim();
    const nickname = document.getElementById("participantName")?.value?.trim();
    const gender = document.getElementById("gender")?.value;

    if (!selectedRoomId) {
      resultDiv.textContent = "방을 먼저 선택해주세요.";
      return;
    }
    if (!phone) {
      resultDiv.textContent = "전화번호를 입력해주세요.";
      return;
    }

    const payload = { roomId: selectedRoomId, phone };
    if (nickname && gender) {
      payload.nickname = nickname;
      payload.gender = gender;
    }

    try {
      const res = await callAPI("/join", "POST", payload);
      console.log("[join response]", res);

      if (res.isNew) {
        if (extraFields) extraFields.style.display = "block";
        resultDiv.textContent =
          "신규 참여자입니다. 닉네임과 성별을 입력 후 다시 ‘파티 참여’를 눌러주세요.";
        return;
      }

      const roomId = res.roomId || selectedRoomId;
      const code = res.code || "";
      const nick = res.nickname || "";

      // 🔍 미션 활성화 여부 체크
      let showMissionTab = false;
      try {
        const meta = await callAPI(`/room/meta?roomId=${roomId}`, "GET");
        showMissionTab = meta?.missionActive === true;
      } catch (err) {
        console.warn("미션 활성화 여부 확인 실패", err);
      }

      // 페이지 이동
      const query = `room.html?roomId=${encodeURIComponent(
        roomId
      )}&phone=${encodeURIComponent(phone)}&code=${encodeURIComponent(
        code
      )}&nickname=${encodeURIComponent(nick)}&mission=${showMissionTab}`;
      window.location.href = query;
    } catch (err) {
      console.error(err);
      resultDiv.textContent = `참여 오류: ${err.message || "알 수 없는 오류"}`;
    }
  });
});