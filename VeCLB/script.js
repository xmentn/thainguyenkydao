// Thiết lập đường dẫn tĩnh lưu trữ file quy chế trên Supabase Storage
const PDF_PUBLIC_URL = `${SUPABASE_URL}/storage/v1/object/public/clb_assets/quy_che.pdf`;
var QUYEN_HAN = getQuyenHan();

// Khởi chạy hệ thống ngay khi trang web tải xong giao diện
document.addEventListener("DOMContentLoaded", function () {
  // 1. Kiểm tra đặc quyền Admin để mở rộng bảng điều khiển quản trị viên
  if (QUYEN_HAN === "admin") {
    // Hiện khung màu vàng cho phép chọn và tải file PDF quy chế lên
    let adminBox = document.getElementById("khoiAdminQuyChe");
    if (adminBox) adminBox.style.display = "block";

    // Mở khóa hiển thị thêm cột Số điện thoại và cột chức năng Thao tác duyệt
    if (document.getElementById("th_sdt"))
      document.getElementById("th_sdt").style.display = "table-cell";
    if (document.getElementById("th_hanhDong"))
      document.getElementById("th_hanhDong").style.display = "table-cell";
  }

  // 2. Kích hoạt hiển thị khung đọc tài liệu quy chế PDF trực tuyến
  docQuyChePdf();

  // 3. Thực hiện tải danh sách hội viên chính thức từ cơ sở dữ liệu
  taiDanhSachHoiVien();
});

// ============================================================================
// CHỨC NĂNG 1: QUẢN LÝ VÀ HIỂN THỊ FILE PDF QUY CHẾ (KHO LƯU TRỮ STORAGE)
// ============================================================================

function docQuyChePdf() {
  const container = document.getElementById("khungHienThiQuyChe");
  if (!container) return;

  // Sử dụng đuôi thời gian biến thiên (?t=...) để triệt tiêu bộ nhớ đệm (cache) của trình duyệt
  const urlKhongCache = `${PDF_PUBLIC_URL}?t=${new Date().getTime()}`;

  // Vẽ giao diện khung nhúng iframe đọc tài liệu phối hợp nút bấm tải trực tiếp phục vụ di động
  container.innerHTML = `
    <div class="d-flex justify-content-end mb-3">
      <a href="${urlKhongCache}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill fw-bold">
        <i class="fas fa-download me-1"></i> Xem toàn màn hình / Tải PDF quy chế
      </a>
    </div>
    <div class="ratio ratio-4x3 border rounded-3 overflow-hidden shadow-sm bg-light" style="min-height: 600px;">
      <iframe src="${urlKhongCache}" allow="autoplay">
        <p>Trình duyệt của bạn không hỗ trợ hiển thị tệp PDF trực tiếp. Vui lòng bấm nút tải về ở trên để đọc văn bản.</p>
      </iframe>
    </div>
  `;
}

async function taiLenQuyChePdf() {
  const fileInput = document.getElementById("fileQuyChePdf");
  if (!fileInput || fileInput.files.length === 0) {
    Swal.fire(
      "Thông báo",
      "Vui lòng chọn một tệp tin PDF trước khi click tải lên!",
      "warning",
    );
    return;
  }

  const file = fileInput.files[0];

  // Chặn định dạng dữ liệu lạ, chỉ chấp nhận tệp mở rộng .pdf
  if (file.type !== "application/pdf") {
    Swal.fire(
      "Lỗi định dạng",
      "Hệ thống chỉ chấp nhận lưu trữ tệp dữ liệu định dạng .pdf chuẩn!",
      "error",
    );
    return;
  }

  // Hiện hộp thoại xoay loading ngăn thao tác click chuột trùng lặp
  Swal.fire({
    title: "Đang đẩy tệp lên máy chủ...",
    text: "Quá trình xử lý diễn ra trong vài giây, vui lòng không tắt trình duyệt.",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  try {
    // Thực hiện đẩy file lên bucket clb_assets với cấu hình upsert: true ghi đè
    const { error } = await supabaseClient.storage
      .from("clb_assets")
      .upload("quy_che.pdf", file, {
        cacheControl: "0",
        upsert: true,
      });

    if (error) throw error;

    Swal.fire(
      "Thành công",
      "Văn bản quy chế hoạt động mới đã được áp dụng toàn hệ thống!",
      "success",
    );
    fileInput.value = ""; // Dọn sạch ô chọn file
    docQuyChePdf(); // Tải lại khung hiển thị văn bản mới ngay lập tức
  } catch (err) {
    console.error("Lỗi Storage:", err);
    Swal.fire(
      "Tải lên thất bại",
      "Lỗi phân quyền lưu trữ hoặc do chưa cấu hình chính sách INSERT/UPDATE cho bucket.",
      "error",
    );
  }
}

// ============================================================================
// CHỨC NĂNG 2: TRA CỨU ĐĂNG KÝ VÀ PHÊ DUYỆT HỘI VIÊN (BẢNG DATABASE HoiVien)
// ============================================================================

// --- HÀM TẢI DANH SÁCH HỘI VIÊN (ĐÃ NÂNG CẤP NÚT BẤM ADMIN) ---
async function taiDanhSachHoiVien() {
  const container = document.getElementById("bangHoiVien");
  const countLabel = document.getElementById("tongSoHoiVien");
  if (!container) return;

  try {
    const { data, error } = await supabaseClient
      .from("HoiVien")
      .select("*")
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<tr><td colspan="${QUYEN_HAN === 'admin' ? 6 : 4}" class="text-center py-4 text-muted">Hệ thống chưa ghi nhận dữ liệu hội viên nào.</td></tr>`;
      if (countLabel) countLabel.innerText = "0";
      return;
    }

    var html = "";
    data.forEach((hv, i) => {
      let isApproved = (hv.status === "Đã duyệt" || hv.status === "Thành viên chính thức");

      let statusBadge = isApproved
        ? `<span class="badge bg-success-subtle text-success border border-success border-opacity-25 px-2 py-1.5 rounded"><i class="fas fa-check-circle me-1"></i>Thành viên chính thức</span>`
        : `<span class="badge bg-warning-subtle text-warning border border-warning border-opacity-25 px-2 py-1.5 rounded"><i class="fas fa-clock me-1"></i>Chưa được duyệt</span>`;

      let sdtRow = (QUYEN_HAN === "admin") ? `<td class="text-center text-secondary small fw-bold">${hv.soDienThoai || "-"}</td>` : "";

      // Xử lý dữ liệu text an toàn (tránh lỗi khi tên có chứa dấu nháy đơn)
      let safeTen = (hv.hoTen || "").replace(/'/g, "\\'");
      let safeSdt = (hv.soDienThoai || "").replace(/'/g, "\\'");
      let safeDiaChi = (hv.diaChi || "").replace(/'/g, "\\'");
      let safeStatus = (hv.status || "").replace(/'/g, "\\'");

      // Bộ 3 nút bấm thao tác dành cho Admin
      let hanhDongRow = "";
      if (QUYEN_HAN === "admin") {
        // Nút Duyệt (Chỉ hiện khi chưa duyệt)
        let btnDuyet = !isApproved
          ? `<button class="btn btn-sm btn-success px-2 py-1 me-1 shadow-sm" title="Duyệt ngay" onclick="pheDuyetThanhVien('${hv.id}', '${safeTen}')"><i class="fas fa-check"></i></button>`
          : `<button class="btn btn-sm btn-secondary px-2 py-1 me-1 opacity-25" disabled><i class="fas fa-check"></i></button>`;

        // Nút Sửa
        let btnSua = `<button class="btn btn-sm btn-primary px-2 py-1 me-1 shadow-sm" title="Sửa thông tin" onclick="moModalSuaHoiVien('${hv.id}', '${safeTen}', '${safeSdt}', '${safeDiaChi}', '${safeStatus}')"><i class="fas fa-edit"></i></button>`;

        // Nút Xóa
        let btnXoa = `<button class="btn btn-sm btn-danger px-2 py-1 shadow-sm" title="Xóa hội viên" onclick="xoaHoiVien('${hv.id}', '${safeTen}')"><i class="fas fa-trash-alt"></i></button>`;

        hanhDongRow = `<td class="text-center text-nowrap">${btnDuyet}${btnSua}${btnXoa}</td>`;
      }

      html += `<tr>
        <td class="text-center fw-bold text-muted">${i + 1}</td>
        <td class="fw-bold text-dark ps-2">${hv.hoTen}</td>
        <td class="text-muted small">${hv.diaChi || "-"}</td>
        ${sdtRow}
        <td class="text-center">${statusBadge}</td>
        ${hanhDongRow}
      </tr>`;
    });

    container.innerHTML = html;
    if (countLabel) countLabel.innerText = data.length;

  } catch (err) {
    console.error("Lỗi kết nối CSDL bảng HoiVien:", err);
    container.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Không thể thiết lập kết nối đồng bộ dữ liệu.</td></tr>`;
  }
}

// --- CÁC HÀM XỬ LÝ CHỈNH SỬA VÀ XÓA (ADMIN) ---

// 1. Mở Modal và điền dữ liệu cũ vào Form Sửa
function moModalSuaHoiVien(id, ten, sdt, diachi, status) {
  document.getElementById("sua_id").value = id;
  document.getElementById("sua_hoTen").value = ten;
  document.getElementById("sua_soDienThoai").value = sdt;
  document.getElementById("sua_diaChi").value = diachi;

  // Tự động chọn đúng trạng thái hiện tại
  let selectStatus = document.getElementById("sua_status");
  if (status === "Đã duyệt" || status === "Thành viên chính thức") {
    selectStatus.value = "Đã duyệt";
  } else {
    selectStatus.value = "Chưa duyệt";
  }

  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalSuaHoiVien")).show();
}

// 2. Xử lý lưu cập nhật lên Supabase
async function xuLySuaHoiVien(event) {
  event.preventDefault();
  const id = document.getElementById("sua_id").value;
  const hoTen = document.getElementById("sua_hoTen").value.trim();
  const soDienThoai = document.getElementById("sua_soDienThoai").value.trim();
  const diaChi = document.getElementById("sua_diaChi").value.trim();
  const status = document.getElementById("sua_status").value;

  Swal.fire({ title: 'Đang lưu thay đổi...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

  try {
    const { error } = await supabaseClient
      .from("HoiVien")
      .update({ hoTen: hoTen, soDienThoai: soDienThoai, diaChi: diaChi, status: status })
      .eq("id", id);

    if (error) throw error;

    Swal.fire("Thành công!", "Đã cập nhật thông tin hội viên.", "success");
    bootstrap.Modal.getInstance(document.getElementById("modalSuaHoiVien")).hide();
    taiDanhSachHoiVien();
  } catch (err) {
    console.error(err);
    Swal.fire("Lỗi cập nhật", "Có lỗi xảy ra, không thể lưu dữ liệu.", "error");
  }
}

// 3. Xử lý lệnh Xóa hội viên
async function xoaHoiVien(id, ten) {
  Swal.fire({
    title: "Xóa vĩnh viễn?",
    text: `Bạn có chắc chắn muốn xóa hồ sơ của "${ten}" không? Thao tác này không thể hoàn tác!`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Đồng ý xóa",
    cancelButtonText: "Hủy"
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({ title: 'Đang xóa dữ liệu...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

      try {
        const { error } = await supabaseClient.from("HoiVien").delete().eq("id", id);
        if (error) throw error;

        Swal.fire("Đã xóa!", `Hồ sơ của ${ten} đã được xóa sạch khỏi hệ thống.`, "success");
        taiDanhSachHoiVien();
      } catch (err) {
        console.error(err);
        Swal.fire("Lỗi xóa", "Không thể xóa. Hãy kiểm tra lại quyền DELETE trên Supabase.", "error");
      }
    }
  });
}

async function xuLyDangKyHoiVien(event) {
  event.preventDefault(); // Triệt tiêu hành động tải lại trang mặc định của form mẫu

  const hoTen = document.getElementById("dk_hoTen").value.trim();
  const soDienThoai = document.getElementById("dk_soDienThoai").value.trim();
  const diaChi = document.getElementById("dk_diaChi").value.trim();

  Swal.fire({
    title: "Đang truyền dữ liệu đăng ký...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  try {
    // Đẩy bản ghi mới vào CSDL với trạng thái mặc định ép cứng là 'Chưa duyệt'
    const { error } = await supabaseClient.from("HoiVien").insert([
      {
        hoTen: hoTen,
        soDienThoai: soDienThoai,
        diaChi: diaChi,
        status: "Chưa duyệt",
      },
    ]);

    if (error) throw error;

    Swal.fire(
      "Gửi đơn thành công!",
      "Thông tin gia nhập của bạn đã được chuyển tới danh sách chờ duyệt của Ban chủ nhiệm.",
      "success",
    );

    // Thu nhỏ cửa sổ modal và xóa trắng các trường dữ liệu biểu mẫu nhập
    bootstrap.Modal.getInstance(
      document.getElementById("modalDangKyHoiVien"),
    ).hide();
    document.getElementById("formDangKyHoiVien").reset();

    // Cập nhật lại giao diện lưới bảng ngay lập tức để người đăng ký thấy tên mình ở trạng thái chờ duyệt
    taiDanhSachHoiVien();
  } catch (err) {
    console.error("Lỗi gửi dữ liệu đăng ký:", err);
    Swal.fire(
      "Lỗi hệ thống",
      "Không thể hoàn tất việc gửi đơn. Hãy kiểm tra lại cấu hình quyền INSERT công khai trên Supabase.",
      "error",
    );
  }
}

async function pheDuyetThanhVien(id, ten) {
  Swal.fire({
    title: "Phê duyệt hội viên chính thức?",
    text: `Xác nhận phê chuẩn cho thành viên "${ten}" tham gia vào tổ chức CLB Thái Nguyên Kỳ Đạo?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Đồng ý duyệt",
    cancelButtonText: "Hủy",
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: "Đang cập nhật trạng thái hồ sơ...",
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
      });

      try {
        // Cập nhật trường dữ liệu status sang 'Đã duyệt' khớp điều kiện ID chỉ định
        const { error } = await supabaseClient
          .from("HoiVien")
          .update({ status: "Đã duyệt" })
          .eq("id", id);

        if (error) throw error;

        Swal.fire(
          "Phê duyệt hoàn tất!",
          `Thành viên ${ten} đã chính thức trở thành hội viên chính thức.`,
          "success",
        );
        taiDanhSachHoiVien(); // Tải và vẽ lại bảng dữ liệu mới
      } catch (err) {
        console.error("Lỗi cập nhật dữ liệu phê duyệt:", err);
        Swal.fire(
          "Lỗi phê duyệt",
          "Thao tác thất bại. Hãy chắc chắn anh đã tạo chính sách cấp quyền UPDATE cho bảng dữ liệu.",
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
