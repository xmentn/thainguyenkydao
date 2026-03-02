// ============================================================
// CẤU HÌNH DÙNG CHUNG CHO TOÀN BỘ HỆ THỐNG
// ============================================================
const API_URL =
  "https://script.google.com/macros/s/AKfycbw5OVhG9_Ehj7_kiyKGsr24ug7hQ3C7_zkbX_dgDT49v5ZvQqZCx8XP8QQ40FFhMTrGeA/exec";

// Hàm lấy quyền hạn từ Bộ nhớ phiên (Thay cho biến toàn cục cũ)
function getQuyenHan() {
  return sessionStorage.getItem("QUYEN_HAN") || "";
}
function getUserName() {
  return sessionStorage.getItem("USER_NAME") || "";
}

// Hàm Đăng xuất chung
function dangXuatChung() {
  Swal.fire({
    title: "Đăng xuất?",
    text: "Bạn muốn thoát khỏi hệ thống?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Đồng ý",
    cancelButtonText: "Không",
  }).then((result) => {
    if (result.isConfirmed) {
      sessionStorage.clear(); // Xóa sạch bộ nhớ
      window.location.href = "../index.html"; // Đẩy về trang chủ gốc
    }
  });
}

// Hàm gọi API chung
async function callAPI(action, params = {}) {
  var loadingEl = document.getElementById("loadingOverlay");
  if (loadingEl) loadingEl.classList.add("active");

  let url = API_URL + "?action=" + action;
  if (
    ["save", "update", "saveGiaiDau", "saveKyThu", "deleteKyThu"].includes(
      action,
    )
  ) {
    url += "&data=" + encodeURIComponent(JSON.stringify(params));
  } else {
    const searchParams = new URLSearchParams(params);
    url += "&" + searchParams.toString();
  }

  try {
    // Thêm thuộc tính redirect: 'follow' để chống lỗi chặn chuyển hướng trên tên miền thật
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
    });

    const json = await response.json();
    if (loadingEl) loadingEl.classList.remove("active");
    return json;
  } catch (error) {
    if (loadingEl) loadingEl.classList.remove("active");
    console.error("Lỗi API:", error);

    // Thêm log để dễ bắt bệnh trên tên miền thật
    console.log("Đường dẫn API đang gọi:", url);

    alert(
      "Lỗi kết nối đến Server Google. Hãy ấn F12 -> tab Console để xem chi tiết!",
    );
    return null;
  }
}
