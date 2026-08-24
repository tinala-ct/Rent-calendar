/**
 * Rent Tracker Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const isOwnerPage = window.location.pathname.includes('owner-x7k2');
  
  // State
  let currentDate = new Date(2026, 7, 1); // Default Aug 2026 as per spec
  let bills = [];
  let selectedDate = null;
  let activeBillForPay = null;

  // DOM Elements
  const monthYearLabel = document.getElementById('monthYearLabel');
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  const calendarGrid = document.getElementById('calendarGrid');
  const billsList = document.getElementById('billsList');

  // Summary Elements
  const summaryTotalAmount = document.getElementById('summaryTotalAmount');
  const summaryPaidAmount = document.getElementById('summaryPaidAmount');
  const summaryProgressBar = document.getElementById('summaryProgressBar');
  const summaryStatPaid = document.getElementById('summaryStatPaid');
  const summaryStatPending = document.getElementById('summaryStatPending');

  // Bank Info Elements (Tenant)
  const bankNameEl = document.getElementById('bankName');
  const bankAccountNoEl = document.getElementById('bankAccountNo');
  const bankAccountNameEl = document.getElementById('bankAccountName');
  const copyBankBtn = document.getElementById('copyBankBtn');

  // Modals
  const payModal = document.getElementById('payModal');
  const closePayModalBtn = document.getElementById('closePayModalBtn');
  const payForm = document.getElementById('payForm');
  const slipInput = document.getElementById('slipInput');
  const slipPreviewContainer = document.getElementById('slipPreviewContainer');
  const slipPreviewImg = document.getElementById('slipPreviewImg');

  // Lightbox Modal
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');

  // Owner Modals & Buttons
  const addBillBtn = document.getElementById('addBillBtn');
  const generateMonthBillsBtn = document.getElementById('generateMonthBillsBtn');
  const settingsBtn = document.getElementById('settingsBtn');

  const billModal = document.getElementById('billModal');
  const closeBillModalBtn = document.getElementById('closeBillModalBtn');
  const billForm = document.getElementById('billForm');

  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
  const settingsForm = document.getElementById('settingsForm');

  const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const TYPE_NAMES = {
    rent: 'ค่าเช่า',
    common_fee: 'ค่าส่วนกลาง',
    electricity: 'ค่าไฟฟ้า',
    internet: 'ค่าอินเทอร์เน็ต',
    pool_cleaning: 'ค่าทำสระว่ายน้ำ'
  };

  const TYPE_ICONS = {
    rent: '🏠',
    common_fee: '🏢',
    electricity: '⚡',
    internet: '🌐',
    pool_cleaning: '🏊'
  };

  // Helper Toast
  window.showToast = function(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✅</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  };

  // Format Currency
  function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount);
  }

  // Load Bank Settings
  async function loadBankSettings() {
    const settings = await window.dataService.getSettings();
    if (bankNameEl) bankNameEl.textContent = settings.bankName;
    if (bankAccountNoEl) bankAccountNoEl.textContent = settings.bankAccountNo;
    if (bankAccountNameEl) bankAccountNameEl.textContent = settings.bankAccountName;
  }

  // Render Header Month
  function updateMonthHeader() {
    const month = currentDate.getMonth();
    const yearStr = (currentDate.getFullYear() + 543); // Thai BE year
    monthYearLabel.textContent = `${THAI_MONTHS[month]} ${yearStr}`;
  }

  // Refresh All UI
  async function refreshData() {
    bills = await window.dataService.getBills();
    renderSummary();
    renderCalendar();
    renderBillsList();
  }

  // Calculate & Render Summary
  function renderSummary() {
    const year = currentDate.getFullYear();
    const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;

    const monthBills = bills.filter(b => b.dueDate.startsWith(prefix));
    
    const total = monthBills.reduce((sum, b) => sum + Number(b.amount), 0);
    const paid = monthBills.filter(b => b.status === 'paid').reduce((sum, b) => sum + Number(b.amount), 0);
    const pendingCount = monthBills.filter(b => b.status !== 'paid').length;
    const paidCount = monthBills.filter(b => b.status === 'paid').length;

    if (summaryTotalAmount) summaryTotalAmount.textContent = formatCurrency(total);
    if (summaryPaidAmount) summaryPaidAmount.textContent = formatCurrency(paid);
    
    if (summaryProgressBar) {
      const percentage = total > 0 ? (paid / total) * 100 : 0;
      summaryProgressBar.style.width = `${percentage}%`;
    }

    if (summaryStatPaid) summaryStatPaid.textContent = `${paidCount} รายการ`;
    if (summaryStatPending) summaryStatPending.textContent = `${pendingCount} รายการ`;
  }

  // Render Calendar Grid
  function renderCalendar() {
    if (!calendarGrid) return;
    calendarGrid.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDateOfMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Previous Month Fillers
    for (let x = firstDayIndex; x > 0; x--) {
      const dayNum = prevMonthLastDate - x + 1;
      const cell = document.createElement('div');
      cell.className = 'calendar-cell other-month';
      cell.innerHTML = `<span class="calendar-date-number">${dayNum}</span>`;
      calendarGrid.appendChild(cell);
    }

    // Current Month Days
    for (let day = 1; day <= lastDateOfMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(month + 1).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;

      const cell = document.createElement('div');
      cell.className = 'calendar-cell';
      if (dateKey === todayStr) cell.classList.add('today');
      if (selectedDate === dateKey) cell.classList.add('selected');

      cell.innerHTML = `<span class="calendar-date-number">${day}</span>`;

      // Filter bills on this day
      const dayBills = bills.filter(b => b.dueDate === dateKey);

      if (dayBills.length > 0) {
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'calendar-dots';

        dayBills.forEach(b => {
          const dot = document.createElement('div');
          let dotClass = `dot dot-${b.type.replace('_cleaning', '').replace('_fee', '')}`;
          if (b.status === 'paid') dotClass += ' dot-paid';
          dot.className = dotClass;
          dot.title = `${b.title} (${b.amount} บ.)`;
          dotsContainer.appendChild(dot);
        });

        cell.appendChild(dotsContainer);
      }

      cell.addEventListener('click', () => {
        if (selectedDate === dateKey) {
          selectedDate = null; // Toggle filter off
        } else {
          selectedDate = dateKey;
        }
        renderCalendar();
        renderBillsList();
      });

      calendarGrid.appendChild(cell);
    }
  }

  // Render Bills Cards List
  function renderBillsList() {
    if (!billsList) return;
    billsList.innerHTML = '';

    const year = currentDate.getFullYear();
    const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');

    let displayBills = bills.filter(b => b.dueDate.startsWith(`${year}-${monthStr}`));

    // If date selected on calendar, filter by date
    if (selectedDate) {
      displayBills = displayBills.filter(b => b.dueDate === selectedDate);
    }

    // Sort by Due Date asc
    displayBills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    if (displayBills.length === 0) {
      billsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>${selectedDate ? 'ไม่มีบิลที่ต้องชำระในวันนี้' : 'ไม่มีรายการบิลในเดือนนี้'}</p>
        </div>
      `;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    displayBills.forEach(bill => {
      // Determine status auto if pending but past due date
      let currentStatus = bill.status;
      if (currentStatus === 'pending' && bill.dueDate < todayStr) {
        currentStatus = 'overdue';
      }

      const statusLabels = {
        paid: 'จ่ายแล้ว',
        pending: 'รอชำระ',
        overdue: 'เกินกำหนด'
      };

      const card = document.createElement('div');
      card.className = `bill-card type-${bill.type}`;
      card.innerHTML = `
        <div class="bill-main-info">
          <div class="bill-left">
            <div class="bill-icon-box type-${bill.type}">
              ${TYPE_ICONS[bill.type] || '📄'}
            </div>
            <div class="bill-details">
              <h3>${bill.title}</h3>
              <p>ครบกำหนด: ${formatThaiDate(bill.dueDate)}</p>
            </div>
          </div>
          <div class="bill-right">
            <div class="bill-amount">${formatCurrency(bill.amount)}</div>
            <span class="bill-status-tag status-${currentStatus}">${statusLabels[currentStatus]}</span>
          </div>
        </div>

        ${bill.note ? `<div class="bill-note">💬 ${bill.note}</div>` : ''}

        <div class="bill-actions">
          ${renderCardButtons(bill, isOwnerPage)}
        </div>
      `;

      billsList.appendChild(card);
    });

    attachBillCardEvents();
  }

  function formatThaiDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[0], 10) + 543;
    return `${day} ${THAI_MONTHS[month]} ${year}`;
  }

  function renderCardButtons(bill, isOwner) {
    let btns = '';

    if (!isOwner) {
      // Tenant view
      if (bill.status === 'paid') {
        if (bill.slipImageUrl) {
          btns += `<button class="btn btn-secondary btn-sm btn-view-slip" data-slip="${bill.slipImageUrl}">🔍 ดูสลิป</button>`;
        }
        btns += `<span style="font-size:0.8rem; color:var(--status-paid-text); font-weight:600;">✓ ชำระแล้ว</span>`;
      } else {
        btns += `<button class="btn btn-primary btn-sm btn-pay" data-id="${bill.id}">💳 แจ้งชำระเงิน</button>`;
      }
    } else {
      // Owner view
      if (bill.slipImageUrl) {
        btns += `<button class="btn btn-secondary btn-sm btn-view-slip" data-slip="${bill.slipImageUrl}">🔍 ดูสลิป</button>`;
      }

      if (bill.status !== 'paid') {
        btns += `<button class="btn btn-secondary btn-sm btn-mark-paid" data-id="${bill.id}">✅ ทำเป็นจ่ายแล้ว</button>`;
      }

      btns += `<button class="btn btn-secondary btn-sm btn-edit-bill" data-id="${bill.id}">✏️ แก้ไข</button>`;
      btns += `<button class="btn btn-danger btn-sm btn-delete-bill" data-id="${bill.id}">🗑️</button>`;
    }

    return btns;
  }

  function attachBillCardEvents() {
    // Pay button
    document.querySelectorAll('.btn-pay').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        activeBillForPay = bills.find(b => b.id === id);
        if (activeBillForPay) {
          document.getElementById('payModalTitle').textContent = `แจ้งชำระ: ${activeBillForPay.title}`;
          document.getElementById('payModalAmount').textContent = formatCurrency(activeBillForPay.amount);
          slipPreviewContainer.style.display = 'none';
          payModal.classList.add('active');
        }
      });
    });

    // View slip
    document.querySelectorAll('.btn-view-slip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slipUrl = e.currentTarget.getAttribute('data-slip');
        if (slipUrl && lightboxModal) {
          lightboxImg.src = slipUrl;
          lightboxModal.classList.add('active');
        }
      });
    });

    // Owner actions: Mark paid
    document.querySelectorAll('.btn-mark-paid').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        await window.dataService.updateBillStatus(id, 'paid');
        showToast('อัปเดตสถานะเป็นจ่ายแล้วเรียบร้อย');
        refreshData();
      });
    });

    // Owner actions: Edit bill
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

    // Owner actions: Delete bill
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

  // Copy Bank Account Button
  if (copyBankBtn) {
    copyBankBtn.addEventListener('click', () => {
      const settings = window.dataService.getSettings();
      navigator.clipboard.writeText(settings.bankAccountNo.replace(/-/g, ''));
      showToast('คัดลอกเลขบัญชีแล้ว!');
    });
  }

  // Month Navigation
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

  // Pay Form Submit (Tenant)
  if (payForm) {
    slipInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          slipPreviewImg.src = event.target.result;
          slipPreviewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });

    payForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeBillForPay) return;

      let slipUrl = null;
      if (slipInput.files && slipInput.files[0]) {
        // Convert image to DataURL Base64 for instant storage
        slipUrl = slipPreviewImg.src;
      }

      await window.dataService.updateBillStatus(activeBillForPay.id, 'paid', slipUrl);
      payModal.classList.remove('active');
      showToast('แจ้งชำระเงินเรียบร้อยแล้ว ขอบคุณครับ');
      refreshData();
    });
  }

  // Modals Close handlers
  if (closePayModalBtn) {
    closePayModalBtn.addEventListener('click', () => payModal.classList.remove('active'));
  }
  if (closeLightboxBtn) {
    closeLightboxBtn.addEventListener('click', () => lightboxModal.classList.remove('active'));
  }

  // Owner Handlers: Add Bill Modal
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

  if (closeBillModalBtn) {
    closeBillModalBtn.addEventListener('click', () => billModal.classList.remove('active'));
  }

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
        note: document.getElementById('billNoteInput').value
      };

      await window.dataService.saveBill(billData);
      billModal.classList.remove('active');
      showToast('บันทึกบิลเรียบร้อยแล้ว');
      refreshData();
    });
  }

  // Owner Handlers: Auto Generate Monthly Bills
  if (generateMonthBillsBtn) {
    generateMonthBillsBtn.addEventListener('click', async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const result = await window.dataService.generateMonthlyBills(year, month);
      if (result.success) {
        showToast(`สร้างบิลประจำเดือน ${month}/${year} (${result.count} รายการ) สำเร็จ`);
        refreshData();
      } else {
        alert(result.message);
      }
    });
  }

  // Owner Handlers: Settings Modal
  if (settingsBtn) {
    settingsBtn.addEventListener('click', async () => {
      const settings = await window.dataService.getSettings();
      document.getElementById('settingBankName').value = settings.bankName;
      document.getElementById('settingAccountNo').value = settings.bankAccountNo;
      document.getElementById('settingAccountName').value = settings.bankAccountName;
      settingsModal.classList.add('active');
    });
  }

  if (closeSettingsModalBtn) {
    closeSettingsModalBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
  }

  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const current = await window.dataService.getSettings();
      const updated = {
        ...current,
        bankName: document.getElementById('settingBankName').value,
        bankAccountNo: document.getElementById('settingAccountNo').value,
        bankAccountName: document.getElementById('settingAccountName').value
      };
      await window.dataService.saveSettings(updated);
      settingsModal.classList.remove('active');
      await loadBankSettings();
      showToast('บันทึกข้อมูลการตั้งค่าเรียบร้อย');
    });
  }

  // Initialize App & Realtime Cloud Sync
  loadBankSettings();
  updateMonthHeader();
  refreshData();

  // Listen for live real-time cloud changes from Firestore
  if (window.dataService && window.dataService.db) {
    try {
      window.dataService.db.collection('bills').onSnapshot(snapshot => {
        if (!snapshot.empty) {
          const cloudBills = [];
          snapshot.forEach(doc => cloudBills.push({ id: doc.id, ...doc.data() }));
          bills = cloudBills;
          localStorage.setItem(window.dataService.storageKey, JSON.stringify(cloudBills));
          renderSummary();
          renderCalendar();
          renderBillsList();
        }
      });

      // Listen for bank settings realtime updates across all devices
      window.dataService.db.collection('settings').doc('bank').onSnapshot(doc => {
        if (doc && doc.exists) {
          const settings = doc.data();
          if (bankNameEl) bankNameEl.textContent = settings.bankName;
          if (bankAccountNoEl) bankAccountNoEl.textContent = settings.bankAccountNo;
          if (bankAccountNameEl) bankAccountNameEl.textContent = settings.bankAccountName;
        }
      });
    } catch(e) {
      console.warn('Firestore realtime listener error:', e);
    }
  }
});
