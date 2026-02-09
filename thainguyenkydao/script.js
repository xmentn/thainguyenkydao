// --- CẤU HÌNH API ---
const API_URL =
  "https://script.google.com/macros/s/AKfycbxperqhvig5g3Qt-HuOuTADswy-GoZSFYzOWA5DvClyE5vDIQtM6cr8OUuXImVnDbUAdg/exec";
// ============================================================
// ============================================================
// 2. BIẾN TOÀN CỤC & KHỞI TẠO
// ============================================================
var QUYEN_HAN = "";
var chart1 = null;
var chart2 = null;
var duLieuTimKiem = []; // Lưu toàn bộ kết quả tìm kiếm
var modalSuaObj = null; // Biến quản lý Hộp thoại Sửa

// Biến cho Phân trang (Xem tiếp)
var pageSize = 20; // Số dòng mỗi lần hiện
var currentIndex = 0; // Vị trí hiện tại

// Đăng ký Plugin hiển thị số liệu trên biểu đồ
if (typeof Chart !== "undefined" && ChartDataLabels) {
  Chart.register(ChartDataLabels);
}

// ============================================================
// 3. HÀM GỌI API (TRUNG TÂM KẾT NỐI)
// ============================================================
async function callAPI(action, params = {}) {
  // Hiện màn hình chờ Loading
  var loadingEl = document.getElementById("loadingOverlay");
  if (loadingEl) loadingEl.classList.add("active");

  // Tạo URL gửi yêu cầu (Luôn dùng GET để tránh lỗi CORS trên Localhost)
  let url = API_URL + "?action=" + action;

  // Nếu là hành động lưu/sửa/nhập liệu: Đóng gói dữ liệu thành chuỗi JSON
  if (["save", "update"].includes(action)) {
    url += "&data=" + encodeURIComponent(JSON.stringify(params));
  } else {
    // Các hành động xem/tìm kiếm: Nối tham số bình thường
    const searchParams = new URLSearchParams(params);
    url += "&" + searchParams.toString();
  }

  try {
    const response = await fetch(url);
    const json = await response.json();

    // Ẩn loading
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

    // Chuyển màn hình
    document.getElementById("login-container").style.display = "none";
    document.getElementById("app-container").style.display = "block";

    phanQuyenGiaoDien();
    khoiTaoApp();

    // Thông báo chào mừng
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
    text: "Bạn muốn thoát phiên làm việc?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Đồng ý",
    cancelButtonText: "Không",
  }).then((result) => {
    if (result.isConfirmed) location.reload();
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

  // Top 10
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

  // Hiện vật
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
// 6. LOGIC VẼ BIỂU ĐỒ (CHART.JS)
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
// 7. XỬ LÝ FORM NHẬP LIỆU
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
// 8. TÌM KIẾM - PHÂN TRANG - SỬA - XÓA
// ============================================================
async function thucHienTimKiem() {
  var tu = document.getElementById("searchTuNgay").value;
  var den = document.getElementById("searchDenNgay").value;
  var loai = document.getElementById("searchLoai").value;
  var ten = document.getElementById("searchTen").value;

  var divKetQua = document.getElementById("ketQuaTimKiem");
  var divTongHop = document.getElementById("ketQuaTongHop");
  var btnMore = document.getElementById("btnXemTiepContainer");

  // Reset giao diện
  divKetQua.innerHTML =
    '<div class="text-center mt-3 spinner-border text-primary"></div>';
  divTongHop.innerHTML = "";
  if (btnMore) btnMore.style.display = "none";
  document.getElementById("btnIn").disabled = true;

  // 1. Gọi API lấy TOÀN BỘ dữ liệu
  var data = await callAPI("search", {
    tu: tu,
    den: den,
    loai: loai,
    ten: ten,
  });

  // Lưu vào biến toàn cục để dùng cho phân trang và In ấn
  duLieuTimKiem = data;

  document.getElementById("btnIn").disabled = !data || data.length === 0;

  if (!data || data.length == 0) {
    divKetQua.innerHTML =
      '<div class="alert alert-warning text-center mt-3">Không tìm thấy dữ liệu!</div>';
    return;
  }

  // 2. TÍNH TỔNG SỐ LIỆU (Trên toàn bộ dữ liệu tìm được)
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

  // 3. VẼ KHUNG BẢNG
  divKetQua.innerHTML = `
        <div class="card card-box p-0 overflow-hidden">
            <table class="table mb-0 table-hover">
                <thead class="bg-light">
                    <tr><th class="ps-3">Ngày</th><th>Nội dung</th><th class="text-end">Số tiền</th><th class="text-center">#</th></tr>
                </thead>
                <tbody id="tableBody"></tbody>
            </table>
        </div>`;

  // 4. BẮT ĐẦU HIỂN THỊ
  currentIndex = 0; // Reset
  xemThemKetQua(); // Gọi hàm vẽ dòng
}

// Hàm vẽ thêm dòng (Phân trang)
function xemThemKetQua() {
  var tableBody = document.getElementById("tableBody");
  var btnMore = document.getElementById("btnXemTiepContainer");

  // Cắt dữ liệu
  var nextBatch = duLieuTimKiem.slice(currentIndex, currentIndex + pageSize);
  var htmlRows = "";

  nextBatch.forEach((item) => {
    // Nút Sửa/Xóa (Chỉ Admin/Thủ quỹ)
    var actionButtons = '<i class="fas fa-lock text-muted"></i>';
    if (QUYEN_HAN === "admin" || QUYEN_HAN === "thuquy") {
      var itemStr = JSON.stringify(item).replace(/"/g, "&quot;");
      actionButtons = `
                <button class="btn btn-sm text-primary p-0 me-3" title="Sửa" onclick="moModalSua(${itemStr})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm text-danger p-0" title="Xóa" onclick="xoaItem('${item.id}')"><i class="fas fa-trash"></i></button>
            `;
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

  // Ẩn hiện nút Xem tiếp
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

// --- HÀM MỞ HỘP THOẠI SỬA ---
function moModalSua(item) {
  document.getElementById("idEdit").value = item.id;
  document.getElementById("loaiGiaoDichEdit").value = item.loai;
  document.getElementById("hangMucEdit").value = item.hangMuc;
  document.getElementById("soTienEdit").value = item.tien;
  document.getElementById("nguoiLienQuanEdit").value = item.nguoi;
  document.getElementById("ghiChuEdit").value = item.ghiChu;

  // Format ngày YYYY-MM-DD
  var d = new Date(item.ngay);
  var day = ("0" + d.getDate()).slice(-2);
  var month = ("0" + (d.getMonth() + 1)).slice(-2);
  var dateStr = d.getFullYear() + "-" + month + "-" + day;
  document.getElementById("ngayThangEdit").value = dateStr;

  // Mở Modal
  var modalEl = document.getElementById("modalSua");
  modalSuaObj = new bootstrap.Modal(modalEl);
  modalSuaObj.show();
}

// --- HÀM LƯU SỬA ---
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
    thucHienTimKiem(); // Load lại
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
// ============================================================
// 9. EVENT LISTENER & ĐỒNG HỒ (Đã cập nhật)
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
  // 1. Kích hoạt Đồng hồ
  startClock();

  // 2. Lắng nghe sự kiện chọn hạng mục (Logic cũ)
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

// --- HÀM CHẠY ĐỒNG HỒ ---
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

    // Định dạng: Thứ Hai, 09/02/2026 - 08:30:15
    var str = `${thu}, ${ngay}/${thang}/${nam} - ${gio}:${phut}:${giay}`;

    var el = document.getElementById("live-clock");
    if (el) el.innerText = str;
  }

  update(); // Chạy ngay lập tức không cần chờ 1s
  setInterval(update, 1000); // Lặp lại mỗi giây
}
