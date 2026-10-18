/**
 * UG Enterprise Production Operations ERP
 * Role-Based Access Control (RBAC):
 * - 5 Operators (worker1..worker5): Worker portal only. Simplified work order execution and 3-stage irreversible workflow.
 * - 3 Supervisors (supervisor1..supervisor3): Production Operations Dashboard, KPIs, Job Order Dispatch, and Excel/CSV/PDF exports.
 * - 1 Admin (admin): Production Dashboard + User Management tab to inspect and edit system credentials.
 */

(function () {
  'use strict';

  const API_BASE = '/api';

  // Storage Keys
  const STORAGE_KEY = 'factory_prod_logs_v3';
  const USER_SESSION_KEY = 'factory_user_session_v5';
  const LANG_KEY = 'factory_prod_lang_v1';
  const THEME_KEY = 'factory_prod_theme_v1';

  // State
  let records = [];
  let currentUser = null; // { username, role, name }
  let currentLang = 'ar';
  let currentTheme = 'light';
  let currentAdminTab = 'production'; // 'production' | 'settings'

  // Translations
  const I18N = {
    en: {
      langBtn: 'العربية',
      themeDark: 'DARK',
      themeLight: 'LIGHT',
      headerTitle: 'Production ERP',

      loginHeading: 'Enterprise Production System',
      loginSubheading: 'Enter credentials for system authentication and authorization',
      lblLoginUser: 'Username *',
      placeholderLoginUser: 'Enter username...',
      lblLoginPass: 'Password *',
      placeholderLoginPass: 'Enter password...',
      btnLoginSubmit: 'Sign In',
      loginError: 'Invalid username or password.',
      lblQuickCreds: 'Default Accounts (Click to auto-fill):',

      workerLoggedAs: 'Operator ID:',
      workerHeaderDesc: 'Work order execution and production stage tracking',
      workerLogout: 'Sign Out',
      formHeading: 'New Production Work Order',
      lblTaskSelect: 'Operation Type *',
      lblProductInput: 'Batch ID / Product *',
      placeholderProduct: 'e.g. BATCH-2026-A1',
      lblWeightInput: 'Target Quantity *',
      placeholderWeight: 'Numeric quantity...',
      lblUnitSelect: 'Unit of Measure (UOM) *',
      lblClockTitle: 'System Captured Time:',
      btnSubmitTask: 'Register Work Order',
      workerStagesTitle: 'Work Orders & Operations',
      workerStagesDesc: 'Sequence: 1. Pending -> 2. In Progress (Timestamp captured) -> 3. Completed (Timestamp captured). Irreversible.',
      stage1Label: '1. PENDING',
      stage2Label: '2. IN PROGRESS',
      stage3Label: '3. COMPLETED',
      btnStartTask: 'Start Execution',
      btnFinishTask: 'Complete Task',
      taskStartedAt: 'Started:',
      taskFinishedAt: 'Finished:',
      taskCompletedLocked: 'Completed & Locked',
      noTasksYet: 'No active work orders assigned to you',
      noTasksTip: 'Select operation, batch, and quantity above, then register to begin',

      dashSupervisor: 'Supervisor:',
      dashAdmin: 'Administrator:',
      dashSubtitle: 'Monitoring manufacturing lines & operations',
      tabProduction: 'Production Operations',
      tabSettings: 'User Management',
      btnExportExcel: 'Export Excel',
      btnExportCsv: 'Export CSV',
      btnPrintReport: 'Print PDF',
      dashLogout: 'Sign Out',
      statLogs: 'Total Work Orders',
      statWorkers: 'Active Operators',
      kpiHeading: 'Operator Performance Metrics',
      kpiSubheading: 'Completed tasks, average task duration, and operator throughput',
      kpiLblOverallAvg: 'Overall Avg Duration:',
      filterHeaderTitle: 'Filter & Search',
      btnClearFilters: 'Clear Filters',
      lblFWorker: 'Operator Filter',
      lblFTask: 'Operation / Batch',
      placeholderFTask: 'Search operation or batch...',
      lblFStatus: 'Operational Stage',
      lblFDate: 'Filter by Date',
      adminTableTitle: 'Production Master Records',
      adminFilterSummary: (shown, total) => `Displaying ${shown} of ${total} records`,
      thDate: 'Date',
      thTime: 'Time',
      thWorker: 'Operator',
      thTask: 'Operation',
      thProduct: 'Batch / Product',
      thQty: 'Quantity',
      thStatus: 'Status',
      thStart: 'Started',
      thFinish: 'Finished',
      thAction: 'Action',
      btnDelete: 'Delete',
      adminEmpty: 'No production work orders recorded yet.',
      adminFilterEmpty: 'No records match search criteria.',
      confirmDelete: (w, q, t) => `Delete work order for "${w}" (${q} - ${t})?`,
      footerText: 'UG Production Operations ERP • Internal Manufacturing System',

      toastTaskAdded: (t, p) => `Work order registered: ${t} - ${p}`,
      toastTaskStarted: (t, time) => `Execution started: ${t} at ${time}`,
      toastTaskFinished: (t, time) => `Task completed: ${t} at ${time}`,
      toastDeleted: 'Record deleted successfully',
      toastLoggedIn: (u) => `Authenticated: ${u}`,
      toastLoggedOut: 'Signed out successfully',
      toastUserUpdated: 'Credentials updated successfully'
    },

    ar: {
      langBtn: 'English',
      themeDark: 'الداكن',
      themeLight: 'الفاتح',
      headerTitle: 'نظام إدارة عمليات الإنتاج',

      loginHeading: 'نظام إدارة عمليات الإنتاج',
      loginSubheading: 'أدخل بيانات الاعتماد للمصادقة وتحديد مستوى الصلاحيات',
      lblLoginUser: 'اسم المستخدم (Username) *',
      placeholderLoginUser: 'اسم المستخدم...',
      lblLoginPass: 'كلمة المرور (Password) *',
      placeholderLoginPass: 'كلمة المرور...',
      btnLoginSubmit: 'تسجيل الدخول',
      loginError: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
      lblQuickCreds: 'حسابات النظام الافتراضية (انقر للتعبئة السريعة):',

      workerLoggedAs: 'مشغل الوردية:',
      workerHeaderDesc: 'تسجيل أوامر التشغيل ومتابعة المراحل التنفيذية',
      workerLogout: 'تسجيل الخروج',
      formHeading: 'تسجيل أمر إنتاج جديد',
      lblTaskSelect: 'نوع العملية التشغيلية *',
      lblProductInput: 'المنتج / رقم التشغيلة *',
      placeholderProduct: 'اسم المنتج أو كود التشغيلة...',
      lblWeightInput: 'الكمية المستهدفة *',
      placeholderWeight: 'الوزن أو العدد...',
      lblUnitSelect: 'وحدة القياس *',
      lblClockTitle: 'وقت التسجيل في النظام:',
      btnSubmitTask: 'إدراج أمر العمل وبدء المراحل التشغيلية',
      workerStagesTitle: 'أوامر العمل ومراحل التنفيذ',
      workerStagesDesc: 'تسلسل العمل: 1. قيد الانتظار ➔ 2. قيد التشغيل (تسجيل وقت البدء) ➔ 3. مكتمل (تسجيل وقت الإنجاز).',
      stage1Label: '1. قيد الانتظار',
      stage2Label: '2. قيد التشغيل',
      stage3Label: '3. مكتمل',
      btnStartTask: 'بدء التنفيذ',
      btnFinishTask: 'إتمام المهمة',
      taskStartedAt: 'وقت البدء:',
      taskFinishedAt: 'وقت الانتهاء:',
      taskCompletedLocked: 'مكتمل ومغلق',
      noTasksYet: 'لا توجد أوامر تشغيل نشطة مسجلة لك حالياً',
      noTasksTip: 'اختر نوع العملية والتشغيلة والكمية أعلاه لتسجيل أمر جديد',

      dashSupervisor: 'المشرف المسؤول:',
      dashAdmin: 'مدير النظام:',
      dashSubtitle: 'متابعة خطوط الإنتاج والعمليات التشغيلية اليومية',
      tabProduction: 'لوحة عمليات الإنتاج',
      tabSettings: 'إدارة المستخدمين',
      btnExportExcel: 'تصدير Excel',
      btnExportCsv: 'تصدير CSV',
      btnPrintReport: 'طباعة PDF',
      dashLogout: 'تسجيل الخروج',
      statLogs: 'إجمالي أوامر الإنتاج',
      statWorkers: 'المشغلون النشطون',
      kpiHeading: 'مؤشرات أداء المشغلين',
      kpiSubheading: 'متابعة المهام المنجزة، متوسط زمن التنفيذ لكل مشغل، ومعدل الإنجاز',
      kpiLblOverallAvg: 'متوسط وقت الإنجاز العام:',
      filterHeaderTitle: 'البحث والتصفية',
      btnClearFilters: 'مسح التصفية',
      lblFWorker: 'تصفية حسب المشغل',
      lblFTask: 'العملية أو المنتج',
      placeholderFTask: 'بحث بالعملية أو المنتج...',
      lblFStatus: 'المرحلة التشغيلية',
      lblFDate: 'تصفية حسب التاريخ',
      adminTableTitle: 'سجلات الإنتاج وأوامر العمل',
      adminFilterSummary: (shown, total) => `عرض ${shown} من أصل ${total} سجل`,
      thDate: 'التاريخ',
      thTime: 'الوقت',
      thWorker: 'المشغل',
      thTask: 'العملية',
      thProduct: 'التشغيلة / المنتج',
      thQty: 'الكمية',
      thStatus: 'الحالة',
      thStart: 'وقت البدء',
      thFinish: 'وقت الانتهاء',
      thAction: 'إجراء',
      btnDelete: 'حذف',
      adminEmpty: 'لم يتم تسجيل أي عمليات إنتاج حتى الآن.',
      adminFilterEmpty: 'لا توجد سجلات تطابق معايير البحث المحددة.',
      confirmDelete: (w, q, t) => `هل أنت متأكد من حذف أمر العمل للمشغل "${w}" (${q} - ${t})؟`,
      footerText: 'UG Production Operations ERP • Internal Manufacturing System',

      toastTaskAdded: (t, p) => `تم إدراج أمر العمل: ${t} - ${p}`,
      toastTaskStarted: (t, time) => `بدء تشغيل العملية: ${t} الساعة ${time}`,
      toastTaskFinished: (t, time) => `اكتملت العملية بنجاح: ${t} الساعة ${time}`,
      toastDeleted: 'تم حذف السجل بنجاح',
      toastLoggedIn: (u) => `تم تسجيل الدخول: ${u}`,
      toastLoggedOut: 'تم إنهاء الجلسة بنجاح',
      toastUserUpdated: 'تم تحديث بيانات الحساب بنجاح'
    }
  };

  // Helper Date & Time
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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Toast
  function showToast(message, isError = false) {
    const toast = document.getElementById('toast-message');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `fixed top-16 right-4 rtl:right-auto rtl:left-4 z-50 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold border transition-all duration-300 animate-toast ${
      isError 
        ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800' 
        : 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
    }`;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3200);
  }

  // Theme
  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem(THEME_KEY, theme);

    const root = document.documentElement;
    const labelEl = document.getElementById('theme-btn-label');
    const t = I18N[currentLang];

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      if (labelEl) labelEl.textContent = t.themeLight;
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      if (labelEl) labelEl.textContent = t.themeDark;
    }
  }

  function toggleTheme() {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  // Language & UI Text
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setPlaceholder(id, ph) {
    const el = document.getElementById(id);
    if (el) el.placeholder = ph;
  }

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    const t = I18N[lang];

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    // Header
    setText('lang-btn-label', t.langBtn);
    setText('header-title-text', t.headerTitle);
    applyTheme(currentTheme);

    // Login View
    setText('login-heading', t.loginHeading);
    setText('login-subheading', t.loginSubheading);
    setText('lbl-login-user', t.lblLoginUser);
    setPlaceholder('login-username', t.placeholderLoginUser);
    setText('lbl-login-pass', t.lblLoginPass);
    setPlaceholder('login-password', t.placeholderLoginPass);
    setText('btn-login-text', t.btnLoginSubmit);
    setText('lbl-quick-creds', t.lblQuickCreds);

    // Worker View
    setText('lbl-logged-worker', t.workerLoggedAs);
    setText('worker-header-desc', t.workerHeaderDesc);
    setText('worker-logout-text', t.workerLogout);
    setText('form-heading-text', t.formHeading);
    setText('lbl-task-select', t.lblTaskSelect);
    setText('lbl-product-input', t.lblProductInput);
    setPlaceholder('worker-product-input', t.placeholderProduct);
    setText('lbl-weight-input', t.lblWeightInput);
    setPlaceholder('worker-weight-input', t.placeholderWeight);
    setText('lbl-unit-select', t.lblUnitSelect);
    setText('lbl-clock-title', t.lblClockTitle);
    setText('btn-submit-text', t.btnSubmitTask);
    setText('worker-stages-title', t.workerStagesTitle);
    setText('worker-stages-desc', t.workerStagesDesc);

    // Dashboard View
    setText('tab-btn-production', t.tabProduction);
    setText('tab-btn-settings', t.tabSettings);
    setText('btn-export-excel-text', t.btnExportExcel);
    setText('btn-export-csv-text', t.btnExportCsv);
    setText('btn-print-text', t.btnPrintReport);
    setText('stat-lbl-logs', t.statLogs);
    setText('stat-lbl-workers', t.statWorkers);
    setText('kpi-heading', t.kpiHeading);
    setText('kpi-subheading', t.kpiSubheading);
    setText('kpi-lbl-overall-avg', t.kpiLblOverallAvg);
    setText('filter-header-title', t.filterHeaderTitle);
    setText('admin-clear-filters', t.btnClearFilters);
    setText('lbl-f-worker', t.lblFWorker);
    setText('lbl-f-task', t.lblFTask);
    setPlaceholder('admin-filter-task', t.placeholderFTask);
    setText('lbl-f-status', t.lblFStatus);
    setText('lbl-f-date', t.lblFDate);
    setText('admin-table-title', t.adminTableTitle);

    setText('th-a-date', t.thDate);
    setText('th-a-time', t.thTime);
    setText('th-a-worker', t.thWorker);
    setText('th-a-task', t.thTask);
    setText('th-a-product', t.thProduct);
    setText('th-a-qty', t.thQty);
    setText('th-a-status', t.thStatus);
    setText('th-a-start', t.thStart);
    setText('th-a-finish', t.thFinish);
    setText('th-a-action', t.thAction);
    setText('footer-text', t.footerText);

    if (currentUser) {
      if (currentUser.role === 'worker') {
        renderWorkerTasks();
      } else {
        setText('dash-role-badge', currentUser.role === 'admin' ? t.dashAdmin : t.dashSupervisor);
        renderAdminDashboard();
      }
    }
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

      if (clockEl) clockEl.textContent = `${timeStr} | ${dateStr}`;
      if (workerBadge) workerBadge.textContent = `${timeStr} (${currentLang === 'ar' ? 'توقيت النظام' : 'SYSTEM TIME'})`;
    }

    update();
    setInterval(update, 1000);
  }

  // View Navigation
  function showView(viewId) {
    const viewLogin = document.getElementById('view-login');
    const viewWorker = document.getElementById('view-worker');
    const viewDash = document.getElementById('view-supervisor-dashboard');

    if (viewLogin) viewLogin.classList.add('hidden');
    if (viewWorker) viewWorker.classList.add('hidden');
    if (viewDash) viewDash.classList.add('hidden');

    if (viewId === 'login' && viewLogin) {
      viewLogin.classList.remove('hidden');
    } else if (viewId === 'worker' && viewWorker) {
      viewWorker.classList.remove('hidden');
    } else if (viewId === 'supervisor-dashboard' && viewDash) {
      viewDash.classList.remove('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Role-based Router
  function routeUser(user) {
    currentUser = user;
    const t = I18N[currentLang];

    if (!user) {
      showView('login');
      return;
    }

    if (user.role === 'worker') {
      const nameEl = document.getElementById('worker-active-name');
      if (nameEl) nameEl.textContent = user.name || user.username;
      showView('worker');
      renderWorkerTasks();
    } else if (user.role === 'supervisor' || user.role === 'admin') {
      const userDisplay = document.getElementById('dash-username-display');
      const roleBadge = document.getElementById('dash-role-badge');
      const adminTabs = document.getElementById('admin-tabs-container');
      const userIcon = document.getElementById('dash-user-icon');

      if (userDisplay) userDisplay.textContent = user.name || user.username;
      if (roleBadge) roleBadge.textContent = user.role === 'admin' ? t.dashAdmin : t.dashSupervisor;
      if (userIcon) userIcon.textContent = user.role === 'admin' ? 'ADM' : 'SUP';

      if (user.role === 'admin') {
        if (adminTabs) adminTabs.classList.remove('hidden');
        switchAdminTab(currentAdminTab || 'production');
      } else {
        if (adminTabs) adminTabs.classList.add('hidden');
        switchAdminTab('production');
      }

      showView('supervisor-dashboard');
      renderAdminDashboard();
    }
  }

  // Admin Tab Switcher (Production vs Admin Settings)
  function switchAdminTab(tabName) {
    currentAdminTab = tabName;
    const tabBtnProd = document.getElementById('tab-btn-production');
    const tabBtnSettings = document.getElementById('tab-btn-settings');
    const subProd = document.getElementById('subview-production');
    const subSettings = document.getElementById('subview-settings');

    if (tabName === 'settings' && currentUser && currentUser.role === 'admin') {
      if (subProd) subProd.classList.add('hidden');
      if (subSettings) subSettings.classList.remove('hidden');

      if (tabBtnProd) {
        tabBtnProd.className = 'px-3 py-1.5 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition';
      }
      if (tabBtnSettings) {
        tabBtnSettings.className = 'px-3 py-1.5 rounded bg-white dark:bg-slate-900 text-[#1e2540] dark:text-[#d4aa65] shadow-sm transition';
      }

      loadAdminUsersTable();
    } else {
      if (subSettings) subSettings.classList.add('hidden');
      if (subProd) subProd.classList.remove('hidden');

      if (tabBtnProd) {
        tabBtnProd.className = 'px-3 py-1.5 rounded bg-white dark:bg-slate-900 text-[#1e2540] dark:text-[#d4aa65] shadow-sm transition';
      }
      if (tabBtnSettings) {
        tabBtnSettings.className = 'px-3 py-1.5 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition';
      }
      renderAdminDashboard();
    }
  }

  // Load Admin Users Credentials Table
  async function loadAdminUsersTable() {
    const tbody = document.getElementById('admin-users-table-body');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-5 text-center text-xs text-slate-500 font-mono">
          Loading credentials...
        </td>
      </tr>
    `;

    try {
      const res = await fetch(`${API_BASE}/users`);
      if (!res.ok) throw new Error('Fetch users failed');
      const users = await res.json();

      if (!Array.isArray(users) || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-xs text-slate-500">No user accounts found</td></tr>`;
        return;
      }

      const roleBadges = {
        worker: '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">OPERATOR</span>',
        supervisor: '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">SUPERVISOR</span>',
        admin: '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">ADMINISTRATOR</span>'
      };

      tbody.innerHTML = users.map(u => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
          <td class="py-2.5 px-3">${roleBadges[u.role] || u.role}</td>
          <td class="py-2.5 px-3 font-mono font-bold text-[#1e2540] dark:text-[#d4aa65]">${escapeHtml(u.username)}</td>
          <td class="py-2.5 px-3">
            <input type="text" class="user-edit-name w-full max-w-[180px] px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-[#1e2540]"
              data-username="${escapeHtml(u.username)}" value="${escapeHtml(u.name || u.username)}">
          </td>
          <td class="py-2.5 px-3">
            <input type="text" class="user-edit-password w-full max-w-[180px] px-2.5 py-1 text-xs font-mono font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-[#1e2540]"
              data-username="${escapeHtml(u.username)}" value="${escapeHtml(u.password || '')}" placeholder="Password">
          </td>
          <td class="py-2.5 px-3 text-center">
            <button type="button" class="btn-save-user px-3 py-1 rounded text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition active:scale-95 cursor-pointer"
              data-username="${escapeHtml(u.username)}">
              ${currentLang === 'ar' ? 'حفظ' : 'Save'}
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('loadAdminUsersTable error:', err);
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-xs text-rose-600 font-bold">Failed to load accounts</td></tr>`;
    }
  }

  // Save updated user credentials
  async function saveUserCredentials(username) {
    const nameInput = document.querySelector(`.user-edit-name[data-username="${username}"]`);
    const passInput = document.querySelector(`.user-edit-password[data-username="${username}"]`);

    const name = nameInput ? nameInput.value.trim() : '';
    const password = passInput ? passInput.value.trim() : '';

    if (!password) {
      showToast(currentLang === 'ar' ? 'كلمة المرور مطلوبة' : 'Password is required', true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password })
      });

      if (res.ok) {
        showToast(I18N[currentLang].toastUserUpdated);
        if (currentUser && currentUser.username.toLowerCase() === username.toLowerCase()) {
          currentUser.name = name || currentUser.name;
          sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser));
          const userDisplay = document.getElementById('dash-username-display');
          if (userDisplay) userDisplay.textContent = currentUser.name;
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update credentials', true);
      }
    } catch (err) {
      console.error('saveUserCredentials error:', err);
      showToast('Network error updating user', true);
    }
  }

  // Data Loading & Syncing
  async function loadData() {
    try {
      const savedLang = localStorage.getItem(LANG_KEY);
      currentLang = (savedLang === 'en' || savedLang === 'ar') ? savedLang : 'ar';

      const savedTheme = localStorage.getItem(THEME_KEY);
      currentTheme = (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';

      const savedRecords = localStorage.getItem(STORAGE_KEY);
      records = savedRecords ? JSON.parse(savedRecords) : [];

      const savedUser = sessionStorage.getItem(USER_SESSION_KEY);
      currentUser = savedUser ? JSON.parse(savedUser) : null;

      await fetchServerRecords();
      setInterval(fetchServerRecords, 5000);
    } catch (e) {
      console.error('Error during loadData:', e);
    }
  }

  function saveRecordsLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Error saving records locally:', e);
    }
  }

  async function fetchServerRecords() {
    try {
      const res = await fetch(`${API_BASE}/logs`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          records = data.map(serverItem => {
            const local = records.find(r => String(r.id || r._id) === String(serverItem.id || serverItem._id));
            if (local && (local.status === 'in_progress' || local.status === 'completed')) {
              return {
                ...serverItem,
                status: serverItem.status && serverItem.status !== 'pending' ? serverItem.status : local.status,
                startedAt: serverItem.startedAt || local.startedAt,
                finishedAt: serverItem.finishedAt || local.finishedAt
              };
            }
            return serverItem;
          });
          saveRecordsLocal();
          if (currentUser && currentUser.role === 'worker') renderWorkerTasks();
          if (currentUser && (currentUser.role === 'supervisor' || currentUser.role === 'admin')) {
            renderAdminDashboard();
          }
        }
      }
    } catch (err) {
      console.warn('Backend unavailable, using cached records:', err);
    }
  }

  // Worker Form Submit
  async function handleWorkerSubmit(e) {
    e.preventDefault();
    const t = I18N[currentLang];

    const taskSelect = document.getElementById('worker-task-select');
    const productInput = document.getElementById('worker-product-input');
    const weightInput = document.getElementById('worker-weight-input');
    const unitSelect = document.getElementById('worker-unit-select');

    const task = taskSelect.value.trim();
    const product = productInput.value.trim();
    const weight = weightInput.value.trim();
    const unit = unitSelect.value.trim() || 'kg';

    if (!task) {
      showToast(currentLang === 'ar' ? 'يرجى تحديد نوع العملية' : 'Please select operation', true);
      taskSelect.focus();
      return;
    }

    if (!product) {
      showToast(currentLang === 'ar' ? 'يرجى إدخال اسم المنتج أو التشغيلة' : 'Please specify batch/product', true);
      productInput.focus();
      return;
    }

    if (!weight || isNaN(weight) || Number(weight) <= 0) {
      showToast(currentLang === 'ar' ? 'يرجى إدخال كمية صحيحة' : 'Please enter valid quantity', true);
      weightInput.focus();
      return;
    }

    const now = new Date();
    const exactTime = getExactTimeString(now);
    const currentDate = getTodayDateString(now);
    const quantity = `${weight} ${unit}`;

    const newRecord = {
      id: Date.now().toString(),
      worker: currentUser ? currentUser.username : 'worker1',
      task,
      product,
      weight,
      unit,
      quantity,
      status: 'pending',
      startedAt: null,
      finishedAt: null,
      date: currentDate,
      time: exactTime
    };

    records.unshift(newRecord);
    saveRecordsLocal();

    productInput.value = '';
    weightInput.value = '';
    productInput.focus();

    showToast(t.toastTaskAdded(task, product));
    renderWorkerTasks();

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
        renderWorkerTasks();
      }
    } catch (err) {
      console.warn('Network error pushing log to backend:', err);
    }
  }

  // Supervisor & Admin Assign Job to Worker
  async function handleAssignJobSubmit(e) {
    e.preventDefault();
    if (!currentUser || (currentUser.role !== 'supervisor' && currentUser.role !== 'admin')) return;

    const workerSelect = document.getElementById('assign-worker-select');
    const taskSelect = document.getElementById('assign-task-select');
    const productInput = document.getElementById('assign-product-input');
    const weightInput = document.getElementById('assign-weight-input');
    const unitSelect = document.getElementById('assign-unit-select');

    const worker = workerSelect.value.trim();
    const task = taskSelect.value.trim();
    const product = productInput.value.trim();
    const weight = weightInput.value.trim();
    const unit = unitSelect.value.trim() || 'kg';

    if (!worker || !task || !product || !weight || isNaN(weight) || Number(weight) <= 0) {
      showToast(currentLang === 'ar' ? 'يرجى ملء جميع الحقول بشكل صحيح' : 'Please fill all fields accurately', true);
      return;
    }

    const now = new Date();
    const exactTime = getExactTimeString(now);
    const currentDate = getTodayDateString(now);
    const quantity = `${weight} ${unit}`;

    const newRecord = {
      id: Date.now().toString(),
      worker,
      task,
      product,
      weight,
      unit,
      quantity,
      status: 'pending',
      startedAt: null,
      finishedAt: null,
      date: currentDate,
      time: exactTime,
      assignedBy: currentUser.name || currentUser.username
    };

    records.unshift(newRecord);
    saveRecordsLocal();

    productInput.value = '';
    weightInput.value = '';

    showToast(currentLang === 'ar' 
      ? `تم إسناد أمر التشغيل [${task} - ${product}] إلى ${worker}` 
      : `Dispatched order [${task} - ${product}] to ${worker}`);

    renderAdminDashboard();

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
        renderAdminDashboard();
      }
    } catch (err) {
      console.warn('Network error assigning job:', err);
    }
  }

  // 3-Stages Interactive Workflow
  async function startTask(id) {
    const item = records.find(r => String(r.id || r._id) === String(id));
    if (!item || (item.status && item.status !== 'pending')) return;

    const now = new Date();
    const timestamp = getExactTimeString(now);
    const t = I18N[currentLang];

    item.status = 'in_progress';
    item.startedAt = timestamp;
    saveRecordsLocal();
    renderWorkerTasks();
    showToast(t.toastTaskStarted(item.task, timestamp));

    try {
      const targetId = item.id || item._id;
      await fetch(`${API_BASE}/logs/${targetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress', timestamp })
      });
    } catch (err) {
      console.warn('Backend update failed:', err);
    }
  }

  async function finishTask(id) {
    const item = records.find(r => String(r.id || r._id) === String(id));
    if (!item || item.status !== 'in_progress') return;

    const now = new Date();
    const timestamp = getExactTimeString(now);
    const t = I18N[currentLang];

    item.status = 'completed';
    item.finishedAt = timestamp;
    saveRecordsLocal();
    renderWorkerTasks();
    showToast(t.toastTaskFinished(item.task, timestamp));

    try {
      const targetId = item.id || item._id;
      await fetch(`${API_BASE}/logs/${targetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', timestamp })
      });
    } catch (err) {
      console.warn('Backend update failed:', err);
    }
  }

  // Render Worker Tasks
  function renderWorkerTasks() {
    const container = document.getElementById('worker-tasks-list');
    const countEl = document.getElementById('worker-tasks-count');
    const t = I18N[currentLang];
    if (!container) return;

    const myWorkerUser = (currentUser ? currentUser.username : 'worker1').toLowerCase();
    const myTasks = records.filter(
      r => (r.worker || '').trim().toLowerCase() === myWorkerUser
    );

    if (countEl) {
      countEl.textContent = `${myTasks.length} ${currentLang === 'ar' ? 'أوامر' : 'orders'}`;
    }

    if (myTasks.length === 0) {
      container.innerHTML = `
        <div class="py-10 text-center text-slate-500 dark:text-slate-400">
          <p class="font-bold text-sm uppercase tracking-wide font-mono">${t.noTasksYet}</p>
          <p class="text-xs mt-1 text-slate-400">${t.noTasksTip}</p>
        </div>
      `;
      return;
    }

    const taskCodes = {
      'عجن': 'MIX',
      'تقفيل': 'PKG',
      'تركيز': 'CONC',
      'عينات': 'QC',
      'تعقيم': 'STER'
    };

    container.innerHTML = myTasks.map(task => {
      const code = taskCodes[task.task] || 'OP';
      const status = task.status || 'pending';

      const isPending = status === 'pending';
      const isInProgress = status === 'in_progress';
      const isCompleted = status === 'completed';

      return `
        <div class="p-4 rounded-xl glass-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition">

          <!-- Top Row: Task Code, Product, Quantity, Timestamps -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div class="flex items-center space-x-2.5 rtl:space-x-reverse">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1e2540] text-white dark:bg-amber-600 dark:text-slate-950">
                [${code}]
              </span>
              <div>
                <div class="font-bold text-sm text-[#1e2540] dark:text-[#d4aa65]">
                  ${escapeHtml(task.task)} 
                  <span class="text-slate-400 font-normal">/</span> 
                  <span class="text-slate-900 dark:text-slate-100 font-mono">${escapeHtml(task.product || task.quantity)}</span>
                </div>
                <div class="flex items-center flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  <span>DATE: ${escapeHtml(task.date)}</span>
                  <span>|</span>
                  <span>TIME: ${escapeHtml(task.time)}</span>
                  ${task.assignedBy ? `
                    <span>|</span>
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
                      DISPATCHED BY: ${escapeHtml(task.assignedBy)}
                    </span>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- Weight Badge -->
            <div class="self-start sm:self-auto px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs border border-slate-300 dark:border-slate-700">
              QTY: ${escapeHtml(task.quantity || `${task.weight} ${task.unit || 'kg'}`)}
            </div>
          </div>

          <!-- 3 Stages Visual Progress -->
          <div class="grid grid-cols-3 gap-1.5 text-center text-xs font-mono font-bold">
            <!-- Stage 1 -->
            <div class="py-1.5 px-1 rounded transition ${
              isPending 
                ? 'bg-[#1e2540] text-white shadow-sm' 
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }">
              <div>${t.stage1Label}</div>
            </div>

            <!-- Stage 2 -->
            <div class="py-1.5 px-1 rounded transition ${
              isInProgress 
                ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-400' 
                : isCompleted 
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
            }">
              <div>${t.stage2Label}</div>
            </div>

            <!-- Stage 3 -->
            <div class="py-1.5 px-1 rounded transition ${
              isCompleted 
                ? 'bg-emerald-700 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
            }">
              <div>${t.stage3Label}</div>
            </div>
          </div>

          <!-- Stage Actions -->
          <div class="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            
            ${isPending ? `
              <div class="text-[11px] font-mono text-slate-500">
                STATUS: WAITING TO START
              </div>
              <button type="button" class="btn-start-task w-full sm:w-auto px-4 py-2 rounded-lg font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow transition active:scale-95 cursor-pointer" data-id="${task.id || task._id}">
                <span>${t.btnStartTask}</span>
              </button>
            ` : ''}

            ${isInProgress ? `
              <div class="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                ${t.taskStartedAt} <span class="underline">${escapeHtml(task.startedAt || task.time)}</span>
              </div>
              <button type="button" class="btn-finish-task w-full sm:w-auto px-4 py-2 rounded-lg font-bold text-xs bg-[#1e2540] hover:bg-[#141a2e] dark:bg-amber-600 dark:hover:bg-amber-500 text-white shadow transition active:scale-95 cursor-pointer" data-id="${task.id || task._id}">
                <span>${t.btnFinishTask}</span>
              </button>
            ` : ''}

            ${isCompleted ? `
              <div class="w-full flex flex-wrap items-center justify-between gap-2 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg">
                <div class="flex items-center space-x-3 rtl:space-x-reverse text-xs font-mono text-emerald-900 dark:text-emerald-200">
                  <span>START: ${escapeHtml(task.startedAt || '-')}</span>
                  <span>|</span>
                  <span>FINISH: <strong class="text-emerald-700 dark:text-emerald-400">${escapeHtml(task.finishedAt || '-')}</strong></span>
                </div>
                <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  ${t.taskCompletedLocked}
                </span>
              </div>
            ` : ''}

          </div>

        </div>
      `;
    }).join('');
  }

  // Supervisor Dashboard & Filtering
  function getFilteredAdminRecords() {
    const workerQuery = (document.getElementById('admin-filter-worker')?.value || '').toLowerCase().trim();
    const taskQuery = (document.getElementById('admin-filter-task')?.value || '').toLowerCase().trim();
    const statusQuery = (document.getElementById('admin-filter-status')?.value || '').trim();
    const dateQuery = document.getElementById('admin-filter-date')?.value || '';

    return records.filter(r => {
      if (workerQuery && (r.worker || '').toLowerCase() !== workerQuery) {
        return false;
      }
      if (taskQuery) {
        const text = `${r.task || ''} ${r.product || ''}`.toLowerCase();
        if (!text.includes(taskQuery)) return false;
      }
      if (statusQuery && (r.status || 'pending') !== statusQuery) {
        return false;
      }
      if (dateQuery && r.date !== dateQuery) {
        return false;
      }
      return true;
    });
  }

  // Duration Parsing & Computation
  // ponytail: assumes same-day HH:MM:SS timestamps; upgrade to full ISO date strings if work shifts cross midnight.
  function parseTimeToSeconds(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.trim().split(':').map(Number);
    if (parts.length < 2 || parts.some(isNaN)) return null;
    return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
  }

  function computeDurationSeconds(startStr, finishStr) {
    const s = parseTimeToSeconds(startStr);
    const f = parseTimeToSeconds(finishStr);
    if (s === null || f === null) return null;
    let diff = f - s;
    if (diff < 0) diff += 86400; // shift crossed midnight
    return diff;
  }

  function formatDuration(seconds) {
    if (seconds === null || isNaN(seconds)) return '--';
    const totalSec = Math.round(seconds);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    if (currentLang === 'ar') {
      if (hrs > 0) return `${hrs} س ${mins} د`;
      if (mins > 0) return `${mins} د ${secs} ث`;
      return `${secs} ثانية`;
    } else {
      if (hrs > 0) return `${hrs}h ${mins}m`;
      if (mins > 0) return `${mins}m ${secs}s`;
      return `${secs}s`;
    }
  }

  function renderWorkerKPIs() {
    const grid = document.getElementById('worker-kpi-grid');
    const overallAvgEl = document.getElementById('kpi-overall-avg');
    if (!grid) return;

    const defaultWorkers = ['worker1', 'worker2', 'worker3', 'worker4', 'worker5'];
    const recordWorkers = records.map(r => (r.worker || '').trim().toLowerCase()).filter(Boolean);
    const allWorkers = Array.from(new Set([...defaultWorkers, ...recordWorkers]));

    const factoryDurations = [];

    const cardsHtml = allWorkers.map(wId => {
      const workerRecords = records.filter(r => (r.worker || '').trim().toLowerCase() === wId.toLowerCase());
      const total = workerRecords.length;
      const completed = workerRecords.filter(r => r.status === 'completed');
      const inProgress = workerRecords.filter(r => r.status === 'in_progress');

      const durations = completed
        .map(r => computeDurationSeconds(r.startedAt || r.time, r.finishedAt))
        .filter(d => d !== null);

      durations.forEach(d => factoryDurations.push(d));

      const avgSec = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : null;

      const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

      const totalWeight = workerRecords.reduce((sum, r) => {
        const val = parseFloat(r.weight || r.quantity);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      const isAr = currentLang === 'ar';

      return `
        <div class="glass-card rounded-lg p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <div class="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
            <div class="font-mono font-bold text-xs text-[#1e2540] dark:text-[#d4aa65]">
              OPERATOR: ${escapeHtml(wId)}
            </div>
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              completionRate >= 80 ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
              completionRate >= 50 ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }">
              ${completionRate}% ${isAr ? 'إنجاز' : 'COMPLETED'}
            </span>
          </div>

          <div class="w-full bg-slate-100 dark:bg-slate-800 rounded h-1.5 overflow-hidden">
            <div class="bg-emerald-700 h-1.5 rounded transition-all duration-300" style="width: ${completionRate}%"></div>
          </div>

          <div class="grid grid-cols-2 gap-1.5 text-xs font-mono">
            <div class="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span class="text-[10px] text-slate-500 dark:text-slate-400 block">${isAr ? 'المهام المنجزة' : 'COMPLETED'}</span>
              <span class="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                ${completed.length} <span class="text-[10px] text-slate-400 font-normal">/ ${total}</span>
              </span>
            </div>

            <div class="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span class="text-[10px] text-slate-500 dark:text-slate-400 block">${isAr ? 'متوسط الوقت' : 'AVG TIME'}</span>
              <span class="font-bold text-xs text-[#1e2540] dark:text-[#d4aa65]">
                ${formatDuration(avgSec)}
              </span>
            </div>

            <div class="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span class="text-[10px] text-slate-500 dark:text-slate-400 block">${isAr ? 'قيد التشغيل' : 'IN PROGRESS'}</span>
              <span class="font-bold text-xs text-amber-700 dark:text-amber-400">
                ${inProgress.length}
              </span>
            </div>

            <div class="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span class="text-[10px] text-slate-500 dark:text-slate-400 block">${isAr ? 'إجمالي الكمية' : 'TOTAL OUTPUT'}</span>
              <span class="font-bold text-xs text-slate-800 dark:text-slate-200">
                ${totalWeight > 0 ? totalWeight.toLocaleString() : '0'}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    grid.innerHTML = cardsHtml;

    if (overallAvgEl) {
      if (factoryDurations.length > 0) {
        const overallSec = factoryDurations.reduce((a, b) => a + b, 0) / factoryDurations.length;
        overallAvgEl.textContent = formatDuration(overallSec);
      } else {
        overallAvgEl.textContent = '--';
      }
    }
  }

  function renderAdminDashboard() {
    renderWorkerKPIs();
    const filtered = getFilteredAdminRecords();
    const t = I18N[currentLang];

    const totalLogs = filtered.length;
    const uniqueWorkers = new Set(filtered.map(r => (r.worker || '').toLowerCase())).size;

    const statLogs = document.getElementById('admin-stat-logs');
    const statWorkers = document.getElementById('admin-stat-workers');
    const filterSummary = document.getElementById('admin-filter-summary');

    if (statLogs) statLogs.textContent = totalLogs.toLocaleString();
    if (statWorkers) statWorkers.textContent = uniqueWorkers.toString();
    if (filterSummary) filterSummary.textContent = t.adminFilterSummary(filtered.length, records.length);

    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="py-6 text-center text-slate-400 font-mono text-xs">
            ${records.length === 0 ? t.adminEmpty : t.adminFilterEmpty}
          </td>
        </tr>
      `;
      return;
    }

    const stageBadges = {
      pending: '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">PENDING</span>',
      in_progress: '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">IN PROGRESS</span>',
      completed: '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">COMPLETED</span>'
    };

    tbody.innerHTML = filtered.map(r => `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
        <td class="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono">${escapeHtml(r.date)}</td>
        <td class="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">${escapeHtml(r.time)}</td>
        <td class="py-2.5 px-3 font-mono font-bold text-[#1e2540] dark:text-[#d4aa65]">${escapeHtml(r.worker)}</td>
        <td class="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">${escapeHtml(r.task)}</td>
        <td class="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-mono">${escapeHtml(r.product || '-')}</td>
        <td class="py-2.5 px-3 text-right rtl:text-left font-mono font-bold text-slate-900 dark:text-slate-100">${escapeHtml(r.quantity)}</td>
        <td class="py-2.5 px-3 text-center">${stageBadges[r.status] || stageBadges.pending}</td>
        <td class="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">${escapeHtml(r.startedAt || '-')}</td>
        <td class="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">${escapeHtml(r.finishedAt || '-')}</td>
        <td class="py-2.5 px-3 text-center">
          <button class="delete-record-btn text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-800 font-mono font-semibold px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40" data-id="${r.id || r._id}">
            ${t.btnDelete}
          </button>
        </td>
      </tr>
    `).join('');
  }

  async function deleteRecord(id) {
    const item = records.find(r => String(r.id || r._id) === String(id));
    if (!item) return;
    const t = I18N[currentLang];

    if (confirm(t.confirmDelete(item.worker, item.quantity, item.task))) {
      records = records.filter(r => String(r.id || r._id) !== String(id));
      saveRecordsLocal();
      showToast(t.toastDeleted);
      renderAdminDashboard();

      try {
        await fetch(`${API_BASE}/logs/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Could not delete from backend:', err);
      }
    }
  }

  // Formatted Excel Export (.xls)
  function exportFormattedExcel() {
    const filtered = getFilteredAdminRecords();
    if (filtered.length === 0) {
      showToast(currentLang === 'ar' ? 'لا توجد سجلات للتصدير' : 'No records to export', true);
      return;
    }

    const todayStr = getTodayDateString();
    const timeNow = getExactTimeString();
    const isRtl = currentLang === 'ar';

    const stageNames = {
      pending: isRtl ? 'قيد الانتظار' : 'Pending',
      in_progress: isRtl ? 'قيد التشغيل' : 'In Progress',
      completed: isRtl ? 'مكتمل' : 'Completed'
    };

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
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
        .title { font-size: 14pt; font-weight: bold; color: #1e2540; text-align: center; }
        .meta { font-size: 9pt; color: #555555; }
        .th-main { background-color: #1e2540; color: #ffffff; font-weight: bold; font-size: 10pt; border: 1px solid #141a2e; text-align: center; }
        .cell { font-size: 9pt; border: 1px solid #d1d5db; padding: 4px; vertical-align: middle; }
        .cell-center { text-align: center; }
        .cell-qty { text-align: center; font-weight: bold; color: #15803d; }
      </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="10" class="title">${isRtl ? 'سجل عمليات الإنتاج اليومي' : 'Manufacturing Production Log'}</td>
          </tr>
          <tr>
            <td colspan="5" class="meta">${isRtl ? 'تاريخ التصدير:' : 'Exported:'} ${todayStr} ${timeNow}</td>
            <td colspan="5" class="meta" style="text-align: right;">${isRtl ? 'المستخدم:' : 'User:'} ${currentUser ? currentUser.username : 'admin'}</td>
          </tr>
          <tr></tr>
          <tr>
            <th class="th-main">#</th>
            <th class="th-main">${isRtl ? 'التاريخ' : 'Date'}</th>
            <th class="th-main">${isRtl ? 'الوقت' : 'Time'}</th>
            <th class="th-main">${isRtl ? 'المشغل' : 'Operator'}</th>
            <th class="th-main">${isRtl ? 'العملية' : 'Operation'}</th>
            <th class="th-main">${isRtl ? 'التشغيلة / المنتج' : 'Batch / Product'}</th>
            <th class="th-main">${isRtl ? 'الكمية' : 'Quantity'}</th>
            <th class="th-main">${isRtl ? 'الحالة' : 'Status'}</th>
            <th class="th-main">${isRtl ? 'بدء التنفيذ' : 'Started'}</th>
            <th class="th-main">${isRtl ? 'الانتهاء' : 'Finished'}</th>
          </tr>
          ${filtered.map((r, i) => `
            <tr>
              <td class="cell cell-center">${i + 1}</td>
              <td class="cell cell-center">${escapeHtml(r.date)}</td>
              <td class="cell cell-center">${escapeHtml(r.time)}</td>
              <td class="cell" style="font-weight: bold; color: #1e2540;">${escapeHtml(r.worker)}</td>
              <td class="cell">${escapeHtml(r.task)}</td>
              <td class="cell">${escapeHtml(r.product || '-')}</td>
              <td class="cell cell-qty">${escapeHtml(r.quantity)}</td>
              <td class="cell cell-center">${stageNames[r.status] || stageNames.pending}</td>
              <td class="cell cell-center">${escapeHtml(r.startedAt || '-')}</td>
              <td class="cell cell-center" style="font-weight: bold; color: #15803d;">${escapeHtml(r.finishedAt || '-')}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `factory_production_${todayStr}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // CSV Export (.csv)
  function exportCSV() {
    const filtered = getFilteredAdminRecords();
    if (filtered.length === 0) {
      showToast(currentLang === 'ar' ? 'لا توجد سجلات للتصدير' : 'No records to export', true);
      return;
    }

    const headers = ['#', 'Date', 'Time', 'Operator', 'Operation', 'Batch_Product', 'Quantity', 'Status', 'StartedAt', 'FinishedAt'];
    const rows = filtered.map((r, i) => [
      i + 1,
      r.date,
      r.time,
      `"${(r.worker || '').replace(/"/g, '""')}"`,
      `"${(r.task || '').replace(/"/g, '""')}"`,
      `"${(r.product || '').replace(/"/g, '""')}"`,
      `"${(r.quantity || '').replace(/"/g, '""')}"`,
      r.status || 'pending',
      r.startedAt || '',
      r.finishedAt || ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `factory_production_${getTodayDateString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Print PDF Report
  function printPDFReport() {
    const filtered = getFilteredAdminRecords();
    const t = I18N[currentLang];
    if (filtered.length === 0) {
      showToast(currentLang === 'ar' ? 'لا توجد سجلات للطباعة' : 'No records to print', true);
      return;
    }

    const todayStr = getTodayDateString();
    const timeNow = getExactTimeString();
    const isRtl = currentLang === 'ar';

    const stageNames = {
      pending: isRtl ? 'قيد الانتظار' : 'Pending',
      in_progress: isRtl ? 'قيد التشغيل' : 'In Progress',
      completed: isRtl ? 'مكتمل ومغلق' : 'Completed'
    };

    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html ${isRtl ? 'dir="rtl" lang="ar"' : 'dir="ltr" lang="en"'}>
      <head>
        <meta charset="UTF-8">
        <title>Manufacturing Production Report - ${todayStr}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", sans-serif; padding: 25px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e2540; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 18px; font-weight: bold; color: #1e2540; }
          .subtitle { font-size: 12px; color: #64748b; }
          .meta { font-size: 11px; color: #475569; text-align: ${isRtl ? 'left' : 'right'}; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
          th { background-color: #1e2540; color: white; padding: 8px 10px; border: 1px solid #141a2e; text-align: ${isRtl ? 'right' : 'left'}; }
          td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: ${isRtl ? 'right' : 'left'}; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .center { text-align: center; }
          .qty { font-weight: bold; text-align: center; }
          .summary { margin-top: 25px; display: flex; justify-content: space-between; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-family: monospace; }
          .signature { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
          @media print { button { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">UG ENTERPRISE PRODUCTION REPORT</div>
            <div class="subtitle">${isRtl ? 'سجل العمليات التشغيلية اليومي' : 'Daily Manufacturing Operations & Dispatch Log'}</div>
          </div>
          <div class="meta">
            <div><strong>${isRtl ? 'التاريخ:' : 'Date:'}</strong> ${todayStr}</div>
            <div><strong>${isRtl ? 'الوقت:' : 'Time:'}</strong> ${timeNow}</div>
            <div><strong>${isRtl ? 'المستخدم:' : 'User:'}</strong> ${currentUser ? currentUser.username : 'admin'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px;" class="center">#</th>
              <th>${t.thDate}</th>
              <th class="center">${t.thTime}</th>
              <th>${t.thWorker}</th>
              <th>${t.thTask}</th>
              <th>${t.thProduct}</th>
              <th class="center">${t.thQty}</th>
              <th class="center">${t.thStatus}</th>
              <th class="center">${t.thStart}</th>
              <th class="center">${t.thFinish}</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((r, i) => `
              <tr>
                <td class="center">${i + 1}</td>
                <td>${r.date}</td>
                <td class="center font-mono">${r.time}</td>
                <td><strong>${escapeHtml(r.worker)}</strong></td>
                <td>${escapeHtml(r.task)}</td>
                <td class="font-mono">${escapeHtml(r.product || '-')}</td>
                <td class="qty font-mono">${escapeHtml(r.quantity)}</td>
                <td class="center font-mono"><strong>${stageNames[r.status] || stageNames.pending}</strong></td>
                <td class="center font-mono">${escapeHtml(r.startedAt || '-')}</td>
                <td class="center font-mono font-bold">${escapeHtml(r.finishedAt || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div>${isRtl ? 'إجمالي السجلات:' : 'Total Records:'} <strong>${filtered.length}</strong></div>
          <div>${isRtl ? 'حالة التقرير: معتمد ومكتمل' : 'Status: Certified & Closed'}</div>
        </div>

        <div class="signature">
          <div>${isRtl ? 'توقيع المشرف المسؤول: ____________________' : 'Supervisor Signature: ____________________'}</div>
          <div>${isRtl ? 'توقيع مراقبة الجودة: ____________________' : 'Quality Assurance Signature: ____________________'}</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  // Universal Login Form Submit
  async function handleUnifiedLogin(e) {
    e.preventDefault();
    const userInput = document.getElementById('login-username');
    const passInput = document.getElementById('login-password');
    const errorBox = document.getElementById('login-error-box');

    const username = userInput.value.trim();
    const password = passInput.value;

    if (!username || !password) return;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        if (errorBox) errorBox.classList.add('hidden');
        sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(data.user));
        showToast(I18N[currentLang].toastLoggedIn(data.user.name || data.user.username));
        routeUser(data.user);
        userInput.value = '';
        passInput.value = '';
      } else {
        if (errorBox) {
          errorBox.textContent = data.error || I18N[currentLang].loginError;
          errorBox.classList.remove('hidden');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      if (errorBox) {
        errorBox.textContent = I18N[currentLang].loginError;
        errorBox.classList.remove('hidden');
      }
    }
  }

  // Sign out
  function handleLogout() {
    currentUser = null;
    sessionStorage.removeItem(USER_SESSION_KEY);
    showToast(I18N[currentLang].toastLoggedOut);
    routeUser(null);
  }

  // Event Listeners
  function setupEvents() {
    // Theme & Language
    const btnTheme = document.getElementById('btn-toggle-theme');
    if (btnTheme) btnTheme.addEventListener('click', toggleTheme);

    const btnLang = document.getElementById('btn-toggle-lang');
    if (btnLang) {
      btnLang.addEventListener('click', () => {
        applyLanguage(currentLang === 'ar' ? 'en' : 'ar');
      });
    }

    // Logo click: return to active dashboard or login
    const logoBtn = document.getElementById('header-logo-btn');
    if (logoBtn) {
      logoBtn.addEventListener('click', () => {
        if (currentUser) routeUser(currentUser);
        else showView('login');
      });
    }

    // Unified Login Form
    const loginForm = document.getElementById('unified-login-form');
    if (loginForm) loginForm.addEventListener('submit', handleUnifiedLogin);

    // Quick Credential Chips Click Delegation
    document.querySelectorAll('.quick-cred-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const u = chip.getAttribute('data-u');
        const p = chip.getAttribute('data-p');
        const userInput = document.getElementById('login-username');
        const passInput = document.getElementById('login-password');
        if (userInput) userInput.value = u;
        if (passInput) passInput.value = p;
        if (userInput) userInput.focus();
      });
    });

    // Logouts
    const workerLogoutBtn = document.getElementById('worker-btn-logout');
    if (workerLogoutBtn) workerLogoutBtn.addEventListener('click', handleLogout);

    const dashLogoutBtn = document.getElementById('dash-logout-btn');
    if (dashLogoutBtn) dashLogoutBtn.addEventListener('click', handleLogout);

    // Worker Form
    const workerForm = document.getElementById('worker-form');
    if (workerForm) workerForm.addEventListener('submit', handleWorkerSubmit);

    // Worker Stage Action Delegation (Start / Finish buttons)
    const workerTasksList = document.getElementById('worker-tasks-list');
    if (workerTasksList) {
      workerTasksList.addEventListener('click', (e) => {
        const startBtn = e.target.closest('.btn-start-task');
        if (startBtn) {
          const id = startBtn.getAttribute('data-id');
          startTask(id);
          return;
        }

        const finishBtn = e.target.closest('.btn-finish-task');
        if (finishBtn) {
          const id = finishBtn.getAttribute('data-id');
          finishTask(id);
          return;
        }
      });
    }

    // Job Assignment Form (Supervisors & Admins)
    const assignJobForm = document.getElementById('assign-job-form');
    if (assignJobForm) assignJobForm.addEventListener('submit', handleAssignJobSubmit);

    // Admin Tabs Switching
    const tabProd = document.getElementById('tab-btn-production');
    if (tabProd) tabProd.addEventListener('click', () => switchAdminTab('production'));

    const tabSettings = document.getElementById('tab-btn-settings');
    if (tabSettings) tabSettings.addEventListener('click', () => switchAdminTab('settings'));

    // Admin Users Table Save Delegation
    const adminUsersTbody = document.getElementById('admin-users-table-body');
    if (adminUsersTbody) {
      adminUsersTbody.addEventListener('click', (e) => {
        const saveBtn = e.target.closest('.btn-save-user');
        if (saveBtn) {
          const username = saveBtn.getAttribute('data-username');
          saveUserCredentials(username);
        }
      });
    }

    // Supervisor Filters
    const fWorker = document.getElementById('admin-filter-worker');
    if (fWorker) fWorker.addEventListener('change', renderAdminDashboard);

    const fTask = document.getElementById('admin-filter-task');
    if (fTask) fTask.addEventListener('input', renderAdminDashboard);

    const fStatus = document.getElementById('admin-filter-status');
    if (fStatus) fStatus.addEventListener('change', renderAdminDashboard);

    const fDate = document.getElementById('admin-filter-date');
    if (fDate) fDate.addEventListener('change', renderAdminDashboard);

    const clearFilters = document.getElementById('admin-clear-filters');
    if (clearFilters) {
      clearFilters.addEventListener('click', () => {
        if (fWorker) fWorker.value = '';
        if (fTask) fTask.value = '';
        if (fStatus) fStatus.value = '';
        if (fDate) fDate.value = '';
        renderAdminDashboard();
      });
    }

    // Supervisor Table Delete Delegation
    const adminTbody = document.getElementById('admin-table-body');
    if (adminTbody) {
      adminTbody.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.delete-record-btn');
        if (delBtn) {
          const id = delBtn.getAttribute('data-id');
          deleteRecord(id);
        }
      });
    }

    // Exports
    const btnExcel = document.getElementById('admin-export-excel');
    if (btnExcel) btnExcel.addEventListener('click', exportFormattedExcel);

    const btnCsv = document.getElementById('admin-export-csv');
    if (btnCsv) btnCsv.addEventListener('click', exportCSV);

    const btnPrint = document.getElementById('admin-print-report');
    if (btnPrint) btnPrint.addEventListener('click', printPDFReport);
  }

  // Boot
  async function init() {
    await loadData();
    applyTheme(currentTheme);
    applyLanguage(currentLang);
    startClock();
    setupEvents();

    if (currentUser) {
      routeUser(currentUser);
    } else {
      showView('login');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
