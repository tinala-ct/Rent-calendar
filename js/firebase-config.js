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

// ─── Default Recurring Templates ──────────────────────────────────────────────
// These are seeded to Firestore once when the database is empty.
const DEFAULT_RECURRING_TEMPLATES = [
  {
    id: 'tmpl-garbage',
    type: 'garbage',
    title: 'ค่าเก็บขยะ',
    amount: 200,
    dayOfMonth: 1,
    frequency: 'monthly',
    anchorMonth: 1,
    enabled: true,
    note: 'ค่าเก็บขยะประจำเดือน'
  },
  {
    id: 'tmpl-common',
    type: 'common_fee',
    title: 'ค่าส่วนกลาง + ค่าน้ำ',
    amount: 1800,
    dayOfMonth: 27,
    frequency: 'monthly',
    anchorMonth: 1,
    enabled: true,
    note: 'รวมค่าน้ำประปา'
  },
  {
    id: 'tmpl-electricity',
    type: 'electricity',
    title: 'ค่าไฟฟ้า',
    amount: 3000,
    dayOfMonth: 17,
    frequency: 'monthly',
    anchorMonth: 1,
    enabled: true,
    note: 'คำนวณตามหน่วยมิเตอร์จริง'
  },
  {
    id: 'tmpl-internet',
    type: 'internet',
    title: 'ค่าอินเทอร์เน็ต',
    amount: 599,
    dayOfMonth: 21,
    frequency: 'monthly',
    anchorMonth: 1,
    enabled: true,
    note: 'แพ็กเกจ 1000/500 Mbps'
  },
  {
    id: 'tmpl-pool',
    type: 'pool_cleaning',
    title: 'ค่าทำความสะอาดสระว่ายน้ำ',
    amount: 2500,
    dayOfMonth: 27,
    frequency: 'monthly',
    anchorMonth: 1,
    enabled: true,
    note: 'บริการล้างสระประจำเดือน'
  },
  {
    id: 'tmpl-rent',
    type: 'rent',
    title: 'ค่าเช่าบ้าน',
    amount: 135000,
    dayOfMonth: 30,
    frequency: 'every3months',
    anchorMonth: 8,
    enabled: true,
    note: 'ค่าเช่าล่วงหน้า 3 เดือน (45,000 บ./เดือน) — ส.ค., พ.ย., ก.พ., พ.ค.'
  }
];

// Initial Seed Bills (Used only once to seed Cloud Database if brand new)
const SEED_BILLS = [
  {
    id: 'bill-garbage-aug',
    type: 'garbage',
    title: 'ค่าเก็บขยะ',
    amount: 200,
    dueDate: '2026-08-01',
    status: 'paid',
    paidAt: '2026-08-01T09:00:00.000Z',
    slipImageUrl: null,
    note: 'ค่าเก็บขยะประจำเดือน'
  },
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

  // ─── Settings ───────────────────────────────────────────────────────────────

  async getSettings() {
    if (this.db) {
      try {
        const doc = await this.db.collection('settings').doc('bank').get();
        if (doc.exists) {
          const cloudSettings = doc.data();
          localStorage.setItem(this.settingsKey, JSON.stringify(cloudSettings));
          return cloudSettings;
        } else {
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
        console.log('Saved bank settings to Cloud Firestore');
      } catch (e) {
        console.error('Firestore save settings error:', e);
      }
    }
  }

  // ─── Bills ──────────────────────────────────────────────────────────────────

  async getBills() {
    if (this.db) {
      try {
        const snapshot = await this.db.collection('bills').get();
        if (!snapshot.empty) {
          const cloudBills = [];
          snapshot.forEach(doc => cloudBills.push({ id: doc.id, ...doc.data() }));
          localStorage.setItem(this.storageKey, JSON.stringify(cloudBills));
          return cloudBills;
        } else {
          console.log('Firestore is empty. Seeding initial bills...');
          for (const bill of SEED_BILLS) {
            await this.db.collection('bills').doc(bill.id).set(bill);
          }
          // Also seed recurring templates
          await this.getRecurringTemplates();
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
    try {
      const cached = localStorage.getItem(this.storageKey);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  }

  async getBillsWithForecast(year, month) {
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;

    const allBills = await this.getBills();
    const templates = await this.getRecurringTemplates();

    const monthRealBills = allBills.filter(b => b.dueDate && b.dueDate.startsWith(prefix));

    const projectedBills = [];
    for (const template of templates) {
      if (!this._shouldGenerateForMonth(template, year, month)) continue;

      const expectedId = `bill-${template.id}-${year}-${monthStr}`;
      const dueDate = this._getSmartDueDate(year, month, template.dayOfMonth);

      const alreadyExists = monthRealBills.some(b =>
        b.id === expectedId ||
        b.fromTemplate === template.id ||
        (b.type === template.type && b.dueDate === dueDate)
      );

      if (!alreadyExists) {
        projectedBills.push({
          id: expectedId,
          type: template.type,
          title: template.title,
          amount: Number(template.amount),
          dueDate: dueDate,
          status: 'pending',
          paidAt: null,
          slipImageUrl: null,
          note: template.note || '',
          fromTemplate: template.id,
          isScheduled: true
        });
      }
    }

    return [...monthRealBills, ...projectedBills];
  }

  async saveBill(billData) {
    if (!billData.id) {
      billData.id = 'bill-' + Date.now();
    }
    if (this.db) {
      try {
        await this.db.collection('bills').doc(billData.id).set(billData, { merge: true });
        console.log('Saved bill to Firestore:', billData.id);
      } catch (e) {
        console.error('Firestore save bill failed:', e);
      }
    }
    return billData;
  }

  async updateBillStatus(billId, status, slipImageUrl = null, paidAt = null) {
    const paidTimestamp = paidAt || new Date().toISOString();
    const updateData = { status, paidAt: paidTimestamp };
    if (slipImageUrl) updateData.slipImageUrl = slipImageUrl;
    if (this.db) {
      try {
        await this.db.collection('bills').doc(billId).set(updateData, { merge: true });
      } catch (e) {
        console.error('Firestore status update failed:', e);
      }
    }
  }

  async deleteBill(billId) {
    if (this.db) {
      try {
        await this.db.collection('bills').doc(billId).delete();
      } catch (e) {
        console.error('Firestore delete bill failed:', e);
      }
    }
  }

  // ─── Recurring Templates ────────────────────────────────────────────────────

  async getRecurringTemplates() {
    let templates = [];
    if (this.db) {
      try {
        const snapshot = await this.db.collection('recurringTemplates').get();
        if (!snapshot.empty) {
          snapshot.forEach(doc => templates.push({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {
        console.error('Firestore getRecurringTemplates error:', e);
      }
    }

    if (templates.length === 0) {
      templates = [...DEFAULT_RECURRING_TEMPLATES];
      if (this.db) {
        for (const tmpl of DEFAULT_RECURRING_TEMPLATES) {
          try {
            await this.db.collection('recurringTemplates').doc(tmpl.id).set(tmpl);
          } catch (e) {}
        }
      }
    }
    return templates;
  }

  async saveRecurringTemplate(template) {
    if (!template.id) {
      template.id = 'tmpl-' + Date.now();
    }
    if (this.db) {
      try {
        await this.db.collection('recurringTemplates').doc(template.id).set(template, { merge: true });
        console.log('Saved recurring template:', template.id);
      } catch (e) {
        console.error('Firestore save recurring template error:', e);
      }
    }
    return template;
  }

  async deleteRecurringTemplate(templateId) {
    if (this.db) {
      try {
        await this.db.collection('recurringTemplates').doc(templateId).delete();
        console.log('Deleted recurring template:', templateId);
      } catch (e) {
        console.error('Firestore delete recurring template error:', e);
      }
    }
  }

  // ─── Smart Bill Generation ──────────────────────────────────────────────────

  /**
   * Check if a template should be generated for a given year/month.
   * @param {object} template
   * @param {number} year
   * @param {number} month  (1-based)
   */
  _shouldGenerateForMonth(template, year, month) {
    if (template.enabled === false) return false;
    if (template.frequency === 'monthly') return true;

    const anchor = Number(template.anchorMonth) || 1;
    // Positive modulo difference
    const diff = ((month - anchor) % 12 + 12) % 12;

    if (template.frequency === 'every3months') return diff % 3 === 0;
    if (template.frequency === 'every6months') return diff % 6 === 0;
    if (template.frequency === 'yearly') return month === anchor;
    return false;
  }

  /**
   * Returns a YYYY-MM-DD string, capping dayOfMonth to the last valid day.
   * e.g. dayOfMonth=30, month=February → returns the 28th (or 29th in leap year).
   */
  _getSmartDueDate(year, month, dayOfMonth) {
    // new Date(year, month, 0) = last day of the previous month = last day of `month`
    const lastDay = new Date(year, month, 0).getDate();
    const day = Math.min(Number(dayOfMonth), lastDay);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  /**
   * Generate bills for a given month from all enabled recurring templates.
   * Skips templates that already have a bill for this month.
   */
  async generateMonthlyBills(year, month) {
    const monthStr = String(month).padStart(2, '0');
    const templates = await this.getRecurringTemplates();
    const existingBills = await this.getBills();

    const created = [];
    const skipped = [];

    for (const template of templates) {
      if (!this._shouldGenerateForMonth(template, year, month)) continue;

      const billId = `bill-${template.id}-${year}-${monthStr}`;

      // Skip if already exists
      if (existingBills.some(b => b.id === billId)) {
        skipped.push(template.title);
        continue;
      }

      const dueDate = this._getSmartDueDate(year, month, template.dayOfMonth);

      const newBill = {
        id: billId,
        type: template.type,
        title: template.title,
        amount: Number(template.amount),
        dueDate,
        status: 'pending',
        paidAt: null,
        slipImageUrl: null,
        note: template.note || '',
        fromTemplate: template.id
      };

      await this.saveBill(newBill);
      created.push(template.title);
    }

    if (created.length === 0 && skipped.length === 0) {
      return {
        success: false,
        count: 0,
        message: 'ไม่มีรายการประจำในเดือนนี้ กรุณาตั้งค่ารายการประจำก่อน'
      };
    }

    return {
      success: true,
      count: created.length,
      skipped: skipped.length,
      message: created.length > 0
        ? `✅ สร้าง ${created.length} รายการสำเร็จ` + (skipped.length > 0 ? ` (ข้าม ${skipped.length} รายการที่มีแล้ว)` : '')
        : `ℹ️ ทุกรายการมีอยู่แล้วในเดือนนี้ (${skipped.length} รายการ)`
    };
  }
}

window.dataService = new DataService();
