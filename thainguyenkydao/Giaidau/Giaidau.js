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
    '<tr><td colspan="4" class="text-center py-4 text-muted fst-italic">Đang tải dữ liệu...</td></tr>';
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
      if (!isNaN(dTG.getTime())) {
        hienThiThoiGian = `${("0" + dTG.getDate()).slice(-2)}/${("0" + (dTG.getMonth() + 1)).slice(-2)}/${dTG.getFullYear()}`;
      }
    }

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
          hienThiHan = `<div class="small mt-1 text-success" style="font-size: 11px;"><i class="fas fa-clock me-1"></i>Hạn đăng ký: ${strHan}</div>`;
        }
      }
    }

    var safeTen = item.ten.replace(/'/g, "\\'").replace(/"/g, "&quot;");

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
  document.getElementById("hanDangKy").value = "";
  document.getElementById("modalGiaiDauTitle").innerHTML =
    '<i class="fas fa-plus-circle me-2"></i>Thêm Giải Đấu Mới';
  modalGiaiDauObj = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalGiaiDau"),
  );
  modalGiaiDauObj.show();
}

function moModalSuaGiaiDau(item) {
  document.getElementById("isEditGiaiDau").value = "true";
  document.getElementById("maGiaiDau").value = item.ma;
  document.getElementById("maGiaiDau").readOnly = true;
  document.getElementById("tenGiaiDau").value = item.ten;
  document.getElementById("donViToChuc").value = item.donVi;

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
    hanDangKy: document.getElementById("hanDangKy").value,
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

  // Reset số lượng
  document.getElementById("ds_tongSo").innerText = "0";
  if (document.getElementById("ds_tongSo_In")) document.getElementById("ds_tongSo_In").innerText = "0";

  var colXoa = document.getElementById("col-admin-xoa-kythu");
  if (colXoa)
    colXoa.style.display = QUYEN_HAN === "admin" ? "table-cell" : "none";

  var modalEl = document.getElementById("modalDanhSachKyThu");
  modalDanhSachObj = bootstrap.Modal.getOrCreateInstance(modalEl);
  modalDanhSachObj.show();

  var data = await callAPI("getDanhSachKyThu", { maGiai: maGiai });
  veBangDanhSach(data, maGiai);
}

// --- HÀM 2: CHỈ LÀM NHIỆM VỤ VẼ BẢNG ---
function veBangDanhSach(data, maGiai) {
  if (!data || data.length === 0) {
    document.getElementById("bangDanhSachKyThu").innerHTML =
      '<tr><td colspan="4" class="text-center py-4 text-muted fst-italic">Chưa có kỳ thủ nào đăng ký.</td></tr>';
    document.getElementById("ds_tongSo").innerText = "0";
    if (document.getElementById("ds_tongSo_In")) document.getElementById("ds_tongSo_In").innerText = "0";
    return;
  }

  var isAdmin = getQuyenHan() === "admin";
  var colXoa = document.getElementById("col-admin-xoa-kythu");

  if (colXoa) {
    if (isAdmin) {
      colXoa.style.display = "table-cell";
      colXoa.innerText = "Quản lý";
      colXoa.style.width = "80px";
    } else {
      colXoa.style.display = "none";
    }
  }

  var html = "";
  data.forEach((kt, index) => {
    var safeTen = kt.ten ? kt.ten.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "";
    var safeClb = (kt.clb || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");

    var adminAction = "";
    if (isAdmin) {
      // Đã thêm class admin-action-col để nhận diện lúc ẩn in PDF
      adminAction = `<td class="text-center admin-action-col">
                <button class="btn btn-sm text-primary p-0 me-3" onclick="moModalSuaKyThu('${kt.id}', '${maGiai}', '${safeTen}', '${safeClb}')" title="Sửa thông tin"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm text-danger p-0" onclick="huyDangKyKyThu('${maGiai}', '${safeTen}')" title="Hủy đăng ký"><i class="fas fa-user-minus"></i></button>
            </td>`;
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
  // Gắn luôn số liệu vào vùng dành riêng cho in PDF
  if (document.getElementById("ds_tongSo_In")) document.getElementById("ds_tongSo_In").innerText = data.length;
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
      document.getElementById("bangDanhSachKyThu").innerHTML =
        '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-danger"></div><div class="small mt-2 text-muted">Đang xóa...</div></td></tr>';

      var res = await callAPI("deleteKyThu", {
        maGiai: maGiai,
        tenKyThu: tenKyThu,
      });

      if (res && res.success) {
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
        var newData = await callAPI("getDanhSachKyThu", { maGiai: maGiai });
        veBangDanhSach(newData, maGiai);
      }
    }
  });
}

// --- XỬ LÝ SỬA KỲ THỦ ---
var modalSuaKyThuObj = null;

function moModalSuaKyThu(id, maGiai, tenKyThu, clb) {
  document.getElementById("edit_kt_id").value = id;
  document.getElementById("edit_kt_maGiai").value = maGiai;
  document.getElementById("edit_kt_ten").value = tenKyThu;
  document.getElementById("edit_kt_clb").value = clb;

  modalSuaKyThuObj = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalSuaKyThu"),
  );
  modalSuaKyThuObj.show();
}

async function luuSuaKyThu(event) {
  event.preventDefault();
  var btn = document.getElementById("btnSubmitSuaKyThu");
  var textCu = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang lưu...';
  btn.disabled = true;

  var maGiai = document.getElementById("edit_kt_maGiai").value;
  var data = {
    id: document.getElementById("edit_kt_id").value,
    tenKyThu: document.getElementById("edit_kt_ten").value,
    clb: document.getElementById("edit_kt_clb").value,
  };

  var res = await callAPI("updateKyThu", data);
  btn.innerHTML = textCu;
  btn.disabled = false;

  if (res && res.success) {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
    });
    Toast.fire({ icon: "success", title: "Đã cập nhật!" });

    if (modalSuaKyThuObj) modalSuaKyThuObj.hide();

    document.getElementById("bangDanhSachKyThu").innerHTML =
      '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';
    var newData = await callAPI("getDanhSachKyThu", { maGiai: maGiai });
    veBangDanhSach(newData, maGiai);
  } else {
    Swal.fire("Lỗi", "Có lỗi xảy ra, vui lòng thử lại", "error");
  }
}

// ==========================================
// HÀM XUẤT PDF DANH SÁCH KỲ THỦ (THÊM MỚI)
// ==========================================
function xuatDanhSachPDF() {
  var vungCuon = document.getElementById('vungCuonDanhSach');
  var vungIn = document.getElementById('vungInDanhSachPDF');
  var tenGiai = document.getElementById('ds_tenGiai').innerText;
  var thead = document.getElementById('theadDanhSach');

  if (!vungCuon || !vungIn) {
    Swal.fire("Lỗi", "Không tìm thấy vùng dữ liệu", "error");
    return;
  }

  // 1. Mở rộng toàn bộ chiều cao để lấy hết danh sách
  var originalMaxHeight = vungCuon.style.maxHeight;
  var originalOverflow = vungCuon.style.overflowY;
  vungCuon.style.maxHeight = 'none';
  vungCuon.style.overflowY = 'visible';
  if (thead) thead.classList.remove('sticky-top');
  // 2. Ẩn cột quản lý trước khi xuất
  var colXoa = document.getElementById("col-admin-xoa-kythu");
  var originalColDisplay = colXoa ? colXoa.style.display : 'none';
  if (colXoa) colXoa.style.display = 'none';

  var actionCols = vungIn.querySelectorAll('.admin-action-col');
  actionCols.forEach(col => col.style.display = 'none');

  // 3. Cấu hình in PDF
  var tenFile = 'Danh_Sach_Ky_Thu_' + tenGiai.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
  var opt = {
    margin: [10, 10, 10, 10],
    filename: tenFile,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  Swal.fire({
    title: 'Đang khởi tạo PDF...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  // 4. Gọi html2pdf
  html2pdf().set(opt).from(vungIn).save().then(() => {
    // Khôi phục lại giao diện ban đầu
    vungCuon.style.maxHeight = originalMaxHeight;
    vungCuon.style.overflowY = originalOverflow;
    if (thead) thead.classList.add('sticky-top');
    if (colXoa) colXoa.style.display = originalColDisplay;
    actionCols.forEach(col => col.style.display = '');

    Swal.close();
    const Toast = Swal.mixin({ toast: true, position: "top-end", showConfirmButton: false, timer: 3000 });
    Toast.fire({ icon: "success", title: "Đã tải xuống file PDF!" });
  });
}