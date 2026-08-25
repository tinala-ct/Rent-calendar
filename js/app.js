/**
 * Rent Tracker Application Logic
 * Supports English localization for Tenant Portal and Thai for Owner Dashboard
 */

document.addEventListener('DOMContentLoaded', () => {
  const isOwnerPage = window.location.pathname.includes('owner-x7k2');

  // State
  let currentDate = new Date(2026, 7, 1); // Aug 2026
  let bills = [];
  let selectedDate = null;
  let activeBillForPay = null;
  let recurringTemplates = [];

  // DOM Elements — Common
  const monthYearLabel = document.getElementById('monthYearLabel');
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  const calendarGrid = document.getElementById('calendarGrid');
  const billsList = document.getElementById('billsList');

  // Summary
  const summaryTotalAmount = document.getElementById('summaryTotalAmount');
  const summaryPaidAmount = document.getElementById('summaryPaidAmount');
  const summaryProgressBar = document.getElementById('summaryProgressBar');
  const summaryStatPaid = document.getElementById('summaryStatPaid');
  const summaryStatPending = document.getElementById('summaryStatPending');

  // Bank Info (Tenant)
  const bankNameEl = document.getElementById('bankName');
  const bankAccountNoEl = document.getElementById('bankAccountNo');
  const bankAccountNameEl = document.getElementById('bankAccountName');
  const copyBankBtn = document.getElementById('copyBankBtn');

  // Pay Modal
  const payModal = document.getElementById('payModal');
  const closePayModalBtn = document.getElementById('closePayModalBtn');
  const payForm = document.getElementById('payForm');
  const slipInput = document.getElementById('slipInput');
  const slipPreviewContainer = document.getElementById('slipPreviewContainer');
  const slipPreviewImg = document.getElementById('slipPreviewImg');

  // Lightbox
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');

  // Owner Modals
  const addBillBtn = document.getElementById('addBillBtn');
  const generateMonthBillsBtn = document.getElementById('generateMonthBillsBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const billModal = document.getElementById('billModal');
  const closeBillModalBtn = document.getElementById('closeBillModalBtn');
  const billForm = document.getElementById('billForm');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
  const settingsForm = document.getElementById('settingsForm');

  // Recurring Templates Modal
  const recurringBtn = document.getElementById('recurringBtn');
  const recurringModal = document.getElementById('recurringModal');
  const closeRecurringModalBtn = document.getElementById('closeRecurringModalBtn');
  const recurringListView = document.getElementById('recurringListView');
  const recurringFormView = document.getElementById('recurringFormView');
  const addRecurringBtn = document.getElementById('addRecurringBtn');
  const backToRecurringListBtn = document.getElementById('backToRecurringListBtn');
  const recurringTemplateForm = document.getElementById('recurringTemplateForm');
  const recurringTmplFrequency = document.getElementById('recurringTmplFrequency');
  const anchorMonthGroup = document.getElementById('anchorMonthGroup');

  // ─── Constants & Localization ───────────────────────────────────────────────

  const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const EN_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const THAI_MONTHS_SHORT = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const EN_MONTHS_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const TYPE_ICONS = {
    rent: '🏠',
    common_fee: '🏢',
    electricity: '⚡',
    internet: '🌐',
    pool_cleaning: '🏊',
    garbage: '🗑️',
    other: '📄'
  };

  const FREQ_LABELS = {
    monthly: 'ทุกเดือน',
    every3months: 'ทุก 3 เดือน',
    every6months: 'ทุก 6 เดือน',
    yearly: 'ปีละครั้ง'
  };

  // ─── Toast Helper ──────────────────────────────────────────────────────────

  window.showToast = function (message, isError = false) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (isError) toast.style.background = 'rgba(185,28,28,0.92)';
    toast.innerHTML = `<span>${isError ? '⚠️' : '✅'}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency', currency: 'THB', maximumFractionDigits: 0
    }).format(amount);
  }

  function formatDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;

    if (!isOwnerPage) {
      // English date for tenant: e.g. "30 August 2026"
      return `${day} ${EN_MONTHS[month]} ${parts[0]}`;
    }
    // Thai date for owner: e.g. "30 สิงหาคม 2569"
    const year = parseInt(parts[0], 10) + 543;
    return `${day} ${THAI_MONTHS[month]} ${year}`;
  }

  function getDisplayTitle(bill) {
    if (isOwnerPage) return bill.title;

    // Standard English translations for Tenant view
    const titleMap = {
      'ค่าเช่าบ้าน': 'House Rent',
      'ค่าไฟฟ้า': 'Electricity Fee',
      'ค่าอินเทอร์เน็ต': 'Internet Fee',
      'ค่าส่วนกลาง': 'Common Fee & Water',
      'ค่าทำความสะอาดสระ': 'Pool Cleaning Fee',
      'ค่าทำความสะอาดสระว่ายน้ำ': 'Pool Cleaning Fee',
      'ค่าเก็บขยะ': 'Garbage Collection Fee'
    };

    for (const [key, val] of Object.entries(titleMap)) {
      if (bill.title && bill.title.includes(key)) return val;
    }

    const typeFallback = {
      rent: 'House Rent',
      common_fee: 'Common Fee & Water',
      electricity: 'Electricity Fee',
      internet: 'Internet Fee',
      pool_cleaning: 'Pool Cleaning Fee',
      garbage: 'Garbage Collection Fee',
      other: 'Other Expense'
    };

    return typeFallback[bill.type] || bill.title;
  }

  // ─── Bank Settings ─────────────────────────────────────────────────────────

  async function loadBankSettings() {
    const settings = await window.dataService.getSettings();
    if (bankNameEl) bankNameEl.textContent = settings.bankName;
    if (bankAccountNoEl) bankAccountNoEl.textContent = settings.bankAccountNo;
    if (bankAccountNameEl) bankAccountNameEl.textContent = settings.bankAccountName;
    const bankIconEl = document.getElementById('bankIcon');
    if (bankIconEl) bankIconEl.style.backgroundColor = settings.bankColor || 'rgb(87, 82, 133)';
  }

  // ─── Header & Navigation ───────────────────────────────────────────────────

  function updateMonthHeader() {
    const month = currentDate.getMonth();
    if (!isOwnerPage) {
      // Tenant: English Header (e.g. "August 2026")
      monthYearLabel.textContent = `${EN_MONTHS[month]} ${currentDate.getFullYear()}`;
    } else {
      // Owner: Thai Header (e.g. "สิงหาคม 2569")
      const yearStr = currentDate.getFullYear() + 543;
      monthYearLabel.textContent = `${THAI_MONTHS[month]} ${yearStr}`;
    }
  }

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      selectedDate = null;
      updateMonthHeader();
      refreshData();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      selectedDate = null;
      updateMonthHeader();
      refreshData();
    });
  }

  // ─── Data Refresh ──────────────────────────────────────────────────────────

  async function refreshData() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    // Fetches real bills + forecasted/projected bills from active templates
    bills = await window.dataService.getBillsWithForecast(year, month);
    renderSummary();
    renderCalendar();
    renderBillsList();
  }

  // ─── Summary Card ──────────────────────────────────────────────────────────

  function renderSummary() {
    const year = currentDate.getFullYear();
    const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const monthBills = bills.filter(b => b.dueDate && b.dueDate.startsWith(prefix));

    const total = monthBills.reduce((sum, b) => sum + Number(b.amount), 0);
    const paid = monthBills.filter(b => b.status === 'paid').reduce((sum, b) => sum + Number(b.amount), 0);
    const pendingCount = monthBills.filter(b => b.status !== 'paid').length;
    const paidCount = monthBills.filter(b => b.status === 'paid').length;

    if (summaryTotalAmount) summaryTotalAmount.textContent = formatCurrency(total);
    if (summaryPaidAmount) summaryPaidAmount.textContent = formatCurrency(paid);
    if (summaryProgressBar) {
      summaryProgressBar.style.width = total > 0 ? `${(paid / total) * 100}%` : '0%';
    }

    if (summaryStatPaid) {
      summaryStatPaid.textContent = !isOwnerPage ? `${paidCount} Items` : `${paidCount} รายการ`;
    }
    if (summaryStatPending) {
      summaryStatPending.textContent = !isOwnerPage ? `${pendingCount} Items` : `${pendingCount} รายการ`;
    }
  }

  // ─── Calendar ──────────────────────────────────────────────────────────────

  function getDotType(type) {
    if (type === 'common_fee') return 'common';
    if (type === 'pool_cleaning') return 'pool';
    return type; // rent, electricity, internet, garbage, other
  }

  function renderCalendar() {
    if (!calendarGrid) return;
    calendarGrid.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Previous month fillers
    for (let x = firstDayIndex; x > 0; x--) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell other-month';
      cell.innerHTML = `<span class="calendar-date-number">${prevLastDate - x + 1}</span>`;
      calendarGrid.appendChild(cell);
    }

    // Current month
    for (let day = 1; day <= lastDate; day++) {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(month + 1).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;

      const cell = document.createElement('div');
      cell.className = 'calendar-cell';
      if (dateKey === todayStr) cell.classList.add('today');
      if (selectedDate === dateKey) cell.classList.add('selected');
      cell.innerHTML = `<span class="calendar-date-number">${day}</span>`;

      const dayBills = bills.filter(b => b.dueDate === dateKey);
      if (dayBills.length > 0) {
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'calendar-dots';
        dayBills.forEach(b => {
          const dot = document.createElement('div');
          const dotType = getDotType(b.type);
          const titleText = getDisplayTitle(b);
          dot.className = `dot dot-${dotType}${b.status === 'paid' ? ' dot-paid' : ''}`;
          dot.title = `${titleText} (${formatCurrency(b.amount)})`;
          dotsContainer.appendChild(dot);
        });
        cell.appendChild(dotsContainer);
      }

      cell.addEventListener('click', () => {
        selectedDate = selectedDate === dateKey ? null : dateKey;
        renderCalendar();
        renderBillsList();
      });

      calendarGrid.appendChild(cell);
    }
  }

  // ─── Bill Cards ────────────────────────────────────────────────────────────

  function renderBillsList() {
    if (!billsList) return;
    billsList.innerHTML = '';

    const year = currentDate.getFullYear();
    const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
    let displayBills = bills.filter(b => b.dueDate && b.dueDate.startsWith(`${year}-${monthStr}`));

    if (selectedDate) {
      displayBills = displayBills.filter(b => b.dueDate === selectedDate);
    }

    displayBills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    if (displayBills.length === 0) {
      const emptyMsg = !isOwnerPage
        ? (selectedDate ? 'No bills due on this date' : 'No bill items for this month')
        : (selectedDate ? 'ไม่มีบิลที่ต้องชำระในวันนี้' : 'ไม่มีรายการบิลในเดือนนี้');
      billsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>${emptyMsg}</p>
        </div>`;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    displayBills.forEach(bill => {
      let currentStatus = bill.status;
      if (currentStatus === 'pending' && bill.dueDate < todayStr) currentStatus = 'overdue';

      const statusLabels = !isOwnerPage
        ? { paid: 'Paid', pending: 'Pending', overdue: 'Overdue' }
        : { paid: 'จ่ายแล้ว', pending: 'รอชำระ', overdue: 'เกินกำหนด' };

      const scheduledBadge = bill.isScheduled
        ? (!isOwnerPage
            ? ` <span style="font-size:0.7rem; background:rgba(79,70,229,0.12); color:var(--primary); padding:2px 7px; border-radius:10px; font-weight:600;">📌 Recurring</span>`
            : ` <span style="font-size:0.7rem; background:rgba(79,70,229,0.12); color:var(--primary); padding:2px 7px; border-radius:10px; font-weight:600;">📌 ตามรอบ</span>`)
        : '';

      const dueLabel = !isOwnerPage ? 'Due Date:' : 'ครบกำหนด:';
      const displayTitle = getDisplayTitle(bill);

      const card = document.createElement('div');
      card.className = `bill-card type-${bill.type}`;
      card.innerHTML = `
        <div class="bill-main-info">
          <div class="bill-left">
            <div class="bill-icon-box type-${bill.type}">${TYPE_ICONS[bill.type] || '📄'}</div>
            <div class="bill-details">
              <h3>${displayTitle}${scheduledBadge}</h3>
              <p>${dueLabel} ${formatDate(bill.dueDate)}</p>
            </div>
          </div>
          <div class="bill-right">
            <div class="bill-amount">${formatCurrency(bill.amount)}</div>
            <span class="bill-status-tag status-${currentStatus}">${statusLabels[currentStatus]}</span>
          </div>
        </div>
        ${bill.note ? `<div class="bill-note">💬 ${bill.note}</div>` : ''}
        <div class="bill-actions">${renderCardButtons(bill, isOwnerPage)}</div>
      `;
      billsList.appendChild(card);
    });

    attachBillCardEvents();
  }

  function renderCardButtons(bill, isOwner) {
    let btns = '';
    if (!isOwner) {
      if (bill.status === 'paid') {
        if (bill.slipImageUrl) btns += `<button class="btn btn-secondary btn-sm btn-view-slip" data-slip="${bill.slipImageUrl}">🔍 View Slip</button>`;
        btns += `<span style="font-size:0.8rem; color:var(--status-paid-text); font-weight:600;">✓ Paid</span>`;
      } else {
        btns += `<button class="btn btn-primary btn-sm btn-pay" data-id="${bill.id}">💳 Submit Payment</button>`;
      }
    } else {
      if (bill.slipImageUrl) btns += `<button class="btn btn-secondary btn-sm btn-view-slip" data-slip="${bill.slipImageUrl}">🔍 ดูสลิป</button>`;
      if (bill.status !== 'paid') btns += `<button class="btn btn-secondary btn-sm btn-mark-paid" data-id="${bill.id}">✅ ทำเป็นจ่ายแล้ว</button>`;
      btns += `<button class="btn btn-secondary btn-sm btn-edit-bill" data-id="${bill.id}">✏️ แก้ไข</button>`;
      btns += `<button class="btn btn-danger btn-sm btn-delete-bill" data-id="${bill.id}">🗑️</button>`;
    }
    return btns;
  }

  function attachBillCardEvents() {
    document.querySelectorAll('.btn-pay').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        activeBillForPay = bills.find(b => b.id === id);
        if (activeBillForPay) {
          const displayTitle = getDisplayTitle(activeBillForPay);
          document.getElementById('payModalTitle').textContent = !isOwnerPage
            ? `Submit Payment: ${displayTitle}`
            : `แจ้งชำระ: ${activeBillForPay.title}`;
          document.getElementById('payModalAmount').textContent = formatCurrency(activeBillForPay.amount);
          slipPreviewContainer.style.display = 'none';
          payModal.classList.add('active');
        }
      });
    });

    document.querySelectorAll('.btn-view-slip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slipUrl = e.currentTarget.getAttribute('data-slip');
        if (slipUrl && lightboxModal) {
          lightboxImg.src = slipUrl;
          lightboxModal.classList.add('active');
        }
      });
    });

    document.querySelectorAll('.btn-mark-paid').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const bill = bills.find(b => b.id === id);
        if (bill) {
          const billData = { ...bill, status: 'paid', paidAt: new Date().toISOString() };
          delete billData.isScheduled;
          await window.dataService.saveBill(billData);
          showToast('อัปเดตสถานะเป็นจ่ายแล้วเรียบร้อย');
          refreshData();
        }
      });
    });

    document.querySelectorAll('.btn-edit-bill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const bill = bills.find(b => b.id === id);
        if (bill && billModal) {
          document.getElementById('billIdInput').value = bill.id;
          document.getElementById('billTypeSelect').value = bill.type;
          document.getElementById('billTitleInput').value = bill.title;
          document.getElementById('billAmountInput').value = bill.amount;
          document.getElementById('billDueDateInput').value = bill.dueDate;
          document.getElementById('billStatusSelect').value = bill.status;
          document.getElementById('billNoteInput').value = bill.note || '';
          document.getElementById('billModalTitle').textContent = 'แก้ไขรายการบิล';
          billModal.classList.add('active');
        }
      });
    });

    document.querySelectorAll('.btn-delete-bill').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('คุณต้องการลบรายการบิลนี้ใช่หรือไม่?')) {
          await window.dataService.deleteBill(id);
          showToast('ลบบิลเรียบร้อยแล้ว');
          refreshData();
        }
      });
    });
  }

  // ─── Copy Bank Button ──────────────────────────────────────────────────────

  if (copyBankBtn) {
    copyBankBtn.addEventListener('click', async () => {
      const settings = await window.dataService.getSettings();
      navigator.clipboard.writeText(settings.bankAccountNo.replace(/-/g, ''));
      showToast(!isOwnerPage ? 'Account number copied!' : 'คัดลอกเลขบัญชีแล้ว!');
    });
  }

  // ─── Pay Modal ─────────────────────────────────────────────────────────────

  if (payForm) {
    slipInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          slipPreviewImg.src = ev.target.result;
          slipPreviewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });

    payForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeBillForPay) return;
      let slipUrl = null;
      if (slipInput.files && slipInput.files[0]) slipUrl = slipPreviewImg.src;

      const billData = {
        ...activeBillForPay,
        status: 'paid',
        paidAt: new Date().toISOString(),
        ...(slipUrl ? { slipImageUrl: slipUrl } : {})
      };
      delete billData.isScheduled;
      await window.dataService.saveBill(billData);

      payModal.classList.remove('active');
      showToast(!isOwnerPage ? 'Payment submitted successfully. Thank you!' : 'แจ้งชำระเงินเรียบร้อยแล้ว ขอบคุณครับ');
      refreshData();
    });
  }

  if (closePayModalBtn) closePayModalBtn.addEventListener('click', () => payModal.classList.remove('active'));
  if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', () => lightboxModal.classList.remove('active'));

  // ─── Owner: Add/Edit Bill Modal ────────────────────────────────────────────

  if (addBillBtn) {
    addBillBtn.addEventListener('click', () => {
      billForm.reset();
      document.getElementById('billIdInput').value = '';
      const year = currentDate.getFullYear();
      const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
      document.getElementById('billDueDateInput').value = `${year}-${monthStr}-15`;
      document.getElementById('billModalTitle').textContent = 'เพิ่มรายการบิลใหม่';
      billModal.classList.add('active');
    });
  }

  if (closeBillModalBtn) closeBillModalBtn.addEventListener('click', () => billModal.classList.remove('active'));

  if (billForm) {
    billForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const billData = {
        id: document.getElementById('billIdInput').value || null,
        type: document.getElementById('billTypeSelect').value,
        title: document.getElementById('billTitleInput').value,
        amount: Number(document.getElementById('billAmountInput').value),
        dueDate: document.getElementById('billDueDateInput').value,
        status: document.getElementById('billStatusSelect').value,
        note: document.getElementById('billNoteInput').value,
        paidAt: null,
        slipImageUrl: null
      };
      await window.dataService.saveBill(billData);
      billModal.classList.remove('active');
      showToast('บันทึกบิลเรียบร้อยแล้ว');
      refreshData();
    });
  }

  // ─── Owner: Auto Generate Monthly Bills ────────────────────────────────────

  if (generateMonthBillsBtn) {
    generateMonthBillsBtn.addEventListener('click', async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      generateMonthBillsBtn.disabled = true;
      generateMonthBillsBtn.textContent = '⏳ กำลังสร้าง...';
      const result = await window.dataService.generateMonthlyBills(year, month);
      generateMonthBillsBtn.disabled = false;
      generateMonthBillsBtn.innerHTML = '⚡ สร้างบิลเดือนนี้อัตโนมัติ';
      showToast(result.message, !result.success && result.count === 0);
      if (result.count > 0) refreshData();
    });
  }

  // ─── Owner: Settings Modal ─────────────────────────────────────────────────

  if (settingsBtn) {
    settingsBtn.addEventListener('click', async () => {
      const settings = await window.dataService.getSettings();
      document.getElementById('settingBankName').value = settings.bankName;
      document.getElementById('settingAccountNo').value = settings.bankAccountNo;
      document.getElementById('settingAccountName').value = settings.bankAccountName;
      const colorVal = settings.bankColor || 'rgb(87, 82, 133)';
      const textInput = document.getElementById('settingBankColor');
      const pickerInput = document.getElementById('settingBankColorPicker');
      if (textInput) textInput.value = colorVal;
      if (pickerInput) {
        if (colorVal.startsWith('#')) pickerInput.value = colorVal;
        else pickerInput.value = '#575285';
      }
      settingsModal.classList.add('active');
    });
  }

  const settingBankColorPicker = document.getElementById('settingBankColorPicker');
  const settingBankColor = document.getElementById('settingBankColor');
  if (settingBankColorPicker && settingBankColor) {
    settingBankColorPicker.addEventListener('input', (e) => {
      settingBankColor.value = e.target.value;
    });
  }

  if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', () => settingsModal.classList.remove('active'));

  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const current = await window.dataService.getSettings();
      const updated = {
        ...current,
        bankName: document.getElementById('settingBankName').value,
        bankAccountNo: document.getElementById('settingAccountNo').value,
        bankAccountName: document.getElementById('settingAccountName').value,
        bankColor: document.getElementById('settingBankColor').value || 'rgb(87, 82, 133)'
      };
      await window.dataService.saveSettings(updated);
      settingsModal.classList.remove('active');
      await loadBankSettings();
      showToast('บันทึกข้อมูลการตั้งค่าเรียบร้อย');
    });
  }

  // ─── Owner: Recurring Templates Modal ─────────────────────────────────────

  async function loadAndRenderTemplates() {
    recurringTemplates = await window.dataService.getRecurringTemplates();
    renderRecurringList();
  }

  function renderRecurringList() {
    const container = document.getElementById('recurringTemplatesList');
    if (!container) return;
    container.innerHTML = '';

    if (recurringTemplates.length === 0) {
      container.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:0.85rem; padding:20px 0;">ยังไม่มีรายการประจำ</p>`;
      return;
    }

    recurringTemplates
      .slice()
      .sort((a, b) => (a.dayOfMonth || 1) - (b.dayOfMonth || 1))
      .forEach(tmpl => {
        const freqLabel = FREQ_LABELS[tmpl.frequency] || tmpl.frequency;
        const anchorLabel = tmpl.frequency !== 'monthly'
          ? ` (เริ่ม${THAI_MONTHS_SHORT[(Number(tmpl.anchorMonth) || 1) - 1]})` : '';

        const item = document.createElement('div');
        item.style.cssText = `
          background: var(--bg-card-subtle);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 10px;
          border-left: 4px solid ${getTypeColor(tmpl.type)};
          opacity: ${tmpl.enabled ? 1 : 0.5};
        `;
        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px; flex-wrap:wrap;">
                <span>${TYPE_ICONS[tmpl.type] || '📄'}</span>
                <strong style="font-size:0.9rem;">${tmpl.title}</strong>
                ${!tmpl.enabled ? '<span style="font-size:0.7rem; background:#ef4444; color:white; padding:1px 6px; border-radius:8px;">ปิด</span>' : ''}
              </div>
              <div style="font-size:0.8rem; color:var(--text-secondary);">
                ฿${Number(tmpl.amount).toLocaleString()} · วันที่ ${tmpl.dayOfMonth} · ${freqLabel}${anchorLabel}
              </div>
              ${tmpl.note ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">💬 ${tmpl.note}</div>` : ''}
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0; align-items:flex-start;">
              <button class="btn btn-secondary btn-sm btn-edit-tmpl" data-id="${tmpl.id}" style="padding:4px 10px; font-size:0.8rem;">✏️</button>
              <button class="btn btn-danger btn-sm btn-delete-tmpl" data-id="${tmpl.id}" style="padding:4px 10px; font-size:0.8rem;">🗑️</button>
            </div>
          </div>
        `;
        container.appendChild(item);
      });

    container.querySelectorAll('.btn-edit-tmpl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const tmpl = recurringTemplates.find(t => t.id === id);
        if (tmpl) openRecurringForm(tmpl);
      });
    });

    container.querySelectorAll('.btn-delete-tmpl').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const tmpl = recurringTemplates.find(t => t.id === id);
        if (confirm(`ลบรายการ "${tmpl ? tmpl.title : id}" ออกจากรายการประจำ?`)) {
          await window.dataService.deleteRecurringTemplate(id);
          await loadAndRenderTemplates();
          refreshData();
          showToast('ลบรายการประจำเรียบร้อยแล้ว');
        }
      });
    });
  }

  function getTypeColor(type) {
    const colors = {
      rent: '#6366F1', common_fee: '#06B6D4', electricity: '#F59E0B',
      internet: '#10B981', pool_cleaning: '#EC4899', garbage: '#78716C', other: '#94A3B8'
    };
    return colors[type] || '#94A3B8';
  }

  function openRecurringForm(tmpl = null) {
    if (!recurringListView || !recurringFormView) return;
    recurringListView.style.display = 'none';
    recurringFormView.style.display = 'block';

    document.getElementById('recurringFormTitle').textContent =
      tmpl ? 'แก้ไขรายการประจำ' : 'เพิ่มรายการประจำใหม่';

    if (tmpl) {
      document.getElementById('recurringTmplId').value = tmpl.id;
      document.getElementById('recurringTmplType').value = tmpl.type;
      document.getElementById('recurringTmplTitle').value = tmpl.title;
      document.getElementById('recurringTmplAmount').value = tmpl.amount;
      document.getElementById('recurringTmplDay').value = tmpl.dayOfMonth;
      document.getElementById('recurringTmplFrequency').value = tmpl.frequency;
      document.getElementById('recurringTmplAnchorMonth').value = tmpl.anchorMonth || 1;
      document.getElementById('recurringTmplNote').value = tmpl.note || '';
      document.getElementById('recurringTmplEnabled').checked = tmpl.enabled !== false;
    } else {
      recurringTemplateForm.reset();
      document.getElementById('recurringTmplId').value = '';
      document.getElementById('recurringTmplEnabled').checked = true;
    }
    updateAnchorVisibility();
  }

  function updateAnchorVisibility() {
    if (!recurringTmplFrequency || !anchorMonthGroup) return;
    anchorMonthGroup.style.display = recurringTmplFrequency.value !== 'monthly' ? 'block' : 'none';
  }

  if (recurringBtn) {
    recurringBtn.addEventListener('click', async () => {
      await loadAndRenderTemplates();
      if (recurringListView) recurringListView.style.display = 'block';
      if (recurringFormView) recurringFormView.style.display = 'none';
      if (recurringModal) recurringModal.classList.add('active');
    });
  }

  if (closeRecurringModalBtn) {
    closeRecurringModalBtn.addEventListener('click', () => recurringModal && recurringModal.classList.remove('active'));
  }

  if (addRecurringBtn) {
    addRecurringBtn.addEventListener('click', () => openRecurringForm(null));
  }

  if (backToRecurringListBtn) {
    backToRecurringListBtn.addEventListener('click', async () => {
      await loadAndRenderTemplates();
      if (recurringListView) recurringListView.style.display = 'block';
      if (recurringFormView) recurringFormView.style.display = 'none';
    });
  }

  if (recurringTmplFrequency) {
    recurringTmplFrequency.addEventListener('change', updateAnchorVisibility);
  }

  if (recurringTemplateForm) {
    recurringTemplateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tmpl = {
        id: document.getElementById('recurringTmplId').value || null,
        type: document.getElementById('recurringTmplType').value,
        title: document.getElementById('recurringTmplTitle').value,
        amount: Number(document.getElementById('recurringTmplAmount').value),
        dayOfMonth: Number(document.getElementById('recurringTmplDay').value),
        frequency: document.getElementById('recurringTmplFrequency').value,
        anchorMonth: Number(document.getElementById('recurringTmplAnchorMonth').value),
        note: document.getElementById('recurringTmplNote').value,
        enabled: document.getElementById('recurringTmplEnabled').checked
      };
      await window.dataService.saveRecurringTemplate(tmpl);
      await loadAndRenderTemplates();
      if (recurringListView) recurringListView.style.display = 'block';
      if (recurringFormView) recurringFormView.style.display = 'none';
      refreshData();
      showToast('บันทึกรายการประจำเรียบร้อยแล้ว');
    });
  }

  // ─── Initialize ────────────────────────────────────────────────────────────

  loadBankSettings();
  updateMonthHeader();
  refreshData();

  // ─── Firestore Real-Time Listeners ─────────────────────────────────────────

  if (window.dataService && window.dataService.db) {
    try {
      // Live bills sync
      window.dataService.db.collection('bills').onSnapshot(() => {
        refreshData();
      });

      // Live bank settings sync
      window.dataService.db.collection('settings').doc('bank').onSnapshot(doc => {
        if (doc && doc.exists) {
          const settings = doc.data();
          if (bankNameEl) bankNameEl.textContent = settings.bankName;
          if (bankAccountNoEl) bankAccountNoEl.textContent = settings.bankAccountNo;
          if (bankAccountNameEl) bankAccountNameEl.textContent = settings.bankAccountName;
          const bankIconEl = document.getElementById('bankIcon');
          if (bankIconEl) bankIconEl.style.backgroundColor = settings.bankColor || 'rgb(87, 82, 133)';
        }
      });

      // Live recurring templates sync
      window.dataService.db.collection('recurringTemplates').onSnapshot(() => {
        refreshData();
        if (isOwnerPage && recurringModal && recurringModal.classList.contains('active') && recurringListView && recurringListView.style.display !== 'none') {
          loadAndRenderTemplates();
        }
      });

    } catch (e) {
      console.warn('Firestore realtime listener error:', e);
    }
  }
});
