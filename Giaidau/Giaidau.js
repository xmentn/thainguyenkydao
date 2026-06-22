// ==========================================
// LOGIC XỬ LÝ TRANG GIẢI ĐẤU - FIRESTORE
// ==========================================
var QUYEN_HAN = getQuyenHan();
var maGiaiKetQuaHienTai = "";

document.addEventListener("DOMContentLoaded", function () {
  if (QUYEN_HAN === "admin") {
    var btnAdmin = document.getElementById("btn-admin-tour");
    var colAdmin = document.getElementById("col-admin-action");
    var btnLogout = document.getElementById("btn-logout");
    if (btnAdmin) btnAdmin.style.display = "block";
    if (colAdmin) colAdmin.style.display = "table-cell";
    if (btnLogout) btnLogout.style.display = "inline-block";
  }
  taiDuLieuGiaiDau();
});

// --- 1. TẢI DANH SÁCH GIẢI ĐẤU (FIRESTORE - ĐÃ THÊM STT) ---
async function taiDuLieuGiaiDau() {
  const container = document.getElementById("danhSachGiaiDau");
  if (!container) return;
  container.innerHTML =
    '<tr><td colspan="8" class="text-center py-4 text-muted fst-italic">Đang tải dữ liệu từ CSDL Firebase...</td></tr>';

  // Lấy số lượng đã đăng ký từ Firebase KyThu để làm bộ đếm
  let countMap = {};
  try {
    const snapshot = await db.collection("KyThu").get();
    snapshot.forEach((doc) => {
      let item = doc.data();
      let m = item.maGiai || item.magiai;
      if (m) countMap[m] = (countMap[m] || 0) + 1;
    });
  } catch (e) {
    console.error("Lỗi đếm số lượng kỳ thủ:", e);
  }

  // Tải danh sách giải đấu từ Firebase
  const data = await callAPI("getGiaiDau");

  if (!data || data.length === 0) {
    container.innerHTML =
      '<tr><td colspan="8" class="text-center py-4 text-muted">Chưa có thông tin giải đấu nào trên Firebase.</td></tr>';

    // Nếu không có dữ liệu, gán hiển thị 0 giải đấu
    const lblTong = document.getElementById("tongSoGiaiDauHienThi");
    if (lblTong) lblTong.innerText = "0";
    return;
  }

  // TỰ ĐỘNG ĐIỀN TỔNG SỐ GIẢI ĐẤU VÀO DÒNG CHỮ Ở ĐẦU TABLE
  const lblTong = document.getElementById("tongSoGiaiDauHienThi");
  if (lblTong) {
    lblTong.innerText = data.length;
  }

  var html = "";
  data.forEach((item, i) => {
    let ma = item.maGiai || item.magiai || item.id || "";
    let ten = item.tenGiai || item.tengiai || "Chưa đặt tên";
    let dv = item.donVi || item.donvi || "Hệ thống tổ chức";
    let tg = item.thoiGian || item.thoigian;
    let han = item.hanDangKy || item.handangky;
    let maxP = item.soLuongToiDa || item.soluongtoida;
    let linkDL = item.linkDieuLe || item.linkdieule || "";

    let safeTen = ten.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    let currentCount = countMap[ma] || 0;
    let isFull = maxP && currentCount >= parseInt(maxP);

    // Xử lý ngày thi đấu
    let hienThiThoiGian = "Chưa xếp lịch";
    if (tg) {
      let dTG = new Date(tg);
      if (!isNaN(dTG.getTime())) {
        hienThiThoiGian = `${("0" + dTG.getDate()).slice(-2)}/${("0" + (dTG.getMonth() + 1)).slice(-2)}/${dTG.getFullYear()}`;
      }
    }

    // Xử lý hạn đăng ký
    let hienThiHan = "";
    let isExpired = false;
    if (han) {
      let dHan = new Date(han);
      if (!isNaN(dHan.getTime())) {
        let strHan = `${("0" + dHan.getHours()).slice(-2)}:${("0" + dHan.getMinutes()).slice(-2)} ngày ${("0" + dHan.getDate()).slice(-2)}/${("0" + (dHan.getMonth() + 1)).slice(-2)}/${dHan.getFullYear()}`;
        isExpired = new Date().getTime() > dHan.getTime();
        hienThiHan = `<div class="small mt-1 ${isExpired ? "text-danger fw-bold" : "text-success"}" style="font-size: 11px;">
                        <i class="fas ${isExpired ? "fa-times-circle" : "fa-clock"} me-1"></i>
                        ${isExpired ? "Đã hết hạn ĐK" : "Hạn ĐK: " + strHan}
                      </div>`;
      }
    }

    if (isFull) {
      hienThiHan += `<div class="small mt-1 text-danger fw-bold" style="font-size: 11px;"><i class="fas fa-user-slash me-1"></i>Đã đủ số lượng (${currentCount}/${maxP})</div>`;
    } else if (maxP && !isExpired) {
      hienThiHan += `<div class="small mt-1 text-primary fw-bold" style="font-size: 11px;"><i class="fas fa-users me-1"></i>Đã ĐK: ${currentCount}/${maxP}</div>`;
    }

    // Xử lý nút kết quả
    let btnKetQua =
      QUYEN_HAN === "admin"
        ? `<button class="btn btn-sm btn-outline-info rounded-pill border shadow-sm bg-white text-info fw-bold mb-1" style="font-size:11px" onclick="xemKetQua('${ma}', '${safeTen}')"><i class="fas fa-eye me-1"></i>Xem KQ</button><br>
           <button class="btn btn-sm btn-dark rounded-pill border shadow-sm" style="font-size:11px" onclick="moModalNhapKetQua('${ma}', '${safeTen}')"><i class="fas fa-trophy me-1"></i>Nhập KQ</button>`
        : `<button class="btn btn-sm btn-outline-info rounded-pill border shadow-sm bg-white text-info fw-bold" style="font-size:12px" onclick="xemKetQua('${ma}', '${safeTen}')"><i class="fas fa-eye me-1"></i>Xem KQ</button>`;

    // Xử lý nút Đăng ký
    let btnDangKy =
      isExpired || isFull
        ? `<button class="btn btn-sm btn-secondary rounded-pill fw-bold mb-1" style="font-size:11px" onclick="Swal.fire('Đã đóng', '${isFull ? "Giải đấu này đã đủ số lượng kỳ thủ tối đa!" : "Giải đấu này đã hết hạn đăng ký!"}', 'warning')"><i class="fas fa-lock me-1"></i>Đăng ký</button>`
        : `<button class="btn btn-sm btn-success rounded-pill fw-bold mb-1" style="font-size:11px" onclick="moModalDangKy('${ma}', '${safeTen}')"><i class="fas fa-edit"></i> Đăng ký</button>`;

    let btnDieuLe = linkDL
      ? `<button class="btn btn-sm btn-outline-danger rounded-pill fw-bold border shadow-sm bg-white text-danger px-2.5" style="font-size:11px" onclick="xemDieuLePdf('${linkDL}', '${safeTen}')"><i class="fas fa-file-pdf me-1"></i>Xem điều lệ</button>`
      : `<span class="text-muted small"><i>Chưa gắn</i></span>`;

    let adminAction = "";
    if (QUYEN_HAN === "admin") {
      let itemStr = JSON.stringify(item).replace(/"/g, "&quot;");
      adminAction = `<td class="text-center align-middle">
        <button class="btn btn-sm btn-outline-primary p-1 me-2" title="Sửa" onclick='moModalSuaGiaiDau(${itemStr})'><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-danger p-1" title="Xóa" onclick="xoaGiaiDau('${ma}')"><i class="fas fa-trash"></i></button>
      </td>`;
    }

    html += `<tr>
        <td class="text-center fw-bold text-muted align-middle">${i + 1}</td>
        <td class="ps-3 text-start"><div class="fw-bold text-dark" style="font-size:1.1rem">${ten}</div><div class="small text-muted">Mã: ${ma}</div></td>
        <td class="text-center align-middle"><span class="badge bg-light text-dark border"><i class="fas fa-sitemap me-1 text-muted"></i>${dv}</span></td>
        <td class="text-center align-middle fw-bold text-primary">${hienThiThoiGian} ${hienThiHan}</td>
        <td class="text-center align-middle">${btnDangKy}<br><button class="btn btn-sm btn-light rounded-pill border shadow-sm text-primary mt-1" style="font-size:11px" onclick="xemDanhSachKyThu('${ma}', '${safeTen}')"><i class="fas fa-list me-1"></i>Danh sách</button></td>
        <td class="text-center align-middle">${btnDieuLe}</td> 
        <td class="text-center align-middle">${btnKetQua}</td>
        ${adminAction}
    </tr>`;
  });
  container.innerHTML = html;
}

// --- POPUP XEM PDF ĐIỀU LỆ TRỰC TUYẾN BẰNG IFRAME POPUP ---
function xemDieuLePdf(url, tenGiai) {
  let modalHtml = `
    <div class="modal fade" id="modalXemDieuLe" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg rounded-4">
          <div class="modal-header bg-danger text-white py-2.5 rounded-top-4">
            <h6 class="modal-title fw-bold"><i class="fas fa-file-pdf me-2"></i>Điều lệ: ${tenGiai}</h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-0 bg-light">
            <div class="ratio ratio-4x3" style="min-height: 550px;">
              <iframe src="${url}" allow="autoplay"></iframe>
            </div>
          </div>
          <div class="modal-footer py-1.5 justify-content-between bg-light border-bottom rounded-bottom-4">
            <span class="text-muted small fst-italic">Thái Nguyên Kỳ Đạo</span>
            <a href="${url}" target="_blank" class="btn btn-sm btn-outline-danger rounded-pill fw-bold">
              <i class="fas fa-download me-1"></i> Tải Điều lệ về máy
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  const oldModal = document.getElementById("modalXemDieuLe");
  if (oldModal) oldModal.remove();

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalXemDieuLe"),
  ).show();
}

// --- 2. THÊM / SỬA GIẢI ĐẤU (FIRESTORE) ---
function moModalThemGiaiDau() {
  document.getElementById("formGiaiDau").reset();
  document.getElementById("isEditGiaiDau").value = "false";
  document.getElementById("maGiaiDau").value = "";
  document.getElementById("maGiaiDau").readOnly = false;
  document.getElementById("modalGiaiDauTitle").innerHTML =
    '<i class="fas fa-plus-circle me-2"></i>Thêm Giải Đấu Mới';
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalGiaiDau"),
  ).show();
}

function moModalSuaGiaiDau(item) {
  document.getElementById("formGiaiDau").reset();
  document.getElementById("isEditGiaiDau").value = "true";

  let ma = item.maGiai || item.magiai || item.id || "";
  document.getElementById("maGiaiDau").value = ma;
  document.getElementById("maGiaiDau").readOnly = true;
  document.getElementById("tenGiaiDau").value =
    item.tenGiai || item.tengiai || "";
  document.getElementById("donViToChuc").value = item.donVi || item.donvi || "";
  document.getElementById("soLuongToiDa").value =
    item.soLuongToiDa || item.soluongtoida || "";
  document.getElementById("linkDieuLe").value =
    item.linkDieuLe || item.linkdieule || "";

  // XỬ LÝ CHUẨN ĐỊNH DẠNG NGÀY THI ĐẤU (yyyy-MM-dd)
  let tg = item.thoiGian || item.thoigian;
  if (tg) {
    let dTG = new Date(tg);
    if (!isNaN(dTG.getTime())) {
      let yyyy = dTG.getFullYear();
      let mm = String(dTG.getMonth() + 1).padStart(2, "0");
      let dd = String(dTG.getDate()).padStart(2, "0");
      document.getElementById("thoiGianGiaiDau").value = `${yyyy}-${mm}-${dd}`;
    }
  }

  // XỬ LÝ CHUẨN ĐỊNH DẠNG HẠN ĐĂNG KÝ (yyyy-MM-ddThh:mm)
  let han = item.hanDangKy || item.handangky;
  if (han) {
    let dHan = new Date(han);
    if (!isNaN(dHan.getTime())) {
      let yyyy = dHan.getFullYear();
      let mm = String(dHan.getMonth() + 1).padStart(2, "0");
      let dd = String(dHan.getDate()).padStart(2, "0");
      let hh = String(dHan.getHours()).padStart(2, "0");
      let min = String(dHan.getMinutes()).padStart(2, "0");
      document.getElementById("hanDangKy").value =
        `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }
  }

  document.getElementById("modalGiaiDauTitle").innerHTML =
    '<i class="fas fa-edit me-2"></i>Cập nhật Giải Đấu';
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalGiaiDau"),
  ).show();
}
async function luuGiaiDau() {
  let ten = document.getElementById("tenGiaiDau").value.trim();
  let ma = document.getElementById("maGiaiDau").value.trim();
  let isEdit = document.getElementById("isEditGiaiDau").value === "true";

  if (!ten) {
    Swal.fire("Lỗi", "Vui lòng nhập tên giải đấu!", "error");
    return;
  }
  if (!ma && !isEdit) ma = "GD" + new Date().getTime().toString().slice(-6);

  let updateData = {
    isEdit: isEdit,
    ma: ma,
    ten: ten,
    donVi: document.getElementById("donViToChuc").value.trim() || null,
    thoiGian: document.getElementById("thoiGianGiaiDau").value || null,
    hanDangKy: document.getElementById("hanDangKy").value || null,
    soLuongToiDa: document.getElementById("soLuongToiDa").value
      ? parseInt(document.getElementById("soLuongToiDa").value)
      : null,
    linkDieuLe: document.getElementById("linkDieuLe").value.trim() || null,
  };

  Swal.fire({
    title: "Đang lưu giải đấu...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  var res = await callAPI("saveGiaiDau", updateData);
  if (res && res.success) {
    Swal.fire("Thành công", res.message, "success");
    bootstrap.Modal.getInstance(document.getElementById("modalGiaiDau")).hide();
    taiDuLieuGiaiDau();
  } else {
    Swal.fire("Lỗi", "Không thể ghi nhận dữ liệu giải đấu!", "error");
  }
}

// --- 3. XÓA GIẢI ĐẤU (FIRESTORE) ---
async function xoaGiaiDau(ma) {
  Swal.fire({
    title: "Xóa giải đấu này?",
    text: "Hành động này sẽ xóa hoàn toàn giải đấu cùng toàn bộ danh sách kỳ thủ!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonText: "Hủy bỏ",
    confirmButtonText: "Xóa ngay",
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: "Đang xóa dữ liệu...",
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
      });

      // Bước 1: Quét sạch kỳ thủ của giải này trên Firebase trước
      try {
        const snapshot = await db
          .collection("KyThu")
          .where("maGiai", "==", ma)
          .get();
        let deletePromises = snapshot.docs.map((doc) => doc.ref.delete());
        await Promise.all(deletePromises);
      } catch (e) {
        console.error("Lỗi xóa kỳ thủ con:", e);
      }

      // Bước 2: Gọi callAPI để xóa hẳn tài liệu giải đấu
      var res = await callAPI("deleteGiaiDau", { id: ma });
      if (res && res.success) {
        Swal.fire("Đã xóa!", "Giải đấu đã được xóa khỏi hệ thống.", "success");
        taiDuLieuGiaiDau();
      } else {
        Swal.fire("Lỗi", "Không thể xóa giải đấu!", "error");
      }
    }
  });
}

// --- 4. XÁC NHẬN ĐĂNG KÝ KỲ THỦ MỚI (FIRESTORE) ---
function moModalDangKy(maGiai, tenGiai) {
  document.getElementById("formDangKy").reset();
  document.getElementById("dk_maGiai").value = maGiai;
  document.getElementById("dk_tenGiai").value = tenGiai;
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalDangKy"),
  ).show();
}

async function xacNhanDangKy(event) {
  event.preventDefault();
  let btn = document.getElementById("btnSubmitDangKy");
  btn.disabled = true;

  let data = {
    maGiai: document.getElementById("dk_maGiai").value,
    tenGiai: document.getElementById("dk_tenGiai").value,
    tenKyThu: document.getElementById("dk_tenKyThu").value.trim(),
    clb: document.getElementById("dk_clb").value.trim() || "Tự do",
  };

  Swal.fire({
    title: "Đang đăng ký...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });
  var res = await callAPI("saveKyThu", data);
  btn.disabled = false;

  if (res && res.success) {
    Swal.fire("Thành công", "Bạn đã đăng ký tham gia thành công!", "success");
    bootstrap.Modal.getInstance(document.getElementById("modalDangKy")).hide();
    taiDuLieuGiaiDau();
  } else {
    Swal.fire("Lỗi", "Đăng ký thất bại, vui lòng thử lại!", "error");
  }
}

// --- 5. QUẢN LÝ DANH SÁCH KỲ THỦ ĐÃ ĐĂNG KÝ (FIRESTORE) ---
async function xemDanhSachKyThu(ma, ten) {
  let search = document.getElementById("timKiemKyThuDanhSach");
  if (search) search.value = "";
  document.getElementById("ds_tenGiai").innerText = ten;
  let bang = document.getElementById("bangDanhSachKyThu");
  bang.innerHTML =
    '<tr><td colspan="4" class="text-center py-4 text-muted fst-italic">Đang đọc dữ liệu từ Firebase...</td></tr>';

  if (document.getElementById("btnXuatExcel")) {
    document.getElementById("btnXuatExcel").style.display = "inline-block";
  }
  if (document.getElementById("col-admin-xoa-kythu")) {
    document.getElementById("col-admin-xoa-kythu").style.display =
      QUYEN_HAN === "admin" ? "table-cell" : "none";
  }

  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalDanhSachKyThu"),
  ).show();

  // Đọc danh sách kỳ thủ của giải đấu này
  var data = await callAPI("getDanhSachKyThu", { maGiai: ma });
  veBangDanhSach(data, ma);
}

function veBangDanhSach(data, maGiai) {
  let bang = document.getElementById("bangDanhSachKyThu");
  if (!data || data.length === 0) {
    bang.innerHTML =
      '<tr><td colspan="4" class="text-center py-4 text-muted">Chưa có ai đăng ký tham gia giải này.</td></tr>';
    document.getElementById("ds_tongSo").innerText = "0";
    document.getElementById("ds_tongSo_2").innerText = "0";
    return;
  }

  let html = "";
  data.forEach((kt, i) => {
    let tenKT = kt.ten || "Chưa có tên";
    let safeTen = tenKT.replace(/'/g, "\\'");
    let safeClb = (kt.clb || "Tự do").replace(/'/g, "\\'");

    let adminBtn =
      QUYEN_HAN === "admin"
        ? `<td class="text-center admin-action-col">
            <button class="btn btn-sm text-primary p-0 me-3" onclick="moModalSuaKyThu('${kt.id}', '${maGiai}', '${safeTen}', '${safeClb}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm text-danger p-0" onclick="huyDangKyKyThu('${maGiai}', '${safeTen}')"><i class="fas fa-user-minus"></i></button>
           </td>`
        : "";

    html += `<tr>
      <td class="text-center fw-bold text-muted">${i + 1}</td>
      <td class="fw-bold text-dark ps-3">${tenKT}</td>
      <td class="text-center"><span class="badge bg-light text-secondary border">${kt.clb || "Tự do"}</span></td>
      ${adminBtn}
    </tr>`;
  });
  bang.innerHTML = html;

  document.getElementById("ds_tongSo").innerText = data.length;
  document.getElementById("ds_tongSo_2").innerText = data.length;
}

function moModalSuaKyThu(id, maGiai, tenKyThu, clb) {
  document.getElementById("edit_kt_id").value = id;
  document.getElementById("edit_kt_maGiai").value = maGiai;
  document.getElementById("edit_kt_ten").value = tenKyThu;
  document.getElementById("edit_kt_clb").value = clb;
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalSuaKyThu"),
  ).show();
}

async function luuSuaKyThu(event) {
  event.preventDefault();
  let id = document.getElementById("edit_kt_id").value;
  let maGiai = document.getElementById("edit_kt_maGiai").value;

  let updateData = {
    id: id,
    tenKyThu: document.getElementById("edit_kt_ten").value.trim(),
    clb: document.getElementById("edit_kt_clb").value.trim(),
  };

  Swal.fire({
    title: "Đang lưu thay đổi...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });
  var res = await callAPI("updateKyThu", updateData);

  if (res && res.success) {
    Swal.fire("Thành công", "Đã cập nhật thông tin kỳ thủ!", "success");
    bootstrap.Modal.getInstance(
      document.getElementById("modalSuaKyThu"),
    ).hide();
    xemDanhSachKyThu(maGiai, document.getElementById("ds_tenGiai").innerText);
  } else {
    Swal.fire("Lỗi", "Không thể chỉnh sửa thông tin kỳ thủ!", "error");
  }
}

async function huyDangKyKyThu(maGiai, tenKyThu) {
  Swal.fire({
    title: "Hủy đăng ký?",
    text: `Loại kỳ thủ "${tenKyThu}" ra khỏi giải đấu này?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Đồng ý",
    cancelButtonText: "Không",
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: "Đang hủy...",
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
      });
      var res = await callAPI("deleteKyThu", {
        maGiai: maGiai,
        tenKyThu: tenKyThu,
      });

      if (res && res.success) {
        Swal.fire("Thành công", "Đã loại kỳ thủ khỏi danh sách!", "success");
        xemDanhSachKyThu(
          maGiai,
          document.getElementById("ds_tenGiai").innerText,
        );
        taiDuLieuGiaiDau();
      } else {
        Swal.fire("Lỗi", "Không thể thực hiện!", "error");
      }
    }
  });
}

// --- 6. XEM VÀ CẬP NHẬT KẾT QUẢ GIẢI ĐẤU (FIRESTORE) ---
async function xemKetQua(maGiai, tenGiai) {
  document.getElementById("view_kq_tenGiai").innerText = tenGiai;
  document.getElementById("bodyXemKetQua").innerHTML =
    '<tr><td colspan="4" class="text-center py-4">Đang tải bảng vàng kết quả...</td></tr>';

  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalXemKetQua"),
  ).show();

  try {
    const snapshot = await db
      .collection("KyThu")
      .where("maGiai", "==", maGiai)
      .get();
    let list = snapshot.docs.map((doc) => doc.data());

    var dsKetQua = list
      .filter(
        (k) =>
          (k.diem !== undefined && k.diem !== null) ||
          (k.xep_hang !== undefined && k.xep_hang !== null),
      )
      .sort((a, b) => {
        let h1 =
          a.xep_hang !== null && a.xep_hang !== undefined
            ? parseInt(a.xep_hang)
            : 999;
        let h2 =
          b.xep_hang !== null && b.xep_hang !== undefined
            ? parseInt(b.xep_hang)
            : 999;
        return h1 - h2;
      });

    if (dsKetQua.length === 0) {
      document.getElementById("bodyXemKetQua").innerHTML =
        '<tr><td colspan="4" class="text-center py-4 text-muted fst-italic">Chưa cập nhật bảng điểm chung cuộc.</td></tr>';
      return;
    }

    var html = "";
    dsKetQua.forEach((kt) => {
      var hangStr = "-";
      if (kt.xep_hang !== null && kt.xep_hang !== undefined) {
        hangStr =
          parseInt(kt.xep_hang) <= 3
            ? `<span class="badge bg-danger fs-6">${kt.xep_hang}</span>`
            : kt.xep_hang;
      }
      html += `<tr class="text-center">
            <td class="fw-bold align-middle">${hangStr}</td>
            <td class="text-start ps-3 fw-bold align-middle">${kt.tenKyThu || kt.ten || "Kỳ thủ"} <br><small class="text-muted fw-normal">${kt.clb || ""}</small></td>
            <td class="text-primary fw-bold fs-5 align-middle">${kt.diem !== null && kt.diem !== undefined ? kt.diem : "-"}</td>
            <td class="small text-muted align-middle">${kt.ghi_chu_ket_qua || ""}</td>
        </tr>`;
    });
    document.getElementById("bodyXemKetQua").innerHTML = html;
  } catch (err) {
    document.getElementById("bodyXemKetQua").innerHTML =
      '<tr><td colspan="4" class="text-center py-4 text-danger">Lỗi truy xuất dữ liệu Firebase.</td></tr>';
  }
}

async function moModalNhapKetQua(maGiai, tenGiai) {
  maGiaiKetQuaHienTai = maGiai;
  var oTimKiem = document.getElementById("timKiemKyThuNhapKQ");
  if (oTimKiem) oTimKiem.value = "";

  document.getElementById("bodyNhapKetQua").innerHTML =
    '<tr><td colspan="5" class="text-center py-4">Đang đọc danh sách từ Firebase...</td></tr>';
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalNhapKetQua"),
  ).show();

  try {
    const snapshot = await db
      .collection("KyThu")
      .where("maGiai", "==", maGiai)
      .get();
    var html = "";
    let index = 0;

    snapshot.forEach((doc) => {
      let kt = doc.data();
      let idDoc = doc.id;
      let diemVal = kt.diem !== null && kt.diem !== undefined ? kt.diem : "";
      let hangVal =
        kt.xep_hang !== null && kt.xep_hang !== undefined ? kt.xep_hang : "";
      let ghichuVal = kt.ghi_chu_ket_qua || "";

      html += `<tr>
            <td class="text-center fw-bold text-muted align-middle">${index + 1}</td>
            <td class="fw-bold align-middle">${kt.tenKyThu || kt.ten || "Kỳ thủ"}
                <input type="hidden" class="inp-kt-id" value="${idDoc}">
            </td>
            <td><input type="number" step="0.5" class="form-control text-center text-primary fw-bold inp-kt-diem" value="${diemVal}" data-old="${diemVal}"></td>
            <td><input type="number" class="form-control text-center text-danger fw-bold inp-kt-hang" value="${hangVal}" data-old="${hangVal}"></td>
            <td><input type="text" class="form-control inp-kt-ghichu" placeholder="Nhập ghi chú..." value="${ghichuVal}" data-old="${ghichuVal}"></td>
        </tr>`;
      index++;
    });

    if (index === 0) {
      document.getElementById("bodyNhapKetQua").innerHTML =
        '<tr><td colspan="5" class="text-center py-4 text-muted">Giải đấu chưa có kỳ thủ đăng ký!</td></tr>';
    } else {
      document.getElementById("bodyNhapKetQua").innerHTML = html;
    }
  } catch (e) {
    document.getElementById("bodyNhapKetQua").innerHTML =
      '<tr><td colspan="5" class="text-center py-4 text-danger">Lỗi kết nối Firebase Firestore.</td></tr>';
  }
}

async function luuTatCaKetQua() {
  var rows = document.querySelectorAll("#bodyNhapKetQua tr");
  var updatePromises = [];

  rows.forEach((row) => {
    let idInput = row.querySelector(".inp-kt-id");
    let diemInp = row.querySelector(".inp-kt-diem");
    let hangInp = row.querySelector(".inp-kt-hang");
    let ghichuInp = row.querySelector(".inp-kt-ghichu");

    if (!idInput || !diemInp || !hangInp || !ghichuInp) return;

    let id = idInput.value || "";
    let diemStr = (diemInp.value || "").toString().trim();
    let hangStr = (hangInp.value || "").toString().trim();
    let ghichuStr = (ghichuInp.value || "").toString().trim();

    let oldDiem = (diemInp.getAttribute("data-old") || "").toString().trim();
    let oldHang = (hangInp.getAttribute("data-old") || "").toString().trim();
    let oldGhichu = (ghichuInp.getAttribute("data-old") || "")
      .toString()
      .trim();

    let isChanged =
      diemStr !== oldDiem || hangStr !== oldHang || ghichuStr !== oldGhichu;

    if (isChanged && id !== "") {
      let updateData = {
        diem: diemStr === "" ? null : parseFloat(diemStr),
        xep_hang: hangStr === "" ? null : parseInt(hangStr),
        ghi_chu_ket_qua: ghichuStr === "" ? null : ghichuStr,
      };

      // Đẩy lệnh update trực tiếp vào mảng để thực thi hàng loạt thông qua SDK Firebase của config.js
      let request = db.collection("KyThu").doc(id).update(updateData);
      updatePromises.push(request);
    }
  });

  if (updatePromises.length === 0) {
    Swal.fire("Thông báo", "Bạn chưa thay đổi kết quả của kỳ thủ nào!", "info");
    return;
  }

  Swal.fire({
    title: "Đang lưu bảng vàng kết quả...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  try {
    await Promise.all(updatePromises);
    Swal.fire("Thành công", "Đã lưu kết quả thi đấu toàn bộ giải!", "success");
    bootstrap.Modal.getInstance(
      document.getElementById("modalNhapKetQua"),
    ).hide();
  } catch (error) {
    console.error("Lỗi cập nhật Firestore:", error);
    Swal.fire(
      "Lỗi Hệ thống",
      "Không thể ghi nhận kết quả lên Firebase.",
      "error",
    );
  }
}

// --- 7. TIỆN ÍCH LỌC TÌM KIẾM HÀNG LOẠT ---
function locKyThuDanhSach() {
  var input = document
    .getElementById("timKiemKyThuDanhSach")
    .value.toLowerCase()
    .trim();
  var rows = document.querySelectorAll("#bangDanhSachKyThu tr");
  let count = 0;

  rows.forEach((row) => {
    var cells = row.querySelectorAll("td");
    if (cells.length > 1) {
      var tenKyThu = cells[1].textContent.toLowerCase();
      if (tenKyThu.includes(input)) {
        row.style.display = "";
        count++;
      } else {
        row.style.display = "none";
      }
    }
  });
  document.getElementById("ds_tongSo").innerText = count;
  document.getElementById("ds_tongSo_2").innerText = count;
}

function locKyThuNhapKQ() {
  var input = document
    .getElementById("timKiemKyThuNhapKQ")
    .value.toLowerCase()
    .trim();
  var rows = document.querySelectorAll("#bodyNhapKetQua tr");

  rows.forEach((row) => {
    var cells = row.querySelectorAll("td");
    if (cells.length > 1) {
      var tenKyThu = cells[1].textContent.toLowerCase();
      if (tenKyThu.includes(input)) row.style.display = "";
      else row.style.display = "none";
    }
  });
}

function xuatDanhSachPDF() {
  var vungCuon = document.getElementById("vungCuonDanhSach");
  var vungIn = document.getElementById("vungInDanhSachPDF");
  var thead = document.getElementById("theadDanhSach");
  var tenGiai = document.getElementById("ds_tenGiai").innerText;

  var originalMaxHeight = vungCuon.style.maxHeight;
  var originalOverflow = vungCuon.style.overflowY;

  vungCuon.style.maxHeight = "none";
  vungCuon.style.overflowY = "visible";
  if (thead) thead.classList.remove("sticky-top");

  var searchBox = document.getElementById("khuVucTimKiemDanhSach");
  if (searchBox) searchBox.style.display = "none";

  var colXoa = document.getElementById("col-admin-xoa-kythu");
  var originalColDisplay = colXoa ? colXoa.style.display : "none";
  if (colXoa) colXoa.style.display = "none";
  var actionCols = vungIn.querySelectorAll(".admin-action-col");
  actionCols.forEach((col) => (col.style.display = "none"));

  var opt = {
    margin: [10, 10, 10, 10],
    filename:
      "Danh_Sach_Ky_Thu_" + tenGiai.replace(/[^a-zA-Z0-9]/g, "_") + ".pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  Swal.fire({
    title: "Đang khởi tạo PDF...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  html2pdf()
    .set(opt)
    .from(vungIn)
    .save()
    .then(() => {
      vungCuon.style.maxHeight = originalMaxHeight;
      vungCuon.style.overflowY = originalOverflow;
      if (thead) thead.classList.add("sticky-top");
      if (searchBox) searchBox.style.display = "block";
      if (colXoa) colXoa.style.display = originalColDisplay;
      actionCols.forEach((col) => (col.style.display = ""));
      Swal.close();
    });
}

function xuatDanhSachExcel() {
  const tenGiai = document.getElementById("ds_tenGiai").innerText;
  const rows = document.querySelectorAll("#bangDanhSachKyThu tr");

  if (
    rows.length === 0 ||
    rows[0].innerText.includes("Chưa có") ||
    rows[0].innerText.includes("Đang tải")
  ) {
    Swal.fire("Thông báo", "Không có dữ liệu để xuất!", "warning");
    return;
  }

  let csvContent = "\uFEFF";
  csvContent += "STT,Họ và Tên,CLB / Đơn vị\n";

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 3) {
      const stt = cells[0].innerText.trim();
      const hoTen = cells[1].innerText.split("\n")[0].trim();
      const clb = cells[2].innerText.trim();
      csvContent += `"${stt}","${hoTen}","${clb}"\n`;
    }
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  const thoiGian = new Date().toLocaleDateString("vi-VN").replace(/\//g, "-");

  link.setAttribute("href", url);
  link.setAttribute("download", `Danh_Sach_Ky_Thu_${thoiGian}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
