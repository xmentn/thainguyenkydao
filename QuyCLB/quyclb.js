// ============================================================
// LOGIC XỬ LÝ TRANG QUỸ CÂU LẠC BỘ - FIRESTORE
// ============================================================
var QUYEN_HAN = getQuyenHan();
var chart1 = null;
var chart2 = null;
var duLieuTimKiem = [];
var modalSuaObj = null;
var pageSize = 20;
var currentIndex = 0;

if (typeof Chart !== "undefined" && ChartDataLabels) {
  Chart.register(ChartDataLabels);
}

// KHÔI PHỤC LOGIC GỐC: Kiểm tra trạng thái đăng nhập bảo mật ngay khi mở tệp
document.addEventListener("DOMContentLoaded", function () {
  startClock();

  if (QUYEN_HAN !== "") {
    // Phiên làm việc hợp lệ -> Vào thẳng ứng dụng quỹ
    document.getElementById("login-container").style.display = "none";
    document.getElementById("app-container").style.display = "block";
    let activeName = getUserName()
      ? getUserName().replace(" Xem", "")
      : "Thành viên";
    document.getElementById("user-name").innerText = activeName;
    phanQuyenGiaoDien();
    khoiTaoApp();
  } else {
    // Chưa có phiên đăng nhập -> Chuyển hướng bắt buộc ra Form Đăng nhập
    document.getElementById("login-container").style.display = "block";
    document.getElementById("app-container").style.display = "none";
  }

  // Logic đổi cấu trúc input khi chọn Hạng mục Hiện vật
  var selectHangMuc = document.getElementById("hangMuc");
  if (selectHangMuc) {
    selectHangMuc.addEventListener("change", function () {
      var val = this.value;
      var inpTien = document.getElementById("soTien");
      var inpGhiChu = document.getElementById("ghiChu");
      var labelGhiChu = inpGhiChu.previousElementSibling;
      if (val === "Tài trợ hiện vật") {
        inpTien.value = 0;
        inpTien.disabled = true;
        labelGhiChu.innerText = "Tên hiện vật / Số lượng (Bắt buộc)";
        labelGhiChu.classList.add("text-success");
        inpGhiChu.placeholder = "Ví dụ: 05 lít rượu nếp...";
        inpGhiChu.required = true;
      } else {
        inpTien.disabled = false;
        if (inpTien.value == 0) inpTien.value = "";
        labelGhiChu.innerText = "Ghi chú";
        labelGhiChu.classList.remove("text-success");
        inpGhiChu.placeholder = "";
        inpGhiChu.required = false;
      }
    });
  }
});

// Xử lý xác thực Đăng nhập tài khoản đồng bộ từ Firebase Firestore
async function xuLyDangNhap(event) {
  event.preventDefault();
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();

  Swal.fire({
    title: "Đang kiểm tra thông tin...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  const res = await callAPI("login", { username: u, password: p });

  if (res && res.success) {
    // Ép kiểu chữ thường toàn bộ quyền hạn để tránh lỗi lệch pha cấu trúc chữ hoa/thường
    const userRole = String(res.role).toLowerCase().trim();

    sessionStorage.setItem("QUYEN_HAN", userRole);
    sessionStorage.setItem("USER_NAME", res.name);
    QUYEN_HAN = userRole; // Cập nhật biến toàn cục tức thì

    let cleanName = res.name.replace(" Xem", "");
    document.getElementById("user-name").innerText = cleanName;
    document.getElementById("login-container").style.display = "none";
    document.getElementById("app-container").style.display = "block";

    phanQuyenGiaoDien();
    khoiTaoApp();

    Swal.close();
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
    });
    Toast.fire({
      icon: "success",
      title: "Xin chào, " + cleanName,
    });
  } else {
    Swal.fire(
      "Đăng nhập thất bại",
      "Sai tài khoản đăng nhập hoặc mật khẩu quản trị không đúng!",
      "error",
    );
  }
}

// Hàm phân quyền thông minh: Ẩn các chức năng nhạy cảm nếu không phải Admin/Thủ quỹ
function phanQuyenGiaoDien() {
  // Lấy trực tiếp từ sessionStorage để đảm bảo tính thời gian thực sau khi nhấn Đăng nhập
  const currentRole = String(sessionStorage.getItem("QUYEN_HAN"))
    .toLowerCase()
    .trim();
  const isAdminOrThuQuy = currentRole === "admin" || currentRole === "thuquy";

  document.querySelectorAll(".admin-only").forEach((el) => {
    if (isAdminOrThuQuy) {
      el.style.setProperty("display", "inline-block", "important");
    } else {
      el.style.setProperty("display", "none", "important");
    }
  });
}
function khoiTaoApp() {
  taiDuLieuBaoCao();
  var today = new Date();
  document.getElementById("datePicker").valueAsDate = today;
  document.getElementById("searchTuNgay").valueAsDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
  );
  document.getElementById("searchDenNgay").valueAsDate = today;
}

// Tải dữ liệu báo cáo thống kê từ Firebase thông qua hàm callAPI chung
async function taiDuLieuBaoCao() {
  const data = await callAPI("getReport");
  if (!data) return;

  var fmt = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  });
  document.getElementById("dash-tonquy").innerText = fmt.format(data.tonQuy);
  document.getElementById("dash-thu").innerText =
    "+" + fmt.format(data.tongThu);
  document.getElementById("dash-chi").innerText =
    "-" + fmt.format(data.tongChi);

  veBieuDoTron(data.tongThu, data.tongChi);
  veBieuDoNguonThu(data.chiTietNguonThu);

  var listHTML = "",
    top10 = data.top10,
    hienThiRank = 1;
  if (!top10 || top10.length === 0)
    listHTML =
      '<li class="list-group-item text-center small text-muted py-3">Chưa có dữ liệu</li>';
  else
    top10.forEach((item, i) => {
      if (i > 0 && item.tien < top10[i - 1].tien) hienThiRank = i + 1;
      var icon =
        hienThiRank === 1
          ? "🥇"
          : hienThiRank === 2
            ? "🥈"
            : hienThiRank === 3
              ? "🥉"
              : `<span class="badge bg-light text-secondary rounded-circle">${hienThiRank}</span>`;
      var bg = hienThiRank === 1 ? "bg-warning bg-opacity-10" : "";
      listHTML += `<li class="list-group-item d-flex justify-content-between align-items-center ${bg} py-2"><div class="d-flex align-items-center"><div class="me-2 text-center" style="width:25px">${icon}</div><div class="fw-bold small text-dark">${item.ten}</div></div><span class="fw-bold text-success small">${fmt.format(item.tien)}</span></li>`;
    });
  document.getElementById("list-top10").innerHTML = listHTML;

  var hienVatHTML = "";
  var listHienVat = data.listHienVat;
  var divHienVat = document.getElementById("list-hienvat");
  if (divHienVat) {
    if (!listHienVat || listHienVat.length === 0)
      hienVatHTML =
        '<li class="list-group-item text-center small text-muted py-3">Chưa có ghi nhận hiện vật</li>';
    else
      listHienVat.forEach((item) => {
        var d = new Date(item.ngay);
        var ngayStr =
          ("0" + d.getDate()).slice(-2) +
          "/" +
          ("0" + (d.getMonth() + 1)).slice(-2);
        hienVatHTML += `<li class="list-group-item py-2"><div class="d-flex justify-content-between align-items-center"><div class="fw-bold small text-dark"><i class="fas fa-gift text-success me-2"></i>${item.ten}</div><span class="badge bg-light text-muted border" style="font-size:10px">${ngayStr}</span></div><div class="small text-success mt-1 ms-4 fst-italic">"${item.vatpham}"</div></li>`;
      });
    divHienVat.innerHTML = hienVatHTML;
  }
}

function veBieuDoTron(thu, chi) {
  var ctx = document.getElementById("bieuDoTron").getContext("2d");
  if (chart1) chart1.destroy();
  chart1 = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Thu", "Chi"],
      datasets: [
        {
          data: thu == 0 && chi == 0 ? [1] : [thu, chi],
          backgroundColor:
            thu == 0 && chi == 0 ? ["#eee"] : ["#198754", "#dc3545"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",
      plugins: { legend: { display: false }, datalabels: { display: false } },
    },
  });
}

// Biểu đồ hình tròn phân tách nguồn thu vào CLB
function veBieuDoNguonThu(data) {
  var ctx = document.getElementById("bieuDoNguonThu").getContext("2d");
  if (chart2) chart2.destroy();
  var v = [data.dongQuy, data.taiTro, data.thuKhac],
    l = ["Đóng Quỹ", "Tài Trợ", "Thu Khác"],
    c = ["#0d6efd", "#ffc107", "#6c757d"];
  var isEmpty = v.every((val) => val === 0);
  if (isEmpty) {
    v = [1];
    c = ["#eee"];
    l = ["Chưa có"];
  }
  chart2 = new Chart(ctx, {
    type: "pie",
    data: {
      labels: l,
      datasets: [
        { data: v, backgroundColor: c, borderWidth: 2, borderColor: "#fff" },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, font: { size: 11 } },
        },
        datalabels: {
          color: "#fff",
          font: { weight: "bold", size: 12 },
          formatter: (value, ctx) => {
            if (isEmpty) return "";
            let sum = 0;
            ctx.chart.data.datasets[0].data.map((data) => {
              sum += data;
            });
            let percentage = ((value * 100) / sum).toFixed(0) + "%";
            return percentage === "0%" ? "" : percentage;
          },
          display: function (context) {
            return context.dataset.data[context.dataIndex] > 0;
          },
        },
      },
    },
  });
}

function chuyenManHinh(mh) {
  ["dashboard", "form", "search"].forEach((id) => {
    document.getElementById("view-" + id).style.display = "none";
  });
  document.getElementById("view-" + mh).style.display = "block";
  if (mh === "dashboard") taiDuLieuBaoCao();
}

async function handleFormSubmit(event) {
  event.preventDefault();
  var valTien = document.getElementById("soTien").value;
  var data = {
    ngayThang: document.getElementById("datePicker").value,
    loaiGiaoDich: document.querySelector('input[name="loaiGiaoDich"]:checked')
      .value,
    hangMuc: document.getElementById("hangMuc").value,
    soTien: valTien || 0,
    nguoiLienQuan: document.getElementById("nguoiLienQuan").value,
    ghiChu: document.getElementById("ghiChu").value,
  };

  Swal.fire({
    title: "Đang lưu giao dịch...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });
  var res = await callAPI("save", data);
  if (res && res.success) {
    document.getElementById("myForm").reset();
    document.getElementById("datePicker").valueAsDate = new Date();
    document.getElementById("soTien").disabled = false;
    document.getElementById("hangMuc").dispatchEvent(new Event("change"));
    Swal.fire("Thành công", res.message, "success");
  }
}

async function thucHienTimKiem() {
  var tu = document.getElementById("searchTuNgay").value,
    den = document.getElementById("searchDenNgay").value;
  var loai = document.getElementById("searchLoai").value,
    ten = document.getElementById("searchTen").value;
  var divKetQua = document.getElementById("ketQuaTimKiem"),
    divTongHop = document.getElementById("ketQuaTongHop"),
    btnMore = document.getElementById("btnXemTiepContainer");

  divKetQua.innerHTML =
    '<div class="text-center mt-3 spinner-border text-success"></div>';
  divTongHop.innerHTML = "";
  if (btnMore) btnMore.style.display = "none";
  document.getElementById("btnIn").disabled = true;

  var data = await callAPI("search", {
    tu: tu,
    den: den,
    loai: loai,
    text: ten,
  });
  duLieuTimKiem = data;
  document.getElementById("btnIn").disabled = !data || data.length === 0;

  if (!data || data.length == 0) {
    divKetQua.innerHTML =
      '<div class="alert alert-warning text-center mt-3">Không tìm thấy dữ liệu giao dịch!</div>';
    return;
  }

  var tongTien = 0,
    soPhieu = data.length,
    soHienVat = 0,
    chiTietHienVat = [];
  data.forEach((item) => {
    if (item.hangMuc === "Tài trợ hiện vật") {
      soHienVat++;
      if (chiTietHienVat.length < 5) chiTietHienVat.push(item.ghiChu);
    } else {
      tongTien += parseInt(item.tien || 0);
    }
  });

  var fmt = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  });
  divTongHop.innerHTML = `<div class="card card-box bg-success bg-opacity-10 border-0 p-3 mb-3" style="border-radius:12px;"><div class="row text-center"><div class="col-4 border-end border-success"><small class="text-success fw-bold text-uppercase">Số phiếu</small><div class="h5 fw-bold text-dark mb-0">${soPhieu}</div></div><div class="col-4 border-end border-success"><small class="text-success fw-bold text-uppercase">Hiện vật</small><div class="h5 fw-bold text-dark mb-0">${soHienVat}</div></div><div class="col-4"><small class="text-success fw-bold text-uppercase">Tổng tiền</small><div class="h5 fw-bold text-danger mb-0">${fmt.format(tongTien)}</div></div></div>${soHienVat > 0 ? `<div class="mt-2 text-center small text-muted fst-italic border-top border-success pt-2">🎁 Hiện vật: ${chiTietHienVat.join(", ")}...</div>` : ""}</div>`;

  divKetQua.innerHTML = `<div class="card card-box p-0 overflow-hidden border-0 shadow-sm" style="border-radius:12px;"><table class="table mb-0 table-hover"><thead class="table-light"><tr><th class="ps-3">Ngày</th><th>Nội dung</th><th class="text-end">Số tiền</th><th class="text-center">#</th></tr></thead><tbody id="tableBody"></tbody></table></div>`;
  currentIndex = 0;
  xemThequyetKetQua();
}

function xemThequyetKetQua() {
  var tableBody = document.getElementById("tableBody"),
    btnMore = document.getElementById("btnXemTiepContainer");
  var nextBatch = duLieuTimKiem.slice(currentIndex, currentIndex + pageSize),
    htmlRows = "";

  // Đọc lại quyền hạn chuẩn xác để render nút
  const currentRole = String(sessionStorage.getItem("QUYEN_HAN"))
    .toLowerCase()
    .trim();
  const isAdminOrThuQuy = currentRole === "admin" || currentRole === "thuquy";

  nextBatch.forEach((item) => {
    var actionButtons = '<i class="fas fa-lock text-muted small"></i>';

    // Đồng bộ mở quyền Sửa/Xóa biên lai cho cả admin và thuquy
    if (isAdminOrThuQuy) {
      var itemStr = JSON.stringify(item).replace(/"/g, "&quot;");
      actionButtons = `<button class="btn btn-sm text-primary p-0 me-3" onclick="moModalSua(${itemStr})"><i class="fas fa-edit"></i></button><button class="btn btn-sm text-danger p-0" onclick="xoaItem('${item.id}')"><i class="fas fa-trash"></i></button>`;
    }

    var hienThiTien =
      item.hangMuc === "Tài trợ hiện vật"
        ? '<span class="badge bg-info text-dark">Hiện vật</span>'
        : new Intl.NumberFormat("vi-VN").format(item.tien);
    var classMau = item.loai === "Thu" ? "text-success" : "text-danger";
    htmlRows += `<tr><td class="ps-3 small text-muted">${new Date(item.ngay).toLocaleDateString("vi-VN")}</td><td><div class="fw-bold small text-dark">${item.hangMuc}</div><div class="text-muted fst-italic" style="font-size:11px">${item.nguoi}</div>${item.hangMuc === "Tài trợ hiện vật" ? `<div class="text-success small"><i class="fas fa-gift me-1"></i>${item.ghiChu}</div>` : ""}</td><td class="text-end fw-bold small ${classMau}">${hienThiTien}</td><td class="text-center">${actionButtons}</td></tr>`;
  });

  tableBody.insertAdjacentHTML("beforeend", htmlRows);
  currentIndex += nextBatch.length;
  if (btnMore) {
    if (currentIndex < duLieuTimKiem.length) {
      btnMore.style.display = "block";
      document.getElementById("lblDaHienThi").innerText = currentIndex;
      document.getElementById("lblTongSo").innerText = duLieuTimKiem.length;
    } else {
      btnMore.style.display = "none";
    }
  }
}

function moModalSua(item) {
  document.getElementById("idEdit").value = item.id;
  document.getElementById("loaiGiaoDichEdit").value = item.loai;
  document.getElementById("hangMucEdit").value = item.hangMuc;
  document.getElementById("soTienEdit").value = item.tien;
  document.getElementById("nguoiLienQuanEdit").value = item.nguoi;
  document.getElementById("ghiChuEdit").value = item.ghiChu;
  var d = new Date(item.ngay);
  document.getElementById("ngayThangEdit").value =
    d.getFullYear() +
    "-" +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + d.getDate()).slice(-2);
  modalSuaObj = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalSua"),
  );
  modalSuaObj.show();
}

async function luuSua() {
  var data = {
    idEdit: document.getElementById("idEdit").value,
    ngayThangEdit: document.getElementById("ngayThangEdit").value,
    loaiGiaoDichEdit: document.getElementById("loaiGiaoDichEdit").value,
    hangMucEdit: document.getElementById("hangMucEdit").value,
    soTienEdit: document.getElementById("soTienEdit").value,
    nguoiLienQuanEdit: document.getElementById("nguoiLienQuanEdit").value,
    ghiChuEdit: document.getElementById("ghiChuEdit").value,
  };

  Swal.fire({
    title: "Đang cập nhật...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });
  var res = await callAPI("update", data);
  if (res && res.success) {
    Swal.fire("Đã cập nhật", res.message, "success");
    if (modalSuaObj) modalSuaObj.hide();
    thucHienTimKiem();
  } else {
    Swal.fire("Lỗi", res ? res.message : "Có lỗi xảy ra", "error");
  }
}

async function xoaItem(id) {
  Swal.fire({
    title: "Bạn chắc chắn muốn xóa?",
    text: "Giao dịch này sẽ bị xóa vĩnh viễn khỏi CSDL Firebase!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Đồng ý xóa",
    cancelButtonText: "Hủy",
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: "Đang xóa...",
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
      });
      var res = await callAPI("delete", { id: id });
      if (res && res.success) {
        Swal.fire("Đã xóa", res.message, "success");
        thucHienTimKiem();
      }
    }
  });
}

async function saoLuuDuLieu() {
  if (confirm("Tạo bản sao lưu ngay?")) {
    var res = await callAPI("backup");
    if (res && res.success) Swal.fire("Thành công", res.message, "success");
  }
}

function inBaoCao() {
  if (duLieuTimKiem.length === 0) return;
  var tuNgay = new Date(
      document.getElementById("searchTuNgay").value,
    ).toLocaleDateString("vi-VN"),
    denNgay = new Date(
      document.getElementById("searchDenNgay").value,
    ).toLocaleDateString("vi-VN");
  var tongThu = 0,
    tongChi = 0;
  var htmlRows = duLieuTimKiem
    .map((item, index) => {
      if (item.loai === "Thu") tongThu += parseInt(item.tien || 0);
      else tongChi += parseInt(item.tien || 0);
      var hienThiTien =
        item.hangMuc === "Tài trợ hiện vật"
          ? "Hiện vật"
          : new Intl.NumberFormat("vi-VN").format(item.tien);
      return `<tr><td style="text-align:center">${index + 1}</td><td style="text-align:center">${new Date(item.ngay).toLocaleDateString("vi-VN")}</td><td>${item.hangMuc} <br> <i style="font-size:11px">(${item.nguoi})</i></td><td style="text-align:right">${item.loai === "Thu" ? hienThiTien : "-"}</td><td style="text-align:right">${item.loai === "Chi" ? hienThiTien : "-"}</td></tr>`;
    })
    .join("");
  var win = window.open("", "", "height=700,width=900");
  win.document.write(
    `<html><head><title>IN BÁO CÁO</title><style>body{font-family:"Times New Roman",serif; padding:20px;} table{width:100%; border-collapse:collapse; margin-top:20px;} th,td{border:1px solid #000; padding:8px; font-size:13px;} th{background:#f0f0f0;} .text-center{text-align:center} .text-end{text-align:right} .bold{font-weight:bold}</style></head><body><div class="text-center"><h2>BÁO CÁO THU CHI QŨY CLB</h2><i>(Từ ngày ${tuNgay} đến ngày ${denNgay})</i></div><table><thead><tr><th>STT</th><th>Ngày</th><th>Nội dung</th><th>Thu</th><th>Chi</th></tr></thead><tbody>${htmlRows}<tr style="font-weight:bold; background:#fafafa;"><td colspan="3" class="text-center">TỔNG CỘNG TIỀN MẶT</td><td class="text-end">${new Intl.NumberFormat("vi-VN").format(tongThu)}</td><td class="text-end">${new Intl.NumberFormat("vi-VN").format(tongChi)}</td></tr></tbody></table></body></html>`,
  );
  win.document.close();
  win.print();
}

function startClock() {
  function update() {
    var now = new Date(),
      days = [
        "Chủ Nhật",
        "Thứ Hai",
        "Thứ Ba",
        "Thứ Tư",
        "Thứ Năm",
        "Thứ Sáu",
        "Thứ Bảy",
      ];
    var thu = days[now.getDay()],
      ngay = String(now.getDate()).padStart(2, "0"),
      thang = String(now.getMonth() + 1).padStart(2, "0"),
      nam = now.getFullYear();
    var gio = String(now.getHours()).padStart(2, "0"),
      phut = String(now.getMinutes()).padStart(2, "0"),
      giay = String(now.getSeconds()).padStart(2, "0");
    var el = document.getElementById("live-clock");
    if (el)
      el.innerText = `${thu}, ${ngay}/${thang}/${nam} - ${gio}:${phut}:${giay}`;
  }
  update();
  setInterval(update, 1000);
}
