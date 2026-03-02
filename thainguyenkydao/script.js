// --- CẤU HÌNH API ---
const API_URL =
  "https://script.google.com/macros/s/AKfycbw5OVhG9_Ehj7_kiyKGsr24ug7hQ3C7_zkbX_dgDT49v5ZvQqZCx8XP8QQ40FFhMTrGeA/exec";
// ============================================================
// ============================================================
// 2. BIẾN TOÀN CỤC & KHỞI TẠO
// ============================================================
var QUYEN_HAN = "";
var chart1 = null;
var chart2 = null;
var duLieuTimKiem = [];
var modalSuaObj = null;

var pageSize = 20;
var currentIndex = 0;

if (typeof Chart !== "undefined" && ChartDataLabels) {
  Chart.register(ChartDataLabels);
}

// ============================================================
// 3. HÀM GỌI API (TRUNG TÂM KẾT NỐI)
// ============================================================
async function callAPI(action, params = {}) {
  var loadingEl = document.getElementById("loadingOverlay");
  if (loadingEl) loadingEl.classList.add("active");

  let url = API_URL + "?action=" + action;

  // ĐÃ FIX LỖI Ở ĐÂY: Thêm 'saveGiaiDau' vào danh sách cần đóng gói JSON
  // Nhớ có chữ 'saveKyThu'
  // Nhớ thêm chữ 'deleteKyThu' vào danh sách này
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
    const response = await fetch(url);
    const json = await response.json();

    if (loadingEl) loadingEl.classList.remove("active");
    return json;
  } catch (error) {
    if (loadingEl) loadingEl.classList.remove("active");
    console.error("Lỗi API:", error);
    Swal.fire(
      "Lỗi kết nối",
      "Không thể kết nối đến Server Google. Hãy kiểm tra lại đường Link Script!",
      "error",
    );
    return null;
  }
}

// ============================================================
// ĐIỀU HƯỚNG SẢNH CHÍNH (TRANG CHỦ CHUNG)
// ============================================================
function veTrangChuCLB() {
  document.getElementById("login-container").style.display = "none";
  document.getElementById("app-container").style.display = "none";
  document.getElementById("tour-container").style.display = "none";
  document.getElementById("home-container").style.display = "block";
}

function moQuanLyQuy() {
  document.getElementById("home-container").style.display = "none";
  if (QUYEN_HAN !== "") {
    document.getElementById("app-container").style.display = "block";
  } else {
    document.getElementById("login-container").style.display = "block";
  }
}

// ============================================================
// 4. XỬ LÝ ĐĂNG NHẬP / ĐĂNG XUẤT
// ============================================================
async function xuLyDangNhap(event) {
  event.preventDefault();
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;

  const res = await callAPI("login", { username: u, password: p });

  if (res && res.success) {
    QUYEN_HAN = res.role;
    document.getElementById("user-name").innerText = res.name.replace(
      " Xem",
      "",
    );

    document.getElementById("login-container").style.display = "none";
    document.getElementById("app-container").style.display = "block";

    phanQuyenGiaoDien();
    khoiTaoApp();

    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
    });
    Toast.fire({
      icon: "success",
      title: "Xin chào, " + res.name.replace(" Xem", ""),
    });
  } else {
    Swal.fire(
      "Đăng nhập thất bại",
      "Sai tên đăng nhập hoặc mật khẩu!",
      "error",
    );
  }
}

function dangXuat() {
  Swal.fire({
    title: "Đăng xuất?",
    text: "Bạn muốn thoát khỏi hệ thống?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Đồng ý",
    cancelButtonText: "Không",
  }).then((result) => {
    if (result.isConfirmed) {
      QUYEN_HAN = "";
      document.getElementById("username").value = "";
      document.getElementById("password").value = "";
      veTrangChuCLB();
    }
  });
}

function phanQuyenGiaoDien() {
  document
    .querySelectorAll(".admin-only")
    .forEach((el) =>
      el.style.setProperty(
        "display",
        QUYEN_HAN === "admin" || QUYEN_HAN === "thuquy" ? "flex" : "none",
        "important",
      ),
    );
}

// ============================================================
// 5. DASHBOARD & HIỂN THỊ SỐ LIỆU
// ============================================================
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
      '<li class="list-group-item text-center small text-muted">Chưa có dữ liệu</li>';
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
      listHTML += `<li class="list-group-item d-flex justify-content-between align-items-center ${bg} py-2"><div class="d-flex align-items-center"><div class="me-2 text-center" style="width:25px">${icon}</div><div class="fw-bold small">${item.ten}</div></div><span class="fw-bold text-primary small">${fmt.format(item.tien)}</span></li>`;
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

// ============================================================
// 6. LOGIC VẼ BIỂU ĐỒ
// ============================================================
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

function veBieuDoNguonThu(data) {
  var ctx = document.getElementById("bieuDoNguonThu").getContext("2d");
  if (chart2) chart2.destroy();
  var v = [data.dongQuy, data.taiTro, data.thuKhac];
  var l = ["Đóng Quỹ", "Tài Trợ", "Thu Khác"];
  var c = ["#0d6efd", "#ffc107", "#6c757d"];
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

// ============================================================
// 7. XỬ LÝ FORM NHẬP LIỆU (QUỸ)
// ============================================================
function chuyenManHinh(mh) {
  ["dashboard", "form", "search"].forEach(
    (id) => (document.getElementById("view-" + id).style.display = "none"),
  );
  document.getElementById("view-" + mh).style.display = "block";
  if (mh === "dashboard") taiDuLieuBaoCao();
}

async function handleFormSubmit(event) {
  event.preventDefault();
  var valTien = document.getElementById("soTien").value;
  if (!valTien) valTien = 0;

  var data = {
    ngayThang: document.getElementById("datePicker").value,
    loaiGiaoDich: document.querySelector('input[name="loaiGiaoDich"]:checked')
      .value,
    hangMuc: document.getElementById("hangMuc").value,
    soTien: valTien,
    nguoiLienQuan: document.getElementById("nguoiLienQuan").value,
    ghiChu: document.getElementById("ghiChu").value,
  };

  var res = await callAPI("save", data);
  if (res && res.success) {
    document.getElementById("myForm").reset();
    document.getElementById("datePicker").valueAsDate = new Date();
    document.getElementById("soTien").disabled = false;
    document.getElementById("hangMuc").dispatchEvent(new Event("change"));
    Swal.fire("Thành công", res.message, "success");
  }
}

// ============================================================
// 8. TÌM KIẾM - SỬA - XÓA (QUỸ)
// ============================================================
async function thucHienTimKiem() {
  var tu = document.getElementById("searchTuNgay").value;
  var den = document.getElementById("searchDenNgay").value;
  var loai = document.getElementById("searchLoai").value;
  var ten = document.getElementById("searchTen").value;

  var divKetQua = document.getElementById("ketQuaTimKiem");
  var divTongHop = document.getElementById("ketQuaTongHop");
  var btnMore = document.getElementById("btnXemTiepContainer");

  divKetQua.innerHTML =
    '<div class="text-center mt-3 spinner-border text-primary"></div>';
  divTongHop.innerHTML = "";
  if (btnMore) btnMore.style.display = "none";
  document.getElementById("btnIn").disabled = true;

  var data = await callAPI("search", {
    tu: tu,
    den: den,
    loai: loai,
    ten: ten,
  });
  duLieuTimKiem = data;
  document.getElementById("btnIn").disabled = !data || data.length === 0;

  if (!data || data.length == 0) {
    divKetQua.innerHTML =
      '<div class="alert alert-warning text-center mt-3">Không tìm thấy dữ liệu!</div>';
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
      tongTien += parseInt(item.tien);
    }
  });

  var fmt = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  });
  divTongHop.innerHTML = `<div class="card card-box bg-primary bg-opacity-10 border-0 p-3 mb-3"><div class="row text-center"><div class="col-4 border-end border-primary"><small class="text-primary fw-bold text-uppercase">Số phiếu</small><div class="h5 fw-bold text-dark mb-0">${soPhieu}</div></div><div class="col-4 border-end border-primary"><small class="text-primary fw-bold text-uppercase">Hiện vật</small><div class="h5 fw-bold text-dark mb-0">${soHienVat}</div></div><div class="col-4"><small class="text-primary fw-bold text-uppercase">Tổng tiền</small><div class="h5 fw-bold text-danger mb-0">${fmt.format(tongTien)}</div></div></div>${soHienVat > 0 ? `<div class="mt-2 text-center small text-muted fst-italic border-top border-primary pt-2">🎁 Các hiện vật: ${chiTietHienVat.join(", ")}...</div>` : ""}</div>`;

  divKetQua.innerHTML = `
        <div class="card card-box p-0 overflow-hidden">
            <table class="table mb-0 table-hover">
                <thead class="bg-light">
                    <tr><th class="ps-3">Ngày</th><th>Nội dung</th><th class="text-end">Số tiền</th><th class="text-center">#</th></tr>
                </thead>
                <tbody id="tableBody"></tbody>
            </table>
        </div>`;

  currentIndex = 0;
  xemThemKetQua();
}

function xemThemKetQua() {
  var tableBody = document.getElementById("tableBody");
  var btnMore = document.getElementById("btnXemTiepContainer");
  var nextBatch = duLieuTimKiem.slice(currentIndex, currentIndex + pageSize);
  var htmlRows = "";

  nextBatch.forEach((item) => {
    var actionButtons = '<i class="fas fa-lock text-muted"></i>';
    if (QUYEN_HAN === "admin" || QUYEN_HAN === "thuquy") {
      var itemStr = JSON.stringify(item).replace(/"/g, "&quot;");
      actionButtons = `<button class="btn btn-sm text-primary p-0 me-3" title="Sửa" onclick="moModalSua(${itemStr})"><i class="fas fa-edit"></i></button><button class="btn btn-sm text-danger p-0" title="Xóa" onclick="xoaItem('${item.id}')"><i class="fas fa-trash"></i></button>`;
    }
    var hienThiTien =
      item.hangMuc === "Tài trợ hiện vật"
        ? '<span class="badge bg-info text-dark">Hiện vật</span>'
        : new Intl.NumberFormat("vi-VN").format(item.tien);
    var classMau = item.loai === "Thu" ? "text-success" : "text-danger";
    htmlRows += `<tr><td class="ps-3 small text-muted">${new Date(item.ngay).toLocaleDateString("vi-VN")}</td><td><div class="fw-bold small">${item.hangMuc}</div><div class="text-muted fst-italic" style="font-size:11px">${item.nguoi}</div>${item.hangMuc === "Tài trợ hiện vật" ? `<div class="text-success small"><i class="fas fa-gift me-1"></i>${item.ghiChu}</div>` : ""}</td><td class="text-end fw-bold small ${classMau}">${hienThiTien}</td><td class="text-center">${actionButtons}</td></tr>`;
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
  var dateStr =
    d.getFullYear() +
    "-" +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + d.getDate()).slice(-2);
  document.getElementById("ngayThangEdit").value = dateStr;

  modalSuaObj = new bootstrap.Modal(document.getElementById("modalSua"));
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
  if (confirm("Bạn chắc chắn muốn xóa giao dịch này?")) {
    var res = await callAPI("delete", { id: id });
    if (res.success) {
      Swal.fire("Đã xóa", res.message, "success");
      thucHienTimKiem();
    }
  }
}

async function saoLuuDuLieu() {
  if (confirm("Tạo bản sao lưu ngay?")) {
    var res = await callAPI("backup");
    if (res.success) Swal.fire("Thành công", res.message, "success");
  }
}

function inBaoCao() {
  if (duLieuTimKiem.length === 0) return;
  var tuNgay = new Date(
    document.getElementById("searchTuNgay").value,
  ).toLocaleDateString("vi-VN");
  var denNgay = new Date(
    document.getElementById("searchDenNgay").value,
  ).toLocaleDateString("vi-VN");
  var tongThu = 0;
  var tongChi = 0;
  var htmlRows = duLieuTimKiem
    .map((item, index) => {
      if (item.loai === "Thu") tongThu += item.tien;
      else tongChi += item.tien;
      var hienThiTien =
        item.hangMuc === "Tài trợ hiện vật"
          ? "Hiện vật"
          : new Intl.NumberFormat("vi-VN").format(item.tien);
      return `<tr><td style="text-align:center">${index + 1}</td><td style="text-align:center">${new Date(item.ngay).toLocaleDateString("vi-VN")}</td><td>${item.hangMuc} <br> <i style="font-size:11px">(${item.nguoi})</i></td><td style="text-align:right">${item.loai === "Thu" ? hienThiTien : "-"}</td><td style="text-align:right">${item.loai === "Chi" ? hienThiTien : "-"}</td></tr>`;
    })
    .join("");
  var win = window.open("", "", "height=700,width=900");
  win.document.write(
    `<html><head><title>IN BÁO CÁO</title><style>body{font-family:"Times New Roman",serif; padding:20px;} table{width:100%; border-collapse:collapse; margin-top:20px;} th,td{border:1px solid #000; padding:8px; font-size:13px;} th{background:#f0f0f0;} .text-center{text-align:center} .text-end{text-align:right} .bold{font-weight:bold}</style></head><body><div class="text-center"><h2>BÁO CÁO THU CHI</h2><i>(Từ ngày ${tuNgay} đến ngày ${denNgay})</i></div><table><thead><tr><th>STT</th><th>Ngày</th><th>Nội dung</th><th>Thu</th><th>Chi</th></tr></thead><tbody>${htmlRows}<tr style="font-weight:bold; background:#fafafa;"><td colspan="3" class="text-center">TỔNG CỘNG TIỀN MẶT</td><td class="text-end">${new Intl.NumberFormat("vi-VN").format(tongThu)}</td><td class="text-end">${new Intl.NumberFormat("vi-VN").format(tongChi)}</td></tr></tbody></table></body></html>`,
  );
  win.document.close();
  win.print();
}

// ============================================================
// 9. EVENT LISTENER & ĐỒNG HỒ
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
  startClock();
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

function startClock() {
  function update() {
    var now = new Date();
    var days = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    var thu = days[now.getDay()];
    var ngay = String(now.getDate()).padStart(2, "0");
    var thang = String(now.getMonth() + 1).padStart(2, "0");
    var nam = now.getFullYear();
    var gio = String(now.getHours()).padStart(2, "0");
    var phut = String(now.getMinutes()).padStart(2, "0");
    var giay = String(now.getSeconds()).padStart(2, "0");

    var str = `${thu}, ${ngay}/${thang}/${nam} - ${gio}:${phut}:${giay}`;
    var el = document.getElementById("live-clock");
    if (el) el.innerText = str;
  }
  update();
  setInterval(update, 1000);
}

// ============================================================
// 10. QUẢN LÝ GIẢI ĐẤU (THÊM/SỬA/XÓA/HIỂN THỊ)
// ============================================================
var modalGiaiDauObj = null;

async function moGiaiDau() {
  document.getElementById("home-container").style.display = "none";
  document.getElementById("tour-container").style.display = "block";

  if (QUYEN_HAN === "admin") {
    document.getElementById("btn-admin-tour").style.display = "block";
    document.getElementById("col-admin-action").style.display = "table-cell";
  } else {
    document.getElementById("btn-admin-tour").style.display = "none";
    document.getElementById("col-admin-action").style.display = "none";
  }

  taiDuLieuGiaiDau();
}

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
      adminAction = `
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary p-1 me-2" title="Sửa" onclick="moModalSuaGiaiDau(${itemStr})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger p-1" title="Xóa" onclick="xoaGiaiDau('${item.ma}')"><i class="fas fa-trash"></i></button>
                </td>`;
    }

    var hienThiThoiGian = item.thoiGian;
    if (
      hienThiThoiGian &&
      String(hienThiThoiGian).includes("T") &&
      String(hienThiThoiGian).includes("Z")
    ) {
      var d = new Date(hienThiThoiGian);
      if (!isNaN(d.getTime())) {
        hienThiThoiGian = `${("0" + d.getDate()).slice(-2)}/${("0" + (d.getMonth() + 1)).slice(-2)}/${d.getFullYear()}`;
      }
    }

    // Thoát dấu nháy cho an toàn
    var safeTen = item.ten.replace(/'/g, "\\'").replace(/"/g, "&quot;");

    // Nút Đăng ký và Danh sách (Ai cũng thấy)
    var publicAction = `
            <td class="text-center">
                <button class="btn btn-sm btn-success rounded-pill fw-bold mb-1" onclick="moModalDangKy('${item.ma}', '${safeTen}')"><i class="fas fa-edit me-1"></i>Đăng ký</button>
                <br>
                <button class="btn btn-sm btn-light rounded-pill border shadow-sm text-primary" style="font-size:11px" onclick="xemDanhSachKyThu('${item.ma}', '${safeTen}')"><i class="fas fa-list me-1"></i>Danh sách</button>
            </td>
        `;

    html += `
        <tr>
            <td class="ps-3"><div class="fw-bold text-dark" style="font-size:1.1rem">${item.ten}</div><div class="small text-muted">Mã: ${item.ma}</div></td>
            <td class="text-center"><span class="badge bg-light text-dark border"><i class="fas fa-sitemap me-1 text-muted"></i>${item.donVi}</span></td>
            <td class="text-center fw-bold text-primary">${hienThiThoiGian}</td>
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
  document.getElementById("modalGiaiDauTitle").innerHTML =
    '<i class="fas fa-plus-circle me-2"></i>Thêm Giải Đấu Mới';

  modalGiaiDauObj = new bootstrap.Modal(
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
  document.getElementById("thoiGianGiaiDau").value = item.thoiGian;
  document.getElementById("modalGiaiDauTitle").innerHTML =
    '<i class="fas fa-edit me-2"></i>Cập nhật Giải Đấu';

  modalGiaiDauObj = new bootstrap.Modal(
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
// ============================================================
// 11. KỲ THỦ ĐĂNG KÝ VÀ XEM DANH SÁCH + HỦY ĐĂNG KÝ
// ============================================================
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

// --- HÀM 1: CHỈ CÓ TÁC DỤNG MỞ HỘP THOẠI VÀ GỌI DỮ LIỆU ---
async function xemDanhSachKyThu(maGiai, tenGiai) {
  document.getElementById("ds_tenGiai").innerText = tenGiai;
  document.getElementById("bangDanhSachKyThu").innerHTML =
    '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';
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
