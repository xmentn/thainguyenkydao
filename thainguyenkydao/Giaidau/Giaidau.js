// ==========================================
// LOGIC XỬ LÝ TRANG GIẢI ĐẤU
// ==========================================
var QUYEN_HAN = getQuyenHan(); // Lấy quyền từ config.js

document.addEventListener("DOMContentLoaded", function () {
  // Nếu là admin thì hiện nút thêm giải và nút đăng xuất
  if (QUYEN_HAN === "admin") {
    document.getElementById("btn-admin-tour").style.display = "block";
    document.getElementById("col-admin-action").style.display = "table-cell";
    document.getElementById("btn-logout").style.display = "inline-block";
  }
  taiDuLieuGiaiDau();
});
async function taiDuLieuGiaiDau() {
  document.getElementById("danhSachGiaiDau").innerHTML =
    '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-warning"></div></td></tr>';
  var data = await callAPI("getGiaiDau");
  if (!data || data.length === 0) {
    document.getElementById("danhSachGiaiDau").innerHTML =
      '<tr><td colspan="5" class="text-center py-4 text-muted">Chưa có thông tin giải đấu nào.</td></tr>';
    return;
  }

  var html = "";
  data.forEach((item) => {
    var adminAction = "";
    if (QUYEN_HAN === "admin") {
      var itemStr = JSON.stringify(item).replace(/"/g, "&quot;");
      adminAction = `<td class="text-center"><button class="btn btn-sm btn-outline-primary p-1 me-2" title="Sửa" onclick="moModalSuaGiaiDau(${itemStr})"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-outline-danger p-1" title="Xóa" onclick="xoaGiaiDau('${item.ma}')"><i class="fas fa-trash"></i></button></td>`;
    }

    var hienThiThoiGian = item.thoiGian;
    if (hienThiThoiGian) {
      var dTG = new Date(hienThiThoiGian);
      // Kiểm tra xem dữ liệu có phải là ngày tháng hợp lệ không
      if (!isNaN(dTG.getTime())) {
        // Ép về định dạng dd/mm/yyyy
        hienThiThoiGian = `${("0" + dTG.getDate()).slice(-2)}/${("0" + (dTG.getMonth() + 1)).slice(-2)}/${dTG.getFullYear()}`;
      }
    }

    // TÍNH TOÁN HIỂN THỊ HẠN CHÓT
    var hienThiHan = "";
    var isExpired = false;
    if (item.hanDangKy) {
      var dHan = new Date(item.hanDangKy);
      if (!isNaN(dHan.getTime())) {
        var strHan = `${("0" + dHan.getHours()).slice(-2)}:${("0" + dHan.getMinutes()).slice(-2)} ngày ${("0" + dHan.getDate()).slice(-2)}/${("0" + (dHan.getMonth() + 1)).slice(-2)}/${dHan.getFullYear()}`;
        isExpired = new Date().getTime() > dHan.getTime();

        if (isExpired) {
          hienThiHan = `<div class="small mt-1 text-danger fw-bold" style="font-size: 11px;"><i class="fas fa-times-circle me-1"></i>Đã hết hạn ĐK</div>`;
        } else {
          hienThiHan = `<div class="small mt-1 text-success" style="font-size: 11px;"><i class="fas fa-clock me-1"></i>Hạn: ${strHan}</div>`;
        }
      }
    }

    var safeTen = item.ten.replace(/'/g, "\\'").replace(/"/g, "&quot;");

    // Đổi màu nút Đăng ký thành Xám nếu đã hết hạn
    var btnDangKy = isExpired
      ? `<button class="btn btn-sm btn-secondary rounded-pill fw-bold mb-1" onclick="Swal.fire('Đã đóng', 'Giải đấu này đã hết hạn đăng ký!', 'warning')"><i class="fas fa-lock me-1"></i>Đăng ký</button>`
      : `<button class="btn btn-sm btn-success rounded-pill fw-bold mb-1" onclick="moModalDangKy('${item.ma}', '${safeTen}')"><i class="fas fa-edit me-1"></i>Đăng ký</button>`;

    var publicAction = `<td class="text-center">${btnDangKy}<br><button class="btn btn-sm btn-light rounded-pill border shadow-sm text-primary mt-1" style="font-size:11px" onclick="xemDanhSachKyThu('${item.ma}', '${safeTen}')"><i class="fas fa-list me-1"></i>Danh sách</button></td>`;

    html += `
        <tr>
            <td class="ps-3"><div class="fw-bold text-dark" style="font-size:1.1rem">${item.ten}</div><div class="small text-muted">Mã: ${item.ma}</div></td>
            <td class="text-center"><span class="badge bg-light text-dark border"><i class="fas fa-sitemap me-1 text-muted"></i>${item.donVi}</span></td>
            <td class="text-center fw-bold text-primary">${hienThiThoiGian} ${hienThiHan}</td>
            ${publicAction}
            ${adminAction}
        </tr>`;
  });
  document.getElementById("danhSachGiaiDau").innerHTML = html;
}
function moModalThemGiaiDau() {
  document.getElementById("formGiaiDau").reset();
  document.getElementById("isEditGiaiDau").value = "false";
  document.getElementById("maGiaiDau").readOnly = false;
  document.getElementById("hanDangKy").value = ""; // Xóa trắng hạn đăng ký
  document.getElementById("modalGiaiDauTitle").innerHTML =
    '<i class="fas fa-plus-circle me-2"></i>Thêm Giải Đấu Mới';
  modalGiaiDauObj = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalGiaiDau"),
  );
  modalGiaiDauObj.show();
}

function moModalSuaGiaiDau(item) {
  // 1. Chuyển form sang chế độ Sửa (Edit)
  document.getElementById("isEditGiaiDau").value = "true";

  // 2. Điền các thông tin cơ bản
  document.getElementById("maGiaiDau").value = item.ma;
  document.getElementById("maGiaiDau").readOnly = true; // Khóa không cho sửa Mã
  document.getElementById("tenGiaiDau").value = item.ten;
  document.getElementById("donViToChuc").value = item.donVi;

  // 3. Xử lý "Thời gian tổ chức" (Định dạng YYYY-MM-DD cho input type="date")
  var tgStr = "";
  if (item.thoiGian) {
    var dTG = new Date(item.thoiGian);
    if (!isNaN(dTG.getTime())) {
      var tg_yyyy = dTG.getFullYear();
      var tg_mm = ("0" + (dTG.getMonth() + 1)).slice(-2);
      var tg_dd = ("0" + dTG.getDate()).slice(-2);
      tgStr = tg_yyyy + "-" + tg_mm + "-" + tg_dd;
    }
  }
  document.getElementById("thoiGianGiaiDau").value = tgStr;

  // 4. Xử lý "Hạn chót đăng ký" (Định dạng YYYY-MM-DDTHH:mm cho input datetime-local)
  var hanStr = "";
  if (item.hanDangKy) {
    var dHan = new Date(item.hanDangKy);
    if (!isNaN(dHan.getTime())) {
      var h_yyyy = dHan.getFullYear();
      var h_mm = ("0" + (dHan.getMonth() + 1)).slice(-2);
      var h_dd = ("0" + dHan.getDate()).slice(-2);
      var h_hh = ("0" + dHan.getHours()).slice(-2);
      var h_mi = ("0" + dHan.getMinutes()).slice(-2);
      hanStr = h_yyyy + "-" + h_mm + "-" + h_dd + "T" + h_hh + ":" + h_mi;
    }
  }
  document.getElementById("hanDangKy").value = hanStr;

  // 5. Cập nhật tiêu đề Hộp thoại và Hiển thị
  document.getElementById("modalGiaiDauTitle").innerHTML =
    '<i class="fas fa-edit me-2"></i>Cập nhật Giải Đấu';
  modalGiaiDauObj = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalGiaiDau"),
  );
  modalGiaiDauObj.show();
}
async function luuGiaiDau() {
  var ten = document.getElementById("tenGiaiDau").value;
  if (!ten) {
    alert("Vui lòng nhập tên giải đấu!");
    return;
  }

  var data = {
    isEdit: document.getElementById("isEditGiaiDau").value === "true",
    ma: document.getElementById("maGiaiDau").value,
    ten: ten,
    donVi: document.getElementById("donViToChuc").value,
    thoiGian: document.getElementById("thoiGianGiaiDau").value,
    hanDangKy: document.getElementById("hanDangKy").value, // Gửi kèm thời hạn
  };

  var res = await callAPI("saveGiaiDau", data);
  if (res && res.success) {
    Swal.fire("Thành công", res.message, "success");
    if (modalGiaiDauObj) modalGiaiDauObj.hide();
    taiDuLieuGiaiDau();
  }
}
async function xoaGiaiDau(maGiaiDau) {
  if (confirm("Bạn chắc chắn muốn xóa giải đấu này?")) {
    var res = await callAPI("deleteGiaiDau", { id: maGiaiDau });
    if (res.success) {
      Swal.fire("Đã xóa", res.message, "success");
      taiDuLieuGiaiDau();
    }
  }
}
var modalDangKyObj = null;
var modalDanhSachObj = null;

function moModalDangKy(maGiai, tenGiai) {
  document.getElementById("formDangKy").reset();
  document.getElementById("dk_maGiai").value = maGiai;
  document.getElementById("dk_tenGiai").value = tenGiai;

  var modalEl = document.getElementById("modalDangKy");
  modalDangKyObj = bootstrap.Modal.getOrCreateInstance(modalEl);
  modalDangKyObj.show();
}

async function xacNhanDangKy(event) {
  event.preventDefault();

  var btn = document.getElementById("btnSubmitDangKy");
  var textCu = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
  btn.disabled = true;

  var data = {
    maGiai: document.getElementById("dk_maGiai").value,
    tenGiai: document.getElementById("dk_tenGiai").value,
    tenKyThu: document.getElementById("dk_tenKyThu").value,
    clb: document.getElementById("dk_clb").value,
  };

  var res = await callAPI("saveKyThu", data);

  btn.innerHTML = textCu;
  btn.disabled = false;

  if (res && res.success) {
    Swal.fire(
      "Đăng ký thành công!",
      "Tên của bạn đã được ghi nhận vào hệ thống.",
      "success",
    );
    if (modalDangKyObj) modalDangKyObj.hide();
  } else {
    Swal.fire("Lỗi", "Có lỗi xảy ra, vui lòng thử lại", "error");
  }
}
async function xemDanhSachKyThu(maGiai, tenGiai) {
  document.getElementById("ds_tenGiai").innerText = tenGiai;
  document.getElementById("bangDanhSachKyThu").innerHTML =
    '<tr><td colspan="4" class="text-center py-4 text-muted fst-italic">Đang tải dữ liệu...</td></tr>';
  document.getElementById("ds_tongSo").innerText = "0";

  var colXoa = document.getElementById("col-admin-xoa-kythu");
  if (colXoa)
    colXoa.style.display = QUYEN_HAN === "admin" ? "table-cell" : "none";

  // Dùng getOrCreateInstance để CHỐNG LỖI MỜ MÀN HÌNH (Không sinh ra 2 lớp màng)
  var modalEl = document.getElementById("modalDanhSachKyThu");
  modalDanhSachObj = bootstrap.Modal.getOrCreateInstance(modalEl);
  modalDanhSachObj.show();

  // Gọi dữ liệu và vẽ
  var data = await callAPI("getDanhSachKyThu", { maGiai: maGiai });
  veBangDanhSach(data, maGiai);
}

// --- HÀM 2: CHỈ LÀM NHIỆM VỤ VẼ BẢNG (Tách riêng để tái sử dụng) ---
function veBangDanhSach(data, maGiai) {
  if (!data || data.length === 0) {
    document.getElementById("bangDanhSachKyThu").innerHTML =
      '<tr><td colspan="4" class="text-center py-4 text-muted fst-italic">Chưa có kỳ thủ nào đăng ký.</td></tr>';
    document.getElementById("ds_tongSo").innerText = "0";
    return;
  }

  var html = "";
  data.forEach((kt, index) => {
    var safeTen = kt.ten.replace(/'/g, "\\'").replace(/"/g, "&quot;");

    var adminAction = "";
    if (QUYEN_HAN === "admin") {
      adminAction = `<td class="text-center"><button class="btn btn-sm text-danger p-0" onclick="huyDangKyKyThu('${maGiai}', '${safeTen}')" title="Hủy đăng ký"><i class="fas fa-user-minus"></i></button></td>`;
    }

    html += `
        <tr>
            <td class="text-center fw-bold text-muted">${index + 1}</td>
            <td class="fw-bold text-dark ps-3">${kt.ten}</td>
            <td class="text-center"><span class="badge bg-light text-secondary border">${kt.clb || "Tự do"}</span></td>
            ${adminAction}
        </tr>`;
  });

  document.getElementById("bangDanhSachKyThu").innerHTML = html;
  document.getElementById("ds_tongSo").innerText = data.length;
}

// --- HÀM XÓA KỲ THỦ DÀNH CHO ADMIN ---
function huyDangKyKyThu(maGiai, tenKyThu) {
  Swal.fire({
    title: "Hủy đăng ký?",
    text: `Loại kỳ thủ "${tenKyThu}" khỏi giải đấu này?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Đồng ý",
    cancelButtonText: "Không",
  }).then(async (result) => {
    if (result.isConfirmed) {
      // Hiện chữ Đang xóa ngay trong bảng
      document.getElementById("bangDanhSachKyThu").innerHTML =
        '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-danger"></div><div class="small mt-2 text-muted">Đang xóa...</div></td></tr>';

      var res = await callAPI("deleteKyThu", {
        maGiai: maGiai,
        tenKyThu: tenKyThu,
      });

      if (res && res.success) {
        // XÓA XONG THÌ CHỈ TẢI LẠI DỮ LIỆU RỒI ĐỔ VÀO BẢNG (Không gọi lại lệnh mở Hộp thoại nữa)
        var newData = await callAPI("getDanhSachKyThu", { maGiai: maGiai });
        veBangDanhSach(newData, maGiai);

        const Toast = Swal.mixin({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
        });
        Toast.fire({ icon: "success", title: "Đã hủy đăng ký" });
      } else {
        Swal.fire("Lỗi", res ? res.message : "Có lỗi xảy ra", "error");
        // Nếu lỗi cũng phải load lại bảng cho chuẩn
        var newData = await callAPI("getDanhSachKyThu", { maGiai: maGiai });
        veBangDanhSach(newData, maGiai);
      }
    }
  });
}

// >>> SAU ĐÓ, ANH COPY TOÀN BỘ CÁC HÀM:
// taiDuLieuGiaiDau(), moModalThemGiaiDau(), moModalSuaGiaiDau(), luuGiaiDau(), xoaGiaiDau()
// moModalDangKy(), xacNhanDangKy(), xemDanhSachKyThu(), veBangDanhSach(), huyDangKyKyThu()
// TỪ FILE script.js CŨ CỦA ANH DÁN TIẾP VÀO DƯỚI NÀY. KHÔNG CẦN CHỈNH SỬA GÌ THÊM!
