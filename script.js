// --- CẤU HÌNH API ---
const API_URL =
  "https://script.google.com/macros/s/AKfycbxperqhvig5g3Qt-HuOuTADswy-GoZSFYzOWA5DvClyE5vDIQtM6cr8OUuXImVnDbUAdg/exec";

// ============================================================
// 2. BIẾN TOÀN CỤC & KHỞI TẠO
// ============================================================
var QUYEN_HAN = "";
var chart1 = null;
var chart2 = null;
var duLieuTimKiem = [];

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
        QUYEN_HAN === "admin" ? "flex" : "none",
        "important",
      ),
    );
}

// ============================================================
// 5. DASHBOARD & HIỂN THỊ SỐ LIỆU
// ============================================================
function khoiTaoApp() {
  taiDuLieuBaoCao();
  // Đặt ngày mặc định cho các ô input
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

  // A. Hiển thị số dư
  var fmt = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  });
  document.getElementById("dash-tonquy").innerText = fmt.format(data.tonQuy);
  document.getElementById("dash-thu").innerText =
    "+" + fmt.format(data.tongThu);
  document.getElementById("dash-chi").innerText =
    "-" + fmt.format(data.tongChi);

  // B. Vẽ biểu đồ
  veBieuDoTron(data.tongThu, data.tongChi);
  veBieuDoNguonThu(data.chiTietNguonThu);

  // C. Hiển thị Top 10 Tài trợ (Tiền mặt)
  var listHTML = "",
    top10 = data.top10,
    hienThiRank = 1;
  if (!top10 || top10.length === 0) {
    listHTML =
      '<li class="list-group-item text-center small text-muted">Chưa có dữ liệu</li>';
  } else {
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
  }
  document.getElementById("list-top10").innerHTML = listHTML;

  // D. Hiển thị Danh sách Hiện vật (Mới)
  var hienVatHTML = "";
  var listHienVat = data.listHienVat;
  var divHienVat = document.getElementById("list-hienvat");

  if (divHienVat) {
    if (!listHienVat || listHienVat.length === 0) {
      hienVatHTML =
        '<li class="list-group-item text-center small text-muted py-3">Chưa có ghi nhận hiện vật</li>';
    } else {
      listHienVat.forEach((item) => {
        var d = new Date(item.ngay);
        var ngayStr =
          ("0" + d.getDate()).slice(-2) +
          "/" +
          ("0" + (d.getMonth() + 1)).slice(-2);

        hienVatHTML += `
                <li class="list-group-item py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="fw-bold small text-dark"><i class="fas fa-gift text-success me-2"></i>${item.ten}</div>
                        <span class="badge bg-light text-muted border" style="font-size:10px">${ngayStr}</span>
                    </div>
                    <div class="small text-success mt-1 ms-4 fst-italic">
                        "${item.vatpham}"
                    </div>
                </li>`;
      });
    }
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
// 7. XỬ LÝ FORM NHẬP LIỆU (QUAN TRỌNG)
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

  // Lấy giá trị tiền (xử lý trường hợp bị disable do chọn hiện vật)
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

    // Reset trạng thái ô nhập tiền về bình thường
    var inpTien = document.getElementById("soTien");
    inpTien.disabled = false;

    // Reset logic sự kiện change dropdown
    document.getElementById("hangMuc").dispatchEvent(new Event("change"));

    Swal.fire("Thành công", res.message, "success");
  }
}

// ============================================================
// 8. TÌM KIẾM & BÁO CÁO
// ============================================================
async function thucHienTimKiem() {
  var tu = document.getElementById("searchTuNgay").value;
  var den = document.getElementById("searchDenNgay").value;
  var loai = document.getElementById("searchLoai").value;

  document.getElementById("ketQuaTimKiem").innerHTML =
    '<div class="text-center mt-3 spinner-border text-primary"></div>';
  document.getElementById("btnIn").disabled = true;

  var data = await callAPI("search", { tu: tu, den: den, loai: loai });

  duLieuTimKiem = data;
  document.getElementById("btnIn").disabled = !data || data.length === 0;

  if (!data || data.length == 0) {
    document.getElementById("ketQuaTimKiem").innerHTML =
      '<div class="alert alert-warning text-center mt-3">Không tìm thấy dữ liệu!</div>';
    return;
  }

  var html =
    '<div class="card card-box p-0 mt-3 overflow-hidden"><table class="table mb-0"><thead class="bg-light"><tr><th class="ps-3">Ngày</th><th>ND</th><th class="text-end">Tiền</th><th class="text-center">#</th></tr></thead><tbody>';
  data.forEach((item) => {
    var icon =
      QUYEN_HAN === "admin"
        ? `<button class="btn btn-sm text-danger p-0" onclick="xoaItem('${item.id}')"><i class="fas fa-trash"></i></button>`
        : '<i class="fas fa-lock text-muted"></i>';
    // Format tiền, nếu là hiện vật (tiền = 0) thì hiện chữ "Hiện vật"
    var tienHienThi = new Intl.NumberFormat("vi-VN").format(item.tien);
    if (item.hangMuc === "Tài trợ hiện vật")
      tienHienThi = '<span class="badge bg-info text-dark">Hiện vật</span>';

    html += `<tr><td class="ps-3 small text-muted">${new Date(item.ngay).toLocaleDateString("vi-VN")}</td><td><div class="fw-bold small">${item.hangMuc}</div><div class="text-muted" style="font-size:11px">${item.nguoi}</div></td><td class="text-end fw-bold small ${item.loai == "Thu" ? "text-success" : "text-danger"}">${tienHienThi}</td><td class="text-center">${icon}</td></tr>`;
  });
  document.getElementById("ketQuaTimKiem").innerHTML =
    html + "</tbody></table></div>";
}

async function xoaItem(id) {
  if (confirm("Bạn chắc chắn muốn xóa giao dịch này?")) {
    var res = await callAPI("delete", { id: id });
    if (res.success) {
      Swal.fire("Đã xóa", res.message, "success");
      thucHienTimKiem(); // Tải lại danh sách tìm kiếm
    }
  }
}

async function saoLuuDuLieu() {
  if (confirm("Bạn có muốn tạo bản sao lưu dữ liệu ngay bây giờ?")) {
    var res = await callAPI("backup");
    if (res.success) Swal.fire("Sao lưu thành công", res.message, "success");
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
// 9. EVENT LISTENER (Xử lý giao diện động)
// ============================================================
// Tự động chạy khi trang web tải xong
document.addEventListener("DOMContentLoaded", function () {
  // Lắng nghe sự kiện chọn hạng mục (Để xử lý Hiện vật)
  var selectHangMuc = document.getElementById("hangMuc");
  if (selectHangMuc) {
    selectHangMuc.addEventListener("change", function () {
      var val = this.value;
      var inpTien = document.getElementById("soTien");
      var inpGhiChu = document.getElementById("ghiChu");
      var labelGhiChu = inpGhiChu.previousElementSibling;

      if (val === "Tài trợ hiện vật") {
        // Chế độ Hiện vật: Tiền = 0, Khóa ô tiền
        inpTien.value = 0;
        inpTien.disabled = true;

        // Đổi placeholder ô Ghi chú
        labelGhiChu.innerText = "Tên hiện vật / Số lượng (Bắt buộc)";
        labelGhiChu.classList.add("text-success");
        inpGhiChu.placeholder = "Ví dụ: 05 lít rượu nếp, 01 bộ cờ...";
        inpGhiChu.required = true;
      } else {
        // Chế độ Thường
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
