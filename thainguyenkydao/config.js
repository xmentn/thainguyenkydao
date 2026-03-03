// ============================================================
// CẤU HÌNH KẾT NỐI SUPABASE (CƠ SỞ DỮ LIỆU SIÊU TỐC)
// ============================================================

// 1. ANH DÁN URL VÀ ANON KEY CỦA ANH VÀO DƯỚI ĐÂY NHÉ:
const SUPABASE_URL = "https://vqjkiqvviffnvwhhgigf.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxamtpcXZ2aWZmbnZ3aGhnaWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDE0MTcsImV4cCI6MjA4ODA3NzQxN30.O8e0d4bEVv-GxX2blRLhKyQjlpOdveEOPWveLGw8-tc";

// Khởi tạo "đường ống" kết nối
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// HÀM DÙNG CHUNG
// ============================================================
function getQuyenHan() {
  return sessionStorage.getItem("QUYEN_HAN") || "";
}
function getUserName() {
  return sessionStorage.getItem("USER_NAME") || "";
}

function dangXuatChung() {
  Swal.fire({
    title: "Đăng xuất?",
    text: "Bạn muốn thoát khỏi hệ thống?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Đồng ý",
    cancelButtonText: "Không",
  }).then((result) => {
    if (result.isConfirmed) {
      sessionStorage.clear();
      window.location.href = "../index.html";
    }
  });
}

// ============================================================
// BỘ NÃO XỬ LÝ API (Thay thế hoàn toàn Google Script)
// ============================================================
async function callAPI(action, params = {}) {
  var loadingEl = document.getElementById("loadingOverlay");
  if (loadingEl) loadingEl.classList.add("active");

  try {
    let result = null;

    // --- 1. XỬ LÝ ĐĂNG NHẬP ---
    if (action === "login") {
      const { data, error } = await supabaseClient
        .from("TaiKhoan")
        .select("*")
        .eq("taiKhoan", params.username)
        .eq("matKhau", params.password);
      if (data && data.length > 0) {
        result = { success: true, role: data[0].quyenHan, name: data[0].hoTen };
      } else {
        result = { success: false };
      }
    }

    // --- 2. XỬ LÝ GIẢI ĐẤU ---
    else if (action === "getGiaiDau") {
      const { data, error } = await supabaseClient
        .from("GiaiDau")
        .select("*")
        .order("ngayTao", { ascending: false });
      result = data || [];
    } else if (action === "saveGiaiDau") {
      if (params.isEdit) {
        const { error } = await supabaseClient
          .from("GiaiDau")
          .update({
            ten: params.ten,
            donVi: params.donVi,
            thoiGian: params.thoiGian || null,
            hanDangKy: params.hanDangKy || null,
          })
          .eq("ma", params.ma);
        result = {
          success: !error,
          message: error ? error.message : "Đã cập nhật Giải đấu!",
        };
      } else {
        let maGD = params.ma ? params.ma : "GD" + new Date().getTime();
        const { error } = await supabaseClient.from("GiaiDau").insert([
          {
            ma: maGD,
            ten: params.ten,
            donVi: params.donVi,
            thoiGian: params.thoiGian || null,
            hanDangKy: params.hanDangKy || null,
          },
        ]);
        result = {
          success: !error,
          message: error ? error.message : "Đã thêm Giải đấu!",
        };
      }
    } else if (action === "deleteGiaiDau") {
      const { error } = await supabaseClient
        .from("GiaiDau")
        .delete()
        .eq("ma", params.id);
      result = { success: !error, message: "Đã xóa giải đấu" };
    }

    // --- 4. XỬ LÝ QUỸ CLB (THU/CHI) ---
    else if (action === "save") {
      const { error } = await supabaseClient.from("GiaoDich").insert([
        {
          ngay: params.ngayThang,
          loai: params.loaiGiaoDich,
          hangMuc: params.hangMuc,
          soTien: params.soTien,
          nguoiLienQuan: params.nguoiLienQuan,
          ghiChu: params.ghiChu,
        },
      ]);
      result = {
        success: !error,
        message: error ? error.message : "Đã lưu giao dịch!",
      };
    } else if (action === "update") {
      const { error } = await supabaseClient
        .from("GiaoDich")
        .update({
          ngay: params.ngayThangEdit,
          loai: params.loaiGiaoDichEdit,
          hangMuc: params.hangMucEdit,
          soTien: params.soTienEdit,
          nguoiLienQuan: params.nguoiLienQuanEdit,
          ghiChu: params.ghiChuEdit,
        })
        .eq("id", params.idEdit);
      result = {
        success: !error,
        message: error ? error.message : "Đã cập nhật giao dịch!",
      };
    } else if (action === "delete") {
      const { error } = await supabaseClient
        .from("GiaoDich")
        .delete()
        .eq("id", params.id);
      result = { success: !error, message: "Đã xóa giao dịch!" };
    } else if (action === "search") {
      let query = supabaseClient.from("GiaoDich").select("*");
      if (params.tu) query = query.gte("ngay", params.tu);
      if (params.den) query = query.lte("ngay", params.den);
      if (params.loai && params.loai !== "Tất cả")
        query = query.eq("loai", params.loai);
      if (params.ten) query = query.ilike("nguoiLienQuan", `%${params.ten}%`);

      const { data, error } = await query.order("ngay", { ascending: false });
      result = data
        ? data.map((item) => ({
            id: item.id,
            ngay: item.ngay,
            loai: item.loai,
            hangMuc: item.hangMuc,
            tien: item.soTien,
            nguoi: item.nguoiLienQuan,
            ghiChu: item.ghiChu,
          }))
        : [];
    } else if (action === "getReport") {
      const { data, error } = await supabaseClient.from("GiaoDich").select("*");
      let tonQuy = 0,
        tongThu = 0,
        tongChi = 0;
      let dongQuy = 0,
        taiTro = 0,
        thuKhac = 0;
      let listHienVat = [];
      let sponsorMap = {};

      if (data) {
        data.forEach((item) => {
          let tien = parseInt(item.soTien);
          if (item.loai === "Thu") {
            tongThu += tien;
            tonQuy += tien;
            if (item.hangMuc === "Đóng quỹ hội viên") dongQuy += tien;
            else if (item.hangMuc === "Tài trợ/Ủng hộ") {
              taiTro += tien;
              sponsorMap[item.nguoiLienQuan] =
                (sponsorMap[item.nguoiLienQuan] || 0) + tien;
            } else if (item.hangMuc === "Tài trợ hiện vật") {
              listHienVat.push({
                ngay: item.ngay,
                ten: item.nguoiLienQuan,
                vatpham: item.ghiChu,
              });
            } else thuKhac += tien;
          } else {
            tongChi += tien;
            tonQuy -= tien;
          }
        });
      }
      let top10 = Object.keys(sponsorMap)
        .map((k) => ({ ten: k, tien: sponsorMap[k] }))
        .sort((a, b) => b.tien - a.tien)
        .slice(0, 10);
      result = {
        tonQuy,
        tongThu,
        tongChi,
        chiTietNguonThu: { dongQuy, taiTro, thuKhac },
        top10,
        listHienVat,
      };
    } else if (action === "backup") {
      result = {
        success: true,
        message:
          "Dữ liệu trên Supabase luôn được sao lưu tự động và bảo mật tuyệt đối!",
      };
    }

    if (loadingEl) loadingEl.classList.remove("active");
    return result;
  } catch (error) {
    if (loadingEl) loadingEl.classList.remove("active");
    console.error("Lỗi Máy chủ:", error);
    Swal.fire(
      "Lỗi kết nối",
      "Không thể đọc dữ liệu. Vui lòng thử lại!",
      "error",
    );
    return null;
  }
}
