/**
 * =========================================================================
 * ระบบบริหารงานลูกค้าสินเชื่อ เงินไชโย สาขาเขาช่องพราน (Pure Neumorphism Color Edition)
 * Theme: Orange (ส้ม), Blue (ฟ้า), Black (ดำ), White (ขาว)
 * Modern Vector Icons & Responsive Executive Analytics
 * =========================================================================
 */

const STORAGE_KEY_API_URL = "CHAIYO_KCP_API_URL";
const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycby2mv4TcwLAoz1AoY0vkGWbNxRZoBTnz0J2wGInpDqQEunzAAUdgi4OPpNtJ96PTsDL/exec";
let currentApiUrl = DEFAULT_API_URL;
localStorage.setItem(STORAGE_KEY_API_URL, DEFAULT_API_URL);
let currentDashboardPeriod = "month"; // 'today', 'month', 'year', 'all'
let currentReportPeriod = "month";
let regionalChecklistData = [
  { id: 1, period: "กันยายน 2569", branch: "เขาช่องพราน", item: "ยอดจัดสินเชื่อรวม (Volume)", target: "5,000,000", actual: "3,250,000", percent: "65.0%", status: "กำลังดำเนินการ", rank: "อันดับ 3", note: "เป้าหมายเขตราชบุรี 2569" },
  { id: 2, period: "กันยายน 2569", branch: "เขาช่องพราน", item: "ประกัน / ผลิตภัณฑ์เสริม (Non-motor)", target: "150,000", actual: "160,000", percent: "106.7%", status: "บรรลุเป้าหมาย", rank: "อันดับ 1", note: "ยอดเยี่ยมเกินเป้าหมาย" },
  { id: 3, period: "กันยายน 2569", branch: "เขาช่องพราน", item: "จำนวนลูกค้าใหม่ (ราย)", target: "30", actual: "22", percent: "73.3%", status: "กำลังดำเนินการ", rank: "อันดับ 4", note: "ลุยต่ออีก 8 ราย" },
  { id: 4, period: "กันยายน 2569", branch: "เขาช่องพราน", item: "ตรวจสภาพรถครบ 100%", target: "100%", actual: "100%", percent: "100.0%", status: "สำเร็จ", rank: "อันดับ 1", note: "ผ่านเกณฑ์คุณภาพ 100%" },
  { id: 5, period: "กันยายน 2569", branch: "เขาช่องพราน", item: "ติดตามหนี้ / NPL 0%", target: "0.0%", actual: "0.0%", percent: "100.0%", status: "สำเร็จ", rank: "อันดับ 1", note: "คุมคุณภาพหนี้ได้ดีเยี่ยม" }
];

/**
 * ฟังก์ชันแปลงวันที่และเวลาเป็นภาษาไทย พ.ศ. แบบ 24 ชั่วโมง (24 hr format)
 */
const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

/**
 * ฟังก์ชันช่วยแปลงตัวเลขยอดเงินให้ปลอดภัย (ตัด comma, ช่องว่าง, ตัวอักษร)
 */
function parseNumericAmount(val) {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, "").replace(/[^0-9.-]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * ตรวจสอบสถานะว่าเข้าข่าย "อนุมัติ" หรือไม่ (รองรับหลายรูปแบบ)
 */
function isApprovedStatus(status) {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return s.includes("อนุมัติ") || s.includes("approve") || s.includes("รับเงินแล้ว");
}

/**
 * จัดกลุ่มและทำให้ชื่อสถานะเป็นมาตรฐานเดียวกัน
 */
function normalizeStatus(status) {
  if (!status) return "นัดหมายเข้าสาขา";
  const s = String(status).trim();
  if (isApprovedStatus(s)) return "อนุมัติ/รับเงินแล้ว";
  if (s.includes("นัดหมาย")) return "นัดหมายเข้าสาขา";
  if (s.includes("90 วัน") || s.includes("ติดต่ออีกครั้ง") || s.includes("พึ่งโอน") || s.includes("โทรซ้ำ")) return "ติดต่ออีกครั้ง (รอครบ 90 วัน/พึ่งโอน)";
  if (s.includes("ไม่สนใจ") || s.includes("ปฏิเสธ") || s.includes("ยกเลิก")) return "ลูกค้าไม่สนใจ";
  if (s.includes("ไม่เข้า") || s.includes("ไม่ผ่าน") || s.includes("ติดเครดิต")) return "ไม่เข้าเงื่อนไข";
  return s;
}

/**
 * แปลงวันที่จากสตริงหลากหลายรูปแบบให้ได้ Date Object ที่ถูกต้อง
 * รองรับทั้ง ค.ศ., พ.ศ., ISO, YYYY-MM-DD, DD/MM/YYYY
 */
function parseFlexDate(dateInput) {
  if (!dateInput || dateInput === "-" || dateInput === "เมื่อสักครู่") return null;
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) return dateInput;

  let str = String(dateInput).trim().replace(/น\.$/, "").trim();

  // 1. ลองแปลงตรงๆ ก่อน
  let d = new Date(str.replace(" ", "T"));
  if (!isNaN(d.getTime())) {
    if (d.getFullYear() > 2400) {
      d.setFullYear(d.getFullYear() - 543);
    }
    return d;
  }

  // 2. รูปแบบ DD/MM/YYYY หรือ DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    let hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    let minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    let second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;

    if (year > 2400) year -= 543;
    const resDate = new Date(year, month, day, hour, minute, second);
    if (!isNaN(resDate.getTime())) return resDate;
  }

  // 3. รูปแบบ YYYY-MM-DD หรือ YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    let month = parseInt(ymdMatch[2], 10) - 1;
    let day = parseInt(ymdMatch[3], 10);
    let hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    let minute = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    let second = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;

    if (year > 2400) year -= 543;
    const resDate = new Date(year, month, day, hour, minute, second);
    if (!isNaN(resDate.getTime())) return resDate;
  }

  return null;
}

/**
 * ดึงวันที่ที่มีผลต่อการคำนวณสถิติ
 * ถ้าเป็นเคสอนุมัติ และมีวันที่อัปเดต/อนุมัติ ให้ใช้วันที่อัปเดตเป็นหลัก
 */
function getItemEffectiveDate(item) {
  if (isApprovedStatus(item.status)) {
    if (item.approvedAt) {
      const d = parseFlexDate(item.approvedAt);
      if (d) return d;
    }
    if (item.updatedAt) {
      const d = parseFlexDate(item.updatedAt);
      if (d) return d;
    }
  }
  if (item.createdAt && item.createdAt !== "เมื่อสักครู่") {
    const d = parseFlexDate(item.createdAt);
    if (d) return d;
  }
  return new Date();
}

function formatThaiDateTime24hr(dateInput) {
  if (!dateInput || dateInput === "-" || dateInput === "เมื่อสักครู่") return dateInput || "-";

  try {
    const d = parseFlexDate(dateInput);
    if (!d || isNaN(d.getTime())) return dateInput;

    const day = d.getDate();
    const month = THAI_MONTHS_SHORT[d.getMonth()];
    const yearBE = d.getFullYear() + 543;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day} ${month} ${yearBE} เวลา ${hours}:${minutes} น.`;
  } catch (e) {
    return dateInput;
  }
}

function formatThaiDateShort24hr(dateInput) {
  if (!dateInput || dateInput === "-" || dateInput === "เมื่อสักครู่") return dateInput || "-";

  try {
    const d = parseFlexDate(dateInput);
    if (!d || isNaN(d.getTime())) return dateInput;

    const day = d.getDate();
    const month = THAI_MONTHS_SHORT[d.getMonth()];
    const yearBE = d.getFullYear() + 543;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day} ${month} ${yearBE} (${hours}:${minutes} น.)`;
  } catch (e) {
    return dateInput;
  }
}

/**
 * ฐานข้อมูลแบรนด์และรุ่นรถยอดนิยมในประเทศไทย
 */
const THAI_VEHICLE_CATALOG = {
  "มอเตอร์ไซค์": {
    brands: ["Honda", "Yamaha", "Vespa", "GPX", "Kawasaki", "Suzuki", "Royal Enfield", "Lambretta", "Ryuka", "Lifan", "แบรนด์อื่นๆ"],
    models: {
      "Honda": ["Wave 110i", "Wave 125i", "Scoopy i", "Click 125", "Click 160", "PCX 160", "Forza 350", "ADV 160", "Lead 125", "Giorno+", "Super Cub", "MSX 125", "CBR 150R", "CB 150R"],
      "Yamaha": ["Grand Filano Hybrid", "Fazzio", "NMAX 155", "XMAX 300", "Aerox 155", "Finn", "GT125", "Exciter 155", "MT-15", "YZF-R15", "QBIX", "Spark 115i"],
      "Vespa": ["Primavera 150", "Sprint 150", "GTS Super 300", "LX 125", "S 125"],
      "GPX": ["Tuscan 150", "Drone 150", "Demon 150GR", "Legend 150", "Rock 110"],
      "Kawasaki": ["Ninja 300/400", "Z300/Z400", "D-Tracker 150/250", "KLX 140/150/230"],
      "Suzuki": ["Smash 115", "Raider 150", "Burgman 200/400", "Address", "GSX-R150"],
      "Royal Enfield": ["Hunter 350", "Classic 350", "Meteor 350", "Interceptor 650"],
      "Lambretta": ["V200 Special", "X300", "G350"]
    }
  },
  "รถเก๋ง": {
    brands: ["Toyota", "Honda", "Mazda", "Nissan", "Mitsubishi", "Suzuki", "MG", "BYD", "GWM / ORA", "Ford", "Mercedes-Benz", "BMW", "แบรนด์อื่นๆ"],
    models: {
      "Toyota": ["Yaris", "Yaris ATIV", "Vios", "Corolla Altis", "Camry", "Prius", "Corolla Cross", "CH-R"],
      "Honda": ["City", "City Hatchback", "Civic", "Accord", "Jazz", "HR-V", "CR-V", "BR-V", "WR-V"],
      "Mazda": ["Mazda 2", "Mazda 3", "CX-3", "CX-30", "CX-5", "CX-8"],
      "Nissan": ["Almera", "March", "Note", "Sylphy", "Teana", "Kicks e-Power"],
      "Mitsubishi": ["Attrage", "Mirage", "Xpander", "Xpander Cross"],
      "Suzuki": ["Swift", "Celerio", "Ciaz", "Ertiga", "XL7"],
      "MG": ["MG 3", "MG 4 Electric", "MG 5", "MG EP / ES", "MG ZS", "MG HS"],
      "BYD": ["Dolphin", "Atto 3", "Seal"],
      "GWM / ORA": ["ORA Good Cat", "Haval H6", "Haval Jolion"],
      "Ford": ["Focus", "Fiesta", "EcoSport"]
    }
  },
  "รถกระบะ": {
    brands: ["Isuzu", "Toyota", "Ford", "Mitsubishi", "Nissan", "MG", "Mazda", "Chevrolet", "แบรนด์อื่นๆ"],
    models: {
      "Isuzu": ["D-Max (แค็บ)", "D-Max (4 ประตู)", "D-Max (ตอนเดียว/ตู้ทึบ)", "D-Max Spark", "D-Max V-Cross 4x4", "MU-X", "MU-7", "TFR / ดราก้อนอาย"],
      "Toyota": ["Hilux Revo (แค็บ)", "Hilux Revo (4 ประตู)", "Hilux Revo (ตอนเดียว/ตู้ทึบ)", "Hilux Revo GR Sport", "Hilux Vigo / Vigo Champ", "Hilux Tiger / D4D", "Fortuner / Legender"],
      "Ford": ["Ranger (แค็บ)", "Ranger (4 ประตู/Wildtrak)", "Ranger (ตอนเดียว)", "Ranger Raptor", "Everest"],
      "Mitsubishi": ["Triton (แค็บ)", "Triton (4 ประตู)", "Triton (ตอนเดียว)", "Triton Athlete", "Strada", "Pajero Sport"],
      "Nissan": ["Navara (แค็บ)", "Navara (4 ประตู/PRO-4X)", "Navara (ตอนเดียว)", "Big-M / Frontier", "Terra"],
      "MG": ["Extender (แค็บ)", "Extender (4 ประตู)"],
      "Mazda": ["BT-50 (แค็บ)", "BT-50 (4 ประตู)", "Fighter"],
      "Chevrolet": ["Colorado (แค็บ/4ประตู)", "Trailblazer"]
    }
  },
  "รถบรรทุก/หกล้อ/สิบล้อ": {
    brands: ["Hino", "Isuzu", "Fuso (Mitsubishi)", "UD Trucks", "Scania", "Volvo", "Dongfeng", "แบรนด์อื่นๆ"],
    models: {
      "Hino": ["Hino 300 (4 ล้อ/6 ล้อเล็ก)", "Hino 500 Victor (6 ล้อ/10 ล้อ)", "Hino 700 (หัวลาก)", "Hino Dominator", "Hino Mega"],
      "Isuzu": ["Isuzu NLR/NMR (4 ล้อใหญ่/6 ล้อเล็ก)", "Isuzu Forward (FRR/FSR 6 ล้อ)", "Isuzu FXZ/GXZ (10 ล้อ/หัวลาก)", "Isuzu Giga", "Isuzu ELF"],
      "Fuso (Mitsubishi)": ["Canter (4 ล้อ/6 ล้อเล็ก)", "Fighter (6 ล้อ/10 ล้อ)", "Super Great (หัวลาก)"],
      "UD Trucks": ["Croner (6 ล้อ)", "Quester (10 ล้อ/หัวลาก)"]
    }
  },
  "รถเพื่อการเกษตร/แทรกเตอร์": {
    brands: ["Kubota (คูโบต้า)", "Yanmar (ยันม่าร์)", "New Holland", "John Deere", "Ford", "Iseki", "Massey Ferguson", "แบรนด์อื่นๆ"],
    models: {
      "Kubota (คูโบต้า)": ["L5018 / L5018SP", "L4018 / L4018SP", "L3218", "M7040", "M8540 / M9540", "M6040SU", "B2440 / B2140", "DC-70G (รถเกี่ยวข้าว)"],
      "Yanmar (ยันม่าร์)": ["EF494T", "EF393T", "YM357A", "YM351A", "Solís / Yanmar YM"],
      "New Holland": ["TT4.55", "TT4.75", "TT4.90", "TS6000"],
      "John Deere": ["5045D", "5055E", "5075E"]
    }
  },
  "โฉนดที่ดิน/อสังหาฯ": {
    brands: ["โฉนดที่ดิน (น.ส.4จ / ครุฑแดง)", "น.ส. 3 ก (ครุฑเขียว)", "น.ส. 3 (ครุฑดำ)", "ห้องชุด / คอนโดมิเนียม", "ที่ดินพร้อมสิ่งปลูกสร้าง"],
    models: {
      "โฉนดที่ดิน (น.ส.4จ / ครุฑแดง)": ["เนื้อที่ไม่เกิน 1 ไร่", "เนื้อที่ 1 - 5 ไร่", "เนื้อที่มากกว่า 5 ไร่"],
      "น.ส. 3 ก (ครุฑเขียว)": ["เนื้อที่เกษตรกรรม", "เนื้อที่อยู่อาศัย"],
      "ที่ดินพร้อมสิ่งปลูกสร้าง": ["บ้านเดี่ยวชั้นเดียว", "บ้านเดี่ยว 2 ชั้น", "ตึกแถว / อาคารพาณิชย์"]
    }
  }
};

// ตัวอย่างข้อมูลเริ่มต้น
const todayStr = new Date().toISOString().slice(0, 10);
let customerDataList = [
  {
    id: "CY-25690830-01",
    createdAt: `${todayStr} 09:30`,
    name: "นายสมศักดิ์ ขยันยิ่ง",
    phone: "089-111-2233",
    vehicleType: "รถกระบะ",
    brand: "Isuzu",
    model: "D-Max (แค็บ)",
    year: "2564 (2021)",
    licensePlate: "บข 1234 ราชบุรี",
    amount: 150000,
    status: "นัดหมายเข้าสาขา",
    appointmentDate: `${todayStr} 10:00`,
    officer: "พนักงานสาขาเขาช่องพราน",
    note: "นัดลูกค้านำเล่มทะเบียนตัวจริงและรถกระบะเข้ามาตรวจสภาพช่วง 10:00 น."
  },
  {
    id: "CY-25690830-02",
    createdAt: `${todayStr} 11:15`,
    name: "นางสาวสมร ดวงดี",
    phone: "081-444-5566",
    vehicleType: "มอเตอร์ไซค์",
    brand: "Honda",
    model: "Wave 110i",
    year: "2566 (2023)",
    licensePlate: "1กข 5678 ราชบุรี",
    amount: 25000,
    status: "ติดต่ออีกครั้ง (รอครบ 90 วัน/พึ่งโอน)",
    appointmentDate: `${todayStr} 14:00`,
    officer: "พนักงานสาขาเขาช่องพราน",
    note: "ลูกค้าพึ่งโอนรถมาเมื่อต้นเดือน รอครอบครองครบ 90 วันแล้วโทรแจ้งสิทธิ์อีกครั้ง"
  },
  {
    id: "CY-25690830-03",
    createdAt: `${todayStr} 13:45`,
    name: "นายบุญมี ชาวนา",
    phone: "092-777-8899",
    vehicleType: "รถเพื่อการเกษตร/แทรกเตอร์",
    brand: "Kubota (คูโบต้า)",
    model: "L5018 / L5018SP",
    year: "2563 (2020)",
    licensePlate: "ตจ 4567 ราชบุรี",
    amount: 200000,
    status: "อนุมัติ/รับเงินแล้ว",
    appointmentDate: "-",
    officer: "พนักงานสาขาเขาช่องพราน",
    note: "ปิดการขายเรียบร้อย อนุมัติและโอนเงินเข้าบัญชีลูกค้าแล้ว"
  }
];

let vehicleChartInstance = null;
let statusChartInstance = null;

// Initializer
document.addEventListener("DOMContentLoaded", () => {
  const inputUrl = document.getElementById("configApiUrl");
  if (inputUrl && currentApiUrl) {
    inputUrl.value = currentApiUrl;
  }

  populateYearSelect();
  selectVehicleType("มอเตอร์ไซค์");
  selectCaseStatus("นัดหมายเข้าสาขา");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const custDateInput = document.getElementById("custAppointmentDate");
  if (custDateInput) custDateInput.value = tomorrow.toISOString().slice(0, 16);

  // Auto Phone Number Formatter (0XX-XXX-XXXX)
  const phoneInput = document.getElementById("custPhone");
  if (phoneInput) {
    phoneInput.addEventListener("input", (e) => {
      let val = e.target.value.replace(/\D/g, "");
      if (val.length > 10) val = val.substring(0, 10);
      if (val.length > 6) {
        e.target.value = `${val.substring(0, 3)}-${val.substring(3, 6)}-${val.substring(6)}`;
      } else if (val.length > 3) {
        e.target.value = `${val.substring(0, 3)}-${val.substring(3)}`;
      } else {
        e.target.value = val;
      }
    });
  }

  loadCustomerData();
  calculateInstallment();
  renderRegionalChecklist();
  initLucideIcons();
});

function initLucideIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function triggerCelebrationConfetti() {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}

/**
 * ฟังก์ชันเลือกประเภทหลักประกันผ่านการ์ด Neumorphic
 */
function selectVehicleType(type) {
  const hiddenInput = document.getElementById("custVehicleType");
  if (hiddenInput) hiddenInput.value = type;

  const vehicleTypes = [
    "มอเตอร์ไซค์",
    "รถเก๋ง",
    "รถกระบะ",
    "รถบรรทุก/หกล้อ/สิบล้อ",
    "รถเพื่อการเกษตร/แทรกเตอร์",
    "โฉนดที่ดิน/อสังหาฯ"
  ];

  vehicleTypes.forEach(t => {
    const card = document.getElementById(`vtype-card-${t}`);
    if (card) {
      if (t === type) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
      }
    }
  });

  handleVehicleTypeChange(type);
  initLucideIcons();
}

/**
 * ฟังก์ชันเลือกสถานะเคสผ่านการ์ด Neumorphic (ในแบบฟอร์มหลัก)
 */
function selectCaseStatus(status) {
  const hiddenInput = document.getElementById("custStatus");
  if (hiddenInput) hiddenInput.value = status;

  const allStatuses = [
    "นัดหมายเข้าสาขา",
    "ติดต่ออีกครั้ง (รอครบ 90 วัน/พึ่งโอน)",
    "อนุมัติ/รับเงินแล้ว",
    "ลูกค้าไม่สนใจ",
    "ไม่เข้าเงื่อนไข"
  ];

  allStatuses.forEach(s => {
    const card = document.getElementById(`status-card-${s}`);
    if (card) {
      if (s === status) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
      }
    }
  });

  toggleAppointmentDateInputs(status);
  initLucideIcons();
}

/**
 * ฟังก์ชันเลือกสถานะเคสผ่านการ์ด Neumorphic (ในหน้าต่าง Modal อัปเดต)
 */
function selectModalStatus(status) {
  const normStatus = normalizeStatus(status);
  const hiddenInput = document.getElementById("modalCustStatus");
  if (hiddenInput) hiddenInput.value = normStatus;

  const allStatuses = [
    "นัดหมายเข้าสาขา",
    "ติดต่ออีกครั้ง (รอครบ 90 วัน/พึ่งโอน)",
    "อนุมัติ/รับเงินแล้ว",
    "ลูกค้าไม่สนใจ",
    "ไม่เข้าเงื่อนไข"
  ];

  allStatuses.forEach(s => {
    const card = document.getElementById(`mstatus-card-${s}`);
    if (card) {
      if (s === normStatus) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
      }
    }
  });

  toggleModalDateInput(normStatus);
  initLucideIcons();
}

/**
 * เติมตัวเลือกปีรถ
 */
function populateYearSelect() {
  const yearSelect = document.getElementById("custYear");
  if (!yearSelect) return;

  const currentYearCE = new Date().getFullYear();
  let html = `<option value="">-- ไม่ระบุปี --</option>`;

  for (let y = currentYearCE; y >= currentYearCE - 25; y--) {
    const yearBE = y + 543;
    html += `<option value="ปี ${yearBE} (ค.ศ. ${y})">ปี ${yearBE} (ค.ศ. ${y})</option>`;
  }
  yearSelect.innerHTML = html;
}

function handleVehicleTypeChange(type) {
  const brandList = document.getElementById("brandList");
  const modelList = document.getElementById("modelList");
  const custBrand = document.getElementById("custBrand");
  const custModel = document.getElementById("custModel");

  if (custBrand) custBrand.value = "";
  if (custModel) custModel.value = "";
  if (modelList) modelList.innerHTML = "";

  const category = THAI_VEHICLE_CATALOG[type];
  if (!category || !brandList) return;

  brandList.innerHTML = category.brands.map(b => `<option value="${b}">${b}</option>`).join("");
}

function handleBrandChange(brand) {
  const typeEl = document.getElementById("custVehicleType");
  const type = typeEl ? typeEl.value : "มอเตอร์ไซค์";
  const modelList = document.getElementById("modelList");
  const custModel = document.getElementById("custModel");

  if (custModel) custModel.value = "";
  const category = THAI_VEHICLE_CATALOG[type];
  if (!category || !category.models || !modelList) return;

  const models = category.models[brand];
  if (models && Array.isArray(models)) {
    modelList.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join("");
  } else {
    modelList.innerHTML = "";
  }
}

/**
 * สลับแท็บเมนู
 */
function switchTab(tabId) {
  const tabs = ["form", "list", "dashboard"];
  
  tabs.forEach(tab => {
    const el = document.getElementById(`tab-${tab}`);
    const btn = document.getElementById(`tabBtn-${tab}`);
    
    if (tab === tabId) {
      if (el) {
        el.classList.remove("hidden");
        el.classList.add("animate-fade-in");
      }
      if (btn) {
        btn.classList.add("active", "text-orange-600");
        btn.classList.remove("text-slate-700");
      }
    } else {
      if (el) el.classList.add("hidden");
      if (btn) {
        btn.classList.remove("active", "text-orange-600");
        btn.classList.add("text-slate-700");
      }
    }
  });

  if (tabId === "dashboard") {
    renderDashboard();
    renderRegionalChecklist();
  }

  initLucideIcons();
}

/**
 * ตรวจสอบว่าวันที่นัดหมายถึงกำหนดวันนี้หรือค้างติดตามหรือไม่
 * (ถ้าใส่วันที่ในอนาคต เช่น อีก 1 เดือน หรือปีหน้า จะถือว่ายังไม่ถึงกำหนด และไม่ขึ้นเตือนวันนี้)
 */
function isTaskDueTodayOrOverdue(appointmentDate) {
  if (!appointmentDate || appointmentDate === "-") return false;
  const targetDate = parseFlexDate(appointmentDate);
  if (!targetDate || isNaN(targetDate.getTime())) return false;

  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  return targetDate <= todayEnd;
}

/**
 * อัปเดตแบนเนอร์แจ้งเตือนงานประจำวัน
 */
function updateTodayTasksBanner() {
  let appointCount = 0;
  let callbackCount = 0;

  customerDataList.forEach(c => {
    if (isTaskDueTodayOrOverdue(c.appointmentDate)) {
      if (c.status === "นัดหมายเข้าสาขา") {
        appointCount++;
      } else if (c.status.includes("ติดต่ออีกครั้ง") || c.status.includes("90 วัน")) {
        callbackCount++;
      }
    }
  });

  const totalToday = appointCount + callbackCount;
  const badge = document.getElementById("todayBadgeCount");
  const appEl = document.getElementById("todayAppointCount");
  const callEl = document.getElementById("todayCallbackCount");
  const tabBadge = document.getElementById("tabListBadge");

  if (badge) badge.textContent = `${totalToday} งาน`;
  if (appEl) appEl.textContent = appointCount;
  if (callEl) callEl.textContent = callbackCount;

  if (tabBadge) {
    if (totalToday > 0) {
      tabBadge.textContent = totalToday;
      tabBadge.classList.remove("hidden");
    } else {
      tabBadge.classList.add("hidden");
    }
  }
}

function filterTodayTasks() {
  switchTab("list");
  const sFilter = document.getElementById("statusFilter");
  const tFilter = document.getElementById("typeFilter");
  if (sFilter) sFilter.value = "";
  if (tFilter) tFilter.value = "";
  
  const todayTasks = customerDataList.filter(c => 
    isTaskDueTodayOrOverdue(c.appointmentDate) && 
    (c.status === "นัดหมายเข้าสาขา" || c.status.includes("ติดต่ออีกครั้ง") || c.status.includes("90 วัน"))
  );

  renderCustomerTable(todayTasks);
  showToast(`🔍 แสดงรายการที่ถึงกำหนดติดต่อวันนี้/ค้างติดตาม (${todayTasks.length} รายการ)`);
}

/**
 * ควบคุมการแสดงผลช่องใส่วันที่นัดหมาย
 */
function toggleAppointmentDateInputs(status) {
  const container = document.getElementById("appointmentDateFieldContainer");
  const label = document.getElementById("appointmentDateLabel");

  if (!container) return;

  if (status === "นัดหมายเข้าสาขา") {
    container.classList.remove("hidden");
    if (label) label.innerHTML = `<i data-lucide="calendar" class="w-4 h-4 text-sky-600"></i> <span>วันที่และเวลานัดหมายเข้าสาขา (รูปแบบ 24 ชม.):</span>`;
  } else if (status.includes("ติดต่ออีกครั้ง")) {
    container.classList.remove("hidden");
    if (label) label.innerHTML = `<i data-lucide="clock" class="w-4 h-4 text-orange-600"></i> <span>วันที่นัดโทรซ้ำ (หลังครอบครองครบ 90 วัน):</span>`;
  } else {
    container.classList.add("hidden");
  }
  initLucideIcons();
}

function toggleModalDateInput(status) {
  const container = document.getElementById("modalDateFieldContainer");
  const label = document.getElementById("modalDateLabel");

  if (!container) return;

  if (status === "นัดหมายเข้าสาขา") {
    container.classList.remove("hidden");
    if (label) label.textContent = "📅 วันที่และเวลานัดหมายลูกค้าเข้าสาขา (24 ชม.)";
  } else if (status.includes("ติดต่ออีกครั้ง")) {
    container.classList.remove("hidden");
    if (label) label.textContent = "⏳ วันที่นัดโทรซ้ำ (หลังครอบครองครบ 90 วัน)";
  } else {
    container.classList.add("hidden");
  }
}

/**
 * ดึงข้อมูลลูกค้าจาก Google Apps Script
 */
async function loadCustomerData() {
  updateSyncStatus("loading", "กำลังซิงค์ข้อมูล...");

  if (!currentApiUrl) {
    updateSyncStatus("demo", "โหมดจำลอง (ยังไม่ได้เชื่อมต่อชีต)");
    renderCustomerTable(customerDataList);
    updateTodayTasksBanner();
    return;
  }

  try {
    const response = await fetch(currentApiUrl);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      customerDataList = result.data;
      if (Array.isArray(result.regionalChecklist) && result.regionalChecklist.length > 0) {
        regionalChecklistData = result.regionalChecklist;
      }
      updateSyncStatus("online", "เชื่อมต่อ Google Sheets สำเร็จ");
      renderCustomerTable(customerDataList);
      updateTodayTasksBanner();
      populateDashboardMonthSelect(customerDataList);
      renderRegionalChecklist(regionalChecklistData);
      if (document.getElementById("tab-dashboard") && !document.getElementById("tab-dashboard").classList.contains("hidden")) {
        renderDashboard();
      }
    } else {
      throw new Error(result.message || "รูปแบบข้อมูลไม่ถูกต้อง");
    }
  } catch (error) {
    console.error("Fetch error:", error);
    updateSyncStatus("error", "ดึงข้อมูลไม่สำเร็จ (คลิก ⚙️ ตรวจสอบ URL)");
    renderCustomerTable(customerDataList);
    updateTodayTasksBanner();
  }
}

/**
 * ดึงข้อมูลลูกค้าเก่าจากแท็บ "ข้อมูลลูกค้าติดต่อ"
 */
async function triggerSyncOldData(forceClear = false) {
  if (!currentApiUrl) {
    alert("กรุณาใส่ Web App URL และกด 'บันทึก URL' ก่อนกดดึงข้อมูลครับ");
    return;
  }

  if (forceClear && !confirm("คุณต้องการล้างข้อมูลในตารางใหม่แล้วนำเข้าข้อมูลจากแท็บ 'ข้อมูลลูกค้าติดต่อ' ทั้งหมด 100% ใช่หรือไม่?")) {
    return;
  }

  updateSyncStatus("loading", "กำลังดึงข้อมูลลูกค้าเก่า...");
  showToast(forceClear ? "⏳ กำลังล้างและนำเข้าข้อมูลเก่าทั้งหมด 100%..." : "⏳ กำลังดึงข้อมูลจากแท็บ 'ข้อมูลลูกค้าติดต่อ'...");

  try {
    const response = await fetch(currentApiUrl, {
      method: "POST",
      body: JSON.stringify({ action: "sync_old_data", force_clear: forceClear })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      showToast(`✅ ${result.message}`);
      await loadCustomerData();
      closeConfigModal();
    } else {
      alert(`⚠️ เกิดข้อผิดพลาด: ${result.message}`);
      updateSyncStatus("online", "พร้อมใช้งาน");
    }
  } catch (err) {
    alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}\n\nคำแนะนำ: กรุณาตรวจสอบว่าใน Apps Script ได้ตั้งค่า 'Who has access' เป็น 'Anyone' หรือยังครับ`);
    updateSyncStatus("error", "เกิดข้อผิดพลาดในการเชื่อมต่อ");
  }
}

/**
 * บันทึกข้อมูลลูกค้าใหม่
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  const submitBtn = document.getElementById("btnSubmitForm");
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `กำลังบันทึกข้อมูล...`;

  const selectedStatus = document.getElementById("custStatus")?.value || "นัดหมายเข้าสาขา";
  const appointmentDate = document.getElementById("custAppointmentDate")?.value || "-";

  const newCustomer = {
    action: "create",
    name: document.getElementById("custName").value.trim(),
    phone: document.getElementById("custPhone").value.trim(),
    vehicleType: document.getElementById("custVehicleType").value,
    brand: document.getElementById("custBrand").value.trim(),
    model: document.getElementById("custModel").value.trim(),
    year: document.getElementById("custYear").value,
    licensePlate: document.getElementById("custLicensePlate").value.trim(),
    amount: parseNumericAmount(document.getElementById("custAmount").value),
    status: selectedStatus,
    appointmentDate: (selectedStatus === "นัดหมายเข้าสาขา" || selectedStatus.includes("ติดต่ออีกครั้ง")) ? appointmentDate.replace("T", " ") : "-",
    officer: document.getElementById("custOfficer").value.trim() || "พนักงานสาขาเขาช่องพราน",
    note: document.getElementById("custNote").value.trim()
  };

  if (selectedStatus === "อนุมัติ/รับเงินแล้ว") {
    triggerCelebrationConfetti();
  }

  if (currentApiUrl) {
    try {
      const response = await fetch(currentApiUrl, {
        method: "POST",
        body: JSON.stringify(newCustomer)
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      
      showToast("✅ บันทึกข้อมูลและแจ้งเตือน LINE เรียบร้อยแล้ว!");
      document.getElementById("customerForm").reset();
      selectVehicleType("มอเตอร์ไซค์");
      selectCaseStatus("นัดหมายเข้าสาขา");
      await loadCustomerData();
      switchTab("list");
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล: " + error.message);
    }
  } else {
    const mockId = "CY-" + new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, '0') + "-" + Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const createdStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    customerDataList.unshift({
      id: mockId,
      createdAt: createdStr,
      ...newCustomer
    });
    showToast("✅ บันทึกข้อมูลสำเร็จ (โหมดจำลอง)!");
    document.getElementById("customerForm").reset();
    selectVehicleType("มอเตอร์ไซค์");
    selectCaseStatus("นัดหมายเข้าสาขา");
    renderCustomerTable(customerDataList);
    updateTodayTasksBanner();
    switchTab("list");
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = originalText;
  initLucideIcons();
}

/**
 * แสดงตารางลูกค้า (Pure Neumorphism: Orange & Blue Accents)
 */
function renderCustomerTable(data) {
  const tbody = document.getElementById("customerTableBody");
  const mobileContainer = document.getElementById("mobileCustomerCards");
  const countSpan = document.getElementById("totalDisplayCount");
  
  if (countSpan) countSpan.textContent = data.length;

  if (data.length === 0) {
    const emptyHtml = `
      <div class="text-center py-8 text-slate-500 font-bold">
        <p>ยังไม่พบข้อมูลลูกค้าในระบบ</p>
      </div>
    `;
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-500">${emptyHtml}</td></tr>`;
    if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
    initLucideIcons();
    return;
  }

  // 1. Mobile Cards View
  if (mobileContainer) {
    mobileContainer.innerHTML = data.map((item, idx) => {
      const statusClass = getStatusBadgeClass(item.status);
      const hasAppoint = item.appointmentDate && item.appointmentDate !== "-";
      const vehicleDetailStr = [item.brand, item.model, item.year ? `(${item.year})` : ""].filter(Boolean).join(" ");
      const formattedCreated = formatThaiDateTime24hr(item.createdAt);
      const formattedAppoint = formatThaiDateTime24hr(item.appointmentDate);

      return `
        <div class="mobile-table-card space-y-3 animate-fade-in" style="animation-delay: ${idx * 0.04}s">
          <div class="flex justify-between items-start gap-2">
            <div>
              <div class="font-black text-slate-950 text-sm sm:text-base">${escapeHtml(item.name)}</div>
              <div class="text-xs font-bold text-sky-950">${escapeHtml(item.vehicleType)} ${escapeHtml(vehicleDetailStr)}</div>
              ${item.licensePlate ? `<div class="text-[11px] text-slate-600 font-mono font-bold">${escapeHtml(item.licensePlate)}</div>` : ''}
            </div>
            <div class="text-right flex-shrink-0">
              <span class="status-badge ${statusClass} text-[11px]">
                ${escapeHtml(item.status)}
              </span>
              <div class="font-black text-orange-600 text-sm mt-1">
                ${parseNumericAmount(item.amount).toLocaleString()} บาท
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center text-[11px] text-slate-600 border-t border-gray-300/80 pt-2 font-semibold">
            <div>
              ${hasAppoint ? `
                <span class="text-sky-900 font-bold flex items-center gap-1">
                  <i data-lucide="clock" class="w-3 h-3 text-sky-600"></i> ${escapeHtml(formattedAppoint)}
                </span>
              ` : `<span>บันทึกเมื่อ: ${escapeHtml(formattedCreated)}</span>`}
            </div>
            <div class="text-slate-800 font-bold truncate">
              ผู้ดูแล: ${escapeHtml(item.officer || "-")}
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 pt-1 border-t border-gray-300/80">
            <a href="tel:${item.phone}" class="neu-button py-2 text-xs text-sky-900 font-bold flex items-center justify-center gap-1 border border-sky-200">
              <i data-lucide="phone-call" class="w-3.5 h-3.5 text-sky-600"></i>
              <span>โทร</span>
            </a>
            <button onclick="copyCustomerLineReminder('${item.id}')" class="neu-button py-2 text-xs text-emerald-800 font-bold flex items-center justify-center gap-1 border border-emerald-200">
              <i data-lucide="message-square" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>LINE</span>
            </button>
            <button onclick="openUpdateModal('${item.id}')" class="neu-button py-2 text-xs text-orange-950 font-black flex items-center justify-center gap-1 border border-orange-200">
              <i data-lucide="edit-2" class="w-3.5 h-3.5 text-orange-600"></i>
              <span>อัปเดต</span>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  // 2. iPad & Desktop Table View
  if (tbody) {
    tbody.innerHTML = data.map((item, idx) => {
      const statusClass = getStatusBadgeClass(item.status);
      const hasAppoint = item.appointmentDate && item.appointmentDate !== "-";
      const vehicleDetailStr = [item.brand, item.model, item.year ? `(${item.year})` : ""].filter(Boolean).join(" ");
      const formattedCreated = formatThaiDateShort24hr(item.createdAt);
      const formattedAppoint = formatThaiDateTime24hr(item.appointmentDate);

      return `
        <tr class="hover:bg-gray-100 transition-all table-row-animate" style="animation-delay: ${idx * 0.03}s">
          <td class="py-3 px-3 text-slate-600 text-xs whitespace-nowrap">
            <div class="font-bold text-slate-900">${escapeHtml(formattedCreated)}</div>
            <div class="text-[10px] text-slate-500 font-mono font-bold">${item.id}</div>
          </td>
          <td class="py-3 px-3">
            <div class="font-black text-slate-950">${escapeHtml(item.name)}</div>
            <div class="flex items-center gap-2 mt-1">
              <a href="tel:${item.phone}" class="neu-button px-2.5 py-0.5 text-[11px] text-sky-900 font-bold flex items-center gap-1.5 border border-sky-200" title="กดเพื่อโทรออก">
                <i data-lucide="phone-call" class="w-3 h-3 text-sky-600"></i>
                ${escapeHtml(item.phone)}
              </a>
            </div>
          </td>
          <td class="py-3 px-3 text-slate-800">
            <div class="font-black text-sky-950">${escapeHtml(item.vehicleType)}</div>
            <div class="text-xs font-bold text-slate-700">${escapeHtml(vehicleDetailStr || "-")}</div>
            ${item.licensePlate ? `<div class="text-[11px] text-slate-600 font-mono font-bold">${escapeHtml(item.licensePlate)}</div>` : ''}
          </td>
          <td class="py-3 px-3 text-right font-black text-orange-600 whitespace-nowrap text-sm">
            ${parseNumericAmount(item.amount).toLocaleString()} บาท
          </td>
          <td class="py-3 px-3 text-center">
            <div>
              <span class="status-badge ${statusClass}">
                ${escapeHtml(item.status)}
              </span>
            </div>
            ${hasAppoint ? `
              <div class="text-[11px] font-bold text-sky-950 mt-1 flex items-center justify-center gap-1">
                <i data-lucide="clock" class="w-3 h-3 text-sky-600"></i>
                <span>${escapeHtml(formattedAppoint)}</span>
              </div>
            ` : ''}
          </td>
          <td class="py-3 px-3 text-slate-700 text-xs font-bold whitespace-nowrap">
            ${escapeHtml(item.officer || "-")}
          </td>
          <td class="py-3 px-3 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="copyCustomerLineReminder('${item.id}')" class="neu-button p-1.5 text-xs text-emerald-800 border border-emerald-200" title="ก๊อปปี้ข้อความ LINE">
                <i data-lucide="message-square" class="w-3.5 h-3.5 text-emerald-600"></i>
              </button>
              <button onclick="openUpdateModal('${item.id}')" class="neu-button px-2.5 py-1 text-xs text-orange-950 font-black border border-orange-200 flex items-center gap-1" title="แก้ไข">
                <i data-lucide="edit-2" class="w-3.5 h-3.5 text-orange-600"></i>
                <span>อัปเดต</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  initLucideIcons();
}

/**
 * ค้นหาและกรอง
 */
function filterCustomerTable() {
  const qEl = document.getElementById("searchInput");
  const sEl = document.getElementById("statusFilter");
  const tEl = document.getElementById("typeFilter");

  const query = qEl ? qEl.value.toLowerCase() : "";
  const status = sEl ? sEl.value : "";
  const type = tEl ? tEl.value : "";

  const filtered = customerDataList.filter(item => {
    const fullSearchStr = `${item.name || ''} ${item.phone || ''} ${item.brand || ''} ${item.model || ''} ${item.licensePlate || ''} ${item.officer || ''}`.toLowerCase();
    const matchQuery = !query || fullSearchStr.includes(query);
    const matchStatus = !status || normalizeStatus(item.status) === normalizeStatus(status) || item.status === status;
    const matchType = !type || item.vehicleType === type;

    return matchQuery && matchStatus && matchType;
  });

  renderCustomerTable(filtered);
}

let selectedCustomMonthKey = null; // 'YYYY-MM'

/**
 * เติมตัวเลือกเดือนใน Dropdown แดชบอร์ดตามข้อมูลจริงในระบบ
 */
function populateDashboardMonthSelect(dataset = customerDataList) {
  const select = document.getElementById("dashboardMonthSelect");
  if (!select) return;

  const monthCountMap = {};
  dataset.forEach(item => {
    const d = getItemEffectiveDate(item);
    if (d && !isNaN(d.getTime())) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthCountMap[key] = (monthCountMap[key] || 0) + 1;
    }
  });

  const sortedKeys = Object.keys(monthCountMap).sort().reverse();
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let html = `<option value="current">เดือนปัจจุบัน (${THAI_MONTHS_FULL[now.getMonth()]} ${now.getFullYear() + 543})</option>`;
  
  sortedKeys.forEach(k => {
    const [y, m] = k.split("-").map(Number);
    const monthName = THAI_MONTHS_FULL[m - 1];
    const yearBE = y + 543;
    const isCurrent = k === currentKey;
    const label = `${monthName} ${yearBE} (${monthCountMap[k]} เคส)${isCurrent ? ' ⭐' : ''}`;
    html += `<option value="${k}" ${selectedCustomMonthKey === k ? 'selected' : ''}>${label}</option>`;
  });

  select.innerHTML = html;
}

function handleDashboardMonthChange(val) {
  if (val === "current") {
    selectedCustomMonthKey = null;
    setDashboardPeriod("month");
  } else {
    selectedCustomMonthKey = val;
    setDashboardPeriod("custom_month");
  }
}

/**
 * ฟังก์ชันกรองข้อมูลตามช่วงเวลา (ใช้วันที่อนุมัติ/อัปเดตสำหรับเคสอนุมัติ และวันที่สร้างสำหรับเคสทั่วไป)
 */
function filterDataByPeriod(period, dataset = customerDataList) {
  if (period === "all") return dataset;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  return dataset.filter(item => {
    const d = getItemEffectiveDate(item);
    if (!d || isNaN(d.getTime())) return true;

    if (period === "today") {
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === currentDate;
    } else if (period === "month") {
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    } else if (period === "custom_month" && selectedCustomMonthKey) {
      const [tYear, tMonth] = selectedCustomMonthKey.split("-").map(Number);
      return d.getFullYear() === tYear && (d.getMonth() + 1) === tMonth;
    } else if (period === "year") {
      return d.getFullYear() === currentYear;
    }
    return true;
  });
}

/**
 * สลับช่วงเวลาแดชบอร์ด
 */
function setDashboardPeriod(period) {
  currentDashboardPeriod = period;
  
  const periods = ["today", "month", "year", "all"];
  periods.forEach(p => {
    const btn = document.getElementById(`periodBtn-${p}`);
    if (btn) {
      if (p === period || (period === "custom_month" && p === "month")) {
        btn.classList.add("active", "text-orange-600");
        btn.classList.remove("text-slate-700");
      } else {
        btn.classList.remove("active", "text-orange-600");
        btn.classList.add("text-slate-700");
      }
    }
  });

  const titleEl = document.getElementById("dashboardPeriodTitle");
  const now = new Date();
  if (titleEl) {
    if (period === "today") {
      titleEl.textContent = `ประจำวันนี้ (${now.getDate()} ${THAI_MONTHS_SHORT[now.getMonth()]} ${now.getFullYear() + 543})`;
    } else if (period === "month") {
      titleEl.textContent = `ประจำเดือน ${THAI_MONTHS_FULL[now.getMonth()]} ${now.getFullYear() + 543}`;
    } else if (period === "custom_month" && selectedCustomMonthKey) {
      const [tYear, tMonth] = selectedCustomMonthKey.split("-").map(Number);
      titleEl.textContent = `ประจำเดือน ${THAI_MONTHS_FULL[tMonth - 1]} ${tYear + 543}`;
    } else if (period === "year") {
      titleEl.textContent = `ประจำปี พ.ศ. ${now.getFullYear() + 543}`;
    } else {
      titleEl.textContent = `ข้อมูลสะสมทั้งหมด`;
    }
  }

  renderDashboard();
}

/**
 * แดชบอร์ดและกราฟสรุปยอด (Pure Neumorphism Executive Dashboard)
 */
function renderDashboard() {
  const filteredData = filterDataByPeriod(currentDashboardPeriod, customerDataList);

  let totalCases = filteredData.length;
  let totalAmount = 0;
  let approvedAmount = 0;
  let approvedCount = 0;
  let vehicleMap = {
    "มอเตอร์ไซค์": 0,
    "รถเก๋ง": 0,
    "รถกระบะ": 0,
    "รถบรรทุก/หกล้อ/สิบล้อ": 0,
    "รถเพื่อการเกษตร/แทรกเตอร์": 0,
    "โฉนดที่ดิน/อสังหาฯ": 0
  };
  let statusMap = {
    "นัดหมายเข้าสาขา": 0,
    "ติดต่ออีกครั้ง (รอครบ 90 วัน/พึ่งโอน)": 0,
    "อนุมัติ/รับเงินแล้ว": 0,
    "ลูกค้าไม่สนใจ": 0,
    "ไม่เข้าเงื่อนไข": 0
  };

  filteredData.forEach(item => {
    const amt = parseNumericAmount(item.amount);
    totalAmount += amt;

    const normStatus = normalizeStatus(item.status);

    if (isApprovedStatus(item.status)) {
      approvedAmount += amt;
      approvedCount++;
      statusMap["อนุมัติ/รับเงินแล้ว"] = (statusMap["อนุมัติ/รับเงินแล้ว"] || 0) + 1;
    } else {
      statusMap[normStatus] = (statusMap[normStatus] || 0) + 1;
    }

    vehicleMap[item.vehicleType] = (vehicleMap[item.vehicleType] || 0) + 1;
  });

  const winRate = totalCases > 0 ? Math.round((approvedCount / totalCases) * 100) : 0;
  const approvedPercentOfAmt = totalAmount > 0 ? Math.round((approvedAmount / totalAmount) * 100) : 0;

  // Counters
  animateCounter("kpiTotalCases", totalCases);
  animateCounter("kpiTotalAmount", totalAmount);
  animateCounter("kpiApprovedAmount", approvedAmount);
  
  const appCountEl = document.getElementById("kpiApprovedCount");
  const winRateEl = document.getElementById("kpiWinRate");
  if (appCountEl) appCountEl.textContent = approvedCount.toLocaleString();
  if (winRateEl) winRateEl.textContent = `${winRate}%`;

  // Dynamic Progress Bars
  const approvedProgress = document.getElementById("kpiApprovedProgress");
  if (approvedProgress) approvedProgress.style.width = `${Math.min(approvedPercentOfAmt, 100)}%`;

  const winRateProgress = document.getElementById("kpiWinRateProgress");
  if (winRateProgress) winRateProgress.style.width = `${Math.min(winRate, 100)}%`;

  // 🎯 Update Monthly Sales Target Progress Gauge
  updateMonthlyTargetGauge(customerDataList);

  // Mini Vehicle Stats Grid
  const vehicleStatsContainer = document.getElementById("vehicleMiniStats");
  if (vehicleStatsContainer) {
    const activeVehicles = Object.keys(vehicleMap).filter(k => vehicleMap[k] > 0);
    if (activeVehicles.length === 0) {
      vehicleStatsContainer.innerHTML = `<div class="col-span-3 text-xs text-slate-500 font-bold py-1">ยังไม่มีข้อมูลหลักประกันในช่วงเวลานี้</div>`;
    } else {
      vehicleStatsContainer.innerHTML = activeVehicles.map(k => `
        <div class="neu-card-sm p-2 rounded-xl bg-gray-100/80">
          <div class="text-[11px] font-bold text-slate-700 truncate">${k.split('/')[0]}</div>
          <div class="text-sm font-black text-sky-950">${vehicleMap[k]} <span class="text-[10px] text-slate-600 font-normal">คัน</span></div>
        </div>
      `).join("");
    }
  }

  // Mini Status Stats Grid
  const statusStatsContainer = document.getElementById("statusMiniStats");
  if (statusStatsContainer) {
    statusStatsContainer.innerHTML = `
      <div class="neu-card-sm p-2 rounded-xl bg-sky-50 border border-sky-100">
        <div class="text-[11px] font-bold text-sky-950">นัดเข้าสาขา</div>
        <div class="text-sm font-black text-sky-700">${statusMap["นัดหมายเข้าสาขา"] || 0} <span class="text-[10px] font-normal">ราย</span></div>
      </div>
      <div class="neu-card-sm p-2 rounded-xl bg-orange-50 border border-orange-100">
        <div class="text-[11px] font-bold text-orange-950">รอครบ 90 วัน</div>
        <div class="text-sm font-black text-orange-700">${statusMap["ติดต่ออีกครั้ง (รอครบ 90 วัน/พึ่งโอน)"] || 0} <span class="text-[10px] font-normal">ราย</span></div>
      </div>
      <div class="neu-card-sm p-2 rounded-xl bg-emerald-50 border border-emerald-100">
        <div class="text-[11px] font-bold text-emerald-950">อนุมัติสำเร็จ</div>
        <div class="text-sm font-black text-emerald-700">${statusMap["อนุมัติ/รับเงินแล้ว"] || 0} <span class="text-[10px] font-normal">ราย</span></div>
      </div>
    `;
  }

  // 1. Doughnut Chart
  const vChartCanvas = document.getElementById("vehicleChart");
  if (vChartCanvas) {
    const ctxVehicle = vChartCanvas.getContext("2d");
    if (vehicleChartInstance) vehicleChartInstance.destroy();

    const vehicleLabels = Object.keys(vehicleMap).filter(k => vehicleMap[k] > 0);
    const vehicleValues = vehicleLabels.map(k => vehicleMap[k]);

    vehicleChartInstance = new Chart(ctxVehicle, {
      type: "doughnut",
      data: {
        labels: vehicleLabels.length ? vehicleLabels : ["ไม่มีข้อมูล"],
        datasets: [{
          data: vehicleValues.length ? vehicleValues : [1],
          backgroundColor: vehicleValues.length ? ["#ff6400", "#0284c7", "#6366f1", "#10b981", "#d97706", "#e11d48"] : ["#cbd5e1"],
          borderWidth: 3,
          borderColor: "#ffffff",
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "64%",
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
          legend: { position: "bottom", labels: { font: { family: "Prompt", weight: "bold", size: 11 }, padding: 12 } }
        }
      }
    });
  }

  // 2. Bar Chart
  const sChartCanvas = document.getElementById("statusChart");
  if (sChartCanvas) {
    const ctxStatus = sChartCanvas.getContext("2d");
    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(ctxStatus, {
      type: "bar",
      data: {
        labels: ["1. นัดเข้าสาขา", "2. รอครบ 90 วัน", "3. อนุมัติสำเร็จ", "4. ไม่สนใจ", "5. ไม่เข้าเกณฑ์"],
        datasets: [{
          label: "จำนวนเคส (ราย)",
          data: [
            statusMap["นัดหมายเข้าสาขา"] || 0,
            statusMap["ติดต่ออีกครั้ง (รอครบ 90 วัน/พึ่งโอน)"] || 0,
            statusMap["อนุมัติ/รับเงินแล้ว"] || 0,
            statusMap["ลูกค้าไม่สนใจ"] || 0,
            statusMap["ไม่เข้าเงื่อนไข"] || 0
          ],
          backgroundColor: ["#0284c7", "#ff6400", "#10b981", "#e11d48", "#64748b"],
          borderRadius: 10,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: { 
          y: { 
            beginAtZero: true, 
            ticks: { stepSize: 1, font: { family: "Prompt", weight: "bold" } },
            grid: { color: "#cbd5e1" }
          },
          x: {
            ticks: { font: { family: "Prompt", weight: "bold", size: 10 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  initLucideIcons();
}

/**
 * สรุปรายงานส่งผู้บริหาร/หัวหน้า (รายวัน/รายเดือน/รายปี)
 */
function openReportModal() {
  const modal = document.getElementById("reportModal");
  if (modal) modal.classList.remove("hidden");
  generateExecutiveReport(currentReportPeriod);
  initLucideIcons();
}

function closeReportModal() {
  const modal = document.getElementById("reportModal");
  if (modal) modal.classList.add("hidden");
}

function generateExecutiveReport(period) {
  currentReportPeriod = period;

  const periods = ["today", "month", "year"];
  periods.forEach(p => {
    const btn = document.getElementById(`repSelect-${p}`);
    if (btn) {
      if (p === period) {
        btn.classList.add("active", "text-orange-600");
        btn.classList.remove("text-slate-700");
      } else {
        btn.classList.remove("active", "text-orange-600");
        btn.classList.add("text-slate-700");
      }
    }
  });

  const filteredData = filterDataByPeriod(period, customerDataList);
  const now = new Date();
  
  let periodTitle = "";
  if (period === "today") {
    periodTitle = `ประจำวันที่ ${now.getDate()} ${THAI_MONTHS_FULL[now.getMonth()]} ${now.getFullYear() + 543}`;
  } else if (period === "month") {
    periodTitle = `ประจำเดือน ${THAI_MONTHS_FULL[now.getMonth()]} ${now.getFullYear() + 543}`;
  } else if (period === "year") {
    periodTitle = `ประจำปี พ.ศ. ${now.getFullYear() + 543}`;
  }

  let totalCases = filteredData.length;
  let totalAmount = 0;
  let approvedAmount = 0;
  let approvedCount = 0;
  let vehicleMap = {};
  let statusMap = {};

  filteredData.forEach(item => {
    const amt = parseNumericAmount(item.amount);
    totalAmount += amt;

    const normStatus = normalizeStatus(item.status);
    if (isApprovedStatus(item.status)) {
      approvedAmount += amt;
      approvedCount++;
      statusMap["อนุมัติ/รับเงินแล้ว"] = (statusMap["อนุมัติ/รับเงินแล้ว"] || 0) + 1;
    } else {
      statusMap[normStatus] = (statusMap[normStatus] || 0) + 1;
    }

    vehicleMap[item.vehicleType] = (vehicleMap[item.vehicleType] || 0) + 1;
  });

  const winRate = totalCases > 0 ? Math.round((approvedCount / totalCases) * 100) : 0;

  let vehicleBreakdownStr = "";
  Object.keys(vehicleMap).forEach(k => {
    vehicleBreakdownStr += `   - ${k}: ${vehicleMap[k]} ราย\n`;
  });

  const timeStamp24 = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} น.`;

  const report = 
`📊 [รายงานผลการดำเนินงานสินเชื่อ] เงินไชโย สาขาเขาช่องพราน
${periodTitle} (ข้อมูล ณ เวลา ${timeStamp24})
-----------------------------------------
👥 รับเรื่องลูกค้าทั้งหมด: ${totalCases.toLocaleString()} ราย
💰 ยอดขอสินเชื่อรวม: ${totalAmount.toLocaleString()} บาท
🎉 ปิดยอดอนุมัติสำเร็จ: ${approvedCount.toLocaleString()} ราย (${approvedAmount.toLocaleString()} บาท)
📈 อัตราความสำเร็จ (Win Rate): ${winRate}%

🚗 จำแนกตามประเภทหลักประกัน:
${vehicleBreakdownStr || '   - ยังไม่มีรายการ\n'}
📌 สถานะการติดตามงาน:
   - นัดหมายเข้าสาขา: ${statusMap["นัดหมายเข้าสาขา"] || 0} ราย
   - รอครบ 90 วัน/พึ่งโอน: ${statusMap["ติดต่ออีกครั้ง (รอครบ 90 วัน/พึ่งโอน)"] || 0} ราย
   - อนุมัติรับเงินแล้ว: ${statusMap["อนุมัติ/รับเงินแล้ว"] || 0} ราย
   - ไม่สนใจ/ไม่เข้าเงื่อนไข: ${(statusMap["ลูกค้าไม่สนใจ"] || 0) + (statusMap["ไม่เข้าเงื่อนไข"] || 0)} ราย
-----------------------------------------
💪 ทีมงานเงินไชโย สาขาเขาช่องพราน พร้อมลุยเต็มที่ครับ!`;

  const preview = document.getElementById("reportTextPreview");
  if (preview) preview.value = report;
}

function copyExecutiveReportToClipboard() {
  const preview = document.getElementById("reportTextPreview");
  if (!preview) return;
  const text = preview.value;
  navigator.clipboard.writeText(text).then(() => {
    showToast("📋 คัดลอกรายงานสรุปเรียบร้อย พร้อมส่งใน LINE ผู้บริหาร/หัวหน้า!");
    closeReportModal();
  });
}

/**
 * Modal อัปเดตสถานะ
 */
function openUpdateModal(id) {
  const item = customerDataList.find(c => String(c.id) === String(id));
  if (!item) return;

  const vehicleDetail = [item.vehicleType, item.brand, item.model, item.licensePlate].filter(Boolean).join(" - ");

  const idEl = document.getElementById("modalCustId");
  const nameEl = document.getElementById("modalCustName");
  const vEl = document.getElementById("modalCustVehicleDetail");
  const amtEl = document.getElementById("modalCustAmount");
  const offEl = document.getElementById("modalCustOfficer");
  const noteEl = document.getElementById("modalCustNote");
  const dateEl = document.getElementById("modalCustAppointmentDate");

  if (idEl) idEl.value = item.id;
  if (nameEl) nameEl.textContent = `${item.name} (${item.phone})`;
  if (vEl) vEl.textContent = `🚗 ${vehicleDetail}`;
  if (amtEl) amtEl.value = item.amount || "";
  if (offEl) offEl.value = item.officer || "";
  if (noteEl) noteEl.value = item.note || "";
  
  selectModalStatus(item.status || "นัดหมายเข้าสาขา");

  if (dateEl) {
    if (item.appointmentDate && item.appointmentDate !== "-") {
      dateEl.value = item.appointmentDate.replace(" ", "T");
    } else {
      dateEl.value = "";
    }
  }

  const modal = document.getElementById("updateModal");
  if (modal) modal.classList.remove("hidden");
  initLucideIcons();
}

function closeUpdateModal() {
  const modal = document.getElementById("updateModal");
  if (modal) modal.classList.add("hidden");
}

async function handleUpdateSubmit(event) {
  event.preventDefault();

  const id = document.getElementById("modalCustId").value;
  const status = document.getElementById("modalCustStatus").value;
  const amount = parseNumericAmount(document.getElementById("modalCustAmount").value);
  const officer = document.getElementById("modalCustOfficer").value.trim();
  const note = document.getElementById("modalCustNote").value.trim();
  let appointDate = document.getElementById("modalCustAppointmentDate").value || "-";
  if (appointDate !== "-") appointDate = appointDate.replace("T", " ");

  const now = new Date();
  const updatedStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (isApprovedStatus(status)) {
    triggerCelebrationConfetti();
  }

  const submitBtn = document.getElementById("btnSubmitUpdate");
  if (submitBtn) submitBtn.disabled = true;

  if (currentApiUrl) {
    try {
      const response = await fetch(currentApiUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "update",
          id: id,
          status: status,
          appointmentDate: (status === "นัดหมายเข้าสาขา" || status.includes("ติดต่ออีกครั้ง")) ? appointDate : "-",
          amount: amount,
          officer: officer,
          note: note,
          updatedAt: updatedStr,
          approvedAt: isApprovedStatus(status) ? updatedStr : undefined
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      showToast("✅ อัปเดตสถานะสำเร็จ!");
      closeUpdateModal();
      await loadCustomerData();
      renderDashboard();
    } catch (e) {
      alert("เกิดข้อผิดพลาด: " + e.message);
    }
  } else {
    const idx = customerDataList.findIndex(c => String(c.id) === String(id));
    if (idx !== -1) {
      customerDataList[idx].status = status;
      customerDataList[idx].appointmentDate = (status === "นัดหมายเข้าสาขา" || status.includes("ติดต่ออีกครั้ง")) ? appointDate : "-";
      customerDataList[idx].amount = amount;
      customerDataList[idx].officer = officer;
      customerDataList[idx].note = note;
      customerDataList[idx].updatedAt = updatedStr;
      if (isApprovedStatus(status)) {
        customerDataList[idx].approvedAt = updatedStr;
      }
    }
    showToast("✅ อัปเดตสถานะสำเร็จ (โหมดจำลอง)!");
    closeUpdateModal();
    renderCustomerTable(customerDataList);
    updateTodayTasksBanner();
    renderDashboard();
  }

  if (submitBtn) submitBtn.disabled = false;
  initLucideIcons();
}

/**
 * เครื่องคำนวณค่างวดสินเชื่อ
 */
function openCalcModal() {
  const modal = document.getElementById("calcModal");
  if (modal) modal.classList.remove("hidden");
  calculateInstallment();
  initLucideIcons();
}

function closeCalcModal() {
  const modal = document.getElementById("calcModal");
  if (modal) modal.classList.add("hidden");
}

function calculateInstallment() {
  const principal = Number(document.getElementById("calcPrincipal")?.value) || 0;
  const rateMonthlyPercent = Number(document.getElementById("calcInterestRate")?.value) || 1.15;
  const months = Number(document.getElementById("calcMonths")?.value) || 24;

  const totalInterest = principal * (rateMonthlyPercent / 100) * months;
  const totalPayment = principal + totalInterest;
  const monthlyPayment = months > 0 ? Math.ceil(totalPayment / months) : 0;

  const monthlyEl = document.getElementById("calcMonthlyPayment");
  const totalEl = document.getElementById("calcTotalInterest");
  if (monthlyEl) monthlyEl.textContent = `${monthlyPayment.toLocaleString()} บาท / เดือน`;
  if (totalEl) totalEl.textContent = `ดอกเบี้ยรวม: ${Math.round(totalInterest).toLocaleString()} บาท | ยอดรวม: ${Math.round(totalPayment).toLocaleString()} บาท`;
}

function applyCalculatedAmountToForm() {
  const principal = document.getElementById("calcPrincipal")?.value;
  const custAmountInput = document.getElementById("custAmount");
  
  if (custAmountInput && principal) {
    switchTab("form");
    custAmountInput.value = principal;
    closeCalcModal();
    
    // Highlight glow effect
    custAmountInput.scrollIntoView({ behavior: "smooth", block: "center" });
    custAmountInput.focus();
    custAmountInput.classList.add("ring-4", "ring-orange-400", "bg-orange-50");
    setTimeout(() => {
      custAmountInput.classList.remove("ring-4", "ring-orange-400", "bg-orange-50");
    }, 1500);

    showToast(`✨ นำวงเงิน ${Number(principal).toLocaleString()} บาท ใส่ในฟอร์มเรียบร้อยแล้ว!`);
  }
}

/**
 * ก๊อปปี้ข้อความเตือนนัดหมายลูกค้า
 */
function copyCustomerLineReminder(id) {
  const item = customerDataList.find(c => String(c.id) === String(id));
  if (!item) return;

  const formattedAppoint = formatThaiDateTime24hr(item.appointmentDate);

  let msg = `สวัสดีครับคุณ ${item.name}\n` +
            `จาก เงินไชโย สาขาเขาช่องพราน นะครับ 💙\n` +
            `เรื่อง: สินเชื่อทะเบียน${item.vehicleType} (${item.brand || ''} ${item.model || ''})\n`;

  if (item.status === "นัดหมายเข้าสาขา") {
    msg += `ขออนุญาตแจ้งเตือนนัดหมายตรวจสภาพรถ: ${formattedAppoint}\n` +
           `เอกสารที่ต้องนำมา: เล่มทะเบียนตัวจริง + บัตรประชาชน + รถคันจริง\n` +
           `ยินดีให้บริการครับ สอบถามโทร: 032-xxx-xxx`;
  } else if (item.status.includes("ติดต่ออีกครั้ง")) {
    msg += `ทางสาขาติดตามเรื่องการครอบครองรถครบกำหนด เพื่อรับสิทธิ์ประเมินวงเงินพิเศษครับ\n` +
           `สะดวกให้เจ้าหน้าที่ติดต่อกลับช่วงเวลาใดแจ้งได้เลยนะครับ`;
  } else {
    msg += `สถานะเรื่องสินเชื่อของคุณ: ${item.status}\n` +
           `ขอบคุณที่ไว้วางใจเงินไชโย สาขาเขาช่องพราน ครับ`;
  }

  navigator.clipboard.writeText(msg).then(() => {
    showToast(`💬 คัดลอกข้อความ LINE ของคุณ ${item.name} สำเร็จ!`);
  });
}

/**
 * แอนิเมชันนับตัวเลข
 */
function animateCounter(elementId, targetValue, duration = 800) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOutCubic = 1 - Math.pow(1 - progress, 3);
    const currentVal = Math.floor(start + (targetValue - start) * easeOutCubic);
    el.textContent = currentVal.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = targetValue.toLocaleString();
    }
  }

  requestAnimationFrame(update);
}

function getStatusBadgeClass(status) {
  const s = normalizeStatus(status);
  switch (s) {
    case "นัดหมายเข้าสาขา": return "status-appointment";
    case "ติดต่ออีกครั้ง (รอครบ 90 วัน/พึ่งโอน)": return "status-callback";
    case "อนุมัติ/รับเงินแล้ว": return "status-approved";
    case "ลูกค้าไม่สนใจ": return "status-uninterested";
    case "ไม่เข้าเงื่อนไข": return "status-disqualified";
    default: return "status-pending";
  }
}

/**
 * อัปเดตสถานะการซิงค์แบบปลอดภัย 100%
 */
function updateSyncStatus(state, text) {
  const el = document.getElementById("syncStatus");
  if (!el) return;

  let dotHtml = `<span class="w-2.5 h-2.5 rounded-full bg-sky-600 pulse-glow-blue flex-shrink-0"></span>`;
  if (state === "loading") {
    dotHtml = `<span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping flex-shrink-0"></span>`;
  } else if (state === "demo") {
    dotHtml = `<span class="w-2.5 h-2.5 rounded-full bg-orange-600 pulse-glow-orange flex-shrink-0"></span>`;
  } else if (state === "error") {
    dotHtml = `<span class="w-2.5 h-2.5 rounded-full bg-red-600 flex-shrink-0"></span>`;
  }
  
  el.innerHTML = `${dotHtml} <span id="syncStatusText" class="font-bold truncate">${escapeHtml(text)}</span>`;
}

function openConfigModal() {
  const modal = document.getElementById("configModal");
  if (modal) modal.classList.remove("hidden");
  initLucideIcons();
}

function closeConfigModal() {
  const modal = document.getElementById("configModal");
  if (modal) modal.classList.add("hidden");
}

function saveApiUrlConfig() {
  const input = document.getElementById("configApiUrl");
  const url = input ? input.value.trim() : "";
  currentApiUrl = url;
  localStorage.setItem(STORAGE_KEY_API_URL, url);
  closeConfigModal();
  showToast("💾 บันทึกการตั้งค่า URL สำเร็จ!");
  loadCustomerData();
}

/**
 * แจ้งเตือน Toast Notification สไตล์ iOS Dynamic Island
 */
function showToast(msg) {
  const existing = document.getElementById("app-dynamic-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "app-dynamic-toast";
  toast.className = "fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-slate-950/95 text-white backdrop-blur-xl border border-white/20 shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-fade-in transition-all";
  toast.innerHTML = msg;
  document.body.appendChild(toast);

  // Play subtle pleasant chime
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {}

  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%, -10px) scale(0.95)";
      setTimeout(() => toast.remove(), 250);
    }
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================================
   🎯 MONTHLY SALES TARGET MANAGEMENT
   ========================================================================= */
const STORAGE_KEY_TARGET = "CHAIYO_MONTHLY_TARGET";
const DEFAULT_TARGET = 3000000; // 3,000,000 บาท

function getMonthlyTarget() {
  return Number(localStorage.getItem(STORAGE_KEY_TARGET)) || DEFAULT_TARGET;
}

function openTargetModal() {
  const currentTarget = getMonthlyTarget();
  const input = document.getElementById("monthlyTargetInput");
  if (input) input.value = currentTarget;
  document.getElementById("targetModal")?.classList.remove("hidden");
  initLucideIcons();
}

function closeTargetModal() {
  document.getElementById("targetModal")?.classList.add("hidden");
}

function setQuickTarget(amount) {
  const input = document.getElementById("monthlyTargetInput");
  if (input) input.value = amount;
}

function saveMonthlyTarget() {
  const input = document.getElementById("monthlyTargetInput");
  const val = Number(input?.value);
  if (val && val > 0) {
    localStorage.setItem(STORAGE_KEY_TARGET, val);
    showToast(`✅ บันทึกเป้าหมาย ${val.toLocaleString()} บาท เรียบร้อยแล้ว!`);
    closeTargetModal();
    renderDashboard();
  } else {
    alert("กรุณาระบุจำนวนเงินเป้าหมายที่ถูกต้อง");
  }
}

function updateMonthlyTargetGauge(dataset = customerDataList) {
  const targetGoal = getMonthlyTarget();
  
  const now = new Date();
  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth();

  if (currentDashboardPeriod === "custom_month" && selectedCustomMonthKey) {
    const [y, m] = selectedCustomMonthKey.split("-").map(Number);
    targetYear = y;
    targetMonth = m - 1;
  }
  
  let approvedThisMonth = 0;
  dataset.forEach(item => {
    if (isApprovedStatus(item.status)) {
      const d = getItemEffectiveDate(item);
      if (d && d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
        approvedThisMonth += parseNumericAmount(item.amount);
      }
    }
  });

  const percent = targetGoal > 0 ? ((approvedThisMonth / targetGoal) * 100) : 0;
  const remaining = Math.max(0, targetGoal - approvedThisMonth);

  const goalText = document.getElementById("targetGoalText");
  const approvedText = document.getElementById("targetApprovedText");
  const percentText = document.getElementById("targetPercentText");
  const remainingText = document.getElementById("targetRemainingText");
  const progressBar = document.getElementById("targetProgressBar");
  const badgeMsg = document.getElementById("targetBadgeMsg");

  if (goalText) goalText.textContent = `${targetGoal.toLocaleString()} บาท`;
  if (approvedText) approvedText.textContent = `${approvedThisMonth.toLocaleString()} บาท`;
  if (percentText) percentText.textContent = `(${percent.toFixed(1)}%)`;

  if (remainingText) {
    if (remaining === 0) {
      remainingText.innerHTML = `🎉 <span class="text-emerald-700 font-black">ทะลุเป้าหมายแล้ว +${(approvedThisMonth - targetGoal).toLocaleString()} บาท</span>`;
    } else {
      remainingText.textContent = `เหลืออีก ${remaining.toLocaleString()} บาท ถึงเป้าหมาย`;
    }
  }

  if (progressBar) {
    progressBar.style.width = `${Math.min(percent, 100)}%`;
  }

  if (badgeMsg) {
    if (percent >= 100) {
      badgeMsg.className = "px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm flex items-center gap-1.5";
      badgeMsg.innerHTML = "<span>🏆 ทะลุเป้าหมาย 100%!</span>";
    } else if (percent >= 80) {
      badgeMsg.className = "px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-sm flex items-center gap-1.5";
      badgeMsg.innerHTML = "<span>🔥 ใกล้ถึงเป้าหมายแล้ว!</span>";
    } else if (percent >= 50) {
      badgeMsg.className = "px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-900 border border-sky-300 shadow-sm flex items-center gap-1.5";
      badgeMsg.innerHTML = "<span>🚀 เกินครึ่งทางแล้ว ลุยต่อ!</span>";
    } else {
      badgeMsg.className = "px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-200 shadow-sm flex items-center gap-1.5";
      badgeMsg.innerHTML = "<span>⚡ ลุยเคสให้เต็มที่!</span>";
    }
  }
}

const REGIONAL_MONTHS = ["ม.ค. 69", "ก.พ. 69", "มี.ค. 69", "เม.ย. 69", "พ.ค. 69", "มิ.ย. 69", "ก.ค. 69", "ส.ค. 69", "ก.ย. 69", "ต.ค. 69", "พ.ย. 69", "ธ.ค. 69"];

let currentRegionalSelectedMonth = "ส.ค. 69";
let currentRegionalViewMode = "spotlight"; // 'spotlight', 'matrix', 'chart'
let regionalTrendChartInstance = null;

let regionalMatrixData = {
  branch: "เขาช่องพราน",
  region: "เขตราชบุรี",
  metrics: [
    { key: "loan_target", label: "เป้าหมายยอดจัด", format: "currency", category: "สินเชื่อ", values: [800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000] },
    { key: "loan_actual", label: "วงเงินสินเชื่อที่อนุมัติ", format: "currency", category: "สินเชื่อ", values: [46000, 194000, 1701000, 21600, 251600, 913000, 522400, 308003, null, null, null, null] },
    { key: "loan_percent", label: "คิดเป็น % (สินเชื่อ)", format: "percent", category: "สินเชื่อ", values: [6.00, 27.00, 192.00, 2.70, 31.45, 38.50, 65.00, 39.00, null, null, null, null] },
    { key: "loan_cases", label: "จำนวนรายลูกค้า", format: "number", category: "สินเชื่อ", values: [1, 2, 1, 1, 2, 3, 2, 3, null, null, null, null] },
    { key: "ins_target", label: "เป้าหมายประกัน", format: "currency", category: "ประกัน", values: [60000, 60000, 60000, 60000, 60000, 60000, 60000, 60000, 60000, 60000, 60000, 60000] },
    { key: "ins_actual", label: "ยอดขายประกัน", format: "currency", category: "ประกัน", values: [28898.56, 13300.12, 2000.00, 15900.00, 40063.70, 29900.00, 13836.00, 32000.95, null, null, null, null] },
    { key: "ins_cases", label: "จำนวนรายประกัน", format: "number", category: "ประกัน", values: [2, 2, 2, 3, 5, 3, 3, 5, null, null, null, null] },
    { key: "ins_percent", label: "คิดเป็น % (ประกัน)", format: "percent", category: "ประกัน", values: [48.16, 22.17, 3.30, 26.50, 66.77, 49.83, 23.00, 53.00, null, null, null, null] },
    { key: "os_total", label: "OS ทั้งหมด (พอร์ตลูกหนี้)", format: "currency", category: "พอร์ตลูกหนี้", values: [20929082, 21043673, 22388345, 22270822, 22207933, 22155151, 22620948, 22800582, null, null, null, null] },
    { key: "overdue_amt", label: "ยอดหนี้ค้าง x day วงเงิน", format: "currency", category: "พอร์ตลูกหนี้", values: [4072581, 4117046, 3949425, 10414120, 7951304, 8461427, 8512821, 8486891, null, null, null, null] },
    { key: "overdue_cases", label: "จำนวนราย x day", format: "number", category: "พอร์ตลูกหนี้", values: [30, 35, 36, 42, 42, 47, 44, 52, null, null, null, null] },
    { key: "overdue_percent", label: "คิดเป็น % x day (NPL)", format: "percent", category: "พอร์ตลูกหนี้", values: [19.46, 19.56, 17.64, 46.76, 35.80, 38.19, 37.63, 37.22, null, null, null, null] },
    { key: "expense_monthly", label: "ค่าใช้จ่ายต่อเดือน", format: "currency", category: "การตลาด", values: [null, null, null, null, null, null, null, null, null, null, null, null] },
    { key: "mkt_offline", label: "การทำการตลาด Offline (ครั้ง)", format: "number", category: "การตลาด", values: [null, null, null, null, null, null, null, null, null, null, null, null] },
    { key: "mkt_online", label: "การทำการตลาด Online (ครั้ง)", format: "number", category: "การตลาด", values: [null, null, null, null, null, null, null, null, null, null, null, null] }
  ]
};

function setRegionalViewMode(mode) {
  currentRegionalViewMode = mode;
  const modes = ["spotlight", "matrix", "chart"];
  modes.forEach(m => {
    const btn = document.getElementById(`btnRegionalMode-${m}`);
    if (btn) {
      if (m === mode) {
        btn.className = "px-3 py-1 rounded-lg bg-white shadow-sm text-orange-600 font-black flex items-center gap-1";
      } else {
        btn.className = "px-3 py-1 rounded-lg text-slate-600 font-bold flex items-center gap-1 hover:text-slate-900";
      }
    }
  });

  renderRegionalChecklist();
}

function selectRegionalMonth(monthStr) {
  currentRegionalSelectedMonth = monthStr;
  renderRegionalChecklist();
}

function renderRegionalTimelinePills() {
  const container = document.getElementById("regionalTimelinePills");
  const labelEl = document.getElementById("timelineSelectedLabel");
  if (!container) return;

  if (labelEl) {
    labelEl.textContent = `${currentRegionalSelectedMonth} (สาขาเขาช่องพราน)`;
  }

  const loanPctMetric = regionalMatrixData.metrics.find(m => m.key === "loan_percent");

  container.innerHTML = REGIONAL_MONTHS.map((m, idx) => {
    const isSelected = m === currentRegionalSelectedMonth;
    const pctVal = loanPctMetric && loanPctMetric.values[idx] !== null ? loanPctMetric.values[idx] : null;

    let dotColor = "bg-slate-300";
    if (pctVal !== null) {
      dotColor = pctVal >= 100 ? "bg-emerald-500" : (pctVal >= 50 ? "bg-orange-500" : "bg-amber-400");
    }

    const activeClass = isSelected
      ? "bg-slate-950 text-white font-black shadow-md scale-105 border-slate-950"
      : "bg-white text-slate-700 font-bold hover:bg-orange-50 border-slate-200";

    return `
      <button onclick="selectRegionalMonth('${m}')" class="px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 whitespace-nowrap transition-all flex-shrink-0 ${activeClass}">
        <span class="w-2 h-2 rounded-full ${dotColor}"></span>
        <span>${m}</span>
        ${pctVal !== null ? `<span class="text-[10px] ${isSelected ? 'text-orange-300' : 'text-slate-400'} font-normal">(${Math.round(pctVal)}%)</span>` : ''}
      </button>
    `;
  }).join("");
}

function handleTargetSimulation(addAmount) {
  const addNum = Number(addAmount) || 0;
  const addTextEl = document.getElementById("simAddAmountText");
  const expectedPctEl = document.getElementById("simExpectedPct");

  if (addTextEl) addTextEl.textContent = `+${addNum.toLocaleString()} บาท`;

  const monthIdx = REGIONAL_MONTHS.indexOf(currentRegionalSelectedMonth);
  if (monthIdx === -1) return;

  const loanTarget = regionalMatrixData.metrics.find(m => m.key === "loan_target")?.values[monthIdx] || 800000;
  const loanActual = regionalMatrixData.metrics.find(m => m.key === "loan_actual")?.values[monthIdx] || 0;

  const simulatedTotal = loanActual + addNum;
  const simulatedPct = loanTarget > 0 ? ((simulatedTotal / loanTarget) * 100).toFixed(2) : "0.00";

  if (expectedPctEl) {
    expectedPctEl.textContent = `${simulatedPct}%`;
    if (simulatedPct >= 100) {
      expectedPctEl.className = "text-sm sm:text-base font-black text-emerald-600";
    } else {
      expectedPctEl.className = "text-sm sm:text-base font-black text-orange-600";
    }
  }
}

/**
 * นำเข้าไฟล์ Excel (.xlsx) ที่ดาวน์โหลดจาก SharePoint
 */
function handleExcelChecklistUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (typeof XLSX === "undefined") {
    alert("ไลบรารีอ่านไฟล์ Excel ยังโหลดไม่เสร็จ กรุณารีเฟรชหน้าเว็บอีกครั้งครับ");
    return;
  }

  showToast("⏳ กำลังอ่านไฟล์ Excel จาก SharePoint...");
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      
      let sheetName = workbook.SheetNames[0];
      for (const name of workbook.SheetNames) {
        if (name.includes("เขาช่องพราน") || name.includes("เป้าหมาย") || name.includes("ราชบุรี")) {
          sheetName = name;
          break;
        }
      }
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonRows && jsonRows.length > 3) {
        parseExcelChecklistData(jsonRows);
        showToast(`✅ นำเข้าข้อมูลสาขาเขาช่องพรานจากไฟล์ '${file.name}' สำเร็จ!`);
        triggerCelebrationConfetti();
        renderRegionalChecklist();
      } else {
        throw new Error("โครงสร้างตารางในไฟล์ไม่ตรงกับแบบฟอร์ม");
      }
    } catch (err) {
      console.error("Excel parse error:", err);
      alert("เกิดข้อผิดพลาดในการอ่านไฟล์: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function parseExcelChecklistData(rows) {
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const rowStr = (rows[r] || []).join(" ");
    if (rowStr.includes("ม.ค.") || rowStr.includes("รายงาน") || rowStr.includes("เป้าหมาย")) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) return;

  const headerRow = rows[headerRowIdx];
  const colMonthMap = {};
  headerRow.forEach((colVal, colIdx) => {
    const str = String(colVal || "").trim();
    REGIONAL_MONTHS.forEach((m, mIdx) => {
      const shortM = m.split(" ")[0]; // e.g. "ม.ค."
      if (str.includes(shortM)) {
        colMonthMap[mIdx] = colIdx;
      }
    });
  });

  // Read data rows
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const rowLabel = String(row[0] || row[1] || "").trim();
    if (!rowLabel) continue;

    const matchedMetric = regionalMatrixData.metrics.find(m => 
      rowLabel.includes(m.label.substring(0, 8)) || m.label.includes(rowLabel.substring(0, 8))
    );

    if (matchedMetric) {
      REGIONAL_MONTHS.forEach((m, mIdx) => {
        const cIdx = colMonthMap[mIdx];
        if (cIdx !== undefined && row[cIdx] !== undefined && row[cIdx] !== null && row[cIdx] !== "") {
          const rawVal = row[cIdx];
          if (matchedMetric.format === "percent") {
            matchedMetric.values[mIdx] = parseFloat(String(rawVal).replace(/%/g, "")) || 0;
          } else {
            matchedMetric.values[mIdx] = parseNumericAmount(rawVal);
          }
        }
      });
    }
  }
}

/**
 * วาดกราฟแนวโน้มผลงาน 12 เดือน (Interactive Trend Chart)
 */
function renderRegionalTrendChart() {
  const canvas = document.getElementById("regionalTrendChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (regionalTrendChartInstance) regionalTrendChartInstance.destroy();

  const loanActuals = regionalMatrixData.metrics.find(m => m.key === "loan_actual")?.values || [];
  const loanTargets = regionalMatrixData.metrics.find(m => m.key === "loan_target")?.values || [];
  const insActuals = regionalMatrixData.metrics.find(m => m.key === "ins_actual")?.values || [];

  regionalTrendChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: REGIONAL_MONTHS,
      datasets: [
        {
          type: "bar",
          label: "ยอดสินเชื่ออนุมัติจริง (บาท)",
          data: loanActuals,
          backgroundColor: "#ff6400",
          borderRadius: 8,
          borderSkipped: false,
          yAxisID: "y"
        },
        {
          type: "line",
          label: "เป้าหมายสินเชื่อ (800k)",
          data: loanTargets,
          borderColor: "#0f172a",
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 3,
          pointBackgroundColor: "#0f172a",
          yAxisID: "y"
        },
        {
          type: "line",
          label: "ยอดขายประกัน (บาท)",
          data: insActuals,
          borderColor: "#0284c7",
          backgroundColor: "rgba(2, 132, 199, 0.1)",
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#0284c7",
          yAxisID: "y1"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", labels: { font: { family: "Prompt", weight: "bold", size: 11 } } },
        tooltip: {
          padding: 12,
          callbacks: {
            label: function(context) {
              const val = context.raw || 0;
              return `${context.dataset.label}: ${Number(val).toLocaleString()} บาท`;
            }
          }
        }
      },
      scales: {
        y: {
          type: "linear",
          display: true,
          position: "left",
          ticks: { callback: (val) => `${(val / 1000).toLocaleString()}k` },
          grid: { color: "#f1f5f9" }
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          ticks: { callback: (val) => `${(val / 1000).toLocaleString()}k` },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

/**
 * คัดลอกรายงานสรุปผลงานสาขาเขาช่องพรานเพื่อส่ง LINE หัวหน้าเขต
 */
function copyRegionalLineReport() {
  const monthStr = currentRegionalSelectedMonth;
  const monthIdx = REGIONAL_MONTHS.indexOf(monthStr);
  if (monthIdx === -1) return;

  const getV = (key) => regionalMatrixData.metrics.find(m => m.key === key)?.values[monthIdx];

  const loanT = getV("loan_target") || 800000;
  const loanA = getV("loan_actual") || 0;
  const loanPct = getV("loan_percent") || 0;
  const loanCases = getV("loan_cases") || 0;

  const insT = getV("ins_target") || 60000;
  const insA = getV("ins_actual") || 0;
  const insPct = getV("ins_percent") || 0;
  const insCases = getV("ins_cases") || 0;

  const osTotal = getV("os_total") || 0;
  const overdueAmt = getV("overdue_amt") || 0;
  const overduePct = getV("overdue_percent") || 0;

  const msg = [
    `🎯 รายงานผลงานเป้าหมาย สาขาเขาช่องพราน (เขตราชบุรี)`,
    `📅 ประจำงวด: ${monthStr} 2569`,
    `━━━━━━━━━━━━━━━━━━`,
    `💳 1. ยอดจัดสินเชื่อ:`,
    `• อนุมัติจริง: ${loanA.toLocaleString()} บาท (${Number(loanPct).toFixed(1)}%)`,
    `• เป้าหมาย: ${loanT.toLocaleString()} บาท | ลูกค้าใหม่: ${loanCases} ราย`,
    ``,
    `🛡️ 2. ยอดขายประกัน (Non-Motor):`,
    `• ทำได้จริง: ${Math.round(insA).toLocaleString()} บาท (${Number(insPct).toFixed(1)}%)`,
    `• เป้าหมาย: ${insT.toLocaleString()} บาท | จำนวน: ${insCases} ราย`,
    ``,
    `📊 3. พอร์ตลูกหนี้ OS & หนี้ค้าง:`,
    `• OS รวม: ${(osTotal / 1000000).toFixed(2)} ล้านบาท`,
    `• ยอดหนี้ค้าง: ${(overdueAmt / 1000000).toFixed(2)} ล้านบาท (${Number(overduePct).toFixed(2)}%)`,
    `━━━━━━━━━━━━━━━━━━`,
    `✨ ข้อมูลจากระบบติดตามงานสาขา เงินไชโย (เขาช่องพราน)`
  ].join("\n");

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(msg).then(() => {
      showToast(`📋 คัดลอกรายงานสรุปประจำเดือน '${monthStr}' สำหรับส่ง LINE แล้ว!`);
      triggerCelebrationConfetti();
    }).catch(() => {
      prompt("คัดลอกข้อความด้านล่างนี้ได้เลยครับ:", msg);
    });
  } else {
    prompt("คัดลอกข้อความด้านล่างนี้ได้เลยครับ:", msg);
  }
}

/**
 * แสดงผล Checklist ความสำเร็จเป้าหมาย เขตราชบุรี 2569 (สาขาเขาช่องพราน)
 */
function renderRegionalChecklist() {
  renderRegionalTimelinePills();

  const container = document.getElementById("regionalChecklistContainer");
  const badgesContainer = document.getElementById("regionalSummaryBadges");
  if (!container) return;

  // 1. Chart View Mode
  if (currentRegionalViewMode === "chart") {
    if (badgesContainer) {
      badgesContainer.innerHTML = `
        <div class="p-2.5 rounded-xl bg-orange-50 border border-orange-200">
          <div class="text-[11px] font-bold text-orange-800">เป้าสินเชื่อรายเดือน</div>
          <div class="text-sm font-black text-orange-950">800,000 บาท/ด.</div>
        </div>
        <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
          <div class="text-[11px] font-bold text-emerald-800">เดือนพีคสูงสุด</div>
          <div class="text-sm font-black text-emerald-700">มี.ค. 69 (1.7M)</div>
        </div>
        <div class="p-2.5 rounded-xl bg-sky-50 border border-sky-200">
          <div class="text-[11px] font-bold text-sky-800">เป้าประกันรายเดือน</div>
          <div class="text-sm font-black text-sky-950">60,000 บาท/ด.</div>
        </div>
        <div class="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
          <div class="text-[11px] font-bold text-purple-800">พอร์ต OS ล่าสุด</div>
          <div class="text-sm font-black text-purple-700">22.8 ล้านบาท</div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div class="flex justify-between items-center border-b border-slate-100 pb-2">
          <h5 class="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
            <i data-lucide="bar-chart-2" class="w-4 h-4 text-orange-600"></i>
            กราฟเปรียบเทียบผลงาน 12 เดือน (ยอดจัดสินเชื่อ & ยอดขายประกัน)
          </h5>
          <span class="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">12 Months Trend</span>
        </div>
        <div class="h-64 sm:h-72 w-full relative">
          <canvas id="regionalTrendChart"></canvas>
        </div>
      </div>
    `;

    setTimeout(renderRegionalTrendChart, 50);
    initLucideIcons();
    return;
  }

  // 2. Full Year Matrix Table View Mode
  if (currentRegionalViewMode === "matrix") {
    if (badgesContainer) {
      let totalLoanTargetYear = 0;
      let totalLoanActualYear = 0;
      let totalInsTargetYear = 0;
      let totalInsActualYear = 0;

      const loanT = regionalMatrixData.metrics.find(m => m.key === "loan_target");
      const loanA = regionalMatrixData.metrics.find(m => m.key === "loan_actual");
      const insT = regionalMatrixData.metrics.find(m => m.key === "ins_target");
      const insA = regionalMatrixData.metrics.find(m => m.key === "ins_actual");

      if (loanT) totalLoanTargetYear = loanT.values.reduce((a, b) => a + (b || 0), 0);
      if (loanA) totalLoanActualYear = loanA.values.reduce((a, b) => a + (b || 0), 0);
      if (insT) totalInsTargetYear = insT.values.reduce((a, b) => a + (b || 0), 0);
      if (insA) totalInsActualYear = insA.values.reduce((a, b) => a + (b || 0), 0);

      const loanPct = totalLoanTargetYear > 0 ? ((totalLoanActualYear / totalLoanTargetYear) * 100).toFixed(1) : "0.0";
      const insPct = totalInsTargetYear > 0 ? ((totalInsActualYear / totalInsTargetYear) * 100).toFixed(1) : "0.0";

      badgesContainer.innerHTML = `
        <div class="p-2.5 rounded-xl bg-orange-50 border border-orange-200">
          <div class="text-[11px] font-bold text-orange-800">เป้าสินเชื่อรวมปี 2569</div>
          <div class="text-sm sm:text-base font-black text-orange-950">${totalLoanTargetYear.toLocaleString()} <span class="text-xs font-normal">บาท</span></div>
        </div>
        <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
          <div class="text-[11px] font-bold text-emerald-800">อนุมัติสะสมปี 2569</div>
          <div class="text-sm sm:text-base font-black text-emerald-700">${totalLoanActualYear.toLocaleString()} <span class="text-xs font-normal">บาท (${loanPct}%)</span></div>
        </div>
        <div class="p-2.5 rounded-xl bg-sky-50 border border-sky-200">
          <div class="text-[11px] font-bold text-sky-800">เป้าประกันรวมปี 2569</div>
          <div class="text-sm sm:text-base font-black text-sky-950">${totalInsTargetYear.toLocaleString()} <span class="text-xs font-normal">บาท</span></div>
        </div>
        <div class="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
          <div class="text-[11px] font-bold text-purple-800">ขายประกันสะสมปี 2569</div>
          <div class="text-sm sm:text-base font-black text-purple-700">${Math.round(totalInsActualYear).toLocaleString()} <span class="text-xs font-normal">บาท (${insPct}%)</span></div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="overflow-x-auto rounded-2xl border border-slate-300 shadow-sm">
        <table class="w-full text-left text-xs border-collapse bg-white">
          <thead>
            <tr class="bg-slate-900 text-white font-black text-center text-[11px] whitespace-nowrap">
              <th class="py-3 px-3 text-left sticky left-0 bg-slate-900 z-10 min-w-[180px]">รายงาน / ตัวชี้วัด</th>
              ${REGIONAL_MONTHS.map(m => `<th class="py-3 px-2.5 border-l border-slate-800">${m}</th>`).join("")}
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${regionalMatrixData.metrics.map((row, idx) => {
              const isHeaderRow = row.key.includes("target");
              const rowBgClass = isHeaderRow ? "bg-slate-50 font-bold" : (idx % 2 === 0 ? "bg-white" : "bg-slate-50/50");

              return `
                <tr class="${rowBgClass} hover:bg-orange-50/60 transition-colors">
                  <td class="py-2.5 px-3 font-bold text-slate-900 sticky left-0 ${rowBgClass} z-10 border-r border-slate-200 flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full ${row.category === 'สินเชื่อ' ? 'bg-orange-500' : (row.category === 'ประกัน' ? 'bg-sky-500' : 'bg-purple-500')}"></span>
                    <span>${escapeHtml(row.label)}</span>
                  </td>
                  ${row.values.map(val => {
                    let displayVal = "-";
                    let textClass = "text-slate-700 font-semibold";

                    if (val !== null && val !== undefined) {
                      if (row.format === "currency") {
                        displayVal = Number(val).toLocaleString();
                        textClass = "text-slate-900 font-bold";
                      } else if (row.format === "percent") {
                        displayVal = `${Number(val).toFixed(2)}%`;
                        if (row.key === "loan_percent" || row.key === "ins_percent") {
                          textClass = Number(val) >= 100 ? "text-emerald-700 font-black" : (Number(val) >= 50 ? "text-orange-600 font-bold" : "text-rose-600 font-bold");
                        } else {
                          textClass = "text-purple-700 font-bold";
                        }
                      } else {
                        displayVal = Number(val).toLocaleString();
                        textClass = "text-slate-900 font-bold";
                      }
                    }

                    return `<td class="py-2.5 px-2 text-right border-l border-slate-200 text-[11px] whitespace-nowrap ${textClass}">${displayVal}</td>`;
                  }).join("")}
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
    initLucideIcons();
    return;
  }

  // 3. Spotlight Mode (Default)
  const monthIdx = REGIONAL_MONTHS.indexOf(currentRegionalSelectedMonth);
  if (monthIdx === -1) return;

  const getMetricVal = (key, mIdx = monthIdx) => {
    const m = regionalMatrixData.metrics.find(x => x.key === key);
    return m && m.values[mIdx] !== null && m.values[mIdx] !== undefined ? m.values[mIdx] : null;
  };

  const loanTarget = getMetricVal("loan_target") || 800000;
  const loanActual = getMetricVal("loan_actual") || 0;
  const loanPercent = getMetricVal("loan_percent") || (loanTarget > 0 ? (loanActual / loanTarget) * 100 : 0);
  const loanCases = getMetricVal("loan_cases") || 0;

  const insTarget = getMetricVal("ins_target") || 60000;
  const insActual = getMetricVal("ins_actual") || 0;
  const insPercent = getMetricVal("ins_percent") || (insTarget > 0 ? (insActual / insTarget) * 100 : 0);
  const insCases = getMetricVal("ins_cases") || 0;

  const osTotal = getMetricVal("os_total") || 0;
  const overdueAmt = getMetricVal("overdue_amt") || 0;
  const overdueCases = getMetricVal("overdue_cases") || 0;
  const overduePercent = getMetricVal("overdue_percent") || 0;

  // Calculate Growth Deltas vs Previous Month
  let loanDeltaPill = "";
  let insDeltaPill = "";
  if (monthIdx > 0) {
    const prevLoanActual = getMetricVal("loan_actual", monthIdx - 1);
    const prevInsActual = getMetricVal("ins_actual", monthIdx - 1);
    const prevMonthName = REGIONAL_MONTHS[monthIdx - 1];

    if (prevLoanActual !== null && prevLoanActual > 0) {
      const diffPct = (((loanActual - prevLoanActual) / prevLoanActual) * 100).toFixed(1);
      const isUp = Number(diffPct) >= 0;
      loanDeltaPill = `
        <span class="text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${isUp ? 'delta-pill-up' : 'delta-pill-down'}">
          ${isUp ? '▲ +' : '▼ '}${diffPct}% vs ${prevMonthName}
        </span>
      `;
    }

    if (prevInsActual !== null && prevInsActual > 0) {
      const diffPct = (((insActual - prevInsActual) / prevInsActual) * 100).toFixed(1);
      const isUp = Number(diffPct) >= 0;
      insDeltaPill = `
        <span class="text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${isUp ? 'delta-pill-up' : 'delta-pill-down'}">
          ${isUp ? '▲ +' : '▼ '}${diffPct}% vs ${prevMonthName}
        </span>
      `;
    }
  }

  // YTD Cumulative calculation (12-month totals)
  let ytdLoanActual = 0;
  let ytdLoanTarget = 0;
  let ytdInsActual = 0;
  let ytdInsTarget = 0;

  const allLoanA = regionalMatrixData.metrics.find(m => m.key === "loan_actual")?.values || [];
  const allLoanT = regionalMatrixData.metrics.find(m => m.key === "loan_target")?.values || [];
  const allInsA = regionalMatrixData.metrics.find(m => m.key === "ins_actual")?.values || [];
  const allInsT = regionalMatrixData.metrics.find(m => m.key === "ins_target")?.values || [];

  allLoanA.forEach((v, i) => { if (v !== null) ytdLoanActual += v; });
  allLoanT.forEach((v, i) => { if (v !== null) ytdLoanTarget += v; });
  allInsA.forEach((v, i) => { if (v !== null) ytdInsActual += v; });
  allInsT.forEach((v, i) => { if (v !== null) ytdInsTarget += v; });

  const ytdLoanPct = ytdLoanTarget > 0 ? ((ytdLoanActual / ytdLoanTarget) * 100).toFixed(1) : "0.0";
  const ytdInsPct = ytdInsTarget > 0 ? ((ytdInsActual / ytdInsTarget) * 100).toFixed(1) : "0.0";

  // Render Badges for this month
  if (badgesContainer) {
    badgesContainer.innerHTML = `
      <div class="p-2.5 rounded-xl bg-orange-50 border border-orange-200">
        <div class="text-[11px] font-bold text-orange-800">เป้าหมายยอดจัด (${currentRegionalSelectedMonth})</div>
        <div class="text-sm sm:text-base font-black text-orange-950">${loanTarget.toLocaleString()} <span class="text-xs font-normal">บาท</span></div>
      </div>
      <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
        <div class="text-[11px] font-bold text-emerald-800">อนุมัติจริง (${currentRegionalSelectedMonth})</div>
        <div class="text-sm sm:text-base font-black text-emerald-700">${loanActual.toLocaleString()} <span class="text-xs font-normal">บาท (${Number(loanPercent).toFixed(1)}%)</span></div>
      </div>
      <div class="p-2.5 rounded-xl bg-sky-50 border border-sky-200">
        <div class="text-[11px] font-bold text-sky-800">ยอดขายประกัน (${currentRegionalSelectedMonth})</div>
        <div class="text-sm sm:text-base font-black text-sky-950">${Math.round(insActual).toLocaleString()} <span class="text-xs font-normal">บาท (${Number(insPercent).toFixed(1)}%)</span></div>
      </div>
      <div class="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
        <div class="text-[11px] font-bold text-purple-800">พอร์ต OS ทั้งหมด</div>
        <div class="text-sm sm:text-base font-black text-purple-700">${osTotal > 0 ? (osTotal / 1000000).toFixed(2) + " ล้านบาท" : "-"}</div>
      </div>
    `;
  }

  // Radial Gauge SVG helper (Apple Activity Ring style)
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const loanOffset = circumference - (Math.min(Number(loanPercent), 100) / 100) * circumference;
  const insOffset = circumference - (Math.min(Number(insPercent), 100) / 100) * circumference;
  const isChampionMonth = Number(loanPercent) >= 100;

  // 4 Detailed Section Cards + YTD Bar + Executive Box
  container.innerHTML = `
    <!-- 🏆 YTD 2569 Full-Year Cumulative Banner -->
    <div class="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white shadow-md border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black shadow-inner flex-shrink-0">
          <i data-lucide="trophy" class="w-4 h-4"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs sm:text-sm font-black text-white">ผลงานสะสมทั้งปี 2569 (YTD Cumulative)</span>
            <span class="text-[10px] bg-orange-500/20 text-orange-300 font-extrabold px-2 py-0.5 rounded-full border border-orange-400/30">สาขาเขาช่องพราน</span>
          </div>
          <p class="text-[11px] text-slate-300">สะสม 8 เดือนแรก: สินเชื่อ ${(ytdLoanActual / 1000000).toFixed(2)}M / ประกัน ${Math.round(ytdInsActual).toLocaleString()} บาท</p>
        </div>
      </div>
      <div class="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-700/60 pt-2 md:pt-0">
        <div class="text-right">
          <div class="text-[10px] text-slate-400 font-bold">สินเชื่อสะสมปี 69</div>
          <div class="text-xs sm:text-sm font-black text-orange-400">${(ytdLoanActual / 1000000).toFixed(2)}M <span class="text-[11px] text-slate-300 font-normal">(${ytdLoanPct}%)</span></div>
        </div>
        <div class="w-px h-7 bg-slate-700"></div>
        <div class="text-right">
          <div class="text-[10px] text-slate-400 font-bold">ประกันสะสมปี 69</div>
          <div class="text-xs sm:text-sm font-black text-sky-400">${Math.round(ytdInsActual / 1000).toLocaleString()}k <span class="text-[11px] text-slate-300 font-normal">(${ytdInsPct}%)</span></div>
        </div>
      </div>
    </div>

    <!-- 4 Spotlight Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 animate-fade-in">
      
      <!-- 1. หมวดสินเชื่อ (พร้อม Apple Activity Ring) -->
      <div class="p-4 rounded-2xl ${isChampionMonth ? 'champion-card' : 'bg-gradient-to-b from-orange-50/50 to-white'} border border-orange-200 shadow-sm space-y-3">
        <div class="flex justify-between items-center border-b border-orange-200/80 pb-2.5">
          <div class="flex items-center gap-2">
            <i data-lucide="banknote" class="w-4 h-4 text-orange-600"></i>
            <h5 class="text-xs sm:text-sm font-black text-orange-950">
              1. ยอดจัดสินเชื่อ (${currentRegionalSelectedMonth})
            </h5>
            ${isChampionMonth ? `<span class="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">⭐ ทะลุเป้า!</span>` : ''}
          </div>
          <div class="flex items-center gap-1.5">
            ${loanDeltaPill}
            <span class="text-xs font-black ${isChampionMonth ? 'text-emerald-700 bg-emerald-100' : 'text-orange-700 bg-orange-100'} px-2.5 py-0.5 rounded-full border border-orange-300">
              ${Number(loanPercent).toFixed(2)}%
            </span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Circular Ring Gauge -->
          <div class="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
            <svg class="radial-progress-ring w-16 h-16" viewBox="0 0 64 64">
              <circle class="radial-progress-bg" stroke-width="5" fill="transparent" r="${radius}" cx="32" cy="32" />
              <circle class="radial-progress-bar" stroke="${isChampionMonth ? '#059669' : '#ff6400'}" stroke-width="5" stroke-linecap="round" fill="transparent" r="${radius}" cx="32" cy="32" stroke-dasharray="${circumference}" stroke-dashoffset="${loanOffset}" />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span class="text-[11px] font-black ${isChampionMonth ? 'text-emerald-700' : 'text-slate-900'}">${Math.round(loanPercent)}%</span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-1.5 flex-grow text-center">
            <div class="p-1.5 rounded-xl bg-white/90 border border-orange-100">
              <div class="text-[9px] text-slate-500 font-bold">เป้าหมาย</div>
              <div class="text-xs font-black text-slate-900">${(loanTarget / 1000).toLocaleString()}k</div>
            </div>
            <div class="p-1.5 rounded-xl bg-white/90 border border-orange-100">
              <div class="text-[9px] text-slate-500 font-bold">อนุมัติจริง</div>
              <div class="text-xs font-black text-emerald-700">${(loanActual / 1000).toLocaleString()}k</div>
            </div>
            <div class="p-1.5 rounded-xl bg-white/90 border border-orange-100">
              <div class="text-[9px] text-slate-500 font-bold">ลูกค้าใหม่</div>
              <div class="text-xs font-black text-sky-700">${loanCases} ราย</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. หมวดประกัน (พร้อม Apple Activity Ring) -->
      <div class="p-4 rounded-2xl bg-gradient-to-b from-sky-50/50 to-white border border-sky-200 shadow-sm space-y-3">
        <div class="flex justify-between items-center border-b border-sky-200/80 pb-2.5">
          <h5 class="text-xs sm:text-sm font-black text-sky-950 flex items-center gap-2">
            <i data-lucide="shield-check" class="w-4 h-4 text-sky-600"></i>
            2. เป้าหมายประกัน (${currentRegionalSelectedMonth})
          </h5>
          <div class="flex items-center gap-1.5">
            ${insDeltaPill}
            <span class="text-xs font-black ${Number(insPercent) >= 100 ? 'text-emerald-700 bg-emerald-100' : 'text-sky-700 bg-sky-100'} px-2.5 py-0.5 rounded-full border border-sky-300">
              ${Number(insPercent).toFixed(2)}%
            </span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Circular Ring Gauge -->
          <div class="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
            <svg class="radial-progress-ring w-16 h-16" viewBox="0 0 64 64">
              <circle class="radial-progress-bg" stroke-width="5" fill="transparent" r="${radius}" cx="32" cy="32" />
              <circle class="radial-progress-bar" stroke="#0284c7" stroke-width="5" stroke-linecap="round" fill="transparent" r="${radius}" cx="32" cy="32" stroke-dasharray="${circumference}" stroke-dashoffset="${insOffset}" />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span class="text-[11px] font-black text-slate-900">${Math.round(insPercent)}%</span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-1.5 flex-grow text-center">
            <div class="p-1.5 rounded-xl bg-white border border-sky-100">
              <div class="text-[9px] text-slate-500 font-bold">เป้าหมาย</div>
              <div class="text-xs font-black text-slate-900">${(insTarget / 1000).toLocaleString()}k</div>
            </div>
            <div class="p-1.5 rounded-xl bg-white border border-sky-100">
              <div class="text-[9px] text-slate-500 font-bold">ยอดขายจริง</div>
              <div class="text-xs font-black text-sky-700">${Math.round(insActual).toLocaleString()}</div>
            </div>
            <div class="p-1.5 rounded-xl bg-white border border-sky-100">
              <div class="text-[9px] text-slate-500 font-bold">จำนวนราย</div>
              <div class="text-xs font-black text-purple-700">${insCases} ราย</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. หมวดคุณภาพพอร์ต OS -->
      <div class="p-4 rounded-2xl bg-gradient-to-b from-purple-50/50 to-white border border-purple-200 shadow-sm space-y-3">
        <div class="flex justify-between items-center border-b border-purple-200/80 pb-2.5">
          <h5 class="text-xs sm:text-sm font-black text-purple-950 flex items-center gap-2">
            <i data-lucide="layers" class="w-4 h-4 text-purple-600"></i>
            3. ยอดพอร์ตลูกหนี้ OS & หนี้ค้าง (${currentRegionalSelectedMonth})
          </h5>
          <span class="text-xs font-black text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-300">
            หนี้ค้าง ${Number(overduePercent).toFixed(2)}%
          </span>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center pt-1">
          <div class="p-2 rounded-xl bg-white border border-purple-100">
            <div class="text-[10px] text-slate-500 font-bold">OS รวมทั้งหมด</div>
            <div class="text-xs font-black text-slate-900">${osTotal > 0 ? (osTotal / 1000000).toFixed(2) + "M" : "-"}</div>
          </div>
          <div class="p-2 rounded-xl bg-white border border-purple-100">
            <div class="text-[10px] text-slate-500 font-bold">ยอดหนี้ค้าง x day</div>
            <div class="text-xs font-black text-rose-600">${overdueAmt > 0 ? (overdueAmt / 1000000).toFixed(2) + "M" : "-"}</div>
          </div>
          <div class="p-2 rounded-xl bg-white border border-purple-100">
            <div class="text-[10px] text-slate-500 font-bold">จำนวนรายค้าง</div>
            <div class="text-xs font-black text-slate-900">${overdueCases} ราย</div>
          </div>
        </div>
      </div>

      <!-- 4. หมวดการตลาด & กิจกรรมสาขา -->
      <div class="p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200 shadow-sm space-y-3">
        <div class="flex justify-between items-center border-b border-slate-200 pb-2.5">
          <h5 class="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
            <i data-lucide="megaphone" class="w-4 h-4 text-orange-600"></i>
            4. กิจกรรมการตลาดสาขาเขาช่องพราน
          </h5>
          <span class="text-[11px] text-slate-500 font-bold">เขตราชบุรี</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-center pt-1">
          <div class="p-2.5 rounded-xl bg-white border border-slate-200">
            <div class="text-[11px] text-slate-600 font-bold">การตลาด Offline</div>
            <div class="text-xs font-black text-orange-600 mt-0.5">ลงพื้นที่ / ออกบูธ</div>
          </div>
          <div class="p-2.5 rounded-xl bg-white border border-slate-200">
            <div class="text-[11px] text-slate-600 font-bold">การตลาด Online</div>
            <div class="text-xs font-black text-sky-600 mt-0.5">Facebook / LINE</div>
          </div>
        </div>
      </div>

    </div>

    <!-- 🤖 5. Executive Smart Summary & One-Click LINE Share Button -->
    <div class="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
          <i data-lucide="message-square" class="w-4 h-4"></i>
        </div>
        <div>
          <div class="text-xs font-black text-emerald-950">💡 สรุปไฮไลท์ประจำงวด ${currentRegionalSelectedMonth} (สาขาเขาช่องพราน)</div>
          <p class="text-[11px] text-slate-600 font-medium">สินเชื่อ ${loanActual.toLocaleString()} บาท (${Number(loanPercent).toFixed(1)}%) • ประกัน ${Math.round(insActual).toLocaleString()} บาท (${Number(insPercent).toFixed(1)}%)</p>
        </div>
      </div>
      <button onclick="copyRegionalLineReport()" class="neu-button px-3.5 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-700 font-black flex items-center justify-center gap-1.5 shadow-md flex-shrink-0 border-0 rounded-xl" title="คัดลอกข้อความสรุปเพื่อส่งเข้ากลุ่ม LINE เขต">
        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
        <span>📋 คัดลอกสรุปส่ง LINE เขต</span>
      </button>
    </div>
  `;

  // Initialize simulator for this month
  const simInput = document.getElementById("simLoanRange");
  if (simInput) {
    simInput.value = 0;
    handleTargetSimulation(0);
  }

  initLucideIcons();
}
