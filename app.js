/**
 * UG Enterprise Production Operations ERP
 * Role-Based Access Control (RBAC):
 * - 5 Operators (worker1..worker5): Worker portal only. Simplified work order execution and 3-stage irreversible workflow.
 * - 3 Supervisors (supervisor1..supervisor3): Production Operations Dashboard, KPIs, Job Order Dispatch, and Excel/CSV/PDF exports.
 * - 1 Admin (admin): Production Dashboard + User Management tab to inspect and edit system credentials.
 */

(function () {
  'use strict';

  const API_BASE = (typeof window !== 'undefined' && (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000')))
    ? 'http://localhost:3000/api'
    : '/api';

  // Default fallback users for zero-downtime offline support
  const DEFAULT_USERS = [
    { username: 'Admin', password: '123', role: 'admin', name: 'حمزه', roleTitle: 'مدير النظام' },
    { username: 'Salwa', password: '123', role: 'admin', name: 'سلوى', roleTitle: 'مدير تنفيذي' },
    { username: 'Hossam', password: '123', role: 'admin', name: 'حسام', roleTitle: 'مدير انتاج' },
    { username: 'Ahmed Khaled', password: '123', role: 'supervisor', name: 'احمد خالد', roleTitle: 'مشرف انتاج' },
    { username: 'Mohamed Saeed', password: '123', role: 'worker', name: 'محمد سعيد', roleTitle: 'عامل' },
    { username: 'Ahmed Abd El Nasser', password: '123', role: 'worker', name: 'احمد عبد الناصر', roleTitle: 'عامل' },
    { username: 'Mohamed Hamdy', password: '123', role: 'worker', name: 'محمد حمدي', roleTitle: 'عامل' },
    { username: 'Youseef Khaled', password: '123', role: 'worker', name: 'يوسف خالد', roleTitle: 'عامل' }
  ];

  const WORKER_NAMES = {
    worker1: { ar: 'محمد سعيد', en: 'Mohamed Saeed' },
    worker2: { ar: 'احمد عبد الناصر', en: 'Ahmed Abdel Nasser' },
    worker3: { ar: 'محمد حمدي', en: 'Mohamed Hamdy' },
    worker4: { ar: 'يوسف خالد', en: 'Youssef Khaled' },
    'mohamed saeed': { ar: 'محمد سعيد', en: 'Mohamed Saeed' },
    'ahmed abd el nasser': { ar: 'احمد عبد الناصر', en: 'Ahmed Abdel Nasser' },
    'mohamed hamdy': { ar: 'محمد حمدي', en: 'Mohamed Hamdy' },
    'youseef khaled': { ar: 'يوسف خالد', en: 'Youssef Khaled' },
    'youssef khaled': { ar: 'يوسف خالد', en: 'Youssef Khaled' }
  };

  function getWorkerDisplayName(workerIdentifier, lang = currentLang) {
    if (!workerIdentifier) return '';
    const id = String(workerIdentifier).trim();
    const lower = id.toLowerCase();
    if (WORKER_NAMES[lower]) {
      return lang === 'en' ? WORKER_NAMES[lower].en : WORKER_NAMES[lower].ar;
    }
    try {
      const users = getLocalUsers();
      const u = users.find(x => (x.username || '').toLowerCase() === lower);
      if (u && u.name && u.name !== id) {
        return u.name;
      }
    } catch (_) {}
    return id;
  }

  function getLocalUsers() {
    try {
      const stored = localStorage.getItem('ug_production_users');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(u => u.username !== 'worker5');
        }
      }
    } catch (e) {
      console.warn('Could not read cached users', e);
    }
    return DEFAULT_USERS;
  }

  // Storage Keys
  const STORAGE_KEY = 'factory_prod_logs_v3';
  const OVERTIME_STORAGE_KEY = 'factory_overtime_logs_v1';
  const USER_SESSION_KEY = 'factory_user_session_v5';
  const LANG_KEY = 'factory_prod_lang_v1';
  const THEME_KEY = 'factory_prod_theme_v1';

  // State
  let records = [];
  let overtimeRecords = [];
  let currentUser = null; // { username, role, name }
  let currentLang = 'ar';
  let currentTheme = 'light';
  let currentAdminTab = 'production'; // 'production' | 'overtime' | 'settings'
  let selectedPortal = null; // 'worker' | 'overtime' | 'admin' | null

  // Translations
  const I18N = {
    en: {
      langBtn: 'العربية',
      themeDark: 'DARK',
      themeLight: 'LIGHT',
      headerTitle: 'Production ERP',

      portalMainHeading: 'Factory Daily Production Logger',
      portalMainSubheading: 'Fast and direct production logging on the shop floor. Select a portal to proceed.',
      portalWorkerTitle: 'Worker Portal',
      portalWorkerDesc: 'Sign in with your account to execute work orders and log production quantities (kg/g) immediately.',
      portalWorkerAction: 'Enter Worker Portal →',
      portalOvertimeTitle: 'Night Shift Portal',
      portalOvertimeDesc: 'Overtime and night attendance check-out. Register departure time directly.',
      portalOvertimeAction: 'Enter Night Shift Portal →',
      portalAdminTitle: 'Management Portal',
      portalAdminDesc: 'Manage, filter, search, and export all production records.',
      portalAdminAction: 'Supervisor Sign In →',
      btnBackPortals: 'Back to Portals',

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
      lblTaskSelect: 'Operation *',
      lblProductInput: 'Product *',
      placeholderProduct: 'Product name...',
      lblWeightInput: 'Target Quantity *',
      placeholderWeight: 'Quantity...',
      lblUnitSelect: 'Unit of Measure *',
      lblClockTitle: 'System Captured Time:',
      btnSubmitTask: 'Register Work Order',
      workerStagesTitle: 'Work Orders & Operations',
      workerStagesDesc: 'Sequence: 1. Pending -> 2. In Progress (Timestamp captured) -> 3. Completed (Timestamp captured). Irreversible.',
      stage1Label: '1. PENDING',
      stage2Label: '2. IN PROGRESS',
      stage3Label: '3. COMPLETED',
      btnStartTask: 'Start Production',
      btnFinishTask: 'Complete Task',
      taskStartedAt: 'Started:',
      taskFinishedAt: 'Finished:',
      taskCompletedLocked: 'Completed & Locked',
      noTasksYet: 'No active work orders assigned to you',
      noTasksTip: 'Select operation, product, and quantity above, then register to begin',

      dashSupervisor: 'Supervisor:',
      dashAdmin: 'Administrator:',
      dashSubtitle: 'Monitoring manufacturing lines & operations',
      tabProduction: 'Production Operations',
      tabSettings: 'User Management',
      btnExportExcel: 'Export Excel',
      btnExportCsv: 'Export CSV',
      btnPrintReport: 'Print PDF',
      dashLogout: 'Sign Out',
      usersMgmtTitle: 'System User Accounts & Credentials Management',
      usersMgmtDesc: 'Modify display names and passwords for operators (4 operators), supervisors (3 supervisors), and system owner.',
      thURole: 'Role & Permission',
      thUUsername: 'Username',
      thUName: 'Display Name',
      thUPassword: 'Password',
      thUAction: 'Save Action',
      lblCredWorkers: 'Production Operators (Password: 123):',
      lblCredSupervisors: 'Supervisors & Management (Password: 123):',
      lblCredAdmin: 'System Administrator (Password: 123):',
      optFilterAllWorkers: 'All Operators',
      optFilterAllStatuses: 'All Operational Stages',
      optStatusPending: 'Pending',
      optStatusInProgress: 'In Progress',
      optStatusCompleted: 'Completed',
      statLogs: 'Total Work Orders',
      statWorkers: 'Active Operators',
      kpiHeading: 'Operator Performance Metrics',
      kpiSubheading: 'Completed tasks, average task duration, and operator throughput',
      kpiLblOverallAvg: 'Overall Avg Duration:',
      filterHeaderTitle: 'Filter & Search',
      btnClearFilters: 'Clear Filters',
      lblFWorker: 'Operator Filter',
      lblFTask: 'Operation / Product',
      placeholderFTask: 'Search operation or product...',
      lblFStatus: 'Operational Stage',
      lblFDate: 'Filter by Date',
      adminTableTitle: 'Production Master Records',
      adminFilterSummary: (shown, total) => `Displaying ${shown} of ${total} records`,
      thDate: 'Date',
      thTime: 'Time',
      thWorker: 'Operator',
      thTask: 'Operation',
      thProduct: 'Product',
      thQty: 'Quantity',
      thStatus: 'Status',
      thStart: 'Started',
      thFinish: 'Finished',
      thAction: 'Action',
      btnDelete: 'Delete',
      lblAssignWorker: 'Target Operator *',
      lblAssignTask: 'Operation *',
      lblAssignProduct: 'Product *',
      placeholderAssignProduct: 'Product name...',
      assignHeading: 'Dispatch Work Order',
      assignSubheading: 'Specify operator, operation, and required quantity for immediate dispatch',
      lblAssignWeight: 'Quantity & Unit *',
      placeholderAssignWeight: 'Quantity...',
      btnAssignSubmit: 'Dispatch Work Order',
      adminEmpty: 'No production work orders recorded yet.',
      adminFilterEmpty: 'No records match search criteria.',
      confirmDelete: (w, q, t) => `Delete work order for "${w}" (${q} - ${t})?`,
      deleteModalTitle: 'Confirm Work Order Deletion',
      deleteModalDesc: 'Are you sure you want to permanently delete this production record? This action cannot be undone.',
      deleteModalWorker: 'Operator:',
      deleteModalTask: 'Operation:',
      deleteModalProduct: 'Product:',
      deleteModalQty: 'Recorded Quantity:',
      deleteModalCancel: 'Cancel',
      deleteModalConfirm: 'Delete Record',
      footerText: 'UG Production Operations ERP • Internal Manufacturing System',

      toastTaskAdded: (t, p) => `Work order registered: ${t} - ${p}`,
      toastTaskStarted: (t, time) => `Production started: ${t} at ${time}`,
      toastTaskFinished: (t, time) => `Task completed: ${t} at ${time}`,
      toastDeleted: 'Record deleted successfully',
      toastLoggedIn: (u) => `Authenticated: ${u}`,
      toastLoggedOut: 'Signed out successfully',
      toastUserUpdated: 'Credentials updated successfully',

      lblLoggedOvertimeWorker: 'Operator:',
      overtimeHeaderDesc: 'Night shift departure & factory sign-out log',
      overtimeLogout: 'Sign Out',
      overtimeBoxTitle: 'Night Shift Sign-Out Punch',
      overtimeBoxDesc: 'Click the button below upon finishing your shift to log your departure time directly into the factory register.',
      lblOvertimeNotes: 'Shift notes or completed tasks (Optional):',
      placeholderOvertimeNotes: 'e.g., Completed packaging line maintenance and cleanup...',
      btnOvertimeSubmit: 'Clock Out & Complete Shift',
      overtimeSuccessMsg: (time) => `Night shift punch recorded successfully at ${time}`,
      overtimeHistoryTitle: 'Your Previous Night Shift Punches',
      thOtDate: 'Date',
      thOtTime: 'Clock-Out Time',
      thOtNotes: 'Notes',
      otEmptyWorkerHistory: 'No night shift punches recorded yet',

      tabOvertime: 'Night Shift Register',
      overtimeMgmtTitle: 'Night Shift & Overtime Attendance Register',
      overtimeMgmtDesc: 'Official log of operator departure and overtime completion times with export capabilities.',
      btnOtExportExcel: 'Export Excel',
      btnOtExportCsv: 'Export CSV',
      btnOtPrintReport: 'Print PDF',
      statOtTotal: 'Total Overtime Punches',
      statOtToday: 'Today\'s Punches',
      otFilterTitle: 'Filter Night Shift Records',
      lblFOtWorker: 'Operator Filter',
      lblFOtDate: 'Date Filter',
      optOtFilterAllWorkers: 'All Operators',
      thMOtDate: 'Date',
      thMOtTime: 'Departure / Clock-Out Time',
      thMOtWorker: 'Operator Name',
      thMOtUser: 'Username',
      thMOtNotes: 'Notes',
      thMOtAction: 'Action',
      btnOtDelete: 'Delete',
      confirmOtDelete: (w, time) => `Delete overtime record for ${w} at ${time}?`,
      toastOvertimeLogged: (w, time) => `Overtime logged: ${w} at ${time}`,
      toastOvertimeDeleted: 'Overtime record deleted successfully',
      otEmptyAdminTable: 'No overtime records recorded yet.',
      otEmptyAdminFiltered: 'No overtime records match search criteria.'
    },

    ar: {
      langBtn: 'English',
      themeDark: 'الداكن',
      themeLight: 'الفاتح',
      headerTitle: 'نظام إدارة عمليات الإنتاج',

      portalMainHeading: 'مسجّل الإنتاج اليومي للمصنع',
      portalMainSubheading: 'تسجيل سريع ومباشر للإنتاج في صالة العمل. اختر البوابة للمتابعة.',
      portalWorkerTitle: 'بوابة العمال',
      portalWorkerDesc: 'سجّل الدخول بحسابك لتسجيل كميات الإنتاج (كجم/جرام) وتنفيذ أوامر التشغيل فوراً.',
      portalWorkerAction: 'دخول بوابة العمال ←',
      portalOvertimeTitle: 'بوابة بصمة السهر',
      portalOvertimeDesc: 'تسجيل انصراف ومواعيد السهر للعمال. وثق وقت خروجك الفعلي مباشرة.',
      portalOvertimeAction: 'دخول بوابة السهر ←',
      portalAdminTitle: 'بوابة الإدارة',
      portalAdminDesc: 'إدارة، تصفية، بحث، وتصدير جميع سجلات الإنتاج.',
      portalAdminAction: 'تسجيل دخول المشرفين ←',
      btnBackPortals: 'العودة للبوابات',

      loginHeading: 'نظام إدارة عمليات الإنتاج',
      loginSubheading: 'أدخل بيانات الاعتماد للمصادقة وتحديد مستوى الصلاحيات',
      lblLoginUser: 'اسم المستخدم *',
      placeholderLoginUser: 'اسم المستخدم...',
      lblLoginPass: 'كلمة المرور *',
      placeholderLoginPass: 'كلمة المرور...',
      btnLoginSubmit: 'تسجيل الدخول',
      loginError: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
      lblQuickCreds: 'حسابات النظام الافتراضية (انقر للتعبئة السريعة):',

      workerLoggedAs: 'مشغل الوردية:',
      workerHeaderDesc: 'تسجيل أوامر التشغيل ومتابعة المراحل التنفيذية',
      workerLogout: 'تسجيل الخروج',
      formHeading: 'تسجيل أمر إنتاج جديد',
      lblTaskSelect: 'نوع العملية التشغيلية *',
      lblProductInput: 'المنتج *',
      placeholderProduct: 'اسم المنتج...',
      lblWeightInput: 'الكمية المستهدفة *',
      placeholderWeight: 'الوزن أو العدد...',
      lblUnitSelect: 'وحدة القياس *',
      lblClockTitle: 'وقت التسجيل في النظام:',
      btnSubmitTask: 'إدراج أمر العمل وبدء المراحل التشغيلية',
      workerStagesTitle: 'أوامر العمل ومراحل التنفيذ',
      workerStagesDesc: 'تسلسل العمل: 1. قيد الانتظار ← 2. قيد التشغيل (تسجيل وقت البدء) ← 3. مكتمل (تسجيل وقت الإنجاز).',
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
      usersMgmtTitle: 'إدارة حسابات النظام وبيانات الدخول',
      usersMgmtDesc: 'تعديل أسماء العرض وكلمات المرور للمشغلين (4 مشغلين)، والمشرفين (3 مشرفين)، ومدير النظام.',
      thURole: 'مستوى الصلاحية',
      thUUsername: 'اسم الدخول',
      thUName: 'الاسم المعروض',
      thUPassword: 'كلمة المرور',
      thUAction: 'إجراء الحفظ',
      lblCredWorkers: 'مشغلو الإنتاج (Password: 123):',
      lblCredSupervisors: 'المشرفون والإدارة (Password: 123):',
      lblCredAdmin: 'مدير النظام (System Admin - Password: 123):',
      optFilterAllWorkers: 'جميع المشغلين',
      optFilterAllStatuses: 'جميع المراحل',
      optStatusPending: 'قيد الانتظار',
      optStatusInProgress: 'قيد التشغيل',
      optStatusCompleted: 'مكتمل',
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
      thProduct: 'المنتج',
      thQty: 'الكمية',
      thStatus: 'الحالة',
      thStart: 'وقت البدء',
      thFinish: 'وقت الانتهاء',
      thAction: 'إجراء',
      btnDelete: 'حذف',
      lblAssignWorker: 'المشغل المستهدف *',
      lblAssignTask: 'العملية المطلوبة *',
      lblAssignProduct: 'المنتج *',
      placeholderAssignProduct: 'اسم المنتج...',
      assignHeading: 'إسناد أمر تشغيل لمشغل',
      assignSubheading: 'تحديد المشغل، العملية المستهدفة، والكمية المطلوبة لتظهر فوراً في جدول أعمال المشغل',
      lblAssignWeight: 'الكمية والوحدة *',
      placeholderAssignWeight: 'الكمية...',
      btnAssignSubmit: 'إسناد وتكليف أمر التشغيل',
      adminEmpty: 'لم يتم تسجيل أي عمليات إنتاج حتى الآن.',
      adminFilterEmpty: 'لا توجد سجلات تطابق معايير البحث المحددة.',
      confirmDelete: (w, q, t) => `هل أنت متأكد من حذف أمر العمل للمشغل "${w}" (${q} - ${t})؟`,
      deleteModalTitle: 'تأكيد حذف أمر التشغيل',
      deleteModalDesc: 'هل أنت متأكد من رغبتك في حذف هذا السجل بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.',
      deleteModalWorker: 'المشغل:',
      deleteModalTask: 'العملية التشغيلية:',
      deleteModalProduct: 'المنتج:',
      deleteModalQty: 'الكمية المسجلة:',
      deleteModalCancel: 'إلغاء',
      deleteModalConfirm: 'تأكيد الحذف',
      footerText: 'UG Production Operations ERP • Internal Manufacturing System',

      toastTaskAdded: (t, p) => `تم إدراج أمر العمل: ${t} - ${p}`,
      toastTaskStarted: (t, time) => `بدء تشغيل العملية: ${t} الساعة ${time}`,
      toastTaskFinished: (t, time) => `اكتملت العملية بنجاح: ${t} الساعة ${time}`,
      toastDeleted: 'تم حذف السجل بنجاح',
      toastLoggedIn: (u) => `تم تسجيل الدخول: ${u}`,
      toastLoggedOut: 'تم إنهاء الجلسة بنجاح',
      toastUserUpdated: 'تم تحديث بيانات الحساب بنجاح',

      lblLoggedOvertimeWorker: 'المشغل:',
      overtimeHeaderDesc: 'توثيق انصراف وردية السهر ومواعيد مغادرة المصنع',
      overtimeLogout: 'تسجيل الخروج',
      overtimeBoxTitle: 'تسجيل بصمة الانصراف للسهر',
      overtimeBoxDesc: 'اضغط على الزر أدناه عند انتهاء عملك لتسجيل وقت خروجك الفعلي مباشرة في سجل المصنع.',
      lblOvertimeNotes: 'ملاحظات أو الأعمال التي تم إنجازها في السهر (اختياري):',
      placeholderOvertimeNotes: 'مثال: إتمام تسليم خط التعبئة والتنظيف...',
      btnOvertimeSubmit: 'تسجيل إتمام العمل وبصمة الانصراف',
      overtimeSuccessMsg: (time) => `تم تسجيل بصمة انصراف السهر بنجاح الساعة ${time}`,
      overtimeHistoryTitle: 'سجل بصماتك السابقة',
      thOtDate: 'التاريخ',
      thOtTime: 'وقت الانصراف',
      thOtNotes: 'الملاحظات',
      otEmptyWorkerHistory: 'لم تسجل أي بصمات سهر حتى الآن',

      tabOvertime: 'كشف بصمة السهر',
      overtimeMgmtTitle: 'كشف بصمة السهر وتوثيق الانصراف',
      overtimeMgmtDesc: 'سجل معتمد لمواعيد انصراف وسهر العمال مع إمكانية التصدير والطباعة للإدارة.',
      btnOtExportExcel: 'تصدير Excel',
      btnOtExportCsv: 'تصدير CSV',
      btnOtPrintReport: 'طباعة PDF',
      statOtTotal: 'إجمالي بصمات السهر',
      statOtToday: 'بصمات سهر اليوم',
      otFilterTitle: 'تصفية سجلات السهر',
      lblFOtWorker: 'تصفية حسب المشغل',
      lblFOtDate: 'تصفية حسب التاريخ',
      optOtFilterAllWorkers: 'جميع المشغلين',
      thMOtDate: 'التاريخ',
      thMOtTime: 'وقت الانصراف والسهر',
      thMOtWorker: 'اسم العامل',
      thMOtUser: 'اسم الدخول',
      thMOtNotes: 'الملاحظات',
      thMOtAction: 'إجراء',
      btnOtDelete: 'حذف',
      confirmOtDelete: (w, time) => `هل أنت متأكد من حذف سجل بصمة السهر للعامل "${w}" في توقيت ${time}؟`,
      toastOvertimeLogged: (w, time) => `تم تسجيل بصمة السهر: ${w} الساعة ${time}`,
      toastOvertimeDeleted: 'تم حذف سجل بصمة السهر بنجاح',
      otEmptyAdminTable: 'لم يتم تسجيل أي بصمات سهر حتى الآن.',
      otEmptyAdminFiltered: 'لا توجد سجلات سهر تطابق معايير البحث.'
    }
  };

  // Digit localization (Arabic Eastern numerals ٠-٩ vs Western Arabic numerals 0-9)
  const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  function localizeDigits(val, lang = currentLang) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (lang !== 'ar') {
      // Convert Arabic digits to Western if in English
      return str.replace(/[٠-٩]/g, d => ARABIC_DIGITS.indexOf(d));
    }
    // Convert Western digits to Eastern Arabic digits
    return str.replace(/[0-9]/g, d => ARABIC_DIGITS[Number(d)]);
  }

  // Helper Date & Time
  function getTodayDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const AR_MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const EN_MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Formats dates as: ١٨ أكتوبر ٢٠٢٦ (in Arabic) or Oct 18, 2026 (in English)
  function formatDisplayDate(dateVal, lang = currentLang) {
    if (!dateVal || dateVal === '-') return '-';
    let d;
    if (dateVal instanceof Date) {
      d = dateVal;
    } else if (typeof dateVal === 'string') {
      const clean = localizeDigits(dateVal, 'en').trim();
      const parts = clean.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else if (parts[2].length === 4) {
          d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        } else {
          d = new Date(clean);
        }
      } else {
        d = new Date(clean);
      }
    } else {
      d = new Date(dateVal);
    }

    if (isNaN(d.getTime())) {
      return localizeDigits(String(dateVal), lang);
    }

    const day = d.getDate();
    const monthIdx = d.getMonth();
    const year = d.getFullYear();

    if (lang === 'ar') {
      const monthName = AR_MONTHS[monthIdx] || '';
      return `${localizeDigits(day, 'ar')} ${monthName} ${localizeDigits(year, 'ar')}`;
    } else {
      const monthName = EN_MONTHS[monthIdx] || '';
      return `${monthName} ${day}, ${year}`;
    }
  }

  // Formats time with indicator on the other side: ٠٨:١٨:٠٥ م or 08:18:05 PM
  function formatDisplayTime(timeStr, lang = currentLang) {
    if (!timeStr || timeStr === '-') return '-';
    const normalized = localizeDigits(timeStr, 'en').trim();
    const isPM = /(pm|م)/i.test(normalized);
    const isAM = /(am|ص)/i.test(normalized);
    const cleanStr = normalized.replace(/\s*(am|pm|ص|م)/gi, '').trim();
    const parts = cleanStr.split(':').map(Number);
    if (parts.length >= 2 && !parts.some(isNaN)) {
      let hours = parts[0];
      let indicator = '';
      if (isPM || isAM) {
        indicator = isPM ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
      } else {
        const pm = hours >= 12;
        hours = hours % 12 || 12;
        indicator = pm ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
      }
      const h = String(hours % 12 || 12).padStart(2, '0');
      const m = String(parts[1]).padStart(2, '0');
      const s = parts[2] !== undefined ? String(parts[2]).padStart(2, '0') : null;
      const timePart = s !== null ? `${h}:${m}:${s}` : `${h}:${m}`;
      
      const formatted = `${timePart} ${indicator}`;
      return lang === 'ar' ? localizeDigits(formatted, 'ar') : formatted;
    }
    return localizeDigits(timeStr, lang);
  }

  // Parses quantity input allowing Eastern Arabic numerals ٠-٩ and decimals ٫ or ,
  function parseQuantityInput(rawVal) {
    if (!rawVal) return null;
    const normalized = localizeDigits(String(rawVal).trim(), 'en')
      .replace(/[٫,]/g, '.')
      .replace(/[^0-9.]/g, '');
    const num = parseFloat(normalized);
    if (isNaN(num) || num <= 0) return null;
    return { num, str: normalized };
  }

  // Formats quantity and unit: in English "15 kg" or "500 g", in Arabic "١٥ كجم" or "٥٠٠ جرام"
  function formatDisplayQuantity(rawQty, rawUnit = '', lang = currentLang) {
    let val = '';
    let unit = rawUnit || '';

    if (rawQty !== null && rawQty !== undefined) {
      const str = String(rawQty).trim();
      const match = str.match(/^([\d.٠-٩٫,]+)\s*(.*)$/);
      if (match) {
        val = match[1];
        if (match[2]) unit = match[2];
      } else {
        val = str;
      }
    }

    unit = String(unit).trim().toLowerCase();
    let normalizedUnit = unit;
    if (lang === 'ar') {
      if (unit === 'kg' || unit === 'كجم') normalizedUnit = 'كجم';
      else if (unit === 'g' || unit === 'gm' || unit === 'جرام') normalizedUnit = 'جرام';
    } else {
      if (unit === 'kg' || unit === 'كجم') normalizedUnit = 'kg';
      else if (unit === 'g' || unit === 'gm' || unit === 'جرام') normalizedUnit = 'g';
    }

    const localizedVal = localizeDigits(val, lang);
    return `${localizedVal} ${normalizedUnit}`.trim();
  }

  function getExactTimeString(date = new Date(), lang = currentLang) {
    const rawHours = date.getHours();
    const isPM = rawHours >= 12;
    const ampm = lang === 'ar' ? (isPM ? 'م' : 'ص') : (isPM ? 'PM' : 'AM');
    const hours12 = rawHours % 12 || 12;
    const hours = String(hours12).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    // In Arabic: ٠٨:١٨:٠٥ م vs English: 08:18:05 PM
    const formatted = `${hours}:${minutes}:${seconds} ${ampm}`;
    return lang === 'ar' ? localizeDigits(formatted, 'ar') : formatted;
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

    // Portal Selection
    setText('portal-main-heading', t.portalMainHeading);
    setText('portal-main-subheading', t.portalMainSubheading);
    setText('portal-worker-title', t.portalWorkerTitle);
    setText('portal-worker-desc', t.portalWorkerDesc);
    setText('portal-worker-action', t.portalWorkerAction);
    setText('portal-overtime-title', t.portalOvertimeTitle);
    setText('portal-overtime-desc', t.portalOvertimeDesc);
    setText('portal-overtime-action', t.portalOvertimeAction);
    setText('portal-admin-title', t.portalAdminTitle);
    setText('portal-admin-desc', t.portalAdminDesc);
    setText('portal-admin-action', t.portalAdminAction);
    setText('btn-back-portals-text', t.btnBackPortals);

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

    // Overtime Worker View
    setText('lbl-logged-overtime-worker', t.lblLoggedOvertimeWorker);
    setText('overtime-header-desc', t.overtimeHeaderDesc);
    setText('overtime-logout-text', t.overtimeLogout);
    setText('overtime-box-title', t.overtimeBoxTitle);
    setText('overtime-box-desc', t.overtimeBoxDesc);
    setText('lbl-overtime-notes', t.lblOvertimeNotes);
    setPlaceholder('overtime-notes', t.placeholderOvertimeNotes);
    setText('btn-overtime-text', t.btnOvertimeSubmit);
    setText('overtime-history-title', t.overtimeHistoryTitle);
    setText('th-ot-date', t.thOtDate);
    setText('th-ot-time', t.thOtTime);
    setText('th-ot-notes', t.thOtNotes);

    // Dashboard View
    setText('tab-btn-production', t.tabProduction);
    setText('tab-btn-overtime', t.tabOvertime);
    setText('tab-btn-settings', t.tabSettings);
    setText('btn-export-excel-text', t.btnExportExcel);
    setText('btn-export-csv-text', t.btnExportCsv);
    setText('btn-print-text', t.btnPrintReport);
    setText('dash-subtitle-text', t.dashSubtitle);
    setText('dash-logout-text', t.dashLogout);
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

    // Overtime Management Subview
    setText('overtime-mgmt-title', t.overtimeMgmtTitle);
    setText('overtime-mgmt-desc', t.overtimeMgmtDesc);
    setText('btn-ot-export-excel-text', t.btnOtExportExcel);
    setText('btn-ot-export-csv-text', t.btnOtExportCsv);
    setText('btn-ot-print-text', t.btnOtPrintReport);
    setText('stat-lbl-ot-total', t.statOtTotal);
    setText('stat-lbl-ot-today', t.statOtToday);
    setText('ot-filter-title', t.otFilterTitle);
    setText('lbl-f-ot-worker', t.lblFOtWorker);
    setText('lbl-f-ot-date', t.lblFOtDate);
    setText('opt-ot-filter-all-workers', t.optOtFilterAllWorkers);
    setText('th-m-ot-date', t.thMOtDate);
    setText('th-m-ot-time', t.thMOtTime);
    setText('th-m-ot-worker', t.thMOtWorker);
    setText('th-m-ot-user', t.thMOtUser);
    setText('th-m-ot-notes', t.thMOtNotes);
    setText('th-m-ot-action', t.thMOtAction);

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
    setText('assign-heading', t.assignHeading);
    setText('assign-subheading', t.assignSubheading);
    setText('lbl-assign-worker', t.lblAssignWorker);
    setText('lbl-assign-task', t.lblAssignTask);
    setText('lbl-assign-product', t.lblAssignProduct);
    setPlaceholder('assign-product-input', t.placeholderAssignProduct);
    setText('lbl-assign-weight', t.lblAssignWeight);
    setPlaceholder('assign-weight-input', t.placeholderAssignWeight);
    setText('btn-assign-text', t.btnAssignSubmit);

    // User Management View
    setText('users-mgmt-title', t.usersMgmtTitle);
    setText('users-mgmt-desc', t.usersMgmtDesc);
    setText('th-u-role', t.thURole);
    setText('th-u-username', t.thUUsername);
    setText('th-u-name', t.thUName);
    setText('th-u-password', t.thUPassword);
    setText('th-u-action', t.thUAction);

    // Quick Credential Group Labels
    setText('lbl-cred-workers', t.lblCredWorkers);
    setText('lbl-cred-supervisors', t.lblCredSupervisors);
    setText('lbl-cred-admin', t.lblCredAdmin);

    // Filter Status Options
    setText('opt-filter-all-workers', t.optFilterAllWorkers);
    setText('opt-filter-all-statuses', t.optFilterAllStatuses);
    setText('opt-status-pending', t.optStatusPending);
    setText('opt-status-in-progress', t.optStatusInProgress);
    setText('opt-status-completed', t.optStatusCompleted);

    // Update Quick Cred Buttons
    document.querySelectorAll('.quick-cred-chip').forEach(btn => {
      const txt = btn.getAttribute(`data-label-${lang}`);
      if (txt) btn.textContent = txt;
    });

    // Update Task & Worker Select Options
    ['worker-task-select', 'assign-task-select', 'assign-worker-select', 'admin-filter-worker', 'admin-filter-ot-worker'].forEach(selectId => {
      const sel = document.getElementById(selectId);
      if (!sel) return;
      Array.from(sel.options).forEach(opt => {
        const label = opt.getAttribute(`data-label-${lang}`);
        if (label) opt.textContent = label;
      });
    });

    // Delete Modal
    setText('delete-modal-title', t.deleteModalTitle);
    setText('delete-modal-desc', t.deleteModalDesc);
    setText('delete-modal-lbl-worker', t.deleteModalWorker);
    setText('delete-modal-lbl-task', t.deleteModalTask);
    setText('delete-modal-lbl-product', t.deleteModalProduct);
    setText('delete-modal-lbl-qty', t.deleteModalQty);
    setText('delete-modal-cancel-btn', t.deleteModalCancel);
    setText('delete-modal-confirm-text', t.deleteModalConfirm);

    // Update Unit Dropdown Options (kg / g in English, كجم / جرام in Arabic)
    const unitOptions = lang === 'ar'
      ? '<option value="kg">كجم</option><option value="g">جرام</option>'
      : '<option value="kg">kg</option><option value="g">g</option>';

    const workerUnitEl = document.getElementById('worker-unit-select');
    if (workerUnitEl) {
      const prevVal = workerUnitEl.value;
      workerUnitEl.innerHTML = unitOptions;
      if (prevVal) workerUnitEl.value = (prevVal === 'g' || prevVal === 'gm' || prevVal === 'جرام') ? 'g' : 'kg';
    }

    const assignUnitEl = document.getElementById('assign-unit-select');
    if (assignUnitEl) {
      const prevVal = assignUnitEl.value;
      assignUnitEl.innerHTML = unitOptions;
      if (prevVal) assignUnitEl.value = (prevVal === 'g' || prevVal === 'gm' || prevVal === 'جرام') ? 'g' : 'kg';
    }

    if (currentUser) {
      if (currentUser.role === 'worker') {
        const nameEl = document.getElementById('worker-active-name');
        const otNameEl = document.getElementById('overtime-active-name');
        const displayName = currentUser.name || getWorkerDisplayName(currentUser.username, lang);
        if (nameEl) nameEl.textContent = displayName;
        if (otNameEl) otNameEl.textContent = displayName;
        renderWorkerTasks();
        renderWorkerOvertimeHistory();
      } else {
        const mappedRole = (currentUser.roleTitle && ROLE_LABELS[lang] && ROLE_LABELS[lang][currentUser.roleTitle]) 
          ? ROLE_LABELS[lang][currentUser.roleTitle]
          : (currentUser.role === 'admin' ? t.dashAdmin : t.dashSupervisor);
        setText('dash-role-badge', mappedRole ? `${mappedRole}:` : '');
        renderAdminDashboard();
        if (currentAdminTab === 'overtime') {
          renderAdminOvertimeTable();
        } else if (currentAdminTab === 'settings' && isServerOwner(currentUser)) {
          loadAdminUsersTable();
        }
      }
    }
  }

  // Live Clock
  function startClock() {
    const clockEl = document.getElementById('header-live-time');
    const workerBadge = document.getElementById('worker-clock-badge');
    const otClockEl = document.getElementById('overtime-live-clock');

    function update() {
      const now = new Date();
      const timeStr = getExactTimeString(now, currentLang);
      const isAr = currentLang === 'ar';
      const dateStr = formatDisplayDate(now, currentLang);

      if (clockEl) clockEl.textContent = `${timeStr} | ${dateStr}`;
      if (workerBadge) workerBadge.textContent = `${timeStr} (${isAr ? 'توقيت النظام' : 'SYSTEM TIME'})`;
      if (otClockEl) otClockEl.textContent = `${timeStr} | ${dateStr}`;
    }

    update();
    setInterval(update, 1000);
  }

  // View Navigation
  function showView(viewId) {
    const viewPortals = document.getElementById('view-portal-selection');
    const viewLogin = document.getElementById('view-login');
    const viewWorker = document.getElementById('view-worker');
    const viewOvertime = document.getElementById('view-overtime');
    const viewDash = document.getElementById('view-supervisor-dashboard');

    if (viewPortals) viewPortals.classList.add('hidden');
    if (viewLogin) viewLogin.classList.add('hidden');
    if (viewWorker) viewWorker.classList.add('hidden');
    if (viewOvertime) viewOvertime.classList.add('hidden');
    if (viewDash) viewDash.classList.add('hidden');

    if (viewId === 'portals' && viewPortals) {
      viewPortals.classList.remove('hidden');
    } else if (viewId === 'login' && viewLogin) {
      viewLogin.classList.remove('hidden');
      updateLoginPortalContext();
    } else if (viewId === 'worker' && viewWorker) {
      viewWorker.classList.remove('hidden');
    } else if (viewId === 'overtime' && viewOvertime) {
      viewOvertime.classList.remove('hidden');
    } else if (viewId === 'supervisor-dashboard' && viewDash) {
      viewDash.classList.remove('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openPortalLogin(portalType) {
    selectedPortal = portalType;
    showView('login');
  }

  function updateLoginPortalContext() {
    const heading = document.getElementById('login-heading');
    const subheading = document.getElementById('login-subheading');
    const grpWorkers = document.getElementById('cred-group-workers');
    const grpSupervisors = document.getElementById('cred-group-supervisors');
    const grpAdmin = document.getElementById('cred-group-admin');
    const isAr = currentLang === 'ar';

    if (selectedPortal === 'worker') {
      if (heading) heading.textContent = isAr ? 'تسجيل دخول مشغلي الإنتاج' : 'Worker Portal Sign In';
      if (subheading) subheading.textContent = isAr ? 'أدخل اسم المشغل وكلمة المرور لمتابعة مهامك اليومية' : 'Enter your operator credentials to manage daily tasks';
      if (grpWorkers) grpWorkers.classList.remove('hidden');
      if (grpSupervisors) grpSupervisors.classList.add('hidden');
      if (grpAdmin) grpAdmin.classList.add('hidden');
    } else if (selectedPortal === 'overtime') {
      if (heading) heading.textContent = isAr ? 'تسجيل دخول بوابة بصمة السهر' : 'Night Shift Portal Sign In';
      if (subheading) subheading.textContent = isAr ? 'أدخل اسمك وكلمة المرور لتوثيق انصراف وردية السهر' : 'Enter credentials to record night shift attendance and clock-out';
      if (grpWorkers) grpWorkers.classList.remove('hidden');
      if (grpSupervisors) grpSupervisors.classList.add('hidden');
      if (grpAdmin) grpAdmin.classList.add('hidden');
    } else if (selectedPortal === 'admin') {
      if (heading) heading.textContent = isAr ? 'تسجيل دخول المشرفين والإدارة' : 'Supervisor & Admin Sign In';
      if (subheading) subheading.textContent = isAr ? 'لوحة المراقبة التشغيلية، مؤشرات الأداء، وإدارة الصلاحيات' : 'Production operations control, KPIs, and access management';
      if (grpWorkers) grpWorkers.classList.add('hidden');
      if (grpSupervisors) grpSupervisors.classList.remove('hidden');
      if (grpAdmin) grpAdmin.classList.remove('hidden');
    } else {
      if (heading) heading.textContent = I18N[currentLang].loginHeading;
      if (subheading) subheading.textContent = I18N[currentLang].loginSubheading;
      if (grpWorkers) grpWorkers.classList.remove('hidden');
      if (grpSupervisors) grpSupervisors.classList.remove('hidden');
      if (grpAdmin) grpAdmin.classList.remove('hidden');
    }
  }

  const ROLE_LABELS = {
    en: {
      'مدير النظام': 'System Administrator',
      'System Administrator': 'System Administrator',
      'اونر السيرفر': 'System Administrator',
      'Server Owner': 'System Administrator',
      'مدير تنفيذي': 'Executive Director',
      'Executive Director': 'Executive Director',
      'مدير انتاج': 'Production Manager',
      'Production Manager': 'Production Manager',
      'مشرف انتاج': 'Production Supervisor',
      'Production Supervisor': 'Production Supervisor',
      'عامل': 'Worker',
      'Worker': 'Worker',
      'عمال': 'Worker',
      'Workers': 'Worker'
    },
    ar: {
      'مدير النظام': 'مدير النظام',
      'System Administrator': 'مدير النظام',
      'اونر السيرفر': 'مدير النظام',
      'Server Owner': 'مدير النظام',
      'مدير تنفيذي': 'مدير تنفيذي',
      'Executive Director': 'مدير تنفيذي',
      'مدير انتاج': 'مدير انتاج',
      'Production Manager': 'مدير انتاج',
      'مشرف انتاج': 'مشرف انتاج',
      'Production Supervisor': 'مشرف انتاج',
      'عامل': 'عامل',
      'Worker': 'عامل',
      'عمال': 'عامل',
      'Workers': 'عامل'
    }
  };

  function isServerOwner(user) {
    if (!user) return false;
    const u = String(user.username || '').toLowerCase();
    const title = String(user.roleTitle || '').trim();
    return u === 'hamza' || u === 'admin' || title === 'مدير النظام' || title === 'System Administrator' || title === 'اونر السيرفر' || title === 'Server Owner';
  }

  // Role-based Router
  function routeUser(user) {
    currentUser = user;
    const t = I18N[currentLang];

    if (!user) {
      showView('portals');
      return;
    }

    if (user.role === 'worker') {
      const displayName = user.name || getWorkerDisplayName(user.username, currentLang);

      if (selectedPortal === 'overtime') {
        const otNameEl = document.getElementById('overtime-active-name');
        if (otNameEl) otNameEl.textContent = displayName;
        showView('overtime');
        loadOvertimeRecords();
      } else {
        const nameEl = document.getElementById('worker-active-name');
        if (nameEl) nameEl.textContent = displayName;
        showView('worker');
        renderWorkerTasks();
      }
    } else if (user.role === 'supervisor' || user.role === 'admin') {
      const userDisplay = document.getElementById('dash-username-display');
      const roleBadge = document.getElementById('dash-role-badge');
      const adminTabs = document.getElementById('admin-tabs-container');
      const tabSettings = document.getElementById('tab-btn-settings');
      const userIcon = document.getElementById('dash-user-icon');

      if (userDisplay) userDisplay.textContent = user.name || user.username;
      if (roleBadge) {
        const mappedRole = (user.roleTitle && ROLE_LABELS[currentLang] && ROLE_LABELS[currentLang][user.roleTitle]) 
          ? ROLE_LABELS[currentLang][user.roleTitle] 
          : (user.role === 'admin' ? t.dashAdmin : t.dashSupervisor);
        roleBadge.textContent = mappedRole ? `${mappedRole}:` : '';
      }
      if (userIcon) {
        userIcon.textContent = isServerOwner(user) ? 'OWN' : (user.role === 'admin' ? 'ADM' : 'SUP');
      }

      // The tabs container is visible to ALL management (supervisors and server owner)
      if (adminTabs) adminTabs.classList.remove('hidden');

      // User management tab is strictly visible only to Server Owner (Hamza)
      const canManageUsers = isServerOwner(user);
      if (tabSettings) {
        if (canManageUsers) {
          tabSettings.classList.remove('hidden');
          tabSettings.style.display = '';
        } else {
          tabSettings.classList.add('hidden');
          tabSettings.style.display = 'none';
        }
      }

      const initialTab = selectedPortal === 'overtime' ? 'overtime' : (currentAdminTab || 'production');
      switchAdminTab(initialTab);

      showView('supervisor-dashboard');
      loadOvertimeRecords();
      renderAdminDashboard();
    }
  }

  // Admin Tab Switcher (Production vs Overtime vs Admin Settings)
  function switchAdminTab(tabName) {
    const isOwner = isServerOwner(currentUser);
    if (tabName === 'settings' && !isOwner) {
      tabName = 'production';
    }
    currentAdminTab = tabName;
    const tabBtnProd = document.getElementById('tab-btn-production');
    const tabBtnOt = document.getElementById('tab-btn-overtime');
    const tabBtnSettings = document.getElementById('tab-btn-settings');
    const subProd = document.getElementById('subview-production');
    const subOt = document.getElementById('subview-overtime');
    const subSettings = document.getElementById('subview-settings');

    const activeClass = 'px-3 py-1.5 rounded bg-white dark:bg-slate-900 text-[#1e2540] dark:text-[#d4aa65] shadow-sm transition';
    const inactiveClass = 'px-3 py-1.5 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition';

    if (tabBtnProd) tabBtnProd.className = tabName === 'production' ? activeClass : inactiveClass;
    if (tabBtnOt) tabBtnOt.className = tabName === 'overtime' ? activeClass : inactiveClass;
    if (tabBtnSettings) {
      if (isOwner) {
        tabBtnSettings.className = (tabName === 'settings' ? activeClass : inactiveClass);
        tabBtnSettings.classList.remove('hidden');
        tabBtnSettings.style.display = '';
      } else {
        tabBtnSettings.className = inactiveClass + ' hidden';
        tabBtnSettings.classList.add('hidden');
        tabBtnSettings.style.display = 'none';
      }
    }

    if (subProd) subProd.classList.toggle('hidden', tabName !== 'production');
    if (subOt) subOt.classList.toggle('hidden', tabName !== 'overtime');
    if (subSettings) subSettings.classList.toggle('hidden', !isOwner || tabName !== 'settings');

    if (tabName === 'settings') {
      loadAdminUsersTable();
    } else if (tabName === 'overtime') {
      loadOvertimeRecords();
      renderAdminOvertimeTable();
    } else {
      renderAdminDashboard();
    }
  }

  // Load Admin Users Credentials Table
  async function loadAdminUsersTable() {
    const tbody = document.getElementById('admin-users-table-body');
    if (!tbody) return;

    if (!isServerOwner(currentUser)) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-xs text-rose-600 font-bold">صلاحية إدارة المستخدمين مقتصرة على اونر السيرفر (حمزه) فقط</td></tr>`;
      return;
    }

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

      const isAr = currentLang === 'ar';

      function renderRoleSelector(u) {
        const currentTitle = u.roleTitle || (
          u.role === 'admin' ? 'مدير النظام' :
          u.role === 'supervisor' ? 'مشرف انتاج' :
          'عامل'
        );

        const isEn = currentLang === 'en';
        const options = [
          { value: 'مدير النظام', role: 'admin', label: isEn ? 'System Administrator' : 'مدير النظام' },
          { value: 'مدير تنفيذي', role: 'admin', label: isEn ? 'Executive Director' : 'مدير تنفيذي' },
          { value: 'مدير انتاج', role: 'admin', label: isEn ? 'Production Manager' : 'مدير انتاج' },
          { value: 'مشرف انتاج', role: 'supervisor', label: isEn ? 'Production Supervisor' : 'مشرف انتاج' },
          { value: 'عامل', role: 'worker', label: isEn ? 'Worker' : 'عامل' }
        ];

        return `
          <select class="user-edit-role-select text-xs font-bold rounded px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-[#1e2540] cursor-pointer"
            data-username="${escapeHtml(u.username)}">
            ${options.map(opt => `
              <option value="${opt.value}" data-role="${opt.role}" ${currentTitle === opt.value ? 'selected' : ''}>
                ${opt.label}
              </option>
            `).join('')}
          </select>
        `;
      }

      const validUsers = users.filter(u => u.username !== 'worker5');

      tbody.innerHTML = validUsers.map(u => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
          <td class="py-2.5 px-3">${renderRoleSelector(u)}</td>
          <td class="py-2.5 px-3 font-mono font-bold text-[#1e2540] dark:text-[#d4aa65]">${escapeHtml(u.username)}</td>
          <td class="py-2.5 px-3">
            <input type="text" class="user-edit-name w-full max-w-[180px] px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-[#1e2540]"
              data-username="${escapeHtml(u.username)}" value="${escapeHtml(u.name || getWorkerDisplayName(u.username, currentLang))}">
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
    if (!isServerOwner(currentUser)) {
      showToast(currentLang === 'ar' ? 'صلاحية التعديل مقتصرة على اونر السيرفر (حمزه) فقط' : 'Only Server Owner can edit accounts', true);
      return;
    }

    const nameInput = document.querySelector(`.user-edit-name[data-username="${username}"]`);
    const passInput = document.querySelector(`.user-edit-password[data-username="${username}"]`);
    const roleSelect = document.querySelector(`.user-edit-role-select[data-username="${username}"]`);

    const name = nameInput ? nameInput.value.trim() : '';
    const password = passInput ? passInput.value.trim() : '';
    const roleTitle = roleSelect ? roleSelect.value : '';
    const selectedOpt = roleSelect ? roleSelect.selectedOptions[0] : null;
    const role = selectedOpt ? selectedOpt.getAttribute('data-role') : (roleTitle === 'عمال' ? 'worker' : 'admin');

    if (!password) {
      showToast(currentLang === 'ar' ? 'كلمة المرور مطلوبة' : 'Password is required', true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password, role, roleTitle })
      });

      if (res.ok) {
        showToast(I18N[currentLang].toastUserUpdated);
        // Cache update
        const localUsers = getLocalUsers();
        const idx = localUsers.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
        if (idx !== -1) {
          localUsers[idx].name = name;
          localUsers[idx].password = password;
          localUsers[idx].role = role;
          localUsers[idx].roleTitle = roleTitle;
          localStorage.setItem('ug_production_users', JSON.stringify(localUsers));
        }

        if (currentUser && currentUser.username.toLowerCase() === username.toLowerCase()) {
          currentUser.name = name || currentUser.name;
          currentUser.role = role || currentUser.role;
          currentUser.roleTitle = roleTitle || currentUser.roleTitle;
          sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser));
          const userDisplay = document.getElementById('dash-username-display');
          if (userDisplay) userDisplay.textContent = currentUser.name;
          const roleBadge = document.getElementById('dash-role-badge');
          if (roleBadge) roleBadge.textContent = `${currentUser.roleTitle}:`;
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
    const parsedWeight = parseQuantityInput(weightInput.value);
    const unit = unitSelect.value.trim() || (currentLang === 'ar' ? 'كجم' : 'kg');

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

    if (!parsedWeight) {
      showToast(currentLang === 'ar' ? 'يرجى إدخال كمية صحيحة' : 'Please enter valid quantity', true);
      weightInput.focus();
      return;
    }

    const weight = parsedWeight.str;
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
    const parsedWeight = parseQuantityInput(weightInput.value);
    const unit = unitSelect.value.trim() || (currentLang === 'ar' ? 'كجم' : 'kg');

    if (!worker || !task || !product || !parsedWeight) {
      showToast(currentLang === 'ar' ? 'يرجى ملء جميع الحقول بشكل صحيح' : 'Please fill all fields accurately', true);
      return;
    }

    const weight = parsedWeight.str;
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

    const myWorkerUser = (currentUser ? currentUser.username : '').trim().toLowerCase();
    const myWorkerNoSpace = myWorkerUser.replace(/[\s_-]+/g, '');
    const myTasks = records.filter(r => {
      const w = (r.worker || '').trim().toLowerCase();
      if (!w) return false;
      if (w === myWorkerUser || w.replace(/[\s_-]+/g, '') === myWorkerNoSpace) return true;
      if (myWorkerUser.includes('saeed') && w === 'worker1') return true;
      if (myWorkerUser.includes('nasser') && w === 'worker2') return true;
      if (myWorkerUser.includes('hamdy') && w === 'worker3') return true;
      if (myWorkerUser.includes('khaled') && w === 'worker4') return true;
      return false;
    });

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

    // Numbering based on first-added order (the first product added gets #1, second gets #2, etc.)
    const chronoTasks = [...myTasks].sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : (isNaN(Number(a.id)) ? 0 : Number(a.id));
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : (isNaN(Number(b.id)) ? 0 : Number(b.id));
      if (tA && tB && tA !== tB) return tA - tB;
      return records.indexOf(b) - records.indexOf(a);
    });

    container.innerHTML = myTasks.map(task => {
      const status = task.status || 'pending';
      const orderIndex = chronoTasks.findIndex(t => String(t.id || t._id) === String(task.id || task._id));
      const seqNum = orderIndex !== -1 ? orderIndex + 1 : 1;
      const orderNumber = `#${localizeDigits(seqNum, currentLang)}`;

      const isPending = status === 'pending';
      const isInProgress = status === 'in_progress';
      const isCompleted = status === 'completed';

      const isAr = currentLang === 'ar';
      const displayDate = formatDisplayDate(task.date, currentLang);
      const displayTime = formatDisplayTime(task.time, currentLang);
      const displayQty = formatDisplayQuantity(task.quantity || `${task.weight} ${task.unit || 'kg'}`, task.unit, currentLang);
      const displayStarted = task.startedAt ? formatDisplayTime(task.startedAt, currentLang) : null;
      const displayFinished = task.finishedAt ? formatDisplayTime(task.finishedAt, currentLang) : null;

      return `
        <div class="p-4 rounded-xl glass-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition">

          <!-- Top Row: Order Number Badge, Task Name, Product, Quantity, Timestamps -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div class="flex items-center space-x-2.5 rtl:space-x-reverse">
              <span class="px-2.5 py-0.5 rounded text-xs font-mono font-extrabold bg-[#1e2540] text-white dark:bg-amber-600 dark:text-slate-950 shadow-xs">
                ${orderNumber}
              </span>
              <div>
                <div class="font-bold text-sm text-[#1e2540] dark:text-[#d4aa65]">
                  ${escapeHtml(task.task)} 
                  <span class="text-slate-400 font-normal">/</span> 
                  <span class="text-slate-900 dark:text-slate-100 font-mono">${escapeHtml(task.product || displayQty)}</span>
                </div>
                <div class="flex items-center flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  <span>${isAr ? 'التاريخ' : 'DATE'}: ${escapeHtml(displayDate)}</span>
                  <span>|</span>
                  <span>${isAr ? 'الوقت' : 'TIME'}: ${escapeHtml(displayTime)}</span>
                  ${task.assignedBy ? `
                    <span>|</span>
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
                      ${isAr ? 'مُسنَد من' : 'DISPATCHED BY'}: ${escapeHtml(task.assignedBy)}
                    </span>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- Weight Badge -->
            <div class="self-start sm:self-auto px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs border border-slate-300 dark:border-slate-700">
              ${isAr ? 'الكمية' : 'QTY'}: ${escapeHtml(displayQty)}
            </div>
          </div>

          <!-- 3 Stages Visual Progress -->
          <div class="grid grid-cols-3 gap-1.5 text-center text-[10px] sm:text-xs font-mono font-bold leading-tight">
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
                ${isAr ? 'الحالة: بانتظار بدء التشغيل' : 'STATUS: WAITING TO START'}
              </div>
              <button type="button" class="btn-start-task w-full sm:w-auto px-4 py-2 rounded-lg font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow transition active:scale-95 cursor-pointer" data-id="${task.id || task._id}">
                <span>${t.btnStartTask}</span>
              </button>
            ` : ''}

            ${isInProgress ? `
              <div class="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                ${t.taskStartedAt} <span class="underline">${escapeHtml(displayStarted || displayTime)}</span>
              </div>
              <button type="button" class="btn-finish-task w-full sm:w-auto px-4 py-2 rounded-lg font-bold text-xs bg-[#1e2540] hover:bg-[#141a2e] dark:bg-amber-600 dark:hover:bg-amber-500 text-white shadow transition active:scale-95 cursor-pointer" data-id="${task.id || task._id}">
                <span>${t.btnFinishTask}</span>
              </button>
            ` : ''}

            ${isCompleted ? `
              <div class="w-full flex flex-wrap items-center justify-between gap-2 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg">
                <div class="flex items-center space-x-3 rtl:space-x-reverse text-xs font-mono text-emerald-900 dark:text-emerald-200">
                  <span>${isAr ? 'البدء' : 'START'}: ${escapeHtml(displayStarted || '-')}</span>
                  <span>|</span>
                  <span>${isAr ? 'الانتهاء' : 'FINISH'}: <strong class="text-emerald-700 dark:text-emerald-400">${escapeHtml(displayFinished || '-')}</strong></span>
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
  // ponytail: assumes same-day timestamps with optional AM/PM or ص/م; upgrade to full ISO date strings if work shifts cross midnight.
  function parseTimeToSeconds(timeStr) {
    if (!timeStr) return null;
    // Normalize Eastern Arabic digits to Western digits first
    const normalized = localizeDigits(timeStr, 'en').trim();
    const isPM = /(pm|م)/i.test(normalized);
    const isAM = /(am|ص)/i.test(normalized);
    const cleanStr = normalized.replace(/\s*(am|pm|ص|م)/gi, '').trim();
    const parts = cleanStr.split(':').map(Number);
    if (parts.length < 2 || parts.some(isNaN)) return null;

    let hours = parts[0];
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    return hours * 3600 + parts[1] * 60 + (parts[2] || 0);
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
      const hStr = localizeDigits(hrs, 'ar');
      const mStr = localizeDigits(mins, 'ar');
      const sStr = localizeDigits(secs, 'ar');
      if (hrs > 0) return `${hStr} س ${mStr} د`;
      if (mins > 0) return `${mStr} د ${sStr} ث`;
      return `${sStr} ثانية`;
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

    const defaultWorkers = ['Mohamed Saeed', 'Ahmed Abd El Nasser', 'Mohamed Hamdy', 'Youseef Khaled'];
    const factoryDurations = [];

    const cardsHtml = defaultWorkers.map(wId => {
      const workerRecords = records.filter(r => {
        const w = (r.worker || '').trim().toLowerCase();
        const target = wId.toLowerCase();
        if (w === target) return true;
        if (target.includes('saeed') && (w === 'worker1' || w.includes('saeed'))) return true;
        if (target.includes('nasser') && (w === 'worker2' || w.includes('nasser'))) return true;
        if (target.includes('hamdy') && (w === 'worker3' || w.includes('hamdy'))) return true;
        if (target.includes('khaled') && (w === 'worker4' || w.includes('khaled'))) return true;
        return false;
      });
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
      const displayName = getWorkerDisplayName(wId, currentLang);

      return `
        <div class="glass-card rounded-xl p-4 border border-slate-300 dark:border-slate-700 shadow-md space-y-3 bg-white/95 dark:bg-slate-900/90">
          <div class="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div class="font-bold text-sm text-[#1e2540] dark:text-[#d4aa65]">
              <span class="text-xs text-slate-700 dark:text-slate-300 font-semibold">${isAr ? 'المشغل:' : 'OPERATOR:'}</span> ${escapeHtml(displayName)}
            </div>
            <span class="text-xs font-bold px-2 py-0.5 rounded shadow-sm ${
              completionRate >= 80 ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' :
              completionRate >= 50 ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700' :
              'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600'
            }">
              ${isAr ? `${localizeDigits(completionRate, 'ar')}٪ إنجاز` : `${completionRate}% COMPLETED`}
            </span>
          </div>

          <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div class="bg-emerald-600 h-2 rounded-full transition-all duration-300" style="width: ${completionRate}%"></div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs font-mono">
            <div class="p-2.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 shadow-sm">
              <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">${isAr ? 'المهام المنجزة' : 'COMPLETED'}</span>
              <span class="font-extrabold text-sm text-emerald-800 dark:text-emerald-400">
                ${isAr ? localizeDigits(completed.length, 'ar') : completed.length} <span class="text-xs text-slate-600 dark:text-slate-400 font-semibold">/ ${isAr ? localizeDigits(total, 'ar') : total}</span>
              </span>
            </div>

            <div class="p-2.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 shadow-sm">
              <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">${isAr ? 'متوسط الوقت' : 'AVG TIME'}</span>
              <span class="font-extrabold text-sm text-[#1e2540] dark:text-[#d4aa65]">
                ${formatDuration(avgSec)}
              </span>
            </div>

            <div class="p-2.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 shadow-sm">
              <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">${isAr ? 'قيد التشغيل' : 'IN PROGRESS'}</span>
              <span class="font-extrabold text-sm text-amber-800 dark:text-amber-400">
                ${isAr ? localizeDigits(inProgress.length, 'ar') : inProgress.length}
              </span>
            </div>

            <div class="p-2.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 shadow-sm">
              <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">${isAr ? 'إجمالي الكمية' : 'TOTAL OUTPUT'}</span>
              <span class="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                ${isAr ? (totalWeight > 0 ? localizeDigits(totalWeight, 'ar') : '٠') : (totalWeight > 0 ? totalWeight.toLocaleString() : '0')}
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
    const isAr = currentLang === 'ar';

    const totalLogs = filtered.length;
    const uniqueWorkers = new Set(filtered.map(r => (r.worker || '').toLowerCase())).size;

    const statLogs = document.getElementById('admin-stat-logs');
    const statWorkers = document.getElementById('admin-stat-workers');
    const filterSummary = document.getElementById('admin-filter-summary');

    if (statLogs) statLogs.textContent = isAr ? localizeDigits(totalLogs, 'ar') : totalLogs.toLocaleString();
    if (statWorkers) statWorkers.textContent = isAr ? localizeDigits(uniqueWorkers, 'ar') : uniqueWorkers.toString();
    if (filterSummary) {
      const shownCount = isAr ? localizeDigits(filtered.length, 'ar') : filtered.length;
      const totalCount = isAr ? localizeDigits(records.length, 'ar') : records.length;
      filterSummary.textContent = t.adminFilterSummary(shownCount, totalCount);
    }

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

    const stageBadges = isAr ? {
      pending: '<span class="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">قيد الانتظار</span>',
      in_progress: '<span class="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700">قيد التشغيل</span>',
      completed: '<span class="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">مكتمل</span>'
    } : {
      pending: '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">PENDING</span>',
      in_progress: '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">IN PROGRESS</span>',
      completed: '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">COMPLETED</span>'
    };

    tbody.innerHTML = filtered.map(r => `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
        <td class="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono">${escapeHtml(formatDisplayDate(r.date, currentLang))}</td>
        <td class="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">${escapeHtml(formatDisplayTime(r.time, currentLang))}</td>
        <td class="py-2.5 px-3 font-mono font-bold text-[#1e2540] dark:text-[#d4aa65]">${escapeHtml(getWorkerDisplayName(r.worker, currentLang))}</td>
        <td class="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">${escapeHtml(r.task)}</td>
        <td class="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-mono">${escapeHtml(r.product || '-')}</td>
        <td class="py-2.5 px-3 text-right rtl:text-left font-mono font-bold text-slate-900 dark:text-slate-100">${escapeHtml(formatDisplayQuantity(r.quantity, r.unit, currentLang))}</td>
        <td class="py-2.5 px-3 text-center">${stageBadges[r.status] || stageBadges.pending}</td>
        <td class="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">${escapeHtml(formatDisplayTime(r.startedAt, currentLang))}</td>
        <td class="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">${escapeHtml(formatDisplayTime(r.finishedAt, currentLang))}</td>
        <td class="py-2.5 px-3 text-center">
          <button class="delete-record-btn text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-800 font-mono font-semibold px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40" data-id="${r.id || r._id}">
            ${t.btnDelete}
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Custom Delete Modal Handler
  let deleteModalResolver = null;

  function showDeleteModal(item) {
    return new Promise((resolve) => {
      deleteModalResolver = resolve;
      const modal = document.getElementById('delete-confirm-modal');
      if (!modal) {
        resolve(false);
        return;
      }

      const t = I18N[currentLang];
      setText('delete-modal-title', t.deleteModalTitle);
      setText('delete-modal-desc', t.deleteModalDesc);
      setText('delete-modal-lbl-worker', t.deleteModalWorker);
      setText('delete-modal-lbl-task', t.deleteModalTask);
      setText('delete-modal-lbl-product', t.deleteModalProduct);
      setText('delete-modal-lbl-qty', t.deleteModalQty);
      setText('delete-modal-cancel-btn', t.deleteModalCancel);
      setText('delete-modal-confirm-text', t.deleteModalConfirm);

      setText('delete-modal-val-worker', item.worker || '-');
      setText('delete-modal-val-task', item.task || '-');
      setText('delete-modal-val-product', item.product || '-');
      setText('delete-modal-val-qty', formatDisplayQuantity(item.quantity, item.unit, currentLang));

      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');

      const cancelBtn = document.getElementById('delete-modal-cancel-btn');
      if (cancelBtn) cancelBtn.focus();
    });
  }

  function closeDeleteModal(result) {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
    if (deleteModalResolver) {
      deleteModalResolver(result);
      deleteModalResolver = null;
    }
  }

  async function deleteRecord(id) {
    const item = records.find(r => String(r.id || r._id) === String(id));
    if (!item) return;
    const t = I18N[currentLang];

    const confirmed = await showDeleteModal(item);
    if (!confirmed) return;

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
              <td class="cell cell-center">${isRtl ? localizeDigits(i + 1, 'ar') : i + 1}</td>
              <td class="cell cell-center">${escapeHtml(formatDisplayDate(r.date, currentLang))}</td>
              <td class="cell cell-center">${escapeHtml(formatDisplayTime(r.time, currentLang))}</td>
              <td class="cell" style="font-weight: bold; color: #1e2540;">${escapeHtml(getWorkerDisplayName(r.worker, currentLang))}</td>
              <td class="cell">${escapeHtml(r.task)}</td>
              <td class="cell">${escapeHtml(r.product || '-')}</td>
              <td class="cell cell-qty">${escapeHtml(formatDisplayQuantity(r.quantity, r.unit, currentLang))}</td>
              <td class="cell cell-center">${stageNames[r.status] || stageNames.pending}</td>
              <td class="cell cell-center">${escapeHtml(formatDisplayTime(r.startedAt, currentLang))}</td>
              <td class="cell cell-center" style="font-weight: bold; color: #15803d;">${escapeHtml(formatDisplayTime(r.finishedAt, currentLang))}</td>
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
      `"${(getWorkerDisplayName(r.worker, currentLang) || '').replace(/"/g, '""')}"`,
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
                <td class="center">${isRtl ? localizeDigits(i + 1, 'ar') : i + 1}</td>
                <td>${escapeHtml(formatDisplayDate(r.date, currentLang))}</td>
                <td class="center font-mono">${escapeHtml(formatDisplayTime(r.time, currentLang))}</td>
                <td><strong>${escapeHtml(getWorkerDisplayName(r.worker, currentLang))}</strong></td>
                <td>${escapeHtml(r.task)}</td>
                <td class="font-mono">${escapeHtml(r.product || '-')}</td>
                <td class="qty font-mono">${escapeHtml(formatDisplayQuantity(r.quantity, r.unit, currentLang))}</td>
                <td class="center font-mono"><strong>${stageNames[r.status] || stageNames.pending}</strong></td>
                <td class="center font-mono">${escapeHtml(formatDisplayTime(r.startedAt, currentLang))}</td>
                <td class="center font-mono font-bold">${escapeHtml(formatDisplayTime(r.finishedAt, currentLang))}</td>
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

    const rawUser = userInput.value.trim();
    const rawPass = passInput.value.trim();
    if (!rawUser || !rawPass) return;

    const cleanUser = localizeDigits(rawUser, 'en').toLowerCase();
    const cleanPass = localizeDigits(rawPass, 'en');

    let authenticatedUser = null;

    // 1. Try server authentication
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.user) {
          authenticatedUser = data.user;
        }
      }
    } catch (err) {
      console.warn('Server auth unreachable, using local fallback:', err);
    }

    // 2. Offline fallback (e.g. file:// protocol or offline server)
    if (!authenticatedUser) {
      const localUsers = getLocalUsers();
      const match = localUsers.find(
        u => u.username.toLowerCase() === cleanUser &&
             (u.password === cleanPass || u.password === rawPass)
      );
      if (match) {
        authenticatedUser = { username: match.username, role: match.role, name: match.name };
      }
    }

    if (authenticatedUser) {
      if (errorBox) errorBox.classList.add('hidden');
      sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(authenticatedUser));
      showToast(I18N[currentLang].toastLoggedIn(authenticatedUser.name || authenticatedUser.username));
      routeUser(authenticatedUser);
      userInput.value = '';
      passInput.value = '';
    } else {
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

  // ==============================================================
  // OVERTIME (NIGHT SHIFT ATTENDANCE) LOGIC & EXPORTS
  // ==============================================================

  async function loadOvertimeRecords() {
    try {
      const res = await fetch(`${API_BASE}/overtime`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          overtimeRecords = data;
          localStorage.setItem(OVERTIME_STORAGE_KEY, JSON.stringify(overtimeRecords));
        }
      }
    } catch (err) {
      console.warn('Overtime fetch failed, falling back to cache:', err);
      const stored = localStorage.getItem(OVERTIME_STORAGE_KEY);
      if (stored) {
        try {
          overtimeRecords = JSON.parse(stored);
        } catch (_) {}
      }
    }

    if (currentUser && currentUser.role === 'worker') {
      renderWorkerOvertimeHistory();
    } else {
      renderAdminOvertimeTable();
    }
  }

  async function handleOvertimeSubmit(e) {
    e.preventDefault();
    if (!currentUser) return;

    const notesInput = document.getElementById('overtime-notes');
    const notes = notesInput ? notesInput.value.trim() : '';
    const now = new Date();
    const dateStr = getTodayDateString(now);
    const timeStr = getExactTimeString(now, currentLang);
    const workerName = currentUser.name || getWorkerDisplayName(currentUser.username, currentLang);

    const payload = {
      worker: currentUser.username,
      workerName: workerName,
      date: dateStr,
      time: timeStr,
      notes: notes
    };

    let saved = null;
    try {
      const res = await fetch(`${API_BASE}/overtime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        saved = await res.json();
      }
    } catch (err) {
      console.warn('Overtime save offline fallback:', err);
    }

    if (!saved) {
      saved = {
        _id: 'ot_' + Date.now(),
        ...payload,
        createdAt: new Date().toISOString()
      };
    }

    overtimeRecords.unshift(saved);
    localStorage.setItem(OVERTIME_STORAGE_KEY, JSON.stringify(overtimeRecords));

    if (notesInput) notesInput.value = '';

    const alertEl = document.getElementById('overtime-success-alert');
    if (alertEl) {
      const t = I18N[currentLang];
      alertEl.textContent = t.overtimeSuccessMsg(timeStr);
      alertEl.classList.remove('hidden');
      setTimeout(() => {
        alertEl.classList.add('hidden');
      }, 5000);
    }

    showToast(I18N[currentLang].toastOvertimeLogged(workerName, timeStr));
    renderWorkerOvertimeHistory();
  }

  function renderWorkerOvertimeHistory() {
    const tbody = document.getElementById('worker-overtime-history-body');
    if (!tbody || !currentUser) return;

    const myLogs = overtimeRecords.filter(r => (r.worker || '').toLowerCase() === currentUser.username.toLowerCase());
    const t = I18N[currentLang];

    if (myLogs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-xs text-slate-400 dark:text-slate-500 font-mono">${t.otEmptyWorkerHistory}</td></tr>`;
      return;
    }

    tbody.innerHTML = myLogs.map(r => `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
        <td class="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">${escapeHtml(formatDisplayDate(r.date, currentLang))}</td>
        <td class="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">${escapeHtml(formatDisplayTime(r.time, currentLang))}</td>
        <td class="py-2.5 px-3 text-slate-600 dark:text-slate-400">${escapeHtml(r.notes || '-')}</td>
      </tr>
    `).join('');
  }

  function getFilteredOvertimeRecords() {
    const workerFilter = (document.getElementById('admin-filter-ot-worker')?.value || '').trim().toLowerCase();
    const dateFilter = (document.getElementById('admin-filter-ot-date')?.value || '').trim();

    return overtimeRecords.filter(r => {
      if (workerFilter && (r.worker || '').toLowerCase() !== workerFilter) {
        return false;
      }
      if (dateFilter && r.date !== dateFilter) {
        return false;
      }
      return true;
    });
  }

  function renderAdminOvertimeTable() {
    const tbody = document.getElementById('admin-overtime-table-body');
    const totalEl = document.getElementById('stat-ot-total');
    const todayEl = document.getElementById('stat-ot-today');
    if (!tbody) return;

    const filtered = getFilteredOvertimeRecords();
    const todayStr = getTodayDateString();
    const todayCount = overtimeRecords.filter(r => r.date === todayStr).length;

    if (totalEl) totalEl.textContent = localizeDigits(overtimeRecords.length, currentLang);
    if (todayEl) todayEl.textContent = localizeDigits(todayCount, currentLang);

    const t = I18N[currentLang];

    if (filtered.length === 0) {
      const msg = overtimeRecords.length === 0 ? t.otEmptyAdminTable : t.otEmptyAdminFiltered;
      tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-xs text-slate-400 dark:text-slate-500 font-mono">${msg}</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => {
      const id = r._id || r.id;
      const workerDisplay = getWorkerDisplayName(r.worker, currentLang) || r.workerName || r.worker;
      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
          <td class="py-2.5 px-3 text-slate-800 dark:text-slate-200">${escapeHtml(formatDisplayDate(r.date, currentLang))}</td>
          <td class="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">${escapeHtml(formatDisplayTime(r.time, currentLang))}</td>
          <td class="py-2.5 px-3 font-bold text-[#1e2540] dark:text-[#d4aa65]">${escapeHtml(workerDisplay)}</td>
          <td class="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">${escapeHtml(r.worker)}</td>
          <td class="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">${escapeHtml(r.notes || '-')}</td>
          <td class="py-2.5 px-3 text-center">
            <button type="button" class="btn-delete-ot px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 transition active:scale-95 cursor-pointer"
              data-id="${escapeHtml(id)}">
              ${t.btnOtDelete}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function deleteOvertimeRecord(id) {
    const record = overtimeRecords.find(r => (r._id || r.id) === id);
    const workerName = record ? (getWorkerDisplayName(record.worker, currentLang) || record.workerName || record.worker) : '';
    const timeStr = record ? record.time : '';
    const promptMsg = I18N[currentLang].confirmOtDelete(workerName, timeStr);

    if (!confirm(promptMsg)) return;

    try {
      await fetch(`${API_BASE}/overtime/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Overtime delete network error:', err);
    }

    overtimeRecords = overtimeRecords.filter(r => (r._id || r.id) !== id);
    localStorage.setItem(OVERTIME_STORAGE_KEY, JSON.stringify(overtimeRecords));
    showToast(I18N[currentLang].toastOvertimeDeleted);
    renderAdminOvertimeTable();
  }

  // Overtime Excel Export
  function exportOvertimeExcel() {
    const filtered = getFilteredOvertimeRecords();
    if (filtered.length === 0) {
      showToast(currentLang === 'ar' ? 'لا توجد سجلات لتصديرها' : 'No records to export', true);
      return;
    }

    const isRtl = currentLang === 'ar';
    const t = I18N[currentLang];
    const todayStr = getTodayDateString();

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; direction: ${isRtl ? 'rtl' : 'ltr'}; font-family: Tahoma, Arial, sans-serif; }
          th { background-color: #1e2540; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #141a2e; text-align: center; }
          td { padding: 8px; border: 1px solid #cccccc; text-align: ${isRtl ? 'right' : 'left'}; vertical-align: middle; }
          .center { text-align: center; }
          .title { font-size: 16pt; font-weight: bold; color: #1e2540; text-align: center; height: 35px; }
          .subtitle { font-size: 11pt; color: #555555; text-align: center; height: 25px; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="5" class="title">${isRtl ? 'كشف بصمة السهر وتوثيق الانصراف' : 'Night Shift Overtime Attendance Register'}</td></tr>
          <tr><td colspan="5" class="subtitle">${isRtl ? 'تاريخ التقرير: ' + todayStr : 'Report Date: ' + todayStr}</td></tr>
          <tr><td colspan="5"></td></tr>
          <tr>
            <th>${t.thMOtDate}</th>
            <th>${t.thMOtTime}</th>
            <th>${t.thMOtWorker}</th>
            <th>${t.thMOtUser}</th>
            <th>${t.thMOtNotes}</th>
          </tr>
    `;

    filtered.forEach(r => {
      const workerDisplay = getWorkerDisplayName(r.worker, currentLang) || r.workerName || r.worker;
      html += `
        <tr>
          <td class="center">${escapeHtml(formatDisplayDate(r.date, currentLang))}</td>
          <td class="center">${escapeHtml(formatDisplayTime(r.time, currentLang))}</td>
          <td>${escapeHtml(workerDisplay)}</td>
          <td class="center">${escapeHtml(r.worker)}</td>
          <td>${escapeHtml(r.notes || '-')}</td>
        </tr>
      `;
    });

    html += `</table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Overtime_Attendance_${todayStr}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(currentLang === 'ar' ? 'تم تصدير ملف Excel بنجاح' : 'Excel exported successfully');
  }

  // Overtime CSV Export
  function exportOvertimeCsv() {
    const filtered = getFilteredOvertimeRecords();
    if (filtered.length === 0) {
      showToast(currentLang === 'ar' ? 'لا توجد سجلات لتصديرها' : 'No records to export', true);
      return;
    }

    const t = I18N[currentLang];
    const headers = [t.thMOtDate, t.thMOtTime, t.thMOtWorker, t.thMOtUser, t.thMOtNotes];

    const escapeCsv = (str) => {
      const s = String(str || '').replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filtered.map(r => {
      const workerDisplay = getWorkerDisplayName(r.worker, currentLang) || r.workerName || r.worker;
      return [
        escapeCsv(formatDisplayDate(r.date, currentLang)),
        escapeCsv(formatDisplayTime(r.time, currentLang)),
        escapeCsv(workerDisplay),
        escapeCsv(r.worker),
        escapeCsv(r.notes || '-')
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const todayStr = getTodayDateString();
    a.href = url;
    a.download = `Overtime_Attendance_${todayStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(currentLang === 'ar' ? 'تم تصدير ملف CSV بنجاح' : 'CSV exported successfully');
  }

  // Overtime PDF Report
  function printOvertimeReport() {
    const filtered = getFilteredOvertimeRecords();
    if (filtered.length === 0) {
      showToast(currentLang === 'ar' ? 'لا توجد سجلات للطباعة' : 'No records to print', true);
      return;
    }

    const todayStr = getTodayDateString();
    const timeNow = getExactTimeString();
    const isRtl = currentLang === 'ar';
    const t = I18N[currentLang];

    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html ${isRtl ? 'dir="rtl" lang="ar"' : 'dir="ltr" lang="en"'}>
      <head>
        <meta charset="UTF-8">
        <title>${isRtl ? 'كشف بصمة السهر والانصراف' : 'Night Shift Attendance Report'} - ${todayStr}</title>
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
          .summary { margin-top: 25px; display: flex; justify-content: space-between; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-family: monospace; }
          .signature { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
          @media print { button { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">${isRtl ? 'كشف بصمة السهر وتوثيق الانصراف المعتمد' : 'NIGHT SHIFT OVERTIME ATTENDANCE REPORT'}</div>
            <div class="subtitle">${isRtl ? 'سجل مغادرة صالة العمل وورديات السهر' : 'Official Shift Completion & Factory Departure Log'}</div>
          </div>
          <div class="meta">
            <div><strong>${isRtl ? 'التاريخ:' : 'Date:'}</strong> ${todayStr}</div>
            <div><strong>${isRtl ? 'الوقت:' : 'Time:'}</strong> ${timeNow}</div>
            <div><strong>${isRtl ? 'المعتمد:' : 'Certified By:'}</strong> ${currentUser ? (currentUser.name || currentUser.username) : 'Management'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px;" class="center">#</th>
              <th>${t.thMOtDate}</th>
              <th class="center">${t.thMOtTime}</th>
              <th>${t.thMOtWorker}</th>
              <th class="center">${t.thMOtUser}</th>
              <th>${t.thMOtNotes}</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((r, i) => {
              const workerDisplay = getWorkerDisplayName(r.worker, currentLang) || r.workerName || r.worker;
              return `
                <tr>
                  <td class="center">${isRtl ? localizeDigits(i + 1, 'ar') : i + 1}</td>
                  <td>${escapeHtml(formatDisplayDate(r.date, currentLang))}</td>
                  <td class="center font-mono font-bold">${escapeHtml(formatDisplayTime(r.time, currentLang))}</td>
                  <td><strong>${escapeHtml(workerDisplay)}</strong></td>
                  <td class="center font-mono">${escapeHtml(r.worker)}</td>
                  <td>${escapeHtml(r.notes || '-')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div>${isRtl ? 'إجمالي البصمات المسجلة:' : 'Total Punches:'} <strong>${filtered.length}</strong></div>
          <div>${isRtl ? 'حالة الاعتماد: موثق بسجلات المصنع' : 'Status: Certified & Stamped'}</div>
        </div>

        <div class="signature">
          <div>${isRtl ? 'توقيع المشرف المسؤول: ____________________' : 'Supervisor Signature: ____________________'}</div>
          <div>${isRtl ? 'اعتماد إدارة المصنع: ____________________' : 'Plant Management Approval: ____________________'}</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
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

    // Logo click: return to active dashboard or portal selection
    const logoBtn = document.getElementById('header-logo-btn');
    if (logoBtn) {
      logoBtn.addEventListener('click', () => {
        if (currentUser) routeUser(currentUser);
        else showView('portals');
      });
    }

    // Portal Selection Cards
    const cardWorker = document.getElementById('card-select-worker');
    if (cardWorker) {
      cardWorker.addEventListener('click', () => openPortalLogin('worker'));
    }

    const cardOvertime = document.getElementById('card-select-overtime');
    if (cardOvertime) {
      cardOvertime.addEventListener('click', () => openPortalLogin('overtime'));
    }

    const cardAdmin = document.getElementById('card-select-admin');
    if (cardAdmin) {
      cardAdmin.addEventListener('click', () => openPortalLogin('admin'));
    }

    // Back to Portals button
    const btnBackPortals = document.getElementById('btn-back-to-portals');
    if (btnBackPortals) {
      btnBackPortals.addEventListener('click', () => {
        const errorBox = document.getElementById('login-error-box');
        if (errorBox) errorBox.classList.add('hidden');
        showView('portals');
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

    const otLogoutBtn = document.getElementById('overtime-btn-logout');
    if (otLogoutBtn) otLogoutBtn.addEventListener('click', handleLogout);

    const dashLogoutBtn = document.getElementById('dash-logout-btn');
    if (dashLogoutBtn) dashLogoutBtn.addEventListener('click', handleLogout);

    // Overtime Worker Form
    const otForm = document.getElementById('overtime-log-form');
    if (otForm) otForm.addEventListener('submit', handleOvertimeSubmit);

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

    const tabOt = document.getElementById('tab-btn-overtime');
    if (tabOt) tabOt.addEventListener('click', () => switchAdminTab('overtime'));

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

    // Overtime Management Filters
    const fOtWorker = document.getElementById('admin-filter-ot-worker');
    if (fOtWorker) fOtWorker.addEventListener('change', renderAdminOvertimeTable);

    const fOtDate = document.getElementById('admin-filter-ot-date');
    if (fOtDate) fOtDate.addEventListener('change', renderAdminOvertimeTable);

    // Overtime Table Delete Delegation
    const otTbody = document.getElementById('admin-overtime-table-body');
    if (otTbody) {
      otTbody.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-delete-ot');
        if (delBtn) {
          const id = delBtn.getAttribute('data-id');
          deleteOvertimeRecord(id);
        }
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

    // Custom Delete Confirmation Modal Events
    const btnCancelDel = document.getElementById('delete-modal-cancel-btn');
    if (btnCancelDel) {
      btnCancelDel.addEventListener('click', () => closeDeleteModal(false));
    }
    const btnConfirmDel = document.getElementById('delete-modal-confirm-btn');
    if (btnConfirmDel) {
      btnConfirmDel.addEventListener('click', () => closeDeleteModal(true));
    }
    const modalDelEl = document.getElementById('delete-confirm-modal');
    if (modalDelEl) {
      modalDelEl.addEventListener('click', (e) => {
        if (e.target === modalDelEl) {
          closeDeleteModal(false);
        }
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('delete-confirm-modal');
        if (modal && !modal.classList.contains('hidden')) {
          closeDeleteModal(false);
        }
      }
    });

    // Production Exports
    const btnExcel = document.getElementById('admin-export-excel');
    if (btnExcel) btnExcel.addEventListener('click', exportFormattedExcel);

    const btnCsv = document.getElementById('admin-export-csv');
    if (btnCsv) btnCsv.addEventListener('click', exportCSV);

    const btnPrint = document.getElementById('admin-print-report');
    if (btnPrint) btnPrint.addEventListener('click', printPDFReport);

    // Overtime Exports
    const btnOtExcel = document.getElementById('overtime-export-excel');
    if (btnOtExcel) btnOtExcel.addEventListener('click', exportOvertimeExcel);

    const btnOtCsv = document.getElementById('overtime-export-csv');
    if (btnOtCsv) btnOtCsv.addEventListener('click', exportOvertimeCsv);

    const btnOtPrint = document.getElementById('overtime-print-report');
    if (btnOtPrint) btnOtPrint.addEventListener('click', printOvertimeReport);
  }

  // Boot
  async function init() {
    await loadData();
    await loadOvertimeRecords();
    applyTheme(currentTheme);
    applyLanguage(currentLang);
    startClock();
    setupEvents();

    if (currentUser) {
      routeUser(currentUser);
    } else {
      showView('portals');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
