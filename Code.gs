/**
 * =========================================================================
 * ระบบบริหารงานลูกค้าสินเชื่อ เงินไชโย สาขาเขาช่องพราน (Backend API & LINE Flex Cards)
 * Google Apps Script v8.0 - การ์ดสไตล์ Flex Header Badge ตามแบบ และสรุปอัตโนมัติ 17:00 น.
 * =========================================================================
 */

// 1. Google Spreadsheet ID สาขาเขาช่องพราน
const SPREADSHEET_ID = "1ZyAAAFpexARGPojAMWTc4RIeq-9RLoZkn7W7fWbMBbc";

// 2. ชื่อแผ่นงานหลัก
const SHEET_NAME = "ข้อมูลลูกค้าสินเชื่อ_เขาช่องพราน";
const SUMMARY_SHEET_NAME = "สรุปผลงาน_รายเดือน_รายปี";
const OLD_CONTACT_SHEET_NAME = "ข้อมูลลูกค้าติดต่อ";

// 3. URL หน้าเว็บแอป & โลโก้ของสาขาเขาช่องพราน
const WEB_APP_URL = "https://limpirat5-design.github.io/lead-Chaiyo/";
const LOGO_IMAGE_URL = "https://limpirat5-design.github.io/lead-Chaiyo/logo.png";

// 4. ตั้งค่า LINE Messaging API
const LINE_CHANNEL_ACCESS_TOKEN = "QRsyH5BB2oI1crhr5KQ+N0zkwePgbjasdtmT2H/rs+TsTCyEfZTu20C/fQSmVB980Wh5avxg6rl4nfTCVOXJjvsUrzFhso9tmH/wEfbXCz7qq3p9/SMcs4us/0Ef1bMdhEBHWb5Xt5WE6upG5DMOHwdB04t89/1O/w1cDnyilFU=";

// 🎯 ID กลุ่ม LINE สาขาเขาช่องพราน (Push Message เข้ากลุ่มนี้โดยตรง)
const LINE_TARGET_ID = "Ce28347e956cadb979061385ade15670d"; 

const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/**
 * ⏰ ฟังก์ชันตั้งเวลาส่งสรุปและแจ้งเตือนอัตโนมัติประจำวัน
 * 1) 08:30 น. - แจ้งเตือนรายชื่อลูกค้าที่ต้องโทรติดตามวันนี้
 * 2) 17:00 น. - สรุปผลงานประจำวัน
 */
function createDailyTriggers() {
  // ลบ Trigger เดิมทั้งหมดออกก่อน
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    const fn = t.getHandlerFunction();
    if (fn === "sendDailySummaryToLine" || fn === "sendMorningFollowUpToLine") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 1. สร้าง Trigger ตอนเช้า 08:00 - 09:00 น.
  ScriptApp.newTrigger("sendMorningFollowUpToLine")
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  // 2. สร้าง Trigger สรุปตอนเย็น 17:00 - 18:00 น.
  ScriptApp.newTrigger("sendDailySummaryToLine")
    .timeBased()
    .everyDays(1)
    .atHour(17)
    .create();

  Logger.log("✅ ตั้งเวลาแจ้งเตือนเช้า 08:30 น. และสรุปเย็น 17:00 น. เรียบร้อยแล้ว!");
}

function create1700DailyTrigger() {
  createDailyTriggers();
}

/**
 * 🌅 ฟังก์ชันส่งแจ้งเตือนรายชื่อลูกค้าที่ต้องติดตามตอนเช้า (08:30 น.)
 */
function sendMorningFollowUpToLine() {
  const sheet = getOrCreateSheet();
  const customers = fetchAllCustomersList(sheet);
  const now = new Date();
  const dateThai = `${now.getDate()} ${THAI_MONTHS[now.getMonth()]} พ.ศ. ${now.getFullYear() + 543}`;

  // กรองเฉพาะลูกค้าที่ต้องติดตาม (นัดหมายเข้าสาขา / รอครบ 90 วัน / พึ่งโอน)
  const followUpList = [];
  customers.forEach(c => {
    if (c.status === "นัดหมายเข้าสาขา" || c.status.includes("90 วัน") || c.status.includes("ติดตาม") || c.status.includes("ติดต่ออีกครั้ง")) {
      followUpList.push(c);
    }
  });

  if (followUpList.length === 0) {
    Logger.log("ไม่มีลูกค้าที่ต้องติดตามในวันนี้");
    return;
  }

  // ดึง 4 รายชื่อแรกมาแสดงในการ์ด
  const topList = followUpList.slice(0, 4);
  const rowsContents = [];

  topList.forEach((cust, idx) => {
    const cleanPhone = String(cust.phone || '').replace(/[^0-9]/g, '');
    rowsContents.push({
      type: "box",
      layout: "vertical",
      backgroundColor: idx % 2 === 0 ? "#F8FAFC" : "#FFFFFF",
      cornerRadius: "10px",
      paddingAll: "10px",
      margin: "xs",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: `${idx + 1}. 👤 ${cust.name || 'ลูกค้า'}`,
              size: "xs",
              weight: "bold",
              color: "#0F172A",
              flex: 4,
              wrap: true
            },
            {
              type: "text",
              text: `${Number(cust.amount).toLocaleString()} บ.`,
              size: "xs",
              weight: "bold",
              color: "#FF6B00",
              align: "end",
              flex: 3
            }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "xs",
          contents: [
            {
              type: "text",
              text: `🚗 ${cust.vehicleType} • 📞 ${cust.phone || '-'}`,
              size: "xxs",
              color: "#64748B",
              flex: 1
            }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "xxs",
          contents: [
            {
              type: "text",
              text: `📌 สถานะ: ${cust.status}`,
              size: "xxs",
              color: cust.status === "นัดหมายเข้าสาขา" ? "#0284C7" : "#D97706",
              weight: "bold"
            }
          ]
        }
      ]
    });
  });

  const flexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      backgroundColor: "#FFFFFF",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          backgroundColor: "#0284C7",
          cornerRadius: "14px",
          paddingAll: "12px",
          contents: [
            {
              type: "box",
              layout: "vertical",
              flex: 3,
              contents: [
                {
                  type: "text",
                  text: "🌅 ภารกิจติดตามเช้านี้!",
                  color: "#FFFFFF",
                  weight: "bold",
                  size: "md"
                },
                {
                  type: "text",
                  text: `สาขาเขาช่องพราน • ${dateThai}`,
                  color: "#E0F2FE",
                  size: "xxs",
                  margin: "xs"
                }
              ]
            },
            {
              type: "box",
              layout: "vertical",
              backgroundColor: "#FF6B00",
              cornerRadius: "12px",
              paddingStart: "10px",
              paddingEnd: "10px",
              paddingTop: "4px",
              paddingBottom: "4px",
              justifyContent: "center",
              alignItems: "center",
              contents: [
                {
                  type: "text",
                  text: `${followUpList.length} ราย`,
                  color: "#FFFFFF",
                  weight: "bold",
                  size: "xs"
                }
              ]
            }
          ]
        },
        {
          type: "box",
          layout: "vertical",
          margin: "md",
          contents: [
            {
              type: "text",
              text: `🎯 วันนี้มีลูกค้าต้องโทรติดตามทั้งหมด ${followUpList.length} รายการ:`,
              weight: "bold",
              size: "xs",
              color: "#0F172A"
            }
          ]
        },
        {
          type: "box",
          layout: "vertical",
          margin: "sm",
          contents: rowsContents
        },
        {
          type: "separator",
          margin: "md"
        },
        {
          type: "text",
          text: `💪 โทรหาลูกค้าตั้งแต่เช้า ปิดยอดได้ไว ลุยเลยครับทีมงาน! 🏆`,
          color: "#475569",
          size: "xs",
          weight: "bold",
          margin: "sm",
          align: "center"
        }
      ]
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      paddingAll: "12px",
      backgroundColor: "#F8FAFC",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#FF6B00",
          height: "sm",
          action: {
            type: "uri",
            label: "📱 เปิดดูรายชื่อทั้งหมด",
            uri: WEB_APP_URL
          }
        }
      ]
    }
  };

  sendLineFlexPayload(
    `🌅 [ภารกิจติดตามเช้านี้] มีลูกค้าต้องติดตาม ${followUpList.length} รายการ (สาขาเขาช่องพราน)`,
    flexBubble
  );
}

/**
 * 🧪 ทดสอบส่งแจ้งเตือนเช้า 08:30 น. ทันที
 */
function testSendMorningFollowUp() {
  sendMorningFollowUpToLine();
}

/**
 * 🧪 ฟังก์ชันทดสอบส่งการ์ดลูกค้าใหม่เข้า LINE ทันที
 */
function testSendFlexNewCustomer() {
  const now = new Date();
  sendLineFlexNewCustomerCard({
    id: "CY-25690830-9999",
    now: now,
    name: "นายสมศักดิ์ ขยันยิ่ง",
    phone: "089-111-2233",
    vehicleType: "รถกระบะ",
    brand: "Isuzu",
    model: "D-Max (แค็บ)",
    year: "2564",
    licensePlate: "บข 1234 ราชบุรี",
    amount: 150000,
    status: "นัดหมายเข้าสาขา",
    appointmentDate: "31 ส.ค. 2569 เวลา 10:00 น.",
    officer: "พนักงานสาขาเขาช่องพราน",
    note: "ลูกค้านำเล่มและรถเข้ามาตรวจสภาพ",
    todayStats: { totalCases: 5, totalAmount: 450000, approvedAmount: 150000, approvedCount: 1 },
    monthStats: { totalCases: 42, approvedAmount: 1850000, approvedCount: 18 }
  });
}

/**
 * ดึง Spreadsheet Object
 */
function getSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * ฟังก์ชันตรวจสอบและสร้างหัวตารางอัตโนมัติ (14 คอลัมน์มาตรฐาน)
 */
function getOrCreateSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      "รหัสลูกค้า (ID)",
      "วันที่-เวลาบันทึก",
      "ชื่อ-นามสกุล",
      "เบอร์โทรศัพท์",
      "ประเภทหลักประกัน",
      "ยี่ห้อ/แบรนด์",
      "รุ่น/แบบ",
      "ปีจดทะเบียน",
      "เลขทะเบียนรถ/จังหวัด",
      "วงเงินที่ขอสินเชื่อ (บาท)",
      "สถานะการติดตาม",
      "วันที่นัดหมาย / วันที่นัดโทรซ้ำ (24 ชม.)",
      "พนักงานผู้ดูแล",
      "บันทึกเพิ่มเติม / หมายเหตุ"
    ];
    sheet.appendRow(headers);
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1E3A8A")
               .setFontColor("#FFFFFF")
               .setFontWeight("bold")
               .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    importAndNormalizeOldCustomers(ss, sheet, false);
  }

  createOrUpdateSummarySheet(ss);
  return sheet;
}

/**
 * ดึงและแปลงข้อมูลลูกค้าเก่า
 */
function importAndNormalizeOldCustomers(ss, targetSheet, forceClearAndImport = false) {
  if (!ss) ss = getSpreadsheet();
  if (!targetSheet) targetSheet = ss.getSheetByName(SHEET_NAME);
  
  const oldSheet = ss.getSheetByName(OLD_CONTACT_SHEET_NAME);
  if (!oldSheet) {
    return { success: false, count: 0, message: `ไม่พบแท็บชื่อ '${OLD_CONTACT_SHEET_NAME}'` };
  }

  const oldData = oldSheet.getDataRange().getValues();
  if (oldData.length <= 1) {
    return { success: true, count: 0, message: "ไม่มีข้อมูลในแท็บลูกค้าเก่า" };
  }

  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(5, oldData.length); r++) {
    const rowStr = oldData[r].map(c => String(c).toLowerCase()).join(" ");
    if (rowStr.includes("ชื่อ") || rowStr.includes("โทร") || rowStr.includes("เบอร์") || rowStr.includes("ทะเบียน") || rowStr.includes("วงเงิน")) {
      headerRowIndex = r;
      break;
    }
  }

  const oldHeaders = oldData[headerRowIndex].map(h => String(h).trim().toLowerCase());
  const oldRows = oldData.slice(headerRowIndex + 1);

  if (forceClearAndImport) {
    const lastRow = targetSheet.getLastRow();
    if (lastRow > 1) {
      targetSheet.getRange(2, 1, lastRow - 1, 14).clearContent();
    }
  }

  const findCol = (keywords) => {
    for (let i = 0; i < oldHeaders.length; i++) {
      const h = oldHeaders[i];
      if (keywords.some(k => h.includes(k.toLowerCase()))) return i;
    }
    return -1;
  };

  const idCol = findCol(["รหัส", "id", "code", "ลำดับ", "no"]);
  const dateCol = findCol(["วัน", "เวลา", "timestamp", "date", "time", "ว/ด/ป"]);
  const nameCol = findCol(["ชื่อ", "นามสกุล", "ลูกค้า", "name", "ชื่อ-สกุล"]);
  const phoneCol = findCol(["เบอร์", "โทร", "phone", "tel", "mobile", "ติดต่อ"]);
  const typeCol = findCol(["ประเภท", "หลักประกัน", "type", "ชนิด"]);
  const brandCol = findCol(["ยี่ห้อ", "แบรนด์", "brand"]);
  const modelCol = findCol(["รุ่น", "แบบ", "model"]);
  const yearCol = findCol(["ปี", "year", "ค.ศ.", "พ.ศ."]);
  const plateCol = findCol(["ทะเบียน", "เลขทะเบียน", "จังหวัด", "plate", "ป้าย"]);
  const amountCol = findCol(["วงเงิน", "ยอด", "กู้", "ขอ", "amount", "price", "ยอดจัด", "ราคาประเมิน"]);
  const statusCol = findCol(["สถานะ", "status", "stage", "ผล"]);
  const appointCol = findCol(["นัด", "นัดหมาย", "โทรซ้ำ", "appointment", "วันนัด"]);
  const officerCol = findCol(["ผู้ดูแล", "พนักงาน", "ผู้รับเรื่อง", "officer", "staff", "จนท."]);
  const noteCol = findCol(["หมายเหตุ", "รายละเอียด", "บันทึก", "note", "remark", "comment"]);

  const rowsToInsert = [];
  let importedCount = 0;

  oldRows.forEach((row, idx) => {
    const rawName = nameCol !== -1 ? String(row[nameCol] || "").trim() : "";
    const rawPhone = phoneCol !== -1 ? String(row[phoneCol] || "").trim() : "";
    const rawBrand = brandCol !== -1 ? String(row[brandCol] || "").trim() : "";
    const rawModel = modelCol !== -1 ? String(row[modelCol] || "").trim() : "";
    const rawPlate = plateCol !== -1 ? String(row[plateCol] || "").trim() : "";
    const rawType = typeCol !== -1 ? String(row[typeCol] || "").trim() : "";
    const rawNote = noteCol !== -1 ? String(row[noteCol] || "").trim() : "";
    const rawStatus = statusCol !== -1 ? String(row[statusCol] || "").trim() : "";

    const isEntirelyBlank = row.every(cell => cell === "" || cell === null || cell === undefined);
    if (isEntirelyBlank) return;

    const cleanDigits = rawPhone.replace(/[^0-9]/g, '');
    let formattedPhone = rawPhone;
    if (cleanDigits.length === 10) {
      formattedPhone = `${cleanDigits.slice(0,3)}-${cleanDigits.slice(3,6)}-${cleanDigits.slice(6)}`;
    } else if (cleanDigits.length === 9) {
      formattedPhone = `${cleanDigits.slice(0,2)}-${cleanDigits.slice(2,5)}-${cleanDigits.slice(5)}`;
    } else if (!formattedPhone) {
      formattedPhone = "-";
    }

    const combinedVehicleText = `${rawType} ${rawBrand} ${rawModel} ${rawNote}`.toLowerCase();
    let normalizedType = "มอเตอร์ไซค์";
    if (combinedVehicleText.match(/มอไซ|มอเตอร์|wave|click|pcx|scoopy|fazzio|filano|adv|forza|giorno|vespa|gpx|yamaha|suzuki/)) {
      normalizedType = "มอเตอร์ไซค์";
    } else if (combinedVehicleText.match(/กระบะ|d-max|dmax|revo|vigo|ranger|triton|navara|bt-50|suv|fortuner|mu-x|pajero|everest|แค็บ|4 ประตู|ตอนเดียว/)) {
      normalizedType = "รถกระบะ";
    } else if (combinedVehicleText.match(/เก๋ง|yaris|city|civic|vios|mazda|almera|swift|mg|byd|ep|es|ora|sedan|hatchback|camry|altis/)) {
      normalizedType = "รถเก๋ง";
    } else if (combinedVehicleText.match(/บรรทุก|6 ล้อ|10 ล้อ|สิบล้อ|หกล้อ|hino|fuso|isuzu nlr|giga|quester|หัวลาก|รถใหญ่/)) {
      normalizedType = "รถบรรทุก/หกล้อ/สิบล้อ";
    } else if (combinedVehicleText.match(/เกษตร|แทรก|คูโบต้า|kubota|yanmar|ยันม่าร์|l5018|l4018|รถไถ|รถเกี่ยว/)) {
      normalizedType = "รถเพื่อการเกษตร/แทรกเตอร์";
    } else if (combinedVehicleText.match(/โฉนด|ที่ดิน|บ้าน|อสังหา|น\.ส\.|คอนโด|ตึกแถว/)) {
      normalizedType = "โฉนดที่ดิน/อสังหาฯ";
    }

    let normalizedStatus = "นัดหมายเข้าสาขา";
    const statusText = `${rawStatus} ${rawNote}`.toLowerCase();

    if (statusText.match(/อนุมัติ|รับเงิน|ปิดการขาย|สำเร็จ|โอนแล้ว|ผ่าน|เรียบร้อย/)) {
      normalizedStatus = "อนุมัติ/รับเงินแล้ว";
    } else if (statusText.match(/90|พึ่งโอน|รอครบ|ติดต่ออีก|โทรซ้ำ|ติดตาม|รอ|ตาม|โอนเล่ม/)) {
      normalizedStatus = "ติดต่ออีกครั้ง (รอครบ 90 วัน/พึ่งโอน)";
    } else if (statusText.match(/ไม่สนใจ|ปฏิเสธ|ยกเลิก|ดอกแพง|ไม่เอา|แพง|ปิดเครื่อง/)) {
      normalizedStatus = "ลูกค้าไม่สนใจ";
    } else if (statusText.match(/ไม่เข้า|ไม่ผ่าน|ไม่มีเล่ม|เอกสารไม่ครบ|ติดแบล็ค|ติดเครดิต/)) {
      normalizedStatus = "ไม่เข้าเงื่อนไข";
    } else {
      normalizedStatus = "นัดหมายเข้าสาขา";
    }

    let cleanAmount = 0;
    if (amountCol !== -1 && row[amountCol]) {
      cleanAmount = Number(String(row[amountCol]).replace(/[^0-9.]/g, '')) || 0;
    }

    let dateStr = "";
    if (dateCol !== -1 && row[dateCol]) {
      try {
        dateStr = Utilities.formatDate(new Date(row[dateCol]), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");
      } catch (e) {
        dateStr = String(row[dateCol]);
      }
    } else {
      dateStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");
    }

    let custId = (idCol !== -1 && row[idCol]) ? String(row[idCol]).trim() : "";
    if (!custId || custId === "-") {
      custId = `CY-OLD-${String(importedCount + 1).padStart(4, '0')}`;
    }

    const cleanYear = yearCol !== -1 ? String(row[yearCol] || "").trim() : "";
    const cleanAppoint = appointCol !== -1 && row[appointCol] ? String(row[appointCol]).trim() : "-";
    const cleanOfficer = officerCol !== -1 && row[officerCol] ? String(row[officerCol]).trim() : "พนักงานสาขาเขาช่องพราน";

    rowsToInsert.push([
      custId,
      dateStr,
      rawName || `ลูกค้าเก่า #${importedCount + 1}`,
      formattedPhone,
      normalizedType,
      rawBrand,
      rawModel,
      cleanYear,
      rawPlate,
      cleanAmount,
      normalizedStatus,
      cleanAppoint,
      cleanOfficer,
      rawNote ? `(ข้อมูลเดิม) ${rawNote}` : "(นำเข้าจากแท็บข้อมูลลูกค้าติดต่อ)"
    ]);

    importedCount++;
  });

  if (rowsToInsert.length > 0) {
    const startRow = targetSheet.getLastRow() + 1;
    targetSheet.getRange(startRow, 1, rowsToInsert.length, 14).setValues(rowsToInsert);
  }

  return {
    success: true,
    count: importedCount,
    message: `นำเข้าข้อมูลลูกค้าเก่าครบทั้งหมด ${importedCount} รายการเรียบร้อยแล้ว!`
  };
}

/**
 * สรุปผลงานรายเดือนและรายปีในชีต
 */
function createOrUpdateSummarySheet(ss) {
  let summarySheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  if (!summarySheet) {
    summarySheet = ss.insertSheet(SUMMARY_SHEET_NAME);
    
    summarySheet.getRange("A1:E1").merge()
      .setValue("📊 สรุปผลงานสินเชื่อ เงินไชโย สาขาเขาช่องพราน (รายเดือน / รายปี)")
      .setBackground("#1E3A8A")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");

    const headers = ["ประจำงวด (เดือน/ปี)", "จำนวนเคสทั้งหมด (ราย)", "ยอดขอรวม (บาท)", "ยอดอนุมัติสำเร็จ (บาท)", "อัตราอนุมัติ (%)"];
    summarySheet.getRange(2, 1, 1, headers.length)
      .setValues([headers])
      .setBackground("#3B82F6")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
      
    summarySheet.setFrozenRows(2);
  }
}

/**
 * รับ Request แบบ GET
 */
function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    let data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      importAndNormalizeOldCustomers(getSpreadsheet(), sheet, false);
      data = sheet.getDataRange().getValues();
    }
    
    if (data.length <= 1) {
      return jsonResponse({ success: true, data: [], stats: getEmptyStats() });
    }
    
    const rows = data.slice(1);
    
    const customers = rows.map((row, index) => {
      let createdTimeStr = "";
      if (row[1]) {
        try {
          createdTimeStr = Utilities.formatDate(new Date(row[1]), "Asia/Bangkok", "yyyy-MM-dd HH:mm");
        } catch (err) {
          createdTimeStr = String(row[1]);
        }
      }

      return {
        rowIndex: index + 2,
        id: row[0] || ("CY-" + (index + 1)),
        createdAt: createdTimeStr,
        name: row[2] || "",
        phone: row[3] || "",
        vehicleType: row[4] || "มอเตอร์ไซค์",
        brand: row[5] || "",
        model: row[6] || "",
        year: row[7] || "",
        licensePlate: row[8] || "",
        amount: Number(row[9]) || 0,
        status: row[10] || "นัดหมายเข้าสาขา",
        appointmentDate: row[11] || "-",
        officer: row[12] || "",
        note: row[13] || ""
      };
    });
    
    return jsonResponse({
      success: true,
      data: customers.reverse(),
      stats: calculateStats(customers)
    });
  } catch (error) {
    return jsonResponse({ success: false, message: error.toString() });
  }
}

/**
 * รับ Request แบบ POST
 */
function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    if (action === "sync_old_data") {
      const forceClear = payload.force_clear === true;
      const syncResult = importAndNormalizeOldCustomers(getSpreadsheet(), sheet, forceClear);
      return jsonResponse(syncResult);
    }

    // Action 1: บันทึกข้อมูลลูกค้าใหม่
    if (action === "create") {
      const now = new Date();
      const thaiYearBE = now.getFullYear() + 543;
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const dayStr = String(now.getDate()).padStart(2, '0');
      const random4Digit = Math.floor(1000 + Math.random() * 9000);
      
      const newId = `CY-${thaiYearBE}${monthStr}${dayStr}-${random4Digit}`;
      const timestamp = Utilities.formatDate(now, "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");
      
      const newRow = [
        newId,
        timestamp,
        payload.name || "",
        payload.phone || "",
        payload.vehicleType || "มอเตอร์ไซค์",
        payload.brand || "",
        payload.model || "",
        payload.year || "",
        payload.licensePlate || "",
        Number(payload.amount) || 0,
        payload.status || "นัดหมายเข้าสาขา",
        payload.appointmentDate || "-",
        payload.officer || "พนักงานสาขาเขาช่องพราน",
        payload.note || ""
      ];
      
      sheet.appendRow(newRow);

      const allCustomers = fetchAllCustomersList(sheet);
      const todayStats = getDailyStats(allCustomers, now);
      const monthStats = getMonthlyStats(allCustomers, now);
      
      // ส่งการ์ด Flex Message ลูกค้าใหม่สไตล์สวยงาม
      sendLineFlexNewCustomerCard({
        id: newId,
        now: now,
        name: payload.name,
        phone: payload.phone,
        vehicleType: payload.vehicleType,
        brand: payload.brand,
        model: payload.model,
        year: payload.year,
        licensePlate: payload.licensePlate,
        amount: Number(payload.amount) || 0,
        status: payload.status,
        appointmentDate: payload.appointmentDate,
        officer: payload.officer,
        note: payload.note,
        todayStats: todayStats,
        monthStats: monthStats
      });
      
      return jsonResponse({ success: true, message: "บันทึกข้อมูลสำเร็จ", id: newId });
    }
    
    // Action 2: อัปเดตสถานะ
    if (action === "update") {
      const data = sheet.getDataRange().getValues();
      let targetRowIndex = -1;
      let existingCustomer = {};
      
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(payload.id)) {
          targetRowIndex = i + 1;
          existingCustomer = {
            id: data[i][0],
            name: data[i][2],
            phone: data[i][3],
            vehicleType: data[i][4],
            brand: data[i][5],
            model: data[i][6],
            amount: data[i][9]
          };
          break;
        }
      }
      
      if (targetRowIndex === -1) {
        return jsonResponse({ success: false, message: "ไม่พบรหัสลูกค้านี้ในระบบ" });
      }
      
      if (payload.amount !== undefined) sheet.getRange(targetRowIndex, 10).setValue(Number(payload.amount));
      if (payload.status) sheet.getRange(targetRowIndex, 11).setValue(payload.status);
      if (payload.appointmentDate) sheet.getRange(targetRowIndex, 12).setValue(payload.appointmentDate);
      if (payload.officer) sheet.getRange(targetRowIndex, 13).setValue(payload.officer);
      if (payload.note !== undefined) sheet.getRange(targetRowIndex, 14).setValue(payload.note);
      
      if (payload.status === "อนุมัติ/รับเงินแล้ว") {
        const now = new Date();
        const allCustomers = fetchAllCustomersList(sheet);
        const monthStats = getMonthlyStats(allCustomers, now);
        
        sendLineFlexApprovedCard({
          id: payload.id,
          name: payload.name || existingCustomer.name || "ลูกค้า",
          phone: existingCustomer.phone || "-",
          vehicleDetail: `${existingCustomer.vehicleType || ''} ${existingCustomer.brand || ''} ${existingCustomer.model || ''}`.trim(),
          amount: Number(payload.amount || existingCustomer.amount || 0),
          officer: payload.officer || "พนักงานสาขาเขาช่องพราน",
          monthStats: monthStats
        });
      }
      
      return jsonResponse({ success: true, message: "อัปเดตข้อมูลเรียบร้อยแล้ว" });
    }
    
    return jsonResponse({ success: false, message: "ไม่พบคำสั่งที่ระบุ" });
  } catch (error) {
    return jsonResponse({ success: false, message: error.toString() });
  }
}

/**
 * =========================================================================
 * 🎨 TEMPLATES: LINE FLEX MESSAGE CARDS (ดีไซน์พรีเมียมตามแบบ)
 * =========================================================================
 */

/**
 * 1. การ์ดลูกค้าใหม่ สไตล์ Badge Card พร้อมปุ่ม LIVE / NEW
 */
function sendLineFlexNewCustomerCard(item) {
  const time24 = Utilities.formatDate(item.now, "Asia/Bangkok", "HH:mm");
  const vehicleSummary = [item.brand, item.model, item.year ? `(${item.year})` : ""].filter(Boolean).join(" ");
  const cleanPhone = String(item.phone || '').replace(/[^0-9]/g, '');

  const flexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      backgroundColor: "#FFFFFF",
      contents: [
        // Top Curved Badge Container (ตามรูปภาพตัวอย่าง)
        {
          type: "box",
          layout: "horizontal",
          backgroundColor: "#00C389", // สีเขียวสดใส พรีเมียม
          cornerRadius: "14px",
          paddingAll: "12px",
          contents: [
            {
              type: "box",
              layout: "vertical",
              flex: 3,
              contents: [
                {
                  type: "text",
                  text: "🚨 ลูกค้าใหม่เข้าสาขา!",
                  color: "#FFFFFF",
                  weight: "bold",
                  size: "md"
                },
                {
                  type: "text",
                  text: "⚡ รับเรื่องด่วน • สาขาเขาช่องพราน",
                  color: "#E6FFFA",
                  size: "xxs",
                  margin: "xs"
                }
              ]
            },
            {
              type: "box",
              layout: "vertical",
              backgroundColor: "#E11D48",
              cornerRadius: "12px",
              paddingStart: "10px",
              paddingEnd: "10px",
              paddingTop: "4px",
              paddingBottom: "4px",
              justifyContent: "center",
              alignItems: "center",
              contents: [
                {
                  type: "text",
                  text: "NEW",
                  color: "#FFFFFF",
                  weight: "bold",
                  size: "xs"
                }
              ]
            }
          ]
        },
        // Customer Profile Section
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          contents: [
            {
              type: "text",
              text: `👤 ${item.name || 'ลูกค้าใหม่'}`,
              weight: "bold",
              size: "xl",
              color: "#0F172A"
            },
            {
              type: "text",
              text: `🚗 ${item.vehicleType} ${vehicleSummary ? '• ' + vehicleSummary : ''}`,
              color: "#64748B",
              size: "xs",
              margin: "xs"
            },
            {
              type: "text",
              text: `⭐ วงเงินที่ขอ: ${Number(item.amount).toLocaleString()} บาท (${item.status})`,
              color: "#D97706",
              weight: "bold",
              size: "xs",
              margin: "sm"
            }
          ]
        },
        {
          type: "separator",
          margin: "md"
        },
        // Detail Key-Value List with Vector Icons
        {
          type: "box",
          layout: "vertical",
          margin: "md",
          spacing: "sm",
          contents: [
            createFlexIconRow("⏰", "เวลารับเรื่อง", `${time24} น.`),
            createFlexIconRow("📞", "เบอร์โทรติดต่อ", item.phone || "-", "#0284C7", true),
            ...(item.licensePlate ? [createFlexIconRow("🏷️", "ทะเบียนรถ", item.licensePlate)] : []),
            ...(item.appointmentDate && item.appointmentDate !== "-" ? [createFlexIconRow("📍", "วันเวลานัดหมาย", item.appointmentDate, "#E11D48", true)] : []),
            createFlexIconRow("👨‍💼", "ผู้รับเรื่อง", item.officer || "พนักงานสาขาเขาช่องพราน"),
            ...(item.note ? [createFlexIconRow("📝", "หมายเหตุ", item.note)] : [])
          ]
        },
        {
          type: "separator",
          margin: "md"
        },
        // Motivational Strip Footer
        {
          type: "box",
          layout: "horizontal",
          margin: "md",
          contents: [
            {
              type: "text",
              text: `⚔️ วันนี้รับเรื่องแล้ว ${item.todayStats.totalCases} ราย — ลุยให้สุด!! 🏆`,
              color: "#475569",
              size: "xs",
              weight: "bold",
              flex: 1,
              wrap: true
            }
          ]
        }
      ]
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      paddingAll: "12px",
      backgroundColor: "#FFFFFF",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#0284C7",
          height: "sm",
          action: {
            type: "uri",
            label: "📞 โทรหาลูกค้าทันที",
            uri: cleanPhone ? `tel:${cleanPhone}` : "tel:0"
          }
        }
      ]
    }
  };

  sendLineFlexPayload(
    `🔔 [ลูกค้าใหม่] ${item.name} (${item.vehicleType}) ขอสินเชื่อ ${Number(item.amount).toLocaleString()} บาท`,
    flexBubble
  );
}

/**
 * 2. การ์ดฉลองยอดอนุมัติ (Approved Flex Card)
 */
function sendLineFlexApprovedCard(item) {
  const now = new Date();
  const time24 = Utilities.formatDate(now, "Asia/Bangkok", "HH:mm");

  const flexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      backgroundColor: "#FFFFFF",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          backgroundColor: "#16A34A",
          cornerRadius: "14px",
          paddingAll: "12px",
          contents: [
            {
              type: "box",
              layout: "vertical",
              flex: 3,
              contents: [
                {
                  type: "text",
                  text: "🏆 ปิดการขายสำเร็จ!",
                  color: "#FFFFFF",
                  weight: "bold",
                  size: "md"
                },
                {
                  type: "text",
                  text: "🎉 อนุมัติและรับเงินเรียบร้อย",
                  color: "#DCFCE7",
                  size: "xxs",
                  margin: "xs"
                }
              ]
            },
            {
              type: "box",
              layout: "vertical",
              backgroundColor: "#EAB308",
              cornerRadius: "12px",
              paddingStart: "10px",
              paddingEnd: "10px",
              paddingTop: "4px",
              paddingBottom: "4px",
              justifyContent: "center",
              alignItems: "center",
              contents: [
                {
                  type: "text",
                  text: "PASS",
                  color: "#000000",
                  weight: "bold",
                  size: "xs"
                }
              ]
            }
          ]
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          contents: [
            {
              type: "text",
              text: `👤 ${item.name}`,
              weight: "bold",
              size: "xl",
              color: "#0F172A"
            },
            {
              type: "text",
              text: `💰 ยอดอนุมัติ: ${Number(item.amount).toLocaleString()} บาท`,
              color: "#16A34A",
              weight: "bold",
              size: "md",
              margin: "xs"
            }
          ]
        },
        {
          type: "separator",
          margin: "md"
        },
        {
          type: "box",
          layout: "vertical",
          margin: "md",
          spacing: "sm",
          contents: [
            createFlexIconRow("⏰", "เวลาปิดยอด", `${time24} น.`),
            createFlexIconRow("🚗", "หลักประกัน", item.vehicleDetail || "-"),
            createFlexIconRow("👨‍💼", "ผู้ปิดยอด", item.officer || "พนักงานสาขา", "#1E3A8A", true)
          ]
        },
        {
          type: "separator",
          margin: "md"
        },
        {
          type: "text",
          text: `📈 ยอดอนุมัติสะสมเดือนนี้: ${item.monthStats.approvedAmount.toLocaleString()} บาท (${item.monthStats.approvedCount} เคส)`,
          color: "#166534",
          size: "xs",
          weight: "bold",
          margin: "md"
        }
      ]
    }
  };

  sendLineFlexPayload(
    `🎉 [ปิดการขายสำเร็จ!] คุณ ${item.name} อนุมัติวงเงิน ${Number(item.amount).toLocaleString()} บาท`,
    flexBubble
  );
}

/**
 * 3. ส่งสรุปผลงานประจำวันอัตโนมัติ (Daily Summary at 17:00 น.)
 */
function sendDailySummaryToLine() {
  const sheet = getOrCreateSheet();
  const customers = fetchAllCustomersList(sheet);
  const now = new Date();
  const stats = getDailyStats(customers, now);
  const dateThai = `${now.getDate()} ${THAI_MONTHS[now.getMonth()]} พ.ศ. ${now.getFullYear() + 543}`;

  const flexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      backgroundColor: "#FFFFFF",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          backgroundColor: "#1E3A8A",
          cornerRadius: "14px",
          paddingAll: "12px",
          contents: [
            {
              type: "box",
              layout: "vertical",
              flex: 3,
              contents: [
                {
                  type: "text",
                  text: "📊 สรุปผลงานประจำวัน",
                  color: "#FFFFFF",
                  weight: "bold",
                  size: "md"
                },
                {
                  type: "text",
                  text: `เงินไชโย สาขาเขาช่องพราน • ${dateThai}`,
                  color: "#93C5FD",
                  size: "xxs",
                  margin: "xs"
                }
              ]
            },
            {
              type: "box",
              layout: "vertical",
              backgroundColor: "#FF6B00",
              cornerRadius: "12px",
              paddingStart: "10px",
              paddingEnd: "10px",
              paddingTop: "4px",
              paddingBottom: "4px",
              justifyContent: "center",
              alignItems: "center",
              contents: [
                {
                  type: "text",
                  text: "DAILY",
                  color: "#FFFFFF",
                  weight: "bold",
                  size: "xs"
                }
              ]
            }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "lg",
          spacing: "md",
          contents: [
            createStatPill("รับเรื่องวันนี้", `${stats.totalCases} ราย`, "#0284C7"),
            createStatPill("ยอดขอรวม", `${(stats.totalAmount / 10000).toFixed(1)} หมื่น`, "#FF6B00"),
            createStatPill("อนุมัติสำเร็จ", `${stats.approvedCount} ราย`, "#16A34A")
          ]
        },
        {
          type: "separator",
          margin: "md"
        },
        {
          type: "box",
          layout: "vertical",
          margin: "md",
          spacing: "sm",
          contents: [
            createFlexIconRow("💰", "ยอดอนุมัติสำเร็จ", `${stats.approvedAmount.toLocaleString()} บาท`, "#16A34A", true),
            createFlexIconRow("📌", "นัดเข้าสาขา", `${stats.statusMap["นัดหมายเข้าสาขา"] || 0} ราย`),
            createFlexIconRow("⏳", "รอครบ 90 วัน", `${stats.statusMap["ติดต่ออีกครั้ง (รอครบ 90 วัน/พึ่งโอน)"] || 0} ราย`),
            createFlexIconRow("❌", "ไม่สนใจ/ไม่ผ่าน", `${(stats.statusMap["ลูกค้าไม่สนใจ"] || 0) + (stats.statusMap["ไม่เข้าเงื่อนไข"] || 0)} ราย`)
          ]
        },
        {
          type: "separator",
          margin: "md"
        },
        {
          type: "text",
          text: "💙 ขอบคุณทีมงานเขาช่องพรานทุกคนที่ทุ่มเทในวันนี้นะครับ!",
          color: "#0284C7",
          size: "xs",
          weight: "bold",
          margin: "md",
          align: "center"
        }
      ]
    }
  };

  sendLineFlexPayload(
    `📊 [สรุปผลงานประจำวัน 17:00 น.] สาขาเขาช่องพราน วันนี้รับเรื่อง ${stats.totalCases} ราย อนุมัติ ${stats.approvedAmount.toLocaleString()} บาท`,
    flexBubble
  );
}

function createFlexIconRow(icon, label, value, valueColor = "#334155", isBold = false) {
  return {
    type: "box",
    layout: "horizontal",
    contents: [
      {
        type: "text",
        text: `${icon} ${label}`,
        size: "xs",
        color: "#64748B",
        flex: 3
      },
      {
        type: "text",
        text: String(value),
        size: "xs",
        color: valueColor,
        weight: isBold ? "bold" : "regular",
        flex: 4,
        align: "end",
        wrap: true
      }
    ]
  };
}

function createStatPill(label, value, color) {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: "#F1F5F9",
    cornerRadius: "8px",
    paddingAll: "6px",
    flex: 1,
    contents: [
      {
        type: "text",
        text: label,
        size: "xxs",
        color: "#64748B",
        align: "center"
      },
      {
        type: "text",
        text: value,
        size: "xs",
        weight: "bold",
        color: color,
        align: "center",
        margin: "xxs"
      }
    ]
  };
}

/**
 * ฟังก์ชันยิง LINE Flex Message API พร้อม Fallback
 */
function sendLineFlexPayload(altText, flexBubble) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN.trim() === "") {
    Logger.log("⚠️ LINE_CHANNEL_ACCESS_TOKEN ว่างอยู่");
    return;
  }

  const payload = {
    messages: [
      {
        type: "flex",
        altText: altText,
        contents: flexBubble
      }
    ]
  };

  let endpoint = "";
  if (LINE_TARGET_ID && LINE_TARGET_ID.trim() !== "" && LINE_TARGET_ID.toLowerCase() !== "broadcast") {
    endpoint = "https://api.line.me/v2/bot/message/push";
    payload.to = LINE_TARGET_ID.trim();
  } else {
    endpoint = "https://api.line.me/v2/bot/message/broadcast";
  }

  try {
    const options = {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + LINE_CHANNEL_ACCESS_TOKEN.trim()
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(endpoint, options);
    const responseCode = response.getResponseCode();
    Logger.log(`LINE Flex API Status: ${responseCode} | Res: ${response.getContentText()}`);

    // ถ้า Flex Push ไม่ผ่าน ให้ Fallback เป็น Broadcast ทันที
    if (responseCode !== 200 && endpoint.includes("/push")) {
      Logger.log("⚠️ กำลังส่งสำรองแบบ Broadcast...");
      const fallbackOptions = {
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + LINE_CHANNEL_ACCESS_TOKEN.trim()
        },
        payload: JSON.stringify({
          messages: [{ type: "flex", altText: altText, contents: flexBubble }]
        }),
        muteHttpExceptions: true
      };
      UrlFetchApp.fetch("https://api.line.me/v2/bot/message/broadcast", fallbackOptions);
    }
  } catch (error) {
    Logger.log("❌ LINE Flex API Error: " + error.toString());
  }
}

/**
 * สถิติ
 */
function fetchAllCustomersList(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  return data.slice(1).map(row => ({
    id: row[0],
    createdAt: row[1],
    amount: Number(row[9]) || 0,
    status: String(row[10] || "นัดหมายเข้าสาขา").trim(),
    vehicleType: String(row[4] || "มอเตอร์ไซค์").trim()
  }));
}

function getDailyStats(customers, now) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  let totalCases = 0;
  let totalAmount = 0;
  let approvedAmount = 0;
  let approvedCount = 0;
  let statusMap = {};

  customers.forEach(c => {
    if (!c.createdAt) return;
    try {
      const d = new Date(c.createdAt);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === currentDate) {
        totalCases++;
        totalAmount += c.amount;
        if (c.status === "อนุมัติ/รับเงินแล้ว") {
          approvedAmount += c.amount;
          approvedCount++;
        }
        statusMap[c.status] = (statusMap[c.status] || 0) + 1;
      }
    } catch(e) {}
  });

  return { totalCases, totalAmount, approvedAmount, approvedCount, statusMap };
}

function getMonthlyStats(customers, now) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let totalCases = 0;
  let totalAmount = 0;
  let approvedAmount = 0;
  let approvedCount = 0;
  let statusMap = {};

  customers.forEach(c => {
    if (!c.createdAt) return;
    try {
      const d = new Date(c.createdAt);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        totalCases++;
        totalAmount += c.amount;
        if (c.status === "อนุมัติ/รับเงินแล้ว") {
          approvedAmount += c.amount;
          approvedCount++;
        }
        statusMap[c.status] = (statusMap[c.status] || 0) + 1;
      }
    } catch(e) {}
  });

  return { totalCases, totalAmount, approvedAmount, approvedCount, statusMap };
}

function calculateStats(customers) {
  let totalAmount = 0;
  let approvedAmount = 0;
  let totalCases = customers.length;
  let statusCount = {};
  let vehicleCount = {};
  
  customers.forEach(c => {
    totalAmount += c.amount;
    if (c.status === "อนุมัติ/รับเงินแล้ว") {
      approvedAmount += c.amount;
    }
    statusCount[c.status] = (statusCount[c.status] || 0) + 1;
    vehicleCount[c.vehicleType] = (vehicleCount[c.vehicleType] || 0) + 1;
  });
  
  return {
    totalCases: totalCases,
    totalAmount: totalAmount,
    approvedAmount: approvedAmount,
    statusCount: statusCount,
    vehicleCount: vehicleCount
  };
}

function getEmptyStats() {
  return { totalCases: 0, totalAmount: 0, approvedAmount: 0, statusCount: {}, vehicleCount: {} };
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
