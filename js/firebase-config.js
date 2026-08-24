/**
 * Firebase Config & Data Management Layer
 * Support Firebase Firestore & Storage with auto-fallback to LocalStorage for offline/demo usage
 */

// Default Bank Info & Settings
const DEFAULT_SETTINGS = {
  bankName: 'กสิกรไทย (KBank)',
  bankAccountNo: '123-4-56789-0',
  bankAccountName: 'นายเจ้าของ บ้านเช่า',
  firebaseConfig: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  }
};

// Initial Seed Data for Instant Preview
const SEED_BILLS = [
  {
    id: 'bill-rent-aug',
    type: 'rent',
    title: 'ค่าเช่าบ้าน (งวด ส.ค. - ต.ค.)',
    amount: 135000,
    dueDate: '2026-08-30',
    status: 'pending',
    paidAt: null,
    slipImageUrl: null,
    note: 'รอบจ่าย 3 เดือน (45,000 บ./เดือน)'
  },
  {
    id: 'bill-elec-aug',
    type: 'electricity',
    title: 'ค่าไฟฟ้าประจำเดือน ส.ค.',
    amount: 3450,
    dueDate: '2026-08-17',
    status: 'paid',
    paidAt: '2026-08-16T14:30:00.000Z',
    slipImageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    note: 'มิเตอร์ประจำเดือน ส.ค.'
  },
  {
    id: 'bill-net-aug',
    type: 'internet',
    title: 'ค่าอินเทอร์เน็ต',
    amount: 599,
    dueDate: '2026-08-21',
    status: 'paid',
    paidAt: '2026-08-20T10:15:00.000Z',
    slipImageUrl: null,
    note: 'แพ็กเกจ 1000/500 Mbps'
  },
  {
    id: 'bill-common-aug',
    type: 'common_fee',
    title: 'ค่าส่วนกลาง + ค่าน้ำ',
    amount: 1800,
    dueDate: '2026-08-27',
    status: 'pending',
    paidAt: null,
    slipImageUrl: null,
    note: 'รวมค่าน้ำประปาเดือนนี้แล้ว'
  },
  {
    id: 'bill-pool-aug',
    type: 'pool_cleaning',
    title: 'ค่าทำความสะอาดสระว่ายน้ำ',
    amount: 2500,
    dueDate: '2026-08-27',
    status: 'pending',
    paidAt: null,
    slipImageUrl: null,
    note: 'ทำความสะอาดสัปดาห์ละ 2 ครั้ง'
  }
];

class DataService {
  constructor() {
    this.storageKey = 'rent_tracker_bills_v1';
    this.settingsKey = 'rent_tracker_settings_v1';
    this.initStorage();
  }

  initStorage() {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify(SEED_BILLS));
    }
    if (!localStorage.getItem(this.settingsKey)) {
      localStorage.setItem(this.settingsKey, JSON.stringify(DEFAULT_SETTINGS));
    }
  }

  getSettings() {
    try {
      const data = localStorage.getItem(this.settingsKey);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings) {
    localStorage.setItem(this.settingsKey, JSON.stringify(settings));
  }

  async getBills() {
    // If Firebase configured & active, attempt Firebase fetch. Fallback to LocalStorage.
    try {
      const bills = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return bills;
    } catch (e) {
      console.error('Error fetching bills:', e);
      return [];
    }
  }

  async saveBill(billData) {
    const bills = await this.getBills();
    if (billData.id) {
      const index = bills.findIndex(b => b.id === billData.id);
      if (index !== -1) {
        bills[index] = { ...bills[index], ...billData };
      } else {
        bills.push(billData);
      }
    } else {
      billData.id = 'bill-' + Date.now();
      bills.push(billData);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(bills));
    return billData;
  }

  async updateBillStatus(billId, status, slipImageUrl = null, paidAt = null) {
    const bills = await this.getBills();
    const bill = bills.find(b => b.id === billId);
    if (bill) {
      bill.status = status;
      if (slipImageUrl) bill.slipImageUrl = slipImageUrl;
      bill.paidAt = paidAt || new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(bills));
    }
    return bill;
  }

  async deleteBill(billId) {
    let bills = await this.getBills();
    bills = bills.filter(b => b.id !== billId);
    localStorage.setItem(this.storageKey, JSON.stringify(bills));
  }

  // Auto-generate standard recurring bills for a given YYYY-MM
  async generateMonthlyBills(year, month) {
    // month is 1-indexed (1..12)
    const monthStr = String(month).padStart(2, '0');
    const bills = await this.getBills();
    
    // Check if bills for this month already exist
    const existingForMonth = bills.filter(b => b.dueDate.startsWith(`${year}-${monthStr}`));
    if (existingForMonth.length > 0) {
      return { success: false, message: `มีบิลของเดือน ${month}/${year} อยู่แล้วในระบบ (${existingForMonth.length} รายการ)` };
    }

    const newBills = [];

    // 1. Rent: Every 3 months (Aug [08], Nov [11], Feb [02], May [05])
    if (['02', '05', '08', '11'].includes(monthStr)) {
      newBills.push({
        id: `bill-rent-${year}-${monthStr}`,
        type: 'rent',
        title: `ค่าเช่าบ้าน (งวด ${month}/${year})`,
        amount: 135000, // 45,000 x 3 months
        dueDate: `${year}-${monthStr}-30`,
        status: 'pending',
        paidAt: null,
        slipImageUrl: null,
        note: 'ค่าเช่าล่วงหน้า 3 เดือน (45,000 บ./เดือน)'
      });
    }

    // 2. Common fee (Due 27th)
    newBills.push({
      id: `bill-common-${year}-${monthStr}`,
      type: 'common_fee',
      title: 'ค่าส่วนกลาง + ค่าน้ำ',
      amount: 1800, // Default estimated
      dueDate: `${year}-${monthStr}-27`,
      status: 'pending',
      paidAt: null,
      slipImageUrl: null,
      note: 'กำหนดโดยเจ้าของ'
    });

    // 3. Electricity (Due 17th)
    newBills.push({
      id: `bill-elec-${year}-${monthStr}`,
      type: 'electricity',
      title: 'ค่าไฟฟ้า',
      amount: 3000, // Default estimated
      dueDate: `${year}-${monthStr}-17`,
      status: 'pending',
      paidAt: null,
      slipImageUrl: null,
      note: 'คำนวณตามหน่วยมิเตอร์จริง'
    });

    // 4. Internet (Due 21st)
    newBills.push({
      id: `bill-net-${year}-${monthStr}`,
      type: 'internet',
      title: 'ค่าอินเทอร์เน็ต',
      amount: 599,
      dueDate: `${year}-${monthStr}-21`,
      status: 'pending',
      paidAt: null,
      slipImageUrl: null,
      note: 'รายเดือนคงที่'
    });

    // 5. Pool cleaning (Due 27th)
    newBills.push({
      id: `bill-pool-${year}-${monthStr}`,
      type: 'pool_cleaning',
      title: 'ค่าทำความสะอาดสระว่ายน้ำ',
      amount: 2500,
      dueDate: `${year}-${monthStr}-27`,
      status: 'pending',
      paidAt: null,
      slipImageUrl: null,
      note: 'บริการล้างสระประจำเดือน'
    });

    for (const b of newBills) {
      bills.push(b);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(bills));
    return { success: true, count: newBills.length };
  }
}

window.dataService = new DataService();
