/**
 * Firebase Config & Data Management Layer
 * Cloud Firestore is the SINGLE SOURCE OF TRUTH for both Bills & Bank Settings.
 * No local default reset on new devices.
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAsM7qjSs0Mpbp_RWsN2xj-fZD0MILOPpA",
  authDomain: "rent-calendar-ab918.firebaseapp.com",
  projectId: "rent-calendar-ab918",
  storageBucket: "rent-calendar-ab918.firebasestorage.app",
  messagingSenderId: "971964703634",
  appId: "1:971964703634:web:874d959a3e9673110e174b"
};

const DEFAULT_SETTINGS = {
  bankName: 'KKP_KiatnaKin-Phatra',
  bankAccountNo: '2009609668',
  bankAccountName: 'Chonnatee Tinala',
  firebaseConfig: FIREBASE_CONFIG
};

// Initial Seed Data (Used only once to seed Cloud Database if brand new)
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
    if (!localStorage.getItem(this.settingsKey)) {
      localStorage.setItem(this.settingsKey, JSON.stringify(DEFAULT_SETTINGS));
    }
  }

  initFirebase() {
    try {
      if (typeof window.firebase !== 'undefined' && FIREBASE_CONFIG.apiKey) {
        if (!firebase.apps.length) {
          firebase.initializeApp(FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
        console.log('Firebase Firestore Initialized Successfully');
      }
    } catch (e) {
      console.warn('Firebase initialization error:', e);
    }
  }

  async getSettings() {
    if (this.db) {
      try {
        const doc = await this.db.collection('settings').doc('bank').get();
        if (doc.exists) {
          const cloudSettings = doc.data();
          localStorage.setItem(this.settingsKey, JSON.stringify(cloudSettings));
          return cloudSettings;
        } else {
          // Seed default bank settings to Cloud Firestore
          await this.db.collection('settings').doc('bank').set(DEFAULT_SETTINGS);
          localStorage.setItem(this.settingsKey, JSON.stringify(DEFAULT_SETTINGS));
          return DEFAULT_SETTINGS;
        }
      } catch (e) {
        console.warn('Firestore settings fetch error:', e);
      }
    }

    try {
      const data = localStorage.getItem(this.settingsKey);
      let parsed = data ? JSON.parse(data) : { ...DEFAULT_SETTINGS };
      parsed.firebaseConfig = FIREBASE_CONFIG;
      return parsed;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings) {
    settings.firebaseConfig = FIREBASE_CONFIG;
    localStorage.setItem(this.settingsKey, JSON.stringify(settings));

    if (this.db) {
      try {
        await this.db.collection('settings').doc('bank').set(settings, { merge: true });
        console.log('Successfully saved bank settings to Cloud Firestore');
      } catch (e) {
        console.error('Firestore save settings error:', e);
      }
    }
  }

  async getBills() {
    // 1. Fetch live bills from Cloud Firestore
    if (this.db) {
      try {
        const snapshot = await this.db.collection('bills').get();
        if (!snapshot.empty) {
          const cloudBills = [];
          snapshot.forEach(doc => cloudBills.push({ id: doc.id, ...doc.data() }));
          localStorage.setItem(this.storageKey, JSON.stringify(cloudBills));
          return cloudBills;
        } else {
          // If Firestore is completely empty on the cloud, seed SEED_BILLS once to Cloud Firestore
          console.log('Firestore is empty. Seeding initial bills to Cloud Firestore...');
          for (const bill of SEED_BILLS) {
            await this.db.collection('bills').doc(bill.id).set(bill);
          }
          localStorage.setItem(this.storageKey, JSON.stringify(SEED_BILLS));
          return SEED_BILLS;
        }
      } catch (e) {
        console.error('Firestore fetch error:', e);
        if (e.code === 'permission-denied') {
          if (window.showToast) window.showToast('⚠️ โปรดเปิดสิทธิ์ Firestore Rules ใน Firebase Console');
        }
      }
    }

    // 2. Return local cached bills if offline
    try {
      const cached = localStorage.getItem(this.storageKey);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  }

  async saveBill(billData) {
    if (!billData.id) {
      billData.id = 'bill-' + Date.now();
    }

    if (this.db) {
      try {
        await this.db.collection('bills').doc(billData.id).set(billData, { merge: true });
        console.log('Successfully saved bill to Cloud Firestore:', billData.id);
      } catch (e) {
        console.error('Firestore save failed:', e);
      }
    }

    const bills = await this.getBills();
    return billData;
  }

  async updateBillStatus(billId, status, slipImageUrl = null, paidAt = null) {
    const paidTimestamp = paidAt || new Date().toISOString();
    const updateData = { status, paidAt: paidTimestamp };
    if (slipImageUrl) updateData.slipImageUrl = slipImageUrl;

    if (this.db) {
      try {
        await this.db.collection('bills').doc(billId).set(updateData, { merge: true });
        console.log('Successfully updated bill status in Cloud Firestore:', billId);
      } catch (e) {
        console.error('Firestore status update failed:', e);
      }
    }

    const bills = await this.getBills();
    const bill = bills.find(b => b.id === billId);
    return bill;
  }

  async deleteBill(billId) {
    if (this.db) {
      try {
        await this.db.collection('bills').doc(billId).delete();
        console.log('Successfully deleted bill from Cloud Firestore:', billId);
      } catch (e) {
        console.error('Firestore delete failed:', e);
      }
    }

    await this.getBills();
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
