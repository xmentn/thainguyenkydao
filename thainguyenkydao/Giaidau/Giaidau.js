// ==========================================
// LOGIC XỬ LÝ TRANG GIẢI ĐẤU
// ==========================================
var QUYEN_HAN = getQuyenHan();

document.addEventListener("DOMContentLoaded", function () {
  if (QUYEN_HAN === "admin") {
    document.getElementById("btn-admin-tour").style.display = "block";
    document.getElementById("col-admin-action").style.display = "table-cell";
    document.getElementById("btn-logout").style.display = "inline-block";
  }
  taiDuLieuGiaiDau();
});

async function taiDuLieuGiaiDau() {
  document.getElementById("danhSachGiaiDau").innerHTML =
    '<tr><td colspan="6" class="text-center py-4 text-muted fst-italic">Đang tải dữ liệu...</td></tr>';

  var data = await callAPI("getGiaiDau");
  if (!data || data.length === 0) {
    document.getElementById("danhSachGiaiDau").innerHTML =
      '<tr><td colspan="6" class="text-center py-4 text-muted">Chưa có thông tin giải đấu nào.</td></tr>';
    return;
  }

  var html = "";
  data.forEach((item) => {
    var safeTen = item.ten ? item.ten.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "";

    var btnKetQua = "";
    if (QUYEN_HAN === "admin") {
      btnKetQua = `
        <button class="btn btn-sm btn-outline-info rounded-pill border shadow-sm bg-white text-info fw-bold mb-1" style="font-size:11px" onclick="xemKetQua('${item.ma}', '${safeTen}')">
          <i class="fas fa-eye me-1"></i>Xem KQ
        </button>
        <br>
        <button class="btn btn-sm btn-dark rounded-pill border shadow-sm" style="font-size:11px" onclick="moModalNhapKetQua('${item.ma}', '${safeTen}')">
          <i class="fas fa-trophy me-1"></i>Nhập KQ
        </button>`;
    } else {
      btnKetQua = `
        <button class="btn btn-sm btn-outline-info rounded-pill border shadow-sm bg-white text-info fw-bold" style="font-size:12px" onclick="xemKetQua('${item.ma}', '${safeTen}')">
          <i class="fas fa-eye me-1"></i>Xem KQ
        </button>`;
    }

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

    var btnDangKy = isExpired
      ? `<button class="btn btn-sm btn-secondary rounded-pill fw-bold mb-1" onclick="Swal.fire('Đã đóng', 'Giải đấu này đã hết hạn đăng ký!', 'warning')"><i class="fas fa-lock me-1"></i>Đăng ký</button>`
      : `<button class="btn btn-sm btn-success rounded-pill fw-bold mb-1" onclick="moModalDangKy('${item.ma}', '${safeTen}')"><i class="fas fa-edit me-1"></i>Đăng ký</button>`;

    var publicAction = `${btnDangKy}<br><button class="btn btn-sm btn-light rounded-pill border shadow-sm text-primary mt-1" style="font-size:11px" onclick="xemDanhSachKyThu('${item.ma}', '${safeTen}')"><i class="fas fa-list me-1"></i>Danh sách</button>`;

    html += `
        <tr>
            <td class="ps-3"><div class="fw-bold text-dark" style="font-size:1.1rem">${item.ten}</div><div class="small text-muted">Mã: ${item.ma}</div></td>
            <td class="text-center"><span class="badge bg-light text-dark border"><i class="fas fa-sitemap me-1 text-muted"></i>${item.donVi}</span></td>
            <td class="text-center fw-bold text-primary">${hienThiThoiGian} ${hienThiHan}</td>
            <td class="text-center">${publicAction}</td>
            <td class="text-center">${btnKetQua}</td>
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
  document.getElementById("modalGiaiDauTitle").innerHTML = '<i class="fas fa-plus-circle me-2"></i>Thêm Giải Đấu Mới';
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalGiaiDau")).show();
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
    if (!isNaN(dTG.getTime())) tgStr = dTG.getFullYear() + "-" + ("0" + (dTG.getMonth() + 1)).slice(-2) + "-" + ("0" + dTG.getDate()).slice(-2);
  }
  document.getElementById("thoiGianGiaiDau").value = tgStr;

  var hanStr = "";
  if (item.hanDangKy) {
    var dHan = new Date(item.hanDangKy);
    if (!isNaN(dHan.getTime())) hanStr = dHan.getFullYear() + "-" + ("0" + (dHan.getMonth() + 1)).slice(-2) + "-" + ("0" + dHan.getDate()).slice(-2) + "T" + ("0" + dHan.getHours()).slice(-2) + ":" + ("0" + dHan.getMinutes()).slice(-2);
  }
  document.getElementById("hanDangKy").value = hanStr;

  document.getElementById("modalGiaiDauTitle").innerHTML = '<i class="fas fa-edit me-2"></i>Cập nhật Giải Đấu';
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalGiaiDau")).show();
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
    bootstrap.Modal.getInstance(document.getElementById("modalGiaiDau")).hide();
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

function moModalDangKy(maGiai, tenGiai) {
  document.getElementById("formDangKy").reset();
  document.getElementById("dk_maGiai").value = maGiai;
  document.getElementById("dk_tenGiai").value = tenGiai;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalDangKy")).show();
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
    Swal.fire("Đăng ký thành công!", "Tên của bạn đã được ghi nhận vào hệ thống.", "success");
    bootstrap.Modal.getInstance(document.getElementById("modalDangKy")).hide();
  } else {
    Swal.fire("Lỗi", "Có lỗi xảy ra, vui lòng thử lại", "error");
  }
}

async function xemDanhSachKyThu(maGiai, tenGiai) {
  // Xóa thanh tìm kiếm khi mở
  var oTimKiem = document.getElementById("timKiemKyThuDanhSach");
  if (oTimKiem) oTimKiem.value = "";

  document.getElementById("ds_tenGiai").innerText = tenGiai;
  document.getElementById("bangDanhSachKyThu").innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted fst-italic">Đang tải dữ liệu...</td></tr>';

  document.getElementById("ds_tongSo").innerText = "0";
  if (document.getElementById("ds_tongSo_In")) document.getElementById("ds_tongSo_In").innerText = "0";

  var colXoa = document.getElementById("col-admin-xoa-kythu");
  if (colXoa) colXoa.style.display = QUYEN_HAN === "admin" ? "table-cell" : "none";

  const btnExcel = document.getElementById("btnXuatExcel");
  if (btnExcel) btnExcel.style.display = (QUYEN_HAN === "admin") ? "inline-block" : "none";

  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalDanhSachKyThu")).show();

  var data = await callAPI("getDanhSachKyThu", { maGiai: maGiai });
  veBangDanhSach(data, maGiai);
}

function veBangDanhSach(data, maGiai) {
  if (!data || data.length === 0) {
    document.getElementById("bangDanhSachKyThu").innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted fst-italic">Chưa có kỳ thủ nào đăng ký.</td></tr>';
    document.getElementById("ds_tongSo").innerText = "0";
    if (document.getElementById("ds_tongSo_In")) document.getElementById("ds_tongSo_In").innerText = "0";
    return;
  }

  var isAdmin = QUYEN_HAN === "admin";
  var html = "";
  data.forEach((kt, index) => {
    var safeTen = kt.ten ? kt.ten.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "";
    var safeClb = (kt.clb || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");

    var adminAction = "";
    if (isAdmin) {
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
  if (document.getElementById("ds_tongSo_In")) document.getElementById("ds_tongSo_In").innerText = data.length;
}

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
      document.getElementById("bangDanhSachKyThu").innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-danger"></div><div class="small mt-2 text-muted">Đang xóa...</div></td></tr>';
      var res = await callAPI("deleteKyThu", { maGiai: maGiai, tenKyThu: tenKyThu });
      if (res && res.success) {
        var newData = await callAPI("getDanhSachKyThu", { maGiai: maGiai });
        veBangDanhSach(newData, maGiai);
        const Toast = Swal.mixin({ toast: true, position: "top-end", showConfirmButton: false, timer: 3000 });
        Toast.fire({ icon: "success", title: "Đã hủy đăng ký" });
      } else {
        Swal.fire("Lỗi", res ? res.message : "Có lỗi xảy ra", "error");
        var newData = await callAPI("getDanhSachKyThu", { maGiai: maGiai });
        veBangDanhSach(newData, maGiai);
      }
    }
  });
}

function moModalSuaKyThu(id, maGiai, tenKyThu, clb) {
  document.getElementById("edit_kt_id").value = id;
  document.getElementById("edit_kt_maGiai").value = maGiai;
  document.getElementById("edit_kt_ten").value = tenKyThu;
  document.getElementById("edit_kt_clb").value = clb;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalSuaKyThu")).show();
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
    const Toast = Swal.mixin({ toast: true, position: "top-end", showConfirmButton: false, timer: 3000 });
    Toast.fire({ icon: "success", title: "Đã cập nhật!" });
    bootstrap.Modal.getInstance(document.getElementById("modalSuaKyThu")).hide();
    document.getElementById("bangDanhSachKyThu").innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';
    var newData = await callAPI("getDanhSachKyThu", { maGiai: maGiai });
    veBangDanhSach(newData, maGiai);
  } else {
    Swal.fire("Lỗi", "Có lỗi xảy ra, vui lòng thử lại", "error");
  }
}

// --- HÀM LỌC TÌM KIẾM TRONG DANH SÁCH KỲ THỦ ---
function locKyThuDanhSach() {
  var input = document.getElementById("timKiemKyThuDanhSach").value.toLowerCase().trim();
  var rows = document.querySelectorAll("#bangDanhSachKyThu tr");

  rows.forEach(row => {
    var cells = row.querySelectorAll("td");
    if (cells.length > 1) {
      var tenKyThu = cells[1].textContent.toLowerCase();
      if (tenKyThu.includes(input)) row.style.display = "";
      else row.style.display = "none";
    }
  });
}

function xuatDanhSachPDF() {
  var vungCuon = document.getElementById('vungCuonDanhSach');
  var vungIn = document.getElementById('vungInDanhSachPDF');
  var thead = document.getElementById('theadDanhSach');
  var tenGiai = document.getElementById('ds_tenGiai').innerText;

  var originalMaxHeight = vungCuon.style.maxHeight;
  var originalOverflow = vungCuon.style.overflowY;

  vungCuon.style.maxHeight = 'none';
  vungCuon.style.overflowY = 'visible';
  if (thead) thead.classList.remove('sticky-top');

  // Ẩn thanh tìm kiếm khi in
  var searchBox = document.getElementById('khuVucTimKiemDanhSach');
  if (searchBox) searchBox.style.display = 'none';

  var colXoa = document.getElementById("col-admin-xoa-kythu");
  var originalColDisplay = colXoa ? colXoa.style.display : 'none';
  if (colXoa) colXoa.style.display = 'none';
  var actionCols = vungIn.querySelectorAll('.admin-action-col');
  actionCols.forEach(col => col.style.display = 'none');

  var opt = {
    margin: [10, 10, 10, 10],
    filename: 'Danh_Sach_Ky_Thu_' + tenGiai.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  Swal.fire({ title: 'Đang khởi tạo PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  html2pdf().set(opt).from(vungIn).save().then(() => {
    vungCuon.style.maxHeight = originalMaxHeight;
    vungCuon.style.overflowY = originalOverflow;
    if (thead) thead.classList.add('sticky-top');

    // Hiện lại thanh tìm kiếm
    if (searchBox) searchBox.style.display = 'block';

    if (colXoa) colXoa.style.display = originalColDisplay;
    actionCols.forEach(col => col.style.display = '');
    Swal.close();
  });
}

// --- HÀM XUẤT EXCEL ---
function xuatDanhSachExcel() {
  const tenGiai = document.getElementById("ds_tenGiai").innerText;
  const rows = document.querySelectorAll("#bangDanhSachKyThu tr");

  if (rows.length === 0 || rows[0].innerText.includes("Chưa có") || rows[0].innerText.includes("Đang tải")) {
    Swal.fire("Thông báo", "Không có dữ liệu để xuất!", "warning");
    return;
  }

  let csvContent = "\uFEFF";
  csvContent += "STT,Họ và Tên,CLB / Đơn vị\n";

  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 3) {
      const stt = cells[0].innerText.trim();
      const hoTen = cells[1].innerText.split('\n')[0].trim();
      const clb = cells[2].innerText.trim();
      csvContent += `"${stt}","${hoTen}","${clb}"\n`;
    }
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  const thoiGian = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
  link.setAttribute("href", url);
  link.setAttribute("download", `Danh_Sach_Ky_Thu_${thoiGian}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// TÍNH NĂNG NHẬP / XEM KẾT QUẢ SUPABASE
// ==========================================

async function xemKetQua(maGiai, tenGiai) {
  document.getElementById("view_kq_tenGiai").innerText = tenGiai;
  document.getElementById("bodyXemKetQua").innerHTML = '<tr><td colspan="4" class="text-center py-4">Đang tải...</td></tr>';

  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalXemKetQua")).show();

  const { data, error } = await supabaseClient
    .from('KyThu')
    .select('*')
    .eq('maGiai', maGiai);

  if (error || !data) {
    console.error("Lỗi tải dữ liệu Supabase:", error);
    document.getElementById("bodyXemKetQua").innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Lỗi kết nối dữ liệu.</td></tr>';
    return;
  }

  var dsKetQua = data.filter(k => k.diem !== null || k.xep_hang !== null)
    .sort((a, b) => {
      let h1 = a.xep_hang !== null ? parseInt(a.xep_hang) : 999;
      let h2 = b.xep_hang !== null ? parseInt(b.xep_hang) : 999;
      return h1 - h2;
    });

  if (dsKetQua.length === 0) {
    document.getElementById("bodyXemKetQua").innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted fst-italic">Ban tổ chức chưa cập nhật kết quả cho giải đấu này.</td></tr>';
    return;
  }

  var html = "";
  dsKetQua.forEach(kt => {
    var hangStr = "-";
    if (kt.xep_hang !== null) {
      hangStr = parseInt(kt.xep_hang) <= 3 ? `<span class="badge bg-danger fs-6">${kt.xep_hang}</span>` : kt.xep_hang;
    }

    html += `<tr class="text-center">
          <td class="fw-bold align-middle">${hangStr}</td>
          <td class="text-start ps-3 fw-bold align-middle">${kt.tenKyThu || kt.ten} <br><small class="text-muted fw-normal">${kt.clb || ''}</small></td>
          <td class="text-primary fw-bold fs-5 align-middle">${kt.diem !== null ? kt.diem : "-"}</td>
          <td class="small text-muted align-middle">${kt.ghi_chu_ket_qua || ""}</td>
      </tr>`;
  });
  document.getElementById("bodyXemKetQua").innerHTML = html;
}

var maGiaiKetQuaHienTai = "";
async function moModalNhapKetQua(maGiai, tenGiai) {
  maGiaiKetQuaHienTai = maGiai;

  // Xóa trắng ô tìm kiếm khi mở
  var oTimKiem = document.getElementById("timKiemKyThuNhapKQ");
  if (oTimKiem) oTimKiem.value = "";

  document.getElementById("bodyNhapKetQua").innerHTML = '<tr><td colspan="5" class="text-center py-4">Đang tải danh sách kỳ thủ...</td></tr>';
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalNhapKetQua")).show();

  const { data, error } = await supabaseClient
    .from('KyThu')
    .select('*')
    .eq('maGiai', maGiai);

  if (error || !data) {
    console.error("Lỗi lấy dữ liệu Supabase:", error);
    document.getElementById("bodyNhapKetQua").innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Lỗi kết nối dữ liệu.</td></tr>';
    return;
  }

  var html = "";
  data.forEach((kt, index) => {
    let diemVal = kt.diem !== null ? kt.diem : "";
    let hangVal = kt.xep_hang !== null ? kt.xep_hang : "";
    let ghichuVal = kt.ghi_chu_ket_qua || "";

    html += `<tr>
          <td class="text-center fw-bold text-muted align-middle">${index + 1}</td>
          <td class="fw-bold align-middle">${kt.tenKyThu || kt.ten}
              <input type="hidden" class="inp-kt-id" value="${kt.id}">
          </td>
          <td><input type="number" step="0.5" class="form-control text-center text-primary fw-bold inp-kt-diem" value="${diemVal}" data-old="${diemVal}"></td>
          <td><input type="number" class="form-control text-center text-danger fw-bold inp-kt-hang" value="${hangVal}" data-old="${hangVal}"></td>
          <td><input type="text" class="form-control inp-kt-ghichu" placeholder="Nhập ghi chú..." value="${ghichuVal}" data-old="${ghichuVal}"></td>
      </tr>`;
  });
  document.getElementById("bodyNhapKetQua").innerHTML = html;
}

function locKyThuNhapKQ() {
  var input = document.getElementById("timKiemKyThuNhapKQ").value.toLowerCase().trim();
  var rows = document.querySelectorAll("#bodyNhapKetQua tr");

  rows.forEach(row => {
    var cells = row.querySelectorAll("td");
    if (cells.length > 1) {
      var tenKyThu = cells[1].textContent.toLowerCase();
      if (tenKyThu.includes(input)) row.style.display = "";
      else row.style.display = "none";
    }
  });
}

async function luuTatCaKetQua() {
  var rows = document.querySelectorAll("#bodyNhapKetQua tr");
  var updatePromises = [];

  rows.forEach(row => {
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
    let oldGhichu = (ghichuInp.getAttribute("data-old") || "").toString().trim();

    let isChanged = (diemStr !== oldDiem) || (hangStr !== oldHang) || (ghichuStr !== oldGhichu);

    if (isChanged && id !== "") {
      let updateData = {
        diem: diemStr === "" ? null : parseFloat(diemStr),
        xep_hang: hangStr === "" ? null : parseInt(hangStr),
        ghi_chu_ket_qua: ghichuStr === "" ? null : ghichuStr
      };

      let request = supabaseClient
        .from('KyThu')
        .update(updateData)
        .eq('id', id);

      updatePromises.push(request);
    }
  });

  if (updatePromises.length === 0) {
    Swal.fire("Thông báo", "Bạn chưa nhập hay thay đổi kết quả nào!", "info");
    return;
  }

  Swal.fire({ title: 'Đang lưu kết quả...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

  try {
    const results = await Promise.all(updatePromises);
    const errorRes = results.find(res => res.error);

    if (!errorRes) {
      Swal.close();
      const Toast = Swal.mixin({ toast: true, position: "top-end", showConfirmButton: false, timer: 3000 });
      Toast.fire({ icon: "success", title: "Đã lưu kết quả thành công!" });
      bootstrap.Modal.getInstance(document.getElementById("modalNhapKetQua")).hide();
    } else {
      throw new Error(errorRes.error.message);
    }
  } catch (error) {
    console.error("Lỗi chi tiết Supabase:", error);
    Swal.fire("Lỗi Database", "Dữ liệu nhập vào không hợp lệ hoặc kết nối lỗi.", "error");
  }
}