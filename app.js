/**
 * Daily Production Logger
 * Powered by Node.js & MongoDB Backend
 * - Multi-device synchronization (Phones, Tablets, Admin PC)
 * - Custom Admin Account Creation
 * - Empty starter records
 * - Quantity supports kg, g, numbers, or text units
 */

(function () {
  'use strict';

  // Backend API URL
  const API_BASE = '/api';

  // Local Storage Keys
  const STORAGE_KEY = 'factory_prod_logs_v3';
  const ADMIN_CREDS_KEY = 'factory_prod_admin_creds_v3';
  const ADMIN_SESSION_KEY = 'factory_prod_admin_session_v3';
  const LAST_WORKER_KEY = 'factory_last_worker_name_v3';
  const LANG_KEY = 'factory_prod_lang_v1';
  const THEME_KEY = 'factory_prod_theme_v1';

  // Translations Dictionary
  const I18N = {
    en: {
      langBtn: 'العربية',
      themeDark: 'Dark',
      themeLight: 'Light',
      headerTitle: 'Production Logger',
      switchRole: '← Switch Role',
      landingTitle: 'Daily Production Logger',
      landingSubtitle: 'Fast and straightforward shop-floor logging. Select an option to proceed.',
      cardWorkerTitle: 'Worker Portal',
      cardWorkerDesc: 'No password required. Type your name, product, quantity (with kg/g), and log.',
      cardWorkerAction: 'Open Worker Portal →',
      cardAdminTitle: 'Admin Portal',
      cardAdminDesc: 'Manage, filter, search, and export all recorded logs.',
      cardAdminAction: 'Admin Sign In →',
      
      workerHeaderTitle: 'Worker Production Log',
      workerHeaderDesc: 'Fill in the fields below and submit your output.',
      workerSwitchRole: 'Switch Role',
      lblWorkerName: 'Your Name *',
      placeholderWorkerName: 'Type your name',
      lblTaskName: 'Task or Product Produced *',
      placeholderTaskName: 'What did you produce? (e.g. Kneading, Sealing, Concentration)',
      lblQtyName: 'Quantity Produced *',
      lblQtyTip: 'You can write units like <strong>25 kg</strong> or <strong>500 g</strong>',
      placeholderQty: 'e.g. 50 kg, 750 g, or 100',
      lblClockTitle: '🕒 Exact Clock Time:',
      clockBadgeAuto: 'Auto-captured on submit',
      btnSubmit: '✓ SUBMIT PRODUCTION RECORD',
      workerRecentTitle: 'Recent Production Logs',
      recordsCount: (n) => `Showing latest ${n} logs`,
      zeroRecords: '0 records',
      thTime: 'Time',
      thWorker: 'Worker Name',
      thTask: 'Product / Task',
      thQty: 'Quantity',
      thStatus: 'Action',
      statusRecorded: 'Recorded',
      workerEmpty: 'No production records logged yet. Fill out the form above to record your output.',
      
      adminAuthTitle: 'Admin Access',
      adminAuthSubtitle: 'Please authenticate to continue.',
      adminSetupTitle: 'Create Admin Account',
      adminSetupSubtitle: 'Set your admin username and password.',
      adminLoginTitle: 'Admin Sign In',
      adminLoginSubtitle: 'Enter your username and password to continue.',
      adminChangeTitle: 'Change Admin Credentials',
      adminChangeSubtitle: 'Enter your new username and password.',
      adminSetupTip: 'Set your desired admin username and password below.',
      lblAdminUser: 'Username',
      placeholderAdminUser: 'Enter username',
      lblAdminPass: 'Password',
      placeholderAdminPass: 'Enter password',
      btnAdminSignIn: 'Sign In to Dashboard',
      btnResetCreds: 'Create New / Change Admin Credentials',
      lblSetupUser: 'Choose Username',
      placeholderSetupUser: 'e.g. manager',
      lblSetupPass: 'Choose Password',
      lblSetupConfirm: 'Confirm Password',
      btnSetupSave: 'Save & Open Admin Dashboard',
      btnCancel: 'Cancel',
      btnBackSelect: '← Back to Role Select',
      adminLoginError: 'Incorrect username or password.',
      adminSetupErrorEmpty: 'Please fill in both username and password.',
      adminSetupErrorMatch: 'Passwords do not match.',
      
      adminDashTitle: 'Admin Dashboard',
      adminWelcome: (u) => `Logged in as: ${u}`,
      btnChangeCreds: 'Change Credentials',
      btnExportExcel: '📊 Formatted Excel Sheet',
      btnExportCsv: '📄 Raw CSV File',
      btnPrintReport: '🖨️ Print / PDF Report',
      btnSignOut: 'Sign Out',
      statLogs: 'Total Submissions Logged',
      statWorkers: 'Active Workers',
      filterHeader: 'Search & Filter',
      btnClearFilters: 'Clear Filters',
      lblFWorker: 'Filter by Worker Name',
      placeholderFWorker: 'Type worker name...',
      lblFTask: 'Filter by Task / Product',
      placeholderFTask: 'Type task or product...',
      lblFDate: 'Filter by Date',
      adminTableTitle: 'All Production Logs',
      adminFilterSummary: (shown, total) => `Showing ${shown} of ${total} total logs`,
      thDate: 'Date',
      thAction: 'Action',
      btnDelete: 'Delete',
      adminEmpty: 'No production logs have been submitted yet.',
      adminFilterEmpty: 'No records match your search filter.',
      confirmDelete: (w, q, t) => `Delete log for "${w}" (${q} of ${t})?`,
      footerText: 'VG Production Logger • Clean & Simple',
      
      toastLogged: (q, t, w) => `✓ Logged: ${q} of "${t}" for ${w}!`,
      toastDeleted: 'Record deleted',
      toastExported: (n) => `Exported ${n} records to CSV`,
      toastAdminLoggedIn: 'Admin logged in',
      toastAdminLoggedOut: 'Signed out of Admin',
      toastAdminCreated: 'Admin account created successfully!'
    },

    ar: {
      langBtn: 'English',
      themeDark: 'الداكن',
      themeLight: 'الفاتح',
      headerTitle: 'مسجّل الإنتاج اليومي',
      switchRole: '← تبديل الدور',
      landingTitle: 'مسجّل الإنتاج اليومي للمصنع',
      landingSubtitle: 'تسجيل سريع ومباشر للإنتاج في صالة العمل. اختر البوابة للمتابعة.',
      cardWorkerTitle: 'بوابة العمال',
      cardWorkerDesc: 'بدون كلمة مرور. اكتب اسمك، المنتج، الكمية (كجم/جرام)، وسجّل فوراً.',
      cardWorkerAction: 'دخول بوابة العمال ←',
      cardAdminTitle: 'بوابة الإدارة',
      cardAdminDesc: 'إدارة، تصفية، بحث، وتصدير جميع سجلات الإنتاج.',
      cardAdminAction: 'تسجيل دخول المشرفين ←',

      workerHeaderTitle: 'تسجيل إنتاج العامل',
      workerHeaderDesc: 'املأ البيانات التالية واضغط على زر التسجيل.',
      workerSwitchRole: 'تغيير الدور',
      lblWorkerName: 'اسم العامل *',
      placeholderWorkerName: 'اكتب اسمك هنا',
      lblTaskName: 'المهمة أو المنتج المنجز *',
      placeholderTaskName: 'ماذا أنتجت؟ (مثال: عجن، تقفيل، تركيز)',
      lblQtyName: 'الكمية المنجزة *',
      lblQtyTip: 'يمكنك كتابة وحدات مثل <strong>25 كجم</strong> أو <strong>500 جرام</strong>',
      placeholderQty: 'مثال: 50 كجم، 750 جرام، أو 100',
      lblClockTitle: '🕒 وقت الإنجاز الدقيق:',
      clockBadgeAuto: 'يُحفظ تلقائياً فور الإرسال',
      btnSubmit: '✓ تسجيل وحفظ بيانات الإنتاج',
      workerRecentTitle: 'سجلات الإنتاج الأخيرة',
      recordsCount: (n) => `عرض آخر ${n} سجلات`,
      zeroRecords: '0 سجلات',
      thTime: 'الوقت',
      thWorker: 'اسم العامل',
      thTask: 'المنتج / المهمة',
      thQty: 'الكمية',
      thStatus: 'الإجراء / حذف',
      statusRecorded: 'تم التسجيل',
      workerEmpty: 'لم يتم تسجيل أي إنتاج بعد. املأ النموذج أعلاه للبدء.',

      adminAuthTitle: 'صلاحيات المشرف',
      adminAuthSubtitle: 'يرجى تسجيل الدخول للمتابعة.',
      adminSetupTitle: 'إنشاء حساب المشرف',
      adminSetupSubtitle: 'حدد اسم المستخدم وكلمة المرور الخاصة بك.',
      adminLoginTitle: 'تسجيل دخول المشرف',
      adminLoginSubtitle: 'أدخل اسم المستخدم وكلمة المرور للمتابعة.',
      adminChangeTitle: 'تغيير بيانات المشرف',
      adminChangeSubtitle: 'أدخل اسم المستخدم وكلمة المرور الجديدة.',
      adminSetupTip: 'حدد اسم المستخدم وكلمة المرور التي تناسبك أدناه.',
      lblAdminUser: 'اسم المستخدم',
      placeholderAdminUser: 'أدخل اسم المستخدم',
      lblAdminPass: 'كلمة المرور',
      placeholderAdminPass: 'أدخل كلمة المرور',
      btnAdminSignIn: 'دخول لوحة التحكم',
      btnResetCreds: 'إنشاء حساب جديد / تغيير بيانات المشرف',
      lblSetupUser: 'اختر اسم المستخدم',
      placeholderSetupUser: 'مثال: مشرف',
      lblSetupPass: 'اختر كلمة المرور',
      lblSetupConfirm: 'تأكيد كلمة المرور',
      btnSetupSave: 'حفظ ودخول لوحة المشرف',
      btnCancel: 'إلغاء',
      btnBackSelect: '← العودة لاختيار الدور',
      adminLoginError: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
      adminSetupErrorEmpty: 'يرجى كتابة اسم المستخدم وكلمة المرور.',
      adminSetupErrorMatch: 'كلمتا المرور غير متطابقتين.',

      adminDashTitle: 'لوحة تحكم المشرف',
      adminWelcome: (u) => `تم الدخول بحساب: ${u}`,
      btnChangeCreds: 'تغيير بيانات الدخول',
      btnExportExcel: '📊 شيت إكسل منسق (Excel)',
      btnExportCsv: '📄 ملف CSV عادي',
      btnPrintReport: '🖨️ طباعة تقرير PDF',
      btnSignOut: 'تسجيل الخروج',
      statLogs: 'إجمالي السجلات المسجلة',
      statWorkers: 'عدد العمال النشطين',
      filterHeader: 'البحث والتصفية',
      btnClearFilters: 'مسح التصفية',
      lblFWorker: 'تصفية حسب اسم العامل',
      placeholderFWorker: 'اكتب اسم العامل...',
      lblFTask: 'تصفية حسب المهمة أو المنتج',
      placeholderFTask: 'اكتب المهمة أو المنتج...',
      lblFDate: 'تصفية حسب التاريخ',
      adminTableTitle: 'جميع سجلات الإنتاج',
      adminFilterSummary: (shown, total) => `عرض ${shown} من أصل ${total} سجل`,
      thDate: 'التاريخ',
      thAction: 'الإجراء',
      btnDelete: 'حذف',
      adminEmpty: 'لم يتم إرسال أي سجلات إنتاج حتى الآن.',
      adminFilterEmpty: 'لا توجد نتائج مطابقة لخيارات البحث والتصفية.',
      confirmDelete: (w, q, t) => `هل أنت متأكد من حذف سجل "${w}" (${q} من ${t})؟`,
      footerText: 'مسجّل إنتاج المصنع • VG Production Logger',

      toastLogged: (q, t, w) => `✓ تم تسجيل: ${q} من "${t}" للعامل ${w}!`,
      toastDeleted: 'تم حذف السجل',
      toastExported: (n) => `تم تصدير ${n} سجل إلى ملف CSV`,
      toastAdminLoggedIn: 'تم تسجيل دخول المشرف',
      toastAdminLoggedOut: 'تم تسجيل الخروج',
      toastAdminCreated: 'تم إنشاء حساب المشرف بنجاح!'
    }
  };

  // State
  let currentLang = 'ar';
  let currentTheme = 'light';
  let records = [];
  let adminCreds = null;
  let isAdminLoggedIn = false;

  // Date/Time Helpers
  function getTodayDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getExactTimeString(date = new Date()) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  // Load Data: Backend API first, fallback to LocalStorage
  async function loadData() {
    try {
      const savedLang = localStorage.getItem(LANG_KEY);
      currentLang = (savedLang === 'en' || savedLang === 'ar') ? savedLang : 'ar';

      const savedTheme = localStorage.getItem(THEME_KEY);
      currentTheme = (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';

      const savedCreds = localStorage.getItem(ADMIN_CREDS_KEY);
      adminCreds = savedCreds ? JSON.parse(savedCreds) : null;

      isAdminLoggedIn = sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';

      // Load local records initially
      const savedRecords = localStorage.getItem(STORAGE_KEY);
      records = savedRecords ? JSON.parse(savedRecords) : [];

      await Promise.all([fetchServerRecords(), fetchAdminStatus()]);

      // Periodic auto-sync every 5 seconds for multi-device sync
      setInterval(fetchServerRecords, 5000);
    } catch (e) {
      console.error('Error during loadData:', e);
    }
  }

  async function fetchServerRecords() {
    try {
      const res = await fetch(`${API_BASE}/logs`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          records = data;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
          renderWorkerTable();
          if (isAdminLoggedIn) renderAdminDashboard();
        }
      }
    } catch (err) {
      console.warn('Backend unavailable, using cached records:', err);
    }
  }

  async function fetchAdminStatus() {
    try {
      const res = await fetch(`${API_BASE}/admin/config`);
      if (res.ok) {
        const data = await res.json();
        if (data.configured) {
          adminCreds = { username: data.username };
          localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(adminCreds));
        } else {
          adminCreds = null;
          localStorage.removeItem(ADMIN_CREDS_KEY);
        }
      }
    } catch (err) {
      console.warn('Could not fetch admin config from backend:', err);
    }
  }

  function saveRecordsLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Error saving records locally:', e);
    }
  }

  async function saveAdminCreds(username, password) {
    adminCreds = { username };
    localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(adminCreds));

    try {
      const res = await fetch(`${API_BASE}/admin/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        throw new Error('Failed to save admin credentials to backend');
      }
    } catch (err) {
      console.warn('Could not sync admin creds to backend:', err);
    }
  }

  // Theme Management
  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem(THEME_KEY, theme);

    const root = document.documentElement;
    const iconEl = document.getElementById('theme-btn-icon');
    const labelEl = document.getElementById('theme-btn-label');
    const t = I18N[currentLang];

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      if (iconEl) iconEl.textContent = '☀️';
      if (labelEl) labelEl.textContent = t.themeLight;
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      if (iconEl) iconEl.textContent = '🌙';
      if (labelEl) labelEl.textContent = t.themeDark;
    }
  }

  function toggleTheme() {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  }

  // Toast
  function showToast(message, isError = false) {
    const toast = document.getElementById('toast-message');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `fixed top-16 right-4 rtl:right-auto rtl:left-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold transition-all duration-300 animate-toast ${
      isError ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
    }`;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3200);
  }

  // Apply Language & Direction
  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    const t = I18N[lang];

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    // Header
    setText('lang-btn-label', t.langBtn);
    setText('header-title-text', t.headerTitle);
    setText('btn-back-home-text', t.switchRole);

    applyTheme(currentTheme);

    // Landing
    setText('landing-main-title', t.landingTitle);
    setText('landing-subtitle', t.landingSubtitle);
    setText('card-worker-title', t.cardWorkerTitle);
    setText('card-worker-desc', t.cardWorkerDesc);
    setText('card-worker-action', t.cardWorkerAction);
    setText('card-admin-title', t.cardAdminTitle);
    setText('card-admin-desc', t.cardAdminDesc);
    setText('card-admin-action', t.cardAdminAction);

    // Worker Portal
    setText('worker-header-title', t.workerHeaderTitle);
    setText('worker-header-desc', t.workerHeaderDesc);
    setText('worker-switch-role-text', t.workerSwitchRole);
    setHtml('lbl-worker-name', t.lblWorkerName);
    setPlaceholder('worker-name-input', t.placeholderWorkerName);
    setHtml('lbl-task-name', t.lblTaskName);
    setPlaceholder('worker-task-input', t.placeholderTaskName);
    setHtml('lbl-qty-name', t.lblQtyName);
    setHtml('lbl-qty-tip', t.lblQtyTip);
    setPlaceholder('worker-qty-input', t.placeholderQty);
    setText('lbl-clock-title', t.lblClockTitle);
    setText('worker-clock-badge', t.clockBadgeAuto);
    setText('btn-submit-text', t.btnSubmit);
    setText('worker-recent-title', t.workerRecentTitle);

    setText('th-w-time', t.thTime);
    setText('th-w-worker', t.thWorker);
    setText('th-w-task', t.thTask);
    setText('th-w-qty', t.thQty);
    setText('th-w-status', t.thStatus);

    // Admin Auth
    setText('lbl-admin-user', t.lblAdminUser);
    setPlaceholder('admin-user-input', t.placeholderAdminUser);
    setText('lbl-admin-pass', t.lblAdminPass);
    setPlaceholder('admin-pass-input', t.placeholderAdminPass);
    setText('btn-admin-signin', t.btnAdminSignIn);
    setText('btn-show-reset-admin', t.btnResetCreds);

    setText('admin-setup-tip', t.adminSetupTip);
    setText('lbl-setup-user', t.lblSetupUser);
    setPlaceholder('setup-user-input', t.placeholderSetupUser);
    setText('lbl-setup-pass', t.lblSetupPass);
    setText('lbl-setup-confirm', t.lblSetupConfirm);
    setText('btn-setup-save', t.btnSetupSave);
    setText('btn-cancel-setup', t.btnCancel);
    setText('btn-cancel-admin', t.btnBackSelect);

    // Admin Dashboard
    setText('admin-dash-title', t.adminDashTitle);
    setText('admin-change-creds-btn', t.btnChangeCreds);
    setText('btn-export-excel-text', t.btnExportExcel);
    setText('btn-export-csv-text', t.btnExportCsv);
    setText('btn-print-text', t.btnPrintReport);
    setText('admin-logout-btn', t.btnSignOut);
    setText('stat-lbl-logs', t.statLogs);
    setText('stat-lbl-workers', t.statWorkers);
    setText('filter-header-title', t.filterHeaderTitle);
    setText('admin-clear-filters', t.btnClearFilters);

    setText('lbl-f-worker', t.lblFWorker);
    setPlaceholder('admin-filter-worker', t.placeholderFWorker);
    setText('lbl-f-task', t.lblFTask);
    setPlaceholder('admin-filter-task', t.placeholderFTask);
    setText('lbl-f-date', t.lblFDate);

    setText('admin-table-title', t.adminTableTitle);
    setText('th-a-date', t.thDate);
    setText('th-a-time', t.thTime);
    setText('th-a-worker', t.thWorker);
    setText('th-a-task', t.thTask);
    setText('th-a-qty', t.thQty);
    setText('th-a-action', t.thAction);

    setText('footer-text', t.footerText);

    renderWorkerTable();
    if (isAdminLoggedIn) {
      renderAdminDashboard();
    }
    prepareAdminAuthView();
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function setPlaceholder(id, ph) {
    const el = document.getElementById(id);
    if (el) el.placeholder = ph;
  }

  // Live Clock
  function startClock() {
    const clockEl = document.getElementById('header-live-time');
    const workerBadge = document.getElementById('worker-clock-badge');

    function update() {
      const now = new Date();
      const timeStr = getExactTimeString(now);
      const locale = currentLang === 'ar' ? 'ar-EG' : 'en-US';
      const dateStr = now.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });

      if (clockEl) {
        clockEl.textContent = `${timeStr} • ${dateStr}`;
      }
      if (workerBadge) {
        workerBadge.textContent = `${timeStr} (${currentLang === 'ar' ? 'مباشر' : 'Live'})`;
      }
    }

    update();
    setInterval(update, 1000);
  }

  // Navigation
  function showView(viewName) {
    const landing = document.getElementById('view-landing');
    const worker = document.getElementById('view-worker');
    const adminAuth = document.getElementById('view-admin-auth');
    const adminDashboard = document.getElementById('view-admin-dashboard');
    const backBtn = document.getElementById('btn-back-home');

    landing.classList.add('hidden');
    worker.classList.add('hidden');
    adminAuth.classList.add('hidden');
    adminDashboard.classList.add('hidden');

    if (viewName === 'landing') {
      landing.classList.remove('hidden');
      backBtn.classList.add('hidden');
    } else if (viewName === 'worker') {
      worker.classList.remove('hidden');
      backBtn.classList.remove('hidden');

      const lastWorker = localStorage.getItem(LAST_WORKER_KEY);
      const nameInput = document.getElementById('worker-name-input');
      if (lastWorker && nameInput && !nameInput.value) {
        nameInput.value = lastWorker;
      }
      renderWorkerTable();
    } else if (viewName === 'admin-auth') {
      adminAuth.classList.remove('hidden');
      backBtn.classList.remove('hidden');
      prepareAdminAuthView();
    } else if (viewName === 'admin-dashboard') {
      if (!isAdminLoggedIn) {
        showView('admin-auth');
        return;
      }
      adminDashboard.classList.remove('hidden');
      backBtn.classList.remove('hidden');
      if (adminCreds) {
        document.getElementById('admin-welcome-label').textContent = I18N[currentLang].adminWelcome(adminCreds.username);
      }
      renderAdminDashboard();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Worker Form Submit (Saves to Supabase cloud + Local)
  async function handleWorkerSubmit(e) {
    e.preventDefault();
    const t = I18N[currentLang];

    const nameInput = document.getElementById('worker-name-input');
    const taskInput = document.getElementById('worker-task-input');
    const qtyInput = document.getElementById('worker-qty-input');

    const workerName = nameInput.value.trim();
    const task = taskInput.value.trim();
    const quantity = qtyInput.value.trim();

    if (!workerName) {
      showToast(currentLang === 'ar' ? 'يرجى كتابة اسمك' : 'Please type your name.', true);
      nameInput.focus();
      return;
    }

    if (!task) {
      showToast(currentLang === 'ar' ? 'يرجى كتابة اسم المنتج أو المهمة' : 'Please enter what you produced.', true);
      taskInput.focus();
      return;
    }

    if (!quantity) {
      showToast(currentLang === 'ar' ? 'يرجى إدخال الكمية (مثال: 25 كجم أو 500 جرام)' : 'Please enter the quantity.', true);
      qtyInput.focus();
      return;
    }

    const now = new Date();
    const exactTime = getExactTimeString(now);
    const currentDate = getTodayDateString(now);

    const newRecord = {
      id: Date.now().toString(),
      worker: workerName,
      task: task,
      quantity: quantity,
      date: currentDate,
      time: exactTime
    };

    // Optimistic local update
    records.unshift(newRecord);
    saveRecordsLocal();

    localStorage.setItem(LAST_WORKER_KEY, workerName);

    taskInput.value = '';
    qtyInput.value = '';
    taskInput.focus();

    showToast(t.toastLogged(quantity, task, workerName));
    renderWorkerTable();

    // Push to MongoDB Backend
    try {
      const res = await fetch(`${API_BASE}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      });
      if (res.ok) {
        const saved = await res.json();
        newRecord.id = saved.id || newRecord.id;
        saveRecordsLocal();
        renderWorkerTable();
      }
    } catch (err) {
      console.warn('Network error pushing to backend:', err);
    }
  }

  function renderWorkerTable() {
    const tbody = document.getElementById('worker-table-body');
    const countEl = document.getElementById('worker-table-count');
    const t = I18N[currentLang];
    if (!tbody) return;

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
            ${t.workerEmpty}
          </td>
        </tr>
      `;
      if (countEl) countEl.textContent = t.zeroRecords;
      return;
    }

    const recent = records.slice(0, 15);
    if (countEl) countEl.textContent = t.recordsCount(recent.length);

    tbody.innerHTML = recent.map(r => `
      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
        <td class="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">${escapeHtml(r.time)}</td>
        <td class="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">${escapeHtml(r.worker)}</td>
        <td class="py-3 px-3 text-slate-700 dark:text-slate-300">${escapeHtml(r.task)}</td>
        <td class="py-3 px-3 text-right rtl:text-left font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">${escapeHtml(r.quantity)}</td>
        <td class="py-3 px-3 text-center">
          <button class="worker-delete-btn text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition inline-flex items-center space-x-1 rtl:space-x-reverse" data-id="${r.id}" title="${t.btnDelete}">
            <span>🗑️</span>
            <span>${t.btnDelete}</span>
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Admin Auth Logic
  function prepareAdminAuthView() {
    const t = I18N[currentLang];
    const title = document.getElementById('admin-auth-title');
    const subtitle = document.getElementById('admin-auth-subtitle');
    const loginForm = document.getElementById('admin-login-form');
    const setupForm = document.getElementById('admin-setup-form');
    const setupCancel = document.getElementById('setup-cancel-container');
    const loginError = document.getElementById('admin-login-error');
    const setupError = document.getElementById('admin-setup-error');

    loginError.classList.add('hidden');
    setupError.classList.add('hidden');

    if (!adminCreds) {
      title.textContent = t.adminSetupTitle;
      subtitle.textContent = t.adminSetupSubtitle;
      loginForm.classList.add('hidden');
      setupForm.classList.remove('hidden');
      setupCancel.classList.add('hidden');
      document.getElementById('setup-user-input').focus();
    } else {
      title.textContent = t.adminLoginTitle;
      subtitle.textContent = t.adminLoginSubtitle;
      loginForm.classList.remove('hidden');
      setupForm.classList.add('hidden');
      document.getElementById('admin-user-input').value = '';
      document.getElementById('admin-pass-input').value = '';
      document.getElementById('admin-user-input').focus();
    }
  }

  async function handleAdminLogin(e) {
    e.preventDefault();
    const t = I18N[currentLang];
    const user = document.getElementById('admin-user-input').value.trim();
    const pass = document.getElementById('admin-pass-input').value;
    const errorBox = document.getElementById('admin-login-error');

    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });

      if (res.ok) {
        const data = await res.json();
        isAdminLoggedIn = true;
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        adminCreds = { username: data.username };
        errorBox.classList.add('hidden');
        showToast(t.toastAdminLoggedIn);
        showView('admin-dashboard');
        return;
      }
    } catch (err) {
      console.warn('Backend login check failed, checking offline:', err);
    }

    if (adminCreds && user === adminCreds.username && pass === adminCreds.password) {
      isAdminLoggedIn = true;
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      errorBox.classList.add('hidden');
      showToast(t.toastAdminLoggedIn);
      showView('admin-dashboard');
    } else {
      errorBox.textContent = t.adminLoginError;
      errorBox.classList.remove('hidden');
    }
  }

  async function handleAdminSetup(e) {
    e.preventDefault();
    const t = I18N[currentLang];
    const user = document.getElementById('setup-user-input').value.trim();
    const pass = document.getElementById('setup-pass-input').value;
    const confirmPass = document.getElementById('setup-pass-confirm').value;
    const errorBox = document.getElementById('admin-setup-error');

    if (!user || !pass) {
      errorBox.textContent = t.adminSetupErrorEmpty;
      errorBox.classList.remove('hidden');
      return;
    }

    if (pass !== confirmPass) {
      errorBox.textContent = t.adminSetupErrorMatch;
      errorBox.classList.remove('hidden');
      return;
    }

    await saveAdminCreds(user, pass);
    isAdminLoggedIn = true;
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    errorBox.classList.add('hidden');

    showToast(t.toastAdminCreated);
    showView('admin-dashboard');
  }

  function handleAdminLogout() {
    isAdminLoggedIn = false;
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    showToast(I18N[currentLang].toastAdminLoggedOut);
    showView('landing');
  }

  // Admin Dashboard
  function getFilteredAdminRecords() {
    const workerQuery = (document.getElementById('admin-filter-worker')?.value || '').toLowerCase().trim();
    const taskQuery = (document.getElementById('admin-filter-task')?.value || '').toLowerCase().trim();
    const dateQuery = document.getElementById('admin-filter-date')?.value || '';

    return records.filter(r => {
      if (workerQuery && !r.worker.toLowerCase().includes(workerQuery)) {
        return false;
      }
      if (taskQuery && !r.task.toLowerCase().includes(taskQuery)) {
        return false;
      }
      if (dateQuery && r.date !== dateQuery) {
        return false;
      }
      return true;
    });
  }

  function renderAdminDashboard() {
    const filtered = getFilteredAdminRecords();
    const t = I18N[currentLang];

    const totalLogs = filtered.length;
    const uniqueWorkers = new Set(filtered.map(r => r.worker.toLowerCase())).size;

    document.getElementById('admin-stat-logs').textContent = totalLogs.toLocaleString();
    document.getElementById('admin-stat-workers').textContent = uniqueWorkers.toString();
    document.getElementById('admin-filter-summary').textContent = t.adminFilterSummary(filtered.length, records.length);

    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
            ${records.length === 0 ? t.adminEmpty : t.adminFilterEmpty}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(r => `
      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
        <td class="py-3 px-3 text-xs text-slate-600 dark:text-slate-400">${escapeHtml(r.date)}</td>
        <td class="py-3 px-3 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(r.time)}</td>
        <td class="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">${escapeHtml(r.worker)}</td>
        <td class="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">${escapeHtml(r.task)}</td>
        <td class="py-3 px-3 text-right rtl:text-left font-bold text-emerald-700 dark:text-emerald-400 font-mono text-sm">${escapeHtml(r.quantity)}</td>
        <td class="py-3 px-3 text-center">
          <button class="delete-record-btn text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40" data-id="${r.id}">
            ${t.btnDelete}
          </button>
        </td>
      </tr>
    `).join('');
  }

  async function deleteRecord(id) {
    const item = records.find(r => r.id === id);
    if (!item) return;
    const t = I18N[currentLang];

    if (confirm(t.confirmDelete(item.worker, item.quantity, item.task))) {
      records = records.filter(r => r.id !== id);
      saveRecordsLocal();
      showToast(t.toastDeleted);
      renderAdminDashboard();
      renderWorkerTable();

      // Delete from backend
      try {
        await fetch(`${API_BASE}/logs/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Could not delete from backend:', err);
      }
    }
  }

  // Formatted Excel Export (.xls with styles, colors, and RTL)
  function exportFormattedExcel() {
    const filtered = getFilteredAdminRecords();
    const t = I18N[currentLang];
    if (filtered.length === 0) {
      showToast(currentLang === 'ar' ? 'لا توجد سجلات للتصدير' : 'No records to export', true);
      return;
    }

    const todayStr = getTodayDateString();
    const timeNow = getExactTimeString();
    const isRtl = currentLang === 'ar';

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${isRtl ? 'تقرير الإنتاج' : 'Production Report'}</x:Name>
              <x:WorksheetOptions>
                ${isRtl ? '<x:DisplayRightToLeft/>' : ''}
                <x:Print><x:ValidPrinterInfo/></x:Print>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; }
        .title-cell { background-color: #26276b; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; padding: 14px; }
        .meta-cell { background-color: #f8fafc; font-size: 11px; color: #475569; padding: 8px; border: 1px solid #e2e8f0; }
        .header-cell { background-color: #f1f5f9; color: #1e293b; font-weight: bold; font-size: 12px; text-align: center; border: 1px solid #94a3b8; }
        .even-row { background-color: #ffffff; }
        .odd-row { background-color: #fbf9f6; }
        .center-cell { text-align: center; font-size: 12px; }
        .qty-cell { text-align: center; font-weight: bold; color: #15803d; font-size: 13px; }
        .summary-cell { background-color: #e2e8f0; font-weight: bold; font-size: 12px; }
      </style>
      </head>
      <body ${isRtl ? 'dir="rtl"' : ''}>
        <table>
          <tr>
            <th colspan="6" class="title-cell">
              VG FACTORY • ${isRtl ? 'تقرير الإنتاج اليومي للمصنع' : 'DAILY PRODUCTION REPORT'}
            </th>
          </tr>
          <tr>
            <td colspan="3" class="meta-cell">
              <strong>${isRtl ? 'تاريخ التقرير:' : 'Report Date:'}</strong> ${todayStr} | ${timeNow}
            </td>
            <td colspan="3" class="meta-cell" style="text-align:${isRtl ? 'left' : 'right'};">
              <strong>${isRtl ? 'المشرف المسؤول:' : 'Supervisor:'}</strong> ${adminCreds ? adminCreds.username : 'Admin'}
            </td>
          </tr>
          <tr>
            <th class="header-cell" style="width: 50px;">#</th>
            <th class="header-cell" style="width: 120px;">${t.thDate}</th>
            <th class="header-cell" style="width: 100px;">${t.thTime}</th>
            <th class="header-cell" style="width: 180px;">${t.thWorker}</th>
            <th class="header-cell" style="width: 180px;">${t.thTask}</th>
            <th class="header-cell" style="width: 140px;">${t.thQty}</th>
          </tr>
          ${filtered.map((r, i) => `
            <tr class="${i % 2 === 0 ? 'even-row' : 'odd-row'}">
              <td class="center-cell" style="color: #64748b;">${i + 1}</td>
              <td class="center-cell">${r.date}</td>
              <td class="center-cell" style="font-family: monospace; font-weight: bold;">${r.time}</td>
              <td style="font-weight: 600; text-align: ${isRtl ? 'right' : 'left'};">${escapeHtml(r.worker)}</td>
              <td style="color: #1e293b; font-weight: 600; text-align: ${isRtl ? 'right' : 'left'};">${escapeHtml(r.task)}</td>
              <td class="qty-cell">${escapeHtml(r.quantity)}</td>
            </tr>
          `).join('')}
          <tr class="summary-cell">
            <td colspan="5" style="text-align: ${isRtl ? 'left' : 'right'}; padding: 12px;">
              ${isRtl ? 'إجمالي السجلات في هذا التقرير:' : 'Total Logged Records in Report:'}
            </td>
            <td class="center-cell" style="font-size: 14px; color: #1e293b;">
              ${filtered.length} ${isRtl ? 'سجل' : 'records'}
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `VG_Production_Report_${todayStr}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(currentLang === 'ar' ? `✓ تم تصدير شيت إكسل المنسق (${filtered.length} سجل)` : `Exported formatted Excel report`);
  }

  // Raw CSV Export
  function exportCSV() {
    const filtered = getFilteredAdminRecords();
    const t = I18N[currentLang];
    if (filtered.length === 0) {
      showToast(currentLang === 'ar' ? 'لا توجد سجلات للتصدير' : 'No records to export', true);
      return;
    }

    const headers = ['#', t.thDate, t.thTime, t.thWorker, t.thTask, t.thQty];
    const rows = filtered.map((r, i) => [
      i + 1,
      `"${r.date}"`,
      `"${r.time}"`,
      `"${(r.worker || '').replace(/"/g, '""')}"`,
      `"${(r.task || '').replace(/"/g, '""')}"`,
      `"${(r.quantity || '').replace(/"/g, '""')}"`
    ]);

    const titleRow = `"${currentLang === 'ar' ? 'تقرير إنتاج مصنع VG' : 'VG Factory Production Report'}"`;
    const dateRow = `"${currentLang === 'ar' ? 'تاريخ التصدير' : 'Export Date'}","${getTodayDateString()} ${getExactTimeString()}"`;
    const emptyRow = '""';

    const csvContent = '\uFEFF' + [titleRow, dateRow, emptyRow, headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `VG_Production_Raw_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(t.toastExported(filtered.length));
  }

  // Print PDF Report
  function printPDFReport() {
    const filtered = getFilteredAdminRecords();
    if (filtered.length === 0) {
      showToast(currentLang === 'ar' ? 'لا توجد سجلات للطباعة' : 'No records to print', true);
      return;
    }

    const isRtl = currentLang === 'ar';
    const t = I18N[currentLang];
    const todayStr = getTodayDateString();
    const timeNow = getExactTimeString();

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html ${isRtl ? 'dir="rtl" lang="ar"' : 'dir="ltr" lang="en"'}>
      <head>
        <meta charset="UTF-8">
        <title>VG Production Report - ${todayStr}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", sans-serif; padding: 25px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #26276b; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #26276b; }
          .subtitle { font-size: 13px; color: #64748b; }
          .meta { font-size: 12px; color: #475569; text-align: ${isRtl ? 'left' : 'right'}; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background-color: #26276b; color: white; padding: 10px; border: 1px solid #1a1b50; text-align: ${isRtl ? 'right' : 'left'}; }
          td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: ${isRtl ? 'right' : 'left'}; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .center { text-align: center; }
          .qty { font-weight: bold; color: #15803d; text-align: center; }
          .summary { margin-top: 25px; display: flex; justify-content: space-between; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          .signature { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; }
          @media print { button { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">VG FACTORY</div>
            <div class="subtitle">${isRtl ? 'تقرير الإنتاج اليومي للمصنع' : 'Daily Production Shift Report'}</div>
          </div>
          <div class="meta">
            <div><strong>${isRtl ? 'التاريخ:' : 'Date:'}</strong> ${todayStr}</div>
            <div><strong>${isRtl ? 'الوقت:' : 'Time:'}</strong> ${timeNow}</div>
            <div><strong>${isRtl ? 'المشرف:' : 'Supervisor:'}</strong> ${adminCreds ? adminCreds.username : 'Admin'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;" class="center">#</th>
              <th style="width: 100px;">${t.thDate}</th>
              <th style="width: 90px;" class="center">${t.thTime}</th>
              <th>${t.thWorker}</th>
              <th>${t.thTask}</th>
              <th style="width: 120px;" class="center">${t.thQty}</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((r, i) => `
              <tr>
                <td class="center">${i + 1}</td>
                <td>${r.date}</td>
                <td class="center font-mono"><strong>${r.time}</strong></td>
                <td><strong>${escapeHtml(r.worker)}</strong></td>
                <td>${escapeHtml(r.task)}</td>
                <td class="qty">${escapeHtml(r.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div>${isRtl ? 'إجمالي السجلات:' : 'Total Records:'} <strong>${filtered.length}</strong></div>
          <div>${isRtl ? 'حالة التقرير: معتمد ومكتمل' : 'Status: Verified & Completed'}</div>
        </div>

        <div class="signature">
          <div>${isRtl ? 'توقيع المشرف المسؤول: ____________________' : 'Supervisor Signature: ____________________'}</div>
          <div>${isRtl ? 'توقيع مراقبة الجودة: ____________________' : 'Quality Control Signature: ____________________'}</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Event Listeners
  function setupEvents() {
    // Theme Toggle
    document.getElementById('btn-toggle-theme').addEventListener('click', toggleTheme);

    // Language Toggle
    document.getElementById('btn-toggle-lang').addEventListener('click', () => {
      const nextLang = currentLang === 'ar' ? 'en' : 'ar';
      applyLanguage(nextLang);
    });

    // Nav
    document.getElementById('header-logo-btn').addEventListener('click', () => showView('landing'));
    document.getElementById('btn-back-home').addEventListener('click', () => showView('landing'));
    document.getElementById('worker-btn-switch').addEventListener('click', () => showView('landing'));
    document.getElementById('btn-cancel-admin').addEventListener('click', () => showView('landing'));

    // Landing
    document.getElementById('btn-goto-worker').addEventListener('click', () => showView('worker'));
    document.getElementById('btn-goto-admin').addEventListener('click', () => {
      if (isAdminLoggedIn) {
        showView('admin-dashboard');
      } else {
        showView('admin-auth');
      }
    });

    // Worker Form
    document.getElementById('worker-form').addEventListener('submit', handleWorkerSubmit);

    // Quick Task Chips (عجن, تقفيل, تركيز)
    document.querySelectorAll('.quick-task-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskInput = document.getElementById('worker-task-input');
        taskInput.value = btn.textContent.trim();
        document.getElementById('worker-qty-input').focus();
      });
    });

    // Admin Auth
    document.getElementById('admin-login-form').addEventListener('submit', handleAdminLogin);
    document.getElementById('admin-setup-form').addEventListener('submit', handleAdminSetup);
    document.getElementById('admin-logout-btn').addEventListener('click', handleAdminLogout);

    // Switch to setup/change creds
    document.getElementById('btn-show-reset-admin').addEventListener('click', () => {
      const t = I18N[currentLang];
      document.getElementById('admin-auth-title').textContent = t.adminChangeTitle;
      document.getElementById('admin-auth-subtitle').textContent = t.adminChangeSubtitle;
      document.getElementById('admin-login-form').classList.add('hidden');
      document.getElementById('admin-setup-form').classList.remove('hidden');
      document.getElementById('setup-cancel-container').classList.remove('hidden');
      document.getElementById('setup-user-input').value = adminCreds ? adminCreds.username : '';
      document.getElementById('setup-pass-input').value = '';
      document.getElementById('setup-pass-confirm').value = '';
      document.getElementById('setup-user-input').focus();
    });

    document.getElementById('btn-cancel-setup').addEventListener('click', () => {
      prepareAdminAuthView();
    });

    document.getElementById('admin-change-creds-btn').addEventListener('click', () => {
      showView('admin-auth');
      document.getElementById('btn-show-reset-admin').click();
    });

    // Admin Filters
    document.getElementById('admin-filter-worker').addEventListener('input', renderAdminDashboard);
    document.getElementById('admin-filter-task').addEventListener('input', renderAdminDashboard);
    document.getElementById('admin-filter-date').addEventListener('change', renderAdminDashboard);
    document.getElementById('admin-clear-filters').addEventListener('click', () => {
      document.getElementById('admin-filter-worker').value = '';
      document.getElementById('admin-filter-task').value = '';
      document.getElementById('admin-filter-date').value = '';
      renderAdminDashboard();
    });

    // Worker Table Delete Button delegation
    const workerTable = document.getElementById('worker-table-body');
    if (workerTable) {
      workerTable.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.worker-delete-btn');
        if (delBtn) {
          const id = delBtn.getAttribute('data-id');
          deleteRecord(id);
        }
      });
    }

    // Admin Table Delete Button delegation
    document.getElementById('admin-table-body').addEventListener('click', (e) => {
      const delBtn = e.target.closest('.delete-record-btn');
      if (delBtn) {
        const id = delBtn.getAttribute('data-id');
        deleteRecord(id);
      }
    });

    // Export & Print Buttons
    const btnExcel = document.getElementById('admin-export-excel');
    if (btnExcel) btnExcel.addEventListener('click', exportFormattedExcel);

    const btnCsv = document.getElementById('admin-export-csv');
    if (btnCsv) btnCsv.addEventListener('click', exportCSV);

    const btnPrint = document.getElementById('admin-print-report');
    if (btnPrint) btnPrint.addEventListener('click', printPDFReport);
  }

  // Init
  async function init() {
    await loadData();
    applyTheme(currentTheme);
    applyLanguage(currentLang);
    startClock();
    setupEvents();
    showView('landing');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
