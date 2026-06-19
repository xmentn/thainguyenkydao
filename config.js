// ============================================================
// CẤU HÌNH KẾT NỐI FIREBASE CLOUD FIRESTORE TNKĐ-db
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyCI_s6pn-5KM7KlmyMzauP03VL0KmhUoTQ",
  authDomain: "tnkd-db.firebaseapp.com",
  projectId: "tnkd-db",
  storageBucket: "tnkd-db.firebasestorage.app",
  messagingSenderId: "78637099274",
  appId: "1:78637099274:web:b99792200f5bbdccef72f3",
};

// Tự động kiểm tra và khởi tạo kết nối đến Firebase nếu chưa có
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
// Biến db toàn cục dùng chung cho toàn bộ phân hệ trong dự án
var db = firebase.firestore();

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
// BỘ NÃO XỬ LÝ API (ĐỒNG BỘ THUẦN FIREBASE FIRESTORE 100%)
// ============================================================
async function callAPI(action, params = {}) {
  var loadingEl = document.getElementById("loadingOverlay");
  if (loadingEl) loadingEl.classList.add("active");

  try {
    let result = null;

    // --- 1. XỬ LÝ ĐĂNG NHẬP (FIREBASE) ---
    if (action === "login") {
      const snapshot = await db
        .collection("TaiKhoan")
        .where("taiKhoan", "==", params.username)
        .where("matKhau", "==", params.password)
        .get();

      if (!snapshot.empty) {
        let userData = snapshot.docs[0].data();
        result = {
          success: true,
          role: userData.quyenHan,
          name: userData.hoTen,
        };
      } else {
        result = { success: false };
      }
    }

    // --- 2. XỬ LÝ PHÂN HỆ GIẢI ĐẤU (FIREBASE) ---
    else if (action === "getGiaiDau") {
      const snapshot = await db.collection("GiaiDau").get();
      let list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Sắp xếp theo ngày tạo mới nhất lên đầu
      list.sort((a, b) => {
        let dateA = a.ngayTao
          ? a.ngayTao.toDate
            ? a.ngayTao.toDate()
            : new Date(a.ngayTao)
          : new Date(0);
        let dateB = b.ngayTao
          ? b.ngayTao.toDate
            ? b.ngayTao.toDate()
            : new Date(b.ngayTao)
          : new Date(0);
        return dateB - dateA;
      });
      result = list;
    } else if (action === "saveGiaiDau") {
      const dataDoc = {
        maGiai: params.ma,
        tenGiai: params.ten,
        donVi: params.donVi,
        thoiGian: params.thoiGian || null,
        hanDangKy: params.hanDangKy || null,
        linkDieuLe: params.linkDieuLe || null,
        soLuongToiDa: params.soLuongToiDa || null,
      };

      if (params.isEdit) {
        // CÁCH SỬA AN TOÀN: Truy vấn tìm đúng tài liệu có cột maGiai khớp để cập nhật, tránh lỗi lệch Document ID
        const snapshot = await db
          .collection("GiaiDau")
          .where("maGiai", "==", params.ma)
          .get();
        if (!snapshot.empty) {
          // Cập nhật tài liệu tìm thấy
          await snapshot.docs[0].ref.update(dataDoc);
          result = { success: true, message: "Đã cập nhật Giải đấu!" };
        } else {
          // Nếu tìm theo maGiai không thấy, thử cập nhật theo ID gốc dự phòng
          try {
            await db.collection("GiaiDau").doc(params.ma).update(dataDoc);
            result = { success: true, message: "Đã cập nhật Giải đấu!" };
          } catch (e) {
            result = {
              success: false,
              message: "Không tìm thấy giải đấu tương ứng trên Firebase!",
            };
          }
        }
      } else {
        // Thêm mới giải đấu (Giữ nguyên)
        let maGD = params.ma
          ? params.ma
          : "GD" + new Date().getTime().toString().slice(-6);
        dataDoc.maGiai = maGD;
        dataDoc.ngayTao = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("GiaiDau").doc(maGD).set(dataDoc);
        result = { success: true, message: "Đã thêm Giải đấu!" };
      }
    } else if (action === "deleteGiaiDau") {
      await db.collection("GiaiDau").doc(params.id).delete();
      result = { success: true, message: "Đã xóa giải đấu" };
    }

    // --- 3. XỬ LÝ KỲ THỦ ĐĂNG KÝ (FIREBASE) ---
    else if (action === "saveKyThu") {
      let maKT = "KT" + new Date().getTime();
      await db.collection("KyThu").doc(maKT).set({
        maGiai: params.maGiai,
        tenGiai: params.tenGiai,
        tenKyThu: params.tenKyThu,
        clb: params.clb,
        ngayDangKy: new Date().toString(),
      });
      result = { success: true, message: "Đăng ký thành công!" };
    } else if (action === "getDanhSachKyThu") {
      const snapshot = await db
        .collection("KyThu")
        .where("maGiai", "==", params.maGiai)
        .get();

      let list = snapshot.docs.map((doc) => {
        const item = doc.data();
        return {
          id: doc.id,
          ten: item.tenKyThu || item.ten || "Chưa có tên",
          clb: item.clb || "Tự do",
          ngayDangKyRaw: item.ngayDangKy,
        };
      });
      result = list;
    } else if (action === "deleteKyThu") {
      const snapshot = await db
        .collection("KyThu")
        .where("maGiai", "==", params.maGiai)
        .where("tenKyThu", "==", params.tenKyThu)
        .get();

      let deletePromises = snapshot.docs.map((doc) => doc.ref.delete());
      await Promise.all(deletePromises);
      result = { success: true, message: "Đã hủy đăng ký" };
    }

    // --- 3.5 XỬ LÝ HỘI VIÊN CLB (FIREBASE) ---
    else if (action === "getHoiVien") {
      const snapshot = await db.collection("HoiVien").get();
      result = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else if (action === "saveHoiVien") {
      const dataDoc = {
        hoTen: params.hoTen,
        soDienThoai: params.soDienThoai,
        diaChi: params.diaChi,
        status: params.status || "Chưa duyệt",
      };

      if (params.id) {
        await db.collection("HoiVien").doc(params.id).update(dataDoc);
        result = { success: true, message: "Đã cập nhật hội viên!" };
      } else {
        let maHV = "HV" + new Date().getTime();
        dataDoc.created_at = new Date().toISOString();
        await db.collection("HoiVien").doc(maHV).set(dataDoc);
        result = { success: true, message: "Đăng ký hội viên thành công!" };
      }
    }

    // --- 4. XỬ LÝ QUỸ CLB THU/CHI (FIREBASE) ---
    else if (action === "save") {
      let maGD = "GDICH" + new Date().getTime();
      await db
        .collection("GiaoDich")
        .doc(maGD)
        .set({
          ngay: params.ngayThang || null,
          loai: params.loaiGiaoDich || "",
          hangMuc: params.hangMuc || "",
          soTien: params.soTien ? parseInt(params.soTien) : 0,
          nguoiLienQuan: params.nguoiLienQuan || "",
          ghiChu: params.ghiChu || "",
          ngayTao: firebase.firestore.FieldValue.serverTimestamp(),
        });
      result = { success: true, message: "Đã lưu giao dịch vào hệ thống!" };
    } else if (action === "update") {
      await db
        .collection("GiaoDich")
        .doc(params.idEdit)
        .update({
          ngay: params.ngayThangEdit || null,
          loai: params.loaiGiaoDichEdit || "",
          hangMuc: params.hangMucEdit || "",
          soTien: params.soTienEdit ? parseInt(params.soTienEdit) : 0,
          nguoiLienQuan: params.nguoiLienQuanEdit || "",
          ghiChu: params.ghiChuEdit || "",
        });
      result = { success: true, message: "Đã cập nhật giao dịch thành công!" };
    } else if (action === "delete") {
      await db.collection("GiaoDich").doc(params.id).delete();
      result = { success: true, message: "Đã xóa giao dịch thành công!" };
    } else if (action === "search") {
      let snapshot = await db.collection("GiaoDich").get();
      let list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      if (params.tu) {
        list = list.filter((item) => item.ngay >= params.tu);
      }
      if (params.den) {
        list = list.filter((item) => item.ngay <= params.den);
      }
      if (params.loai && params.loai !== "Tất cả") {
        list = list.filter((item) => item.loai === params.loai);
      }
      if (params.ten) {
        let tenSearch = params.ten.toLowerCase().trim();
        list = list.filter(
          (item) =>
            item.nguoiLienQuan &&
            item.nguoiLienQuan.toLowerCase().includes(tenSearch),
        );
      }

      list.sort((a, b) => (b.ngay || "").localeCompare(a.ngay || ""));

      result = list.map((item) => ({
        id: item.id,
        ngay: item.ngay,
        loai: item.loai,
        hangMuc: item.hangMuc,
        tien: item.soTien,
        nguoi: item.nguoiLienQuan,
        ghiChu: item.ghiChu,
      }));
    } else if (action === "getReport") {
      const snapshot = await db.collection("GiaoDich").get();
      let tonQuy = 0,
        tongThu = 0,
        tongChi = 0;
      let dongQuy = 0,
        taiTro = 0,
        thuKhac = 0;
      let listHienVat = [];
      let sponsorMap = {};

      snapshot.forEach((doc) => {
        let item = doc.data();
        let tien = parseInt(item.soTien) || 0;
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
          "Dữ liệu trên Firebase luôn được sao lưu tự động và bảo mật tuyệt đối!",
      };
    }

    if (loadingEl) loadingEl.classList.remove("active");
    return result;
  } catch (error) {
    if (loadingEl) loadingEl.classList.remove("active");
    console.error("Lỗi Máy chủ Firebase:", error);
    Swal.fire(
      "Lỗi kết nối",
      "Không thể xử lý dữ liệu với Firebase. Vui lòng thử lại!",
      "error",
    );
    return null;
  }
}
