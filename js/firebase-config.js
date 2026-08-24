/**
 * Firebase Config & Data Management Layer
 * Support Firebase Firestore real-time cloud database with auto-fallback to LocalStorage for offline/demo usage
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
    this.db = null;
    this.initStorage();
    this.initFirebase();
  }

  initStorage() {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify(SEED_BILLS));
    }
    if (!localStorage.getItem(this.settingsKey)) {
      localStorage.setItem(this.settingsKey, JSON.stringify(DEFAULT_SETTINGS));
    }
  }

  initFirebase() {
    try {
      const settings = this.getSettings();
      if (typeof firebase !== 'undefined' && settings.firebaseConfig && settings.firebaseConfig.apiKey) {
        if (!firebase.apps.length) {
          firebase.initializeApp(settings.firebaseConfig);
        }
        this.db = firebase.firestore();
        console.log('Firebase Firestore Initialized Successfully');
      }
    } catch (e) {
      console.warn('Firebase initialization error, using LocalStorage:', e);
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
    this.initFirebase();
  }

  async getBills() {
    // 1. Try Firebase Firestore if configured
    if (this.db) {
      try {
        const snapshot = await this.db.collection('bills').get();
        if (!snapshot.empty) {
          const cloudBills = [];
          snapshot.forEach(doc => cloudBills.push({ id: doc.id, ...doc.data() }));
          localStorage.setItem(this.storageKey, JSON.stringify(cloudBills));
          return cloudBills;
        }
      } catch (e) {
        console.warn('Firestore fetch failed, fallback to LocalStorage:', e);
      }
    }

    // 2. Fallback to LocalStorage
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch (e) {
      return SEED_BILLS;
    }
  }

  async saveBill(billData) {
    if (!billData.id) {
      billData.id = 'bill-' + Date.now();
    }

    // Save to Firestore if connected
    if (this.db) {
      try {
        await this.db.collection('bills').doc(billData.id).set(billData, { merge: true });
      } catch (e) {
        console.error('Firestore save failed:', e);
      }
    }

    // Save to LocalStorage
    const bills = await this.getBills();
    const index = bills.findIndex(b => b.id === billData.id);
    if (index !== -1) {
      bills[index] = { ...bills[index], ...billData };
    } else {
      bills.push(billData);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(bills));
    return billData;
  }

  async updateBillStatus(billId, status, slipImageUrl = null, paidAt = null) {
    const paidTimestamp = paidAt || new Date().toISOString();
    const updateData = { status, paidAt: paidTimestamp };
    if (slipImageUrl) updateData.slipImageUrl = slipImageUrl;

    if (this.db) {
      try {
        await this.db.collection('bills').doc(billId).update(updateData);
      } catch (e) {
        console.error('Firestore status update failed:', e);
      }
    }

    const bills = await this.getBills();
    const bill = bills.find(b => b.id === billId);
    if (bill) {
      bill.status = status;
      if (slipImageUrl) bill.slipImageUrl = slipImageUrl;
      bill.paidAt = paidTimestamp;
      localStorage.setItem(this.storageKey, JSON.stringify(bills));
    }
    return bill;
  }

  async deleteBill(billId) {
    if (this.db) {
      try {
        await this.db.collection('bills').doc(billId).delete();
      } catch (e) {
        console.error('Firestore delete failed:', e);
      }
    }

    let bills = await this.getBills();
    bills = bills.filter(b => b.id !== billId);
    localStorage.setItem(this.storageKey, JSON.stringify(bills));
  }

  async generateMonthlyBills(year, month) {
    const monthStr = String(month).padStart(2, '0');
    const bills = await this.getBills();
    
    const existingForMonth = bills.filter(b => b.dueDate.startsWith(`${year}-${monthStr}`));
    if (existingForMonth.length > 0) {
      return { success: false, message: `มีบิลของเดือน ${month}/${year} อยู่แล้วในระบบ (${existingForMonth.length} รายการ)` };
    }

    const newBills = [];

    if (['02', '05', '08', '11'].includes(monthStr)) {
      newBills.push({
        id: `bill-rent-${year}-${monthStr}`,
        type: 'rent',
        title: `ค่าเช่าบ้าน (งวด ${month}/${year})`,
        amount: 135000,
        dueDate: `${year}-${monthStr}-30`,
        status: 'pending',
        paidAt: null,
        slipImageUrl: null,
        note: 'ค่าเช่าล่วงหน้า 3 เดือน (45,000 บ./เดือน)'
      });
    }

    newBills.push({
      id: `bill-common-${year}-${monthStr}`,
      type: 'common_fee',
      title: 'ค่าส่วนกลาง + ค่าน้ำ',
      amount: 1800,
      dueDate: `${year}-${monthStr}-27`,
      status: 'pending',
      paidAt: null,
      slipImageUrl: null,
      note: 'กำหนดโดยเจ้าของ'
    });

    newBills.push({
      id: `bill-elec-${year}-${monthStr}`,
      type: 'electricity',
      title: 'ค่าไฟฟ้า',
      amount: 3000,
      dueDate: `${year}-${monthStr}-17`,
      status: 'pending',
      paidAt: null,
      slipImageUrl: null,
      note: 'คำนวณตามหน่วยมิเตอร์จริง'
    });

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
      await this.saveBill(b);
    }
    return { success: true, count: newBills.length };
  }
}

window.dataService = new DataService();
