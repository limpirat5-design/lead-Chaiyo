/**
 * =========================================================================
 * ระบบบริหารงานลูกค้าสินเชื่อ เงินไชโย สาขาเขาช่องพราน (Pure Neumorphism Color Edition)
 * Theme: Orange (ส้ม), Blue (ฟ้า), Black (ดำ), White (ขาว)
 * Modern Vector Icons & Responsive Executive Analytics
 * =========================================================================
 */

const STORAGE_KEY_API_URL = "CHAIYO_KCP_API_URL";
const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbwVIvz3pbrwhnUS120l17v7Au6oU09dHZUlMcFViJVZqP896nNsKDViYzT3i3XJhu_d/exec";
let currentApiUrl = DEFAULT_API_URL;
localStorage.setItem(STORAGE_KEY_API_URL, DEFAULT_API_URL);
let currentDashboardPeriod = "month"; // 'today', 'month', 'year', 'all'
let currentReportPeriod = "month";

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

function formatThaiDateTime24hr(dateInput) {
  if (!dateInput || dateInput === "-" || dateInput === "เมื่อสักครู่") return dateInput || "-";

  try {
    const d = new Date(dateInput.replace(" ", "T"));
    if (isNaN(d.getTime())) return dateInput;

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
    const d = new Date(dateInput.replace(" ", "T"));
    if (isNaN(d.getTime())) return dateInput;

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

  loadCustomerData();
  calculateInstallment();
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
  const hiddenInput = document.getElementById("modalCustStatus");
  if (hiddenInput) hiddenInput.value = status;

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
      if (s === status) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
      }
    }
  });

  toggleModalDateInput(status);
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
  }

  initLucideIcons();
}

/**
 * อัปเดตแบนเนอร์แจ้งเตือนงานประจำวัน
 */
function updateTodayTasksBanner() {
  let appointCount = 0;
  let callbackCount = 0;

  customerDataList.forEach(c => {
    if (c.appointmentDate && c.appointmentDate !== "-") {
      if (c.status === "นัดหมายเข้าสาขา") {
        appointCount++;
      } else if (c.status.includes("ติดต่ออีกครั้ง")) {
        callbackCount++;
      }
    }
  });

  const totalToday = appointCount + callbackCount;
  const badge = document.getElementById("todayBadgeCount");
  const appEl = document.getElementById("todayAppointCount");
  const callEl = document.getElementById("todayCallbackCount");

  if (badge) badge.textContent = `${totalToday} งาน`;
  if (appEl) appEl.textContent = appointCount;
  if (callEl) callEl.textContent = callbackCount;
}

function filterTodayTasks() {
  switchTab("list");
  const sFilter = document.getElementById("statusFilter");
  const tFilter = document.getElementById("typeFilter");
  if (sFilter) sFilter.value = "";
  if (tFilter) tFilter.value = "";
  
  const todayTasks = customerDataList.filter(c => 
    c.appointmentDate && c.appointmentDate !== "-" && 
    (c.status === "นัดหมายเข้าสาขา" || c.status.includes("ติดต่ออีกครั้ง"))
  );

  renderCustomerTable(todayTasks);
  showToast(`🔍 แสดงรายการที่ต้องติดต่อ (${todayTasks.length} รายการ)`);
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
      updateSyncStatus("online", "เชื่อมต่อ Google Sheets สำเร็จ");
      renderCustomerTable(customerDataList);
      updateTodayTasksBanner();
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
    amount: Number(document.getElementById("custAmount").value) || 0,
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
                ${Number(item.amount).toLocaleString()} บาท
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
            ${Number(item.amount).toLocaleString()} บาท
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
    const matchStatus = !status || item.status === status;
    const matchType = !type || item.vehicleType === type;

    return matchQuery && matchStatus && matchType;
  });

  renderCustomerTable(filtered);
}

/**
 * ฟังก์ชันกรองข้อมูลตามช่วงเวลา
 */
function filterDataByPeriod(period, dataset = customerDataList) {
  if (period === "all") return dataset;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  return dataset.filter(item => {
    if (!item.createdAt || item.createdAt === "เมื่อสักครู่") return true;

    try {
      const d = new Date(item.createdAt.replace(" ", "T"));
      if (isNaN(d.getTime())) return true;

      if (period === "today") {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === currentDate;
      } else if (period === "month") {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      } else if (period === "year") {
        return d.getFullYear() === currentYear;
      }
      return true;
    } catch (e) {
      return true;
    }
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
      if (p === period) {
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
    const amt = Number(item.amount) || 0;
    totalAmount += amt;

    if (item.status === "อนุมัติ/รับเงินแล้ว") {
      approvedAmount += amt;
      approvedCount++;
    }

    vehicleMap[item.vehicleType] = (vehicleMap[item.vehicleType] || 0) + 1;
    statusMap[item.status] = (statusMap[item.status] || 0) + 1;
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
          backgroundColor: vehicleValues.length ? ["#ff6b00", "#0284c7", "#0b0f19", "#38bdf8", "#fb923c", "#10b981"] : ["#cbd5e1"],
          borderWidth: 3,
          borderColor: "#e6edf5",
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
          legend: { position: "bottom", labels: { font: { family: "Prompt", weight: "bold", size: 11 } } }
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
          backgroundColor: ["#0284c7", "#ff6b00", "#16a34a", "#dc2626", "#64748b"],
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
    const amt = Number(item.amount) || 0;
    totalAmount += amt;

    if (item.status === "อนุมัติ/รับเงินแล้ว") {
      approvedAmount += amt;
      approvedCount++;
    }

    vehicleMap[item.vehicleType] = (vehicleMap[item.vehicleType] || 0) + 1;
    statusMap[item.status] = (statusMap[item.status] || 0) + 1;
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
  const amount = Number(document.getElementById("modalCustAmount").value) || 0;
  const officer = document.getElementById("modalCustOfficer").value.trim();
  const note = document.getElementById("modalCustNote").value.trim();
  let appointDate = document.getElementById("modalCustAppointmentDate").value || "-";
  if (appointDate !== "-") appointDate = appointDate.replace("T", " ");

  if (status === "อนุมัติ/รับเงินแล้ว") {
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
          note: note
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      showToast("✅ อัปเดตสถานะสำเร็จ!");
      closeUpdateModal();
      await loadCustomerData();
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
    }
    showToast("✅ อัปเดตสถานะสำเร็จ (โหมดจำลอง)!");
    closeUpdateModal();
    renderCustomerTable(customerDataList);
    updateTodayTasksBanner();
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
    custAmountInput.value = principal;
  }
  closeCalcModal();
  showToast("📋 นำวงเงินที่คำนวณไปใส่ในแบบฟอร์มแล้ว!");
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
  switch (status) {
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

function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "fixed bottom-4 right-4 left-4 sm:left-auto sm:w-auto neu-card bg-gray-200 px-4 py-3 rounded-2xl border border-gray-300 text-xs sm:text-sm font-bold shadow-2xl text-slate-900 z-50 animate-fade-in flex items-center justify-center sm:justify-start gap-2";
  toast.innerHTML = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
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
  
  // คำนวณยอดอนุมัติประจำเดือนปัจจุบัน
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  let approvedThisMonth = 0;
  dataset.forEach(item => {
    if (item.status === "อนุมัติ/รับเงินแล้ว" && item.createdAt) {
      try {
        const d = new Date(item.createdAt.replace(" ", "T"));
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          approvedThisMonth += Number(item.amount) || 0;
        }
      } catch(e){}
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
