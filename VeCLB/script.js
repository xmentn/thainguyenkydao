// ============================================================================
// LOGIC XỬ LÝ PHÂN HỆ HỘI VIÊN & QUY CHẾ CLB - FIRESTORE 100%
// ============================================================================
var QUYEN_HAN = getQuyenHan();
var linkQuyCheGoc = ""; // Lưu link thô cấu hình

// Khởi chạy hệ thống ngay khi trang web tải xong giao diện
document.addEventListener("DOMContentLoaded", function () {
  // 1. Kiểm tra đặc quyền Admin để mở rộng bảng điều khiển quản trị viên
  if (QUYEN_HAN === "admin") {
    let adminBox = document.getElementById("khoiAdminQuyChe");
    if (adminBox) adminBox.style.display = "block";

    if (document.getElementById("th_sdt"))
      document.getElementById("th_sdt").style.display = "table-cell";
    if (document.getElementById("th_hanhDong"))
      document.getElementById("th_hanhDong").style.display = "table-cell";
  }

  // 2. Kích hoạt hiển thị khung đọc tài liệu quy chế PDF trực tuyến từ Firebase
  taiCấuHinhQuyChe();

  // 3. Thực hiện tải danh sách hội viên chính thức từ Firebase Cloud Firestore
  taiDanhSachHoiVien();
});

// ============================================================================
// CHỨC NĂNG 1: QUẢN LÝ VÀ CHUYỂN ĐỔI LINK FILE PDF QUY CHẾ TRỰC TUYẾN
// ============================================================================

async function taiCấuHinhQuyChe() {
  const container = document.getElementById("khungHienThiQuyChe");
  if (!container) return;

  try {
    // Đọc link quy chế được lưu tại collection "CauHinh" có mã tài liệu là "QuyChe"
    const docSnap = await db.collection("CauHinh").doc("QuyChe").get();

    if (docSnap.exists && docSnap.data().link) {
      linkQuyCheGoc = docSnap.data().link;
      if (document.getElementById("txtLinkQuyChe")) {
        document.getElementById("txtLinkQuyChe").value = linkQuyCheGoc;
      }

      // THUẬT TOÁN BẺ LINK GOOGLE DRIVE SANG DẠNG PREVIEW ĐỂ NHÚNG KHÔNG BỊ CHẶN
      let urlHienThi = linkQuyCheGoc;
      if (linkQuyCheGoc.includes("drive.google.com")) {
        // Nếu link có dạng /file/d/XYZ/view?usp=sharing hoặc tương tự
        if (linkQuyCheGoc.includes("/view")) {
          urlHienThi = linkQuyCheGoc.split("/view")[0] + "/preview";
        } else if (!linkQuyCheGoc.endsWith("/preview")) {
          // Trường hợp link thô chỉ tới ID, làm sạch rồi bọc đuôi /preview
          urlHienThi =
            linkQuyCheGoc.trim().replace(/\?usp=sharing/g, "") + "/preview";
        }
      }

      container.innerHTML = `
        <div class="d-flex justify-content-end mb-3">
          <a href="${linkQuyCheGoc}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill fw-bold">
            <i class="fas fa-external-link-alt me-1"></i> Mở bằng tab mới / Tải Quy chế
          </a>
        </div>
        <div class="ratio ratio-4x3 border rounded-3 overflow-hidden shadow-sm bg-light" style="min-height: 600px;">
          <iframe src="${urlHienThi}" allow="autoplay"></iframe>
        </div>
      `;
    } else {
      container.innerHTML = `<div class="alert alert-light text-muted py-4">Ban chủ nhiệm chưa cấu hình link tài liệu Quy chế hoạt động.</div>`;
    }
  } catch (e) {
    console.error("Lỗi lấy cấu hình quy chế:", e);
    container.innerHTML = `<div class="alert alert-danger py-3">Không thể kết nối CSDL lấy file văn bản Quy chế.</div>`;
  }
}

// Lưu link cấu hình quy chế mới (Admin)
async function capNhatLinkQuyChe() {
  const txtLink = document.getElementById("txtLinkQuyChe");
  if (!txtLink || !txtLink.value.trim()) {
    Swal.fire(
      "Thông báo",
      "Vui lòng dán link Google Drive file Quy chế trước!",
      "warning",
    );
    return;
  }

  Swal.fire({
    title: "Đang lưu cấu hình...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  try {
    await db.collection("CauHinh").doc("QuyChe").set({
      link: txtLink.value.trim(),
      ngayCapNhat: new Date().toISOString(),
    });

    Swal.fire(
      "Thành công",
      "Văn bản quy chế mới đã được áp dụng toàn hệ thống!",
      "success",
    );
    taiCấuHinhQuyChe();
  } catch (err) {
    console.error(err);
    Swal.fire(
      "Thất bại",
      "Lỗi phân quyền Firebase khi cập nhật cấu hình!",
      "error",
    );
  }
}

// --- HÀM TẢI DANH SÁCH HỘI VIÊN (ĐÃ TỐI ƯU ÉP KIỂU AN TOÀN CHO FIREBASE) ---
async function taiDanhSachHoiVien() {
  const container = document.getElementById("bangHoiVien");
  const countLabel = document.getElementById("tongSoHoiVien");
  if (!container) return;

  container.innerHTML = `<tr><td colspan="${QUYEN_HAN === "admin" ? 6 : 4}" class="text-center py-4 text-muted fst-italic">Đang tải danh sách thành viên từ CSDL Firebase...</td></tr>`;

  try {
    // Tải toàn bộ danh sách hội viên từ hàm callAPI chung của config.js
    const data = await callAPI("getHoiVien");

    if (!data || data.length === 0) {
      container.innerHTML = `<tr><td colspan="${QUYEN_HAN === "admin" ? 6 : 4}" class="text-center py-4 text-muted">Hệ thống chưa ghi nhận dữ liệu hội viên nào.</td></tr>`;
      if (countLabel) countLabel.innerText = "0";
      return;
    }

    // --- THUẬT TOÁN TÁCH TÊN VÀ SẮP XẾP TIẾNG VIỆT CHUẨN XÁC ---
    const layTenChinh = (hoTenFull) => {
      if (!hoTenFull) return "";
      let parts = hoTenFull.trim().split(" ");
      return parts[parts.length - 1];
    };

    data.sort((a, b) => {
      // 1. Ưu tiên đưa người "Chưa duyệt" lên hàng đầu để Ban chủ nhiệm nhìn thấy ngay
      let uuTienA = a.status === "Chưa duyệt" ? 0 : 1;
      let uuTienB = b.status === "Chưa duyệt" ? 0 : 1;
      if (uuTienA !== uuTienB) return uuTienA - uuTienB;

      // 2. Sắp xếp theo tên chính (A-Z) chuẩn từ ngữ Tiếng Việt
      let tenA = layTenChinh(a.hoTen);
      let tenB = layTenChinh(b.hoTen);
      let soSanhTen = tenA.localeCompare(tenB, "vi");
      if (soSanhTen !== 0) return soSanhTen;

      return (a.hoTen || "").localeCompare(b.hoTen || "", "vi");
    });

    // --- TIẾN HÀNH DỰNG GIAO DIỆN BẢNG ---
    var html = "";
    data.forEach((hv, i) => {
      let isApproved =
        hv.status === "Đã duyệt" || hv.status === "Thành viên chính thức";

      let statusBadge = isApproved
        ? `<span class="badge bg-success-subtle text-success border border-success border-opacity-25 px-2 py-1.5 rounded"><i class="fas fa-check-circle me-1"></i>Thành viên chính thức</span>`
        : `<span class="badge bg-warning-subtle text-warning border border-warning border-opacity-25 px-2 py-1.5 rounded"><i class="fas fa-clock me-1"></i>Chưa được duyệt</span>`;

      // ÉP KIỂU AN TOÀN: Chuyển đổi số điện thoại dạng Number thành String và bù số 0 nếu thiếu
      let sdtTho =
        hv.soDienThoai !== undefined && hv.soDienThoai !== null
          ? String(hv.soDienThoai).trim()
          : "";
      if (sdtTho !== "" && !sdtTho.startsWith("0") && sdtTho.length === 9) {
        sdtTho = "0" + sdtTho; // Tự động thêm lại số 0 cho đẹp giao diện
      }

      let sdtRow =
        QUYEN_HAN === "admin"
          ? `<td class="text-center text-secondary small fw-bold">${sdtTho || "-"}</td>`
          : "";

      // Khử ký tự lạ để tránh lỗi cú pháp khi truyền vào hàm onclick
      let safeId = String(hv.id || "").replace(/'/g, "\\'");
      let safeTen = String(hv.hoTen || "").replace(/'/g, "\\'");
      let safeSdt = sdtTho.replace(/'/g, "\\'");
      let safeDiaChi = String(hv.diaChi || "").replace(/'/g, "\\'");
      let safeStatus = String(hv.status || "").replace(/'/g, "\\'");

      let hanhDongRow = "";
      if (QUYEN_HAN === "admin") {
        let btnDuyet = !isApproved
          ? `<button class="btn btn-sm btn-success px-2 py-1 me-1 shadow-sm" title="Duyệt ngay" onclick="pheDuyetThanhVien('${safeId}', '${safeTen}')"><i class="fas fa-check"></i></button>`
          : `<button class="btn btn-sm btn-secondary px-2 py-1 me-1 opacity-25" disabled><i class="fas fa-check"></i></button>`;

        let btnSua = `<button class="btn btn-sm btn-primary px-2 py-1 me-1 shadow-sm" title="Sửa thông tin" onclick="moModalSuaHoiVien('${safeId}', '${safeTen}', '${safeSdt}', '${safeDiaChi}', '${safeStatus}')"><i class="fas fa-edit"></i></button>`;

        let btnXoa = `<button class="btn btn-sm btn-danger px-2 py-1 shadow-sm" title="Xóa hội viên" onclick="xoaHoiVien('${safeId}', '${safeTen}')"><i class="fas fa-trash-alt"></i></button>`;

        hanhDongRow = `<td class="text-center text-nowrap">${btnDuyet}${btnSua}${btnXoa}</td>`;
      }

      html += `<tr>
        <td class="text-center fw-bold text-muted">${i + 1}</td>
        <td class="fw-bold text-dark ps-2">${hv.hoTen || "Chưa rõ tên"}</td>
        <td class="text-muted small">${hv.diaChi || "-"}</td>
        ${sdtRow}
        <td class="text-center">${statusBadge}</td>
        ${hanhDongRow}
      </tr>`;
    });

    container.innerHTML = html;
    if (countLabel) countLabel.innerText = data.length;
  } catch (err) {
    console.error("Lỗi dựng bảng hội viên:", err);
    container.innerHTML = `<tr><td colspan="${QUYEN_HAN === "admin" ? 6 : 4}" class="text-center py-4 text-danger">Lỗi xử lý dữ liệu cấu trúc Firestore. Vui lòng kiểm tra Console.</td></tr>`;
  }
}

function moModalSuaHoiVien(id, ten, sdt, diachi, status) {
  document.getElementById("sua_id").value = id;
  document.getElementById("sua_hoTen").value = ten;
  document.getElementById("sua_soDienThoai").value = sdt;
  document.getElementById("sua_diaChi").value = diachi;

  let selectStatus = document.getElementById("sua_status");
  if (status === "Đã duyệt" || status === "Thành viên chính thức") {
    selectStatus.value = "Đã duyệt";
  } else {
    selectStatus.value = "Chưa duyệt";
  }

  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalSuaHoiVien"),
  ).show();
}

async function xuLySuaHoiVien(event) {
  event.preventDefault();
  const id = document.getElementById("sua_id").value;
  const hoTen = document.getElementById("sua_hoTen").value.trim();
  const soDienThoai = document.getElementById("sua_soDienThoai").value.trim();
  const diaChi = document.getElementById("sua_diaChi").value.trim();
  const status = document.getElementById("sua_status").value;

  let dataUpdate = {
    id: id,
    hoTen: hoTen,
    soDienThoai: soDienThoai,
    diaChi: diaChi,
    status: status,
  };

  Swal.fire({
    title: "Đang lưu thay đổi...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  var res = await callAPI("saveHoiVien", dataUpdate);
  if (res && res.success) {
    Swal.fire("Thành công!", res.message, "success");
    bootstrap.Modal.getInstance(
      document.getElementById("modalSuaHoiVien"),
    ).hide();
    taiDanhSachHoiVien();
  } else {
    Swal.fire(
      "Lỗi cập nhật",
      "Không thể ghi tệp thay đổi lên Firebase.",
      "error",
    );
  }
}

async function xoaHoiVien(id, ten) {
  Swal.fire({
    title: "Xóa vĩnh viễn?",
    text: `Hủy bỏ hoàn toàn hồ sơ hội viên của anh "${ten}" khỏi CSDL Firebase?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Đồng ý xóa",
    cancelButtonText: "Hủy",
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: "Đang xóa dữ liệu...",
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
      });

      try {
        await db.collection("HoiVien").doc(id).delete();
        Swal.fire(
          "Đã xóa!",
          "Hồ sơ thành viên đã bốc hơi khỏi hệ thống.",
          "success",
        );
        taiDanhSachHoiVien();
      } catch (err) {
        Swal.fire(
          "Lỗi xóa",
          "Có xung đột hoặc lỗi phân quyền kết nối Firebase.",
          "error",
        );
      }
    }
  });
}

async function xuLyDangKyHoiVien(event) {
  event.preventDefault();
  const hoTen = document.getElementById("dk_hoTen").value.trim();
  const soDienThoai = document.getElementById("dk_soDienThoai").value.trim();
  const diaChi = document.getElementById("dk_diaChi").value.trim();

  Swal.fire({
    title: "Đang gửi đơn...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  var res = await callAPI("saveHoiVien", {
    hoTen: hoTen,
    soDienThoai: soDienThoai,
    diaChi: diaChi,
  });
  if (res && res.success) {
    Swal.fire(
      "Gửi đơn thành công!",
      "Thông tin của bạn đã nằm trong danh sách chờ duyệt của Ban chủ nhiệm.",
      "success",
    );
    bootstrap.Modal.getInstance(
      document.getElementById("modalDangKyHoiVien"),
    ).hide();
    document.getElementById("formDangKyHoiVien").reset();
    taiDanhSachHoiVien();
  } else {
    Swal.fire(
      "Lỗi đơn",
      "Không thể đẩy thông tin lên máy chủ Firebase.",
      "error",
    );
  }
}

async function pheDuyetThanhVien(id, ten) {
  Swal.fire({
    title: "Phê duyệt hội viên chính thức?",
    text: `Xác nhận phê chuẩn cấp quyền hoạt động chính thức cho anh "${ten}"?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    confirmButtonText: "Đồng ý duyệt",
    cancelButtonText: "Hủy",
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: "Đang duyệt hồ sơ...",
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
      });

      try {
        await db.collection("HoiVien").doc(id).update({ status: "Đã duyệt" });
        Swal.fire(
          "Phê duyệt hoàn tất!",
          `Anh ${ten} đã trở thành hội viên chính thức.`,
          "success",
        );
        taiDanhSachHoiVien();
      } catch (err) {
        Swal.fire(
          "Lỗi phê duyệt",
          "Không thể ghi nhận trạng thái mới lên Firebase.",
          "error",
        );
      }
    }
  });
}

function locHoiVien() {
  let val = document
    .getElementById("timKiemHoiVien")
    .value.toLowerCase()
    .trim();
  let count = 0;

  document.querySelectorAll("#bangHoiVien tr").forEach((r) => {
    let nameCell = r.querySelectorAll("td")[1]?.textContent.toLowerCase() || "";
    if (nameCell.includes(val)) {
      r.style.display = "";
      count++;
    } else {
      r.style.display = "none";
    }
  });
  if (document.getElementById("tongSoHoiVien")) {
    document.getElementById("tongSoHoiVien").innerText = count;
  }
}
