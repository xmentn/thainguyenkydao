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

// ==========================================
// LOGIC XỬ LÝ TRANG GIẢI ĐẤU - TỐI ƯU SUPABASE
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

// --- 1. TẢI DANH SÁCH GIẢI ĐẤU TỪ SUPABASE ---
async function taiDuLieuGiaiDau() {
  const container = document.getElementById("danhSachGiaiDau");
  container.innerHTML =
    '<tr><td colspan="6" class="text-center py-4 text-muted fst-italic">Đang tải dữ liệu từ CSDL...</td></tr>';

  // Lấy số lượng đã đăng ký từ bảng KyThu
  let countMap = {};
  try {
    const { data: kyThuData } = await supabaseClient
      .from("KyThu")
      .select("maGiai");
    if (kyThuData) {
      kyThuData.forEach((kt) => {
        let m = kt.maGiai || kt.magiai;
        if (m) countMap[m] = (countMap[m] || 0) + 1;
      });
    }
  } catch (e) {
    console.error("Lỗi đếm số lượng:", e);
  }

  // Lấy danh sách giải đấu, sắp xếp theo ngày tạo mới nhất lên đầu
  const { data, error } = await supabaseClient
    .from("GiaiDau")
    .select("*")
    .order("ngayTao", { ascending: false });

  if (error) {
    console.error("Lỗi Supabase:", error);
    container.innerHTML =
      '<tr><td colspan="6" class="text-center py-4 text-danger">Lỗi kết nối CSDL. Vui lòng kiểm tra Console.</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML =
      '<tr><td colspan="6" class="text-center py-4 text-muted">Chưa có thông tin giải đấu nào.</td></tr>';
    return;
  }

  var html = "";
  data.forEach((item) => {
    // ÉP KIỂU AN TOÀN: Thử cả chữ hoa và chữ thường theo cấu trúc anh gửi
    let ma = item.maGiai || item.magiai || "";
    let ten = item.tenGiai || item.tengiai || "Chưa đặt tên";
    let dv = item.donVi || item.donvi || "Hệ thống";
    let tg = item.thoiGian || item.thoigian;
    let han = item.hanDangKy || item.handangky;
    let maxP = item.soLuongToiDa || item.soluongtoida;

    let safeTen = ten.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    let currentCount = countMap[ma] || 0;
    let isFull = maxP && currentCount >= parseInt(maxP);

    // Xử lý ngày thi đấu
    let hienThiThoiGian = "";
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

    // Nút chức năng
    let btnKetQua =
      QUYEN_HAN === "admin"
        ? `
        <button class="btn btn-sm btn-outline-info rounded-pill border shadow-sm bg-white text-info fw-bold mb-1" style="font-size:11px" onclick="xemKetQua('${ma}', '${safeTen}')"><i class="fas fa-eye me-1"></i>Xem KQ</button><br>
        <button class="btn btn-sm btn-dark rounded-pill border shadow-sm" style="font-size:11px" onclick="moModalNhapKetQua('${ma}', '${safeTen}')"><i class="fas fa-trophy me-1"></i>Nhập KQ</button>
    `
        : `<button class="btn btn-sm btn-outline-info rounded-pill border shadow-sm bg-white text-info fw-bold" style="font-size:12px" onclick="xemKetQua('${ma}', '${safeTen}')"><i class="fas fa-eye me-1"></i>Xem KQ</button>`;

    let btnDangKy =
      isExpired || isFull
        ? `
        <button class="btn btn-sm btn-secondary rounded-pill fw-bold mb-1" onclick="Swal.fire('Đã đóng', '${isFull ? "Giải đấu này đã đủ số lượng kỳ thủ tối đa!" : "Giải đấu này đã hết hạn đăng ký!"}', 'warning')"><i class="fas fa-lock me-1"></i>Đăng ký</button>
    `
        : `<button class="btn btn-sm btn-success rounded-pill fw-bold mb-1" onclick="moModalDangKy('${ma}', '${safeTen}')"><i class="fas fa-edit me-1"></i>Đăng ký</button>`;

    let adminAction = "";
    if (QUYEN_HAN === "admin") {
      let itemStr = JSON.stringify(item).replace(/"/g, "&quot;");
      adminAction = `<td class="text-center">
        <button class="btn btn-sm btn-outline-primary p-1 me-2" title="Sửa" onclick="moModalSuaGiaiDau(${itemStr})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-danger p-1" title="Xóa" onclick="xoaGiaiDau('${ma}')"><i class="fas fa-trash"></i></button>
      </td>`;
    }

    html += `<tr>
        <td class="ps-3"><div class="fw-bold text-dark" style="font-size:1.1rem">${ten}</div><div class="small text-muted">Mã: ${ma}</div></td>
        <td class="text-center"><span class="badge bg-light text-dark border"><i class="fas fa-sitemap me-1 text-muted"></i>${dv}</span></td>
        <td class="text-center fw-bold text-primary">${hienThiThoiGian} ${hienThiHan}</td>
        <td class="text-center align-middle">${btnDangKy}<br><button class="btn btn-sm btn-light rounded-pill border shadow-sm text-primary mt-1" style="font-size:11px" onclick="xemDanhSachKyThu('${ma}', '${safeTen}')"><i class="fas fa-list me-1"></i>Danh sách</button></td>
        <td class="text-center align-middle">${btnKetQua}</td>
        ${adminAction}
    </tr>`;
  });
  container.innerHTML = html;
}

// --- 2. THÊM / SỬA GIẢI ĐẤU ---
function moModalThemGiaiDau() {
  document.getElementById("formGiaiDau").reset();
  document.getElementById("isEditGiaiDau").value = "false";
  document.getElementById("maGiaiDau").readOnly = false;
  document.getElementById("modalGiaiDauTitle").innerHTML =
    '<i class="fas fa-plus-circle me-2"></i>Thêm Giải Đấu Mới';
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalGiaiDau"),
  ).show();
}

function moModalSuaGiaiDau(item) {
  document.getElementById("isEditGiaiDau").value = "true";
  document.getElementById("maGiaiDau").value = item.maGiai || item.magiai;
  document.getElementById("maGiaiDau").readOnly = true;
  document.getElementById("tenGiaiDau").value = item.tenGiai || item.tengiai;
  document.getElementById("donViToChuc").value = item.donVi || item.donvi || "";
  document.getElementById("soLuongToiDa").value =
    item.soLuongToiDa || item.soluongtoida || "";

  let tg = item.thoiGian || item.thoigian;
  if (tg) document.getElementById("thoiGianGiaiDau").value = tg.split("T")[0];

  let han = item.hanDangKy || item.handangky;
  if (han) document.getElementById("hanDangKy").value = han.slice(0, 16);

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
  if (!ma && !isEdit) ma = "GD" + Math.floor(Math.random() * 1000000);

  let updateData = {
    maGiai: ma,
    tenGiai: ten,
    donVi: document.getElementById("donViToChuc").value.trim() || null,
    thoiGian: document.getElementById("thoiGianGiaiDau").value || null,
    hanDangKy: document.getElementById("hanDangKy").value || null,
    soLuongToiDa: document.getElementById("soLuongToiDa").value
      ? parseInt(document.getElementById("soLuongToiDa").value)
      : null,
  };

  Swal.fire({
    title: "Đang lưu...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  try {
    let res = isEdit
      ? await supabaseClient.from("GiaiDau").update(updateData).eq("maGiai", ma)
      : await supabaseClient.from("GiaiDau").insert([updateData]);
    if (res.error) throw res.error;

    Swal.fire("Thành công", "Đã lưu thông tin giải đấu!", "success");
    bootstrap.Modal.getInstance(document.getElementById("modalGiaiDau")).hide();
    taiDuLieuGiaiDau();
  } catch (err) {
    console.error(err);
    Swal.fire("Lỗi", "Không thể lưu. Mã giải có thể đã tồn tại!", "error");
  }
}

// --- XÓA GIẢI ĐẤU (ĐÃ NÂNG CẤP GIAO DIỆN SWEETALERT2) ---
// --- XÓA GIẢI ĐẤU (PHIÊN BẢN HIỂN THỊ LỖI GỐC ĐỂ CHUẨN ĐOÁN) ---
// --- XÓA GIẢI ĐẤU (ĐÃ SỬA CHUẨN TÊN CỘT maGiai) ---
async function xoaGiaiDau(ma) {
  Swal.fire({
    title: "Xóa giải đấu này?",
    text: "Hành động này sẽ xóa hoàn toàn giải đấu CÙNG VỚI toàn bộ kỳ thủ đã đăng ký và không thể khôi phục!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "<i class='fas fa-trash-alt me-1'></i> Xóa ngay",
    cancelButtonText: "Hủy bỏ",
    backdrop: `rgba(0,0,0,0.4)`,
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: "Đang xử lý...",
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
      });

      // BƯỚC 1: Xóa các kỳ thủ thuộc giải đấu này (quét cả maGiai và magiai cho chắc)
      await supabaseClient.from("KyThu").delete().eq("maGiai", ma);
      await supabaseClient.from("KyThu").delete().eq("magiai", ma);

      // BƯỚC 2: Xóa giải đấu (ĐÃ SỬA THÀNH maGiai CHO KHỚP DATABASE)
      const { error } = await supabaseClient
        .from("GiaiDau")
        .delete()
        .eq("maGiai", ma);

      if (error) {
        console.error("Lỗi chi tiết từ Supabase:", error);
        Swal.fire("Lỗi Database", error.message, "error");
      } else {
        Swal.fire(
          "Đã xóa!",
          "Giải đấu và danh sách kỳ thủ liên quan đã được xóa.",
          "success",
        );
        taiDuLieuGiaiDau(); // Tải lại bảng
      }
    }
  });
}
async function xacNhanDangKy(event) {
  event.preventDefault();
  let btn = document.getElementById("btnSubmitDangKy");
  btn.disabled = true;

  let data = {
    maGiai: document.getElementById("dk_maGiai").value,
    tenKyThu: document.getElementById("dk_tenKyThu").value.trim(),
    clb: document.getElementById("dk_clb").value.trim() || "Tự do",
  };

  // Ghi thẳng dữ liệu vào bảng KyThu trên Supabase
  const { error } = await supabaseClient.from("KyThu").insert([data]);

  btn.disabled = false;

  if (!error) {
    Swal.fire("Thành công", "Đăng ký tham gia thành công!", "success");
    bootstrap.Modal.getInstance(document.getElementById("modalDangKy")).hide();
    taiDuLieuGiaiDau(); // Tải lại bảng để thanh tiến độ (1/5) cập nhật ngay lập tức
  } else {
    console.error(error);
    Swal.fire(
      "Lỗi",
      "Không thể đăng ký lúc này. Hãy kiểm tra lại RLS của bảng KyThu.",
      "error",
    );
  }
}
// --- 4. XEM DANH SÁCH & KẾT QUẢ ---
async function xemDanhSachKyThu(ma, ten) {
  let search = document.getElementById("timKiemKyThuDanhSach");
  if (search) search.value = "";
  document.getElementById("ds_tenGiai").innerText = ten;
  let bang = document.getElementById("bangDanhSachKyThu");
  bang.innerHTML =
    '<tr><td colspan="4" class="text-center py-4 text-muted fst-italic">Đang tải dữ liệu từ CSDL...</td></tr>';

  if (document.getElementById("btnXuatExcel"))
    document.getElementById("btnXuatExcel").style.display =
      QUYEN_HAN === "admin" ? "inline-block" : "none";
  if (document.getElementById("col-admin-xoa-kythu"))
    document.getElementById("col-admin-xoa-kythu").style.display =
      QUYEN_HAN === "admin" ? "table-cell" : "none";

  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalDanhSachKyThu"),
  ).show();

  // Đọc danh sách từ Supabase, sắp xếp theo ID (ai đăng ký trước xếp trên)
  const { data, error } = await supabaseClient
    .from("KyThu")
    .select("*")
    .eq("maGiai", ma)
    .order("id", { ascending: true });

  if (error) {
    bang.innerHTML =
      '<tr><td colspan="4" class="text-center py-4 text-danger">Lỗi kết nối CSDL.</td></tr>';
    return;
  }
  veBangDanhSach(data, ma);
}
function veBangDanhSach(data, maGiai) {
  let bang = document.getElementById("bangDanhSachKyThu");
  // Tìm thẻ chứa số lượng (hỗ trợ cả id mới và id cũ)
  let elementTongSo =
    document.getElementById("ds_tongSo") ||
    document.getElementById("tongSoKyThu");

  if (!data || data.length === 0) {
    bang.innerHTML =
      '<tr><td colspan="4" class="text-center py-4 text-muted">Chưa có ai đăng ký.</td></tr>';
    if (elementTongSo) elementTongSo.innerText = "0";
    return;
  }

  let html = "";
  data.forEach((kt, i) => {
    let tenKT = kt.tenKyThu || kt.ten || "Chưa có tên";
    let safeTen = tenKT.replace(/'/g, "\\'");
    let safeClb = (kt.clb || "Tự do").replace(/'/g, "\\'");

    let adminBtn =
      QUYEN_HAN === "admin"
        ? `<td class="text-center admin-action-col">
      <button class="btn btn-sm text-primary p-0 me-3" onclick="moModalSuaKyThu('${kt.id}', '${maGiai}', '${safeTen}', '${safeClb}')"><i class="fas fa-edit"></i></button>
      <button class="btn btn-sm text-danger p-0" onclick="huyDangKyKyThu('${kt.id}', '${maGiai}', '${safeTen}')"><i class="fas fa-user-minus"></i></button>
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

  // Điền tổng số kỳ thủ vào HTML cho cả 2 vị trí
  if (document.getElementById("ds_tongSo"))
    document.getElementById("ds_tongSo").innerText = data.length;
  if (document.getElementById("ds_tongSo_2"))
    document.getElementById("ds_tongSo_2").innerText = data.length;
}

// --- 5. KẾT QUẢ SUPABASE ---
async function xemKetQua(ma, ten) {
  document.getElementById("view_kq_tenGiai").innerText = ten;
  let bang = document.getElementById("bodyXemKetQua");
  bang.innerHTML =
    '<tr><td colspan="4" class="text-center py-4">Đang tải...</td></tr>';
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalXemKetQua"),
  ).show();

  const { data, error } = await supabaseClient
    .from("KyThu")
    .select("*")
    .eq("maGiai", ma);
  if (error || !data) {
    bang.innerHTML =
      '<tr><td colspan="4" class="text-center py-4 text-danger">Lỗi dữ liệu.</td></tr>';
    return;
  }

  let ds = data
    .filter((k) => k.diem !== null || k.xep_hang !== null)
    .sort((a, b) => (a.xep_hang || 999) - (b.xep_hang || 999));
  if (ds.length === 0) {
    bang.innerHTML =
      '<tr><td colspan="4" class="text-center py-4 text-muted fst-italic">Chưa cập nhật kết quả.</td></tr>';
    return;
  }

  let html = "";
  ds.forEach((kt) => {
    let h = kt.xep_hang;
    let hStr =
      h && h <= 3 ? `<span class="badge bg-danger fs-6">${h}</span>` : h || "-";
    html += `<tr class="text-center">
      <td class="fw-bold align-middle">${hStr}</td>
      <td class="text-start ps-3 fw-bold align-middle">${kt.tenKyThu || kt.ten} <br><small class="text-muted fw-normal">${kt.clb || ""}</small></td>
      <td class="text-primary fw-bold fs-5 align-middle">${kt.diem ?? "-"}</td>
      <td class="small text-muted align-middle">${kt.ghi_chu_ket_qua || ""}</td>
    </tr>`;
  });
  bang.innerHTML = html;
}

// --- 6. NHẬP KẾT QUẢ (ADMIN) ---
async function moModalNhapKetQua(ma, ten) {
  maGiaiKetQuaHienTai = ma;
  if (document.getElementById("timKiemKyThuNhapKQ"))
    document.getElementById("timKiemKyThuNhapKQ").value = "";
  let bang = document.getElementById("bodyNhapKetQua");
  bang.innerHTML =
    '<tr><td colspan="5" class="text-center py-4">Đang tải...</td></tr>';
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalNhapKetQua"),
  ).show();

  const { data, error } = await supabaseClient
    .from("KyThu")
    .select("*")
    .eq("maGiai", ma);
  if (error || !data) {
    bang.innerHTML =
      '<tr><td colspan="5" class="text-center py-4 text-danger">Lỗi kết nối.</td></tr>';
    return;
  }

  let html = "";
  data.forEach((kt, i) => {
    html += `<tr>
      <td class="text-center fw-bold text-muted">${i + 1}</td>
      <td class="fw-bold align-middle">${kt.tenKyThu || kt.ten}<input type="hidden" class="inp-kt-id" value="${kt.id}"></td>
      <td><input type="number" step="0.5" class="form-control text-center text-primary fw-bold inp-kt-diem" value="${kt.diem ?? ""}" data-old="${kt.diem ?? ""}"></td>
      <td><input type="number" class="form-control text-center text-danger fw-bold inp-kt-hang" value="${kt.xep_hang ?? ""}" data-old="${kt.xep_hang ?? ""}"></td>
      <td><input type="text" class="form-control inp-kt-ghichu" value="${kt.ghi_chu_ket_qua || ""}" data-old="${kt.ghi_chu_ket_qua || ""}"></td>
    </tr>`;
  });
  bang.innerHTML = html;
}

async function luuTatCaKetQua() {
  let rows = document.querySelectorAll("#bodyNhapKetQua tr");
  let updatePromises = [];

  rows.forEach((row) => {
    let idInp = row.querySelector(".inp-kt-id");
    if (!idInp) return;

    let id = idInp.value;
    let dInp = row.querySelector(".inp-kt-diem");
    let hInp = row.querySelector(".inp-kt-hang");
    let gInp = row.querySelector(".inp-kt-ghichu");

    let dVal = dInp.value.trim(),
      hVal = hInp.value.trim(),
      gVal = gInp.value.trim();
    let isChanged =
      dVal !== dInp.getAttribute("data-old") ||
      hVal !== hInp.getAttribute("data-old") ||
      gVal !== gInp.getAttribute("data-old");

    if (isChanged) {
      updatePromises.push(
        supabaseClient
          .from("KyThu")
          .update({
            diem: dVal === "" ? null : parseFloat(dVal),
            xep_hang: hVal === "" ? null : parseInt(hVal),
            ghi_chu_ket_qua: gVal === "" ? null : gVal,
          })
          .eq("id", id),
      );
    }
  });

  if (updatePromises.length === 0) {
    Swal.fire("Thông báo", "Không có thay đổi nào!", "info");
    return;
  }
  Swal.fire({ title: "Đang lưu...", didOpen: () => Swal.showLoading() });

  try {
    const results = await Promise.all(updatePromises);
    if (results.find((r) => r.error)) throw new Error("Lỗi lưu dữ liệu");
    Swal.fire("Thành công", "Đã cập nhật kết quả!", "success");
    bootstrap.Modal.getInstance(
      document.getElementById("modalNhapKetQua"),
    ).hide();
  } catch (e) {
    Swal.fire("Lỗi", "Không thể lưu kết quả.", "error");
  }
}

// --- TIỆN ÍCH LỌC TÌM KIẾM ---
function locKyThuDanhSach() {
  let val = document
    .getElementById("timKiemKyThuDanhSach")
    .value.toLowerCase()
    .trim();
  let count = 0;

  document.querySelectorAll("#bangDanhSachKyThu tr").forEach((r) => {
    let t = r.querySelectorAll("td")[1]?.textContent.toLowerCase() || "";
    if (t.includes(val)) {
      r.style.display = "";
      count++; // Có chữ khớp thì tăng biến đếm
    } else {
      r.style.display = "none";
    }
  });

  // --- PHẦN MỚI THAY THẾ: Cập nhật con số cho cả 2 vị trí ---
  if (document.getElementById("ds_tongSo")) {
    document.getElementById("ds_tongSo").innerText = count;
  }
  if (document.getElementById("ds_tongSo_2")) {
    document.getElementById("ds_tongSo_2").innerText = count;
  }
}
function locKyThuNhapKQ() {
  let val = document
    .getElementById("timKiemKyThuNhapKQ")
    .value.toLowerCase()
    .trim();
  document.querySelectorAll("#bodyNhapKetQua tr").forEach((r) => {
    let t = r.querySelectorAll("td")[1]?.textContent.toLowerCase() || "";
    r.style.display = t.includes(val) ? "" : "none";
  });
}
function moModalSuaGiaiDau(item) {
  document.getElementById("isEditGiaiDau").value = "true";
  document.getElementById("maGiaiDau").value = item.maGiai;
  document.getElementById("maGiaiDau").readOnly = true;
  document.getElementById("tenGiaiDau").value = item.tenGiai;
  document.getElementById("donViToChuc").value = item.donVi || "";

  var tgStr = "";
  if (item.thoiGian) {
    var dTG = new Date(item.thoiGian);
    if (!isNaN(dTG.getTime()))
      tgStr =
        dTG.getFullYear() +
        "-" +
        ("0" + (dTG.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + dTG.getDate()).slice(-2);
  }
  document.getElementById("thoiGianGiaiDau").value = tgStr;

  var hanStr = "";
  if (item.hanDangKy) {
    var dHan = new Date(item.hanDangKy);
    if (!isNaN(dHan.getTime()))
      hanStr =
        dHan.getFullYear() +
        "-" +
        ("0" + (dHan.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + dHan.getDate()).slice(-2) +
        "T" +
        ("0" + dHan.getHours()).slice(-2) +
        ":" +
        ("0" + dHan.getMinutes()).slice(-2);
  }
  document.getElementById("hanDangKy").value = hanStr;

  document.getElementById("soLuongToiDa").value = item.soLuongToiDa || "";

  document.getElementById("modalGiaiDauTitle").innerHTML =
    '<i class="fas fa-edit me-2"></i>Cập nhật Giải Đấu';
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalGiaiDau"),
  ).show();
}

async function luuGiaiDau() {
  var ten = document.getElementById("tenGiaiDau").value.trim();
  if (!ten) {
    alert("Vui lòng nhập tên giải đấu!");
    return;
  }

  var isEdit = document.getElementById("isEditGiaiDau").value === "true";
  var ma = document.getElementById("maGiaiDau").value.trim();

  // Nếu admin không nhập mã, tự động tạo mã mới: GD + Số ngẫu nhiên
  if (!ma && !isEdit) {
    ma = "GD" + new Date().getTime().toString().slice(-6);
  }

  var donVi = document.getElementById("donViToChuc").value.trim();
  var thoiGian = document.getElementById("thoiGianGiaiDau").value;
  var hanDangKy = document.getElementById("hanDangKy").value;
  var soLuongToiDa = document.getElementById("soLuongToiDa").value;

  // Khớp dữ liệu chuẩn 100% với cấu trúc bảng Supabase anh gửi
  var updateData = {
    maGiai: ma,
    tenGiai: ten,
    donVi: donVi === "" ? null : donVi,
    thoiGian: thoiGian === "" ? null : thoiGian,
    hanDangKy: hanDangKy === "" ? null : hanDangKy,
    soLuongToiDa: soLuongToiDa === "" ? null : parseInt(soLuongToiDa),
  };

  Swal.fire({
    title: "Đang lưu...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  try {
    let error = null;
    if (isEdit) {
      // Cập nhật
      const res = await supabaseClient
        .from("GiaiDau")
        .update(updateData)
        .eq("maGiai", ma);
      error = res.error;
    } else {
      // Thêm mới
      const res = await supabaseClient.from("GiaiDau").insert([updateData]);
      error = res.error;
    }

    if (error) throw error;

    Swal.fire("Thành công", "Đã lưu thông tin giải đấu!", "success");
    bootstrap.Modal.getInstance(document.getElementById("modalGiaiDau")).hide();
    taiDuLieuGiaiDau();
  } catch (err) {
    console.error(err);
    Swal.fire(
      "Lỗi Database",
      "Không thể lưu giải đấu. Kiểm tra lại mã giải đấu!",
      "error",
    );
  }
}

function moModalDangKy(maGiai, tenGiai) {
  document.getElementById("formDangKy").reset();
  document.getElementById("dk_maGiai").value = maGiai;
  document.getElementById("dk_tenGiai").value = tenGiai;
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalDangKy"),
  ).show();
}

function huyDangKyKyThu(id, maGiai, tenKyThu) {
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

      // Xóa thẳng trên Supabase
      const { error } = await supabaseClient
        .from("KyThu")
        .delete()
        .eq("id", id);

      if (!error) {
        const Toast = Swal.mixin({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
        });
        Toast.fire({ icon: "success", title: "Đã hủy đăng ký" });
        xemDanhSachKyThu(
          maGiai,
          document.getElementById("ds_tenGiai").innerText,
        );
        taiDuLieuGiaiDau(); // Tải lại bảng để trả lại 1 slot trống
      } else {
        Swal.fire("Lỗi", "Không thể xóa", "error");
        xemDanhSachKyThu(
          maGiai,
          document.getElementById("ds_tenGiai").innerText,
        );
      }
    }
  });
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
  let btn = document.getElementById("btnSubmitSuaKyThu");
  let textCu = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang lưu...';
  btn.disabled = true;

  let id = document.getElementById("edit_kt_id").value;
  let maGiai = document.getElementById("edit_kt_maGiai").value;

  let updateData = {
    tenKyThu: document.getElementById("edit_kt_ten").value,
    clb: document.getElementById("edit_kt_clb").value,
  };

  // Cập nhật thông tin thẳng lên Supabase
  const { error } = await supabaseClient
    .from("KyThu")
    .update(updateData)
    .eq("id", id);

  btn.innerHTML = textCu;
  btn.disabled = false;

  if (!error) {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
    });
    Toast.fire({ icon: "success", title: "Đã cập nhật!" });
    bootstrap.Modal.getInstance(
      document.getElementById("modalSuaKyThu"),
    ).hide();
    xemDanhSachKyThu(maGiai, document.getElementById("ds_tenGiai").innerText);
  } else {
    Swal.fire("Lỗi", "Có lỗi xảy ra, vui lòng thử lại", "error");
  }
}

// --- HÀM LỌC TÌM KIẾM TRONG DANH SÁCH KỲ THỦ ---
function locKyThuDanhSach() {
  var input = document
    .getElementById("timKiemKyThuDanhSach")
    .value.toLowerCase()
    .trim();
  var rows = document.querySelectorAll("#bangDanhSachKyThu tr");

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

  // Ẩn thanh tìm kiếm khi in
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

      // Hiện lại thanh tìm kiếm
      if (searchBox) searchBox.style.display = "block";

      if (colXoa) colXoa.style.display = originalColDisplay;
      actionCols.forEach((col) => (col.style.display = ""));
      Swal.close();
    });
}

// --- HÀM XUẤT EXCEL ---
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

// ==========================================
// TÍNH NĂNG NHẬP / XEM KẾT QUẢ SUPABASE
// ==========================================

async function xemKetQua(maGiai, tenGiai) {
  document.getElementById("view_kq_tenGiai").innerText = tenGiai;
  document.getElementById("bodyXemKetQua").innerHTML =
    '<tr><td colspan="4" class="text-center py-4">Đang tải...</td></tr>';

  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalXemKetQua"),
  ).show();

  const { data, error } = await supabaseClient
    .from("KyThu")
    .select("*")
    .eq("maGiai", maGiai);

  if (error || !data) {
    console.error("Lỗi tải dữ liệu Supabase:", error);
    document.getElementById("bodyXemKetQua").innerHTML =
      '<tr><td colspan="4" class="text-center py-4 text-danger">Lỗi kết nối dữ liệu.</td></tr>';
    return;
  }

  var dsKetQua = data
    .filter((k) => k.diem !== null || k.xep_hang !== null)
    .sort((a, b) => {
      let h1 = a.xep_hang !== null ? parseInt(a.xep_hang) : 999;
      let h2 = b.xep_hang !== null ? parseInt(b.xep_hang) : 999;
      return h1 - h2;
    });

  if (dsKetQua.length === 0) {
    document.getElementById("bodyXemKetQua").innerHTML =
      '<tr><td colspan="4" class="text-center py-4 text-muted fst-italic">Ban tổ chức chưa cập nhật kết quả cho giải đấu này.</td></tr>';
    return;
  }

  var html = "";
  dsKetQua.forEach((kt) => {
    var hangStr = "-";
    if (kt.xep_hang !== null) {
      hangStr =
        parseInt(kt.xep_hang) <= 3
          ? `<span class="badge bg-danger fs-6">${kt.xep_hang}</span>`
          : kt.xep_hang;
    }

    html += `<tr class="text-center">
          <td class="fw-bold align-middle">${hangStr}</td>
          <td class="text-start ps-3 fw-bold align-middle">${kt.tenKyThu || kt.ten} <br><small class="text-muted fw-normal">${kt.clb || ""}</small></td>
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

  document.getElementById("bodyNhapKetQua").innerHTML =
    '<tr><td colspan="5" class="text-center py-4">Đang tải danh sách kỳ thủ...</td></tr>';
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalNhapKetQua"),
  ).show();

  const { data, error } = await supabaseClient
    .from("KyThu")
    .select("*")
    .eq("maGiai", maGiai);

  if (error || !data) {
    console.error("Lỗi lấy dữ liệu Supabase:", error);
    document.getElementById("bodyNhapKetQua").innerHTML =
      '<tr><td colspan="5" class="text-center py-4 text-danger">Lỗi kết nối dữ liệu.</td></tr>';
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

      let request = supabaseClient
        .from("KyThu")
        .update(updateData)
        .eq("id", id);

      updatePromises.push(request);
    }
  });

  if (updatePromises.length === 0) {
    Swal.fire("Thông báo", "Bạn chưa nhập hay thay đổi kết quả nào!", "info");
    return;
  }

  Swal.fire({
    title: "Đang lưu kết quả...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  try {
    const results = await Promise.all(updatePromises);
    const errorRes = results.find((res) => res.error);

    if (!errorRes) {
      Swal.close();
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
      Toast.fire({ icon: "success", title: "Đã lưu kết quả thành công!" });
      bootstrap.Modal.getInstance(
        document.getElementById("modalNhapKetQua"),
      ).hide();
    } else {
      throw new Error(errorRes.error.message);
    }
  } catch (error) {
    console.error("Lỗi chi tiết Supabase:", error);
    Swal.fire(
      "Lỗi Database",
      "Dữ liệu nhập vào không hợp lệ hoặc kết nối lỗi.",
      "error",
    );
  }
}
