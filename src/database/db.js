import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let _db = null;
function getDbInstance() {
  if (Platform.OS === 'web') {
    // Return a mock database object on Web to prevent crash
    return {
      execSync: () => {},
      getAllSync: () => [],
      getFirstSync: () => null,
      runSync: () => ({ lastInsertRowId: 0 }),
    };
  }
  if (!_db) {
    _db = SQLite.openDatabaseSync('attendance.db');
  }
  return _db;
}

// Wrap db in a Proxy to lazily resolve operations and avoid module-level initialization crash
export const db = new Proxy({}, {
  get(target, prop) {
    const instance = getDbInstance();
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

export const initDB = () => {
  try {
    db.execSync(`PRAGMA journal_mode = WAL;`);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        department TEXT,
        phone TEXT,
        job_title TEXT,
        employee_code TEXT,
        address TEXT,
        work_location TEXT,
        vacation_balance INTEGER DEFAULT 21,
        salary_type TEXT DEFAULT 'monthly',
        salary_rate REAL DEFAULT 0
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'absent',
        check_in_time TEXT,
        check_out_time TEXT,
        permission_hours REAL DEFAULT 0,
        bonus REAL DEFAULT 0,
        deduction REAL DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (employee_id) REFERENCES employees (id)
      );
    `);

    // Safe migration: add new columns to existing tables if they don't exist
    const employeeColumns = db.getAllSync(`PRAGMA table_info(employees)`);
    const empColNames = employeeColumns.map(c => c.name);

    if (!empColNames.includes('phone'))            db.execSync(`ALTER TABLE employees ADD COLUMN phone TEXT;`);
    if (!empColNames.includes('job_title'))        db.execSync(`ALTER TABLE employees ADD COLUMN job_title TEXT;`);
    if (!empColNames.includes('employee_code'))    db.execSync(`ALTER TABLE employees ADD COLUMN employee_code TEXT;`);
    if (!empColNames.includes('address'))          db.execSync(`ALTER TABLE employees ADD COLUMN address TEXT;`);
    if (!empColNames.includes('work_location'))    db.execSync(`ALTER TABLE employees ADD COLUMN work_location TEXT;`);
    if (!empColNames.includes('vacation_balance')) db.execSync(`ALTER TABLE employees ADD COLUMN vacation_balance INTEGER DEFAULT 21;`);
    if (!empColNames.includes('salary_type'))      db.execSync(`ALTER TABLE employees ADD COLUMN salary_type TEXT DEFAULT 'monthly';`);
    if (!empColNames.includes('salary_rate'))      db.execSync(`ALTER TABLE employees ADD COLUMN salary_rate REAL DEFAULT 0;`);

    const attColumns = db.getAllSync(`PRAGMA table_info(attendance)`);
    const attColNames = attColumns.map(c => c.name);

    if (!attColNames.includes('status'))            db.execSync(`ALTER TABLE attendance ADD COLUMN status TEXT DEFAULT 'absent';`);
    if (!attColNames.includes('permission_hours'))  db.execSync(`ALTER TABLE attendance ADD COLUMN permission_hours REAL DEFAULT 0;`);
    if (!attColNames.includes('bonus'))             db.execSync(`ALTER TABLE attendance ADD COLUMN bonus REAL DEFAULT 0;`);
    if (!attColNames.includes('deduction'))         db.execSync(`ALTER TABLE attendance ADD COLUMN deduction REAL DEFAULT 0;`);
    if (!attColNames.includes('notes'))             db.execSync(`ALTER TABLE attendance ADD COLUMN notes TEXT;`);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    // ✅ FIX 5: Don't silently swallow DB errors — re-throw so app knows DB failed
    throw error;
  }
};

// ─────────────────────────────────────────────
// EMPLOYEE QUERIES
// ─────────────────────────────────────────────

export const getEmployees = () => {
  return db.getAllSync('SELECT * FROM employees ORDER BY name ASC');
};

export const getEmployee = (id) => {
  return db.getFirstSync('SELECT * FROM employees WHERE id = ?', [id]);
};

export const addEmployee = (emp) => {
  const {
    name, department = '', phone = '', job_title = '', employee_code = '',
    address = '', work_location = '', vacation_balance = 21,
    salary_type = 'monthly', salary_rate = 0
  } = emp;
  const result = db.runSync(
    `INSERT INTO employees 
      (name, department, phone, job_title, employee_code, address, work_location, vacation_balance, salary_type, salary_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, department, phone, job_title, employee_code, address, work_location, vacation_balance, salary_type, salary_rate]
  );
  return result.lastInsertRowId;
};

export const updateEmployee = (id, emp) => {
  const {
    name, department = '', phone = '', job_title = '', employee_code = '',
    address = '', work_location = '', vacation_balance = 21,
    salary_type = 'monthly', salary_rate = 0
  } = emp;
  db.runSync(
    `UPDATE employees SET
      name = ?, department = ?, phone = ?, job_title = ?, employee_code = ?,
      address = ?, work_location = ?, vacation_balance = ?, salary_type = ?, salary_rate = ?
     WHERE id = ?`,
    [name, department, phone, job_title, employee_code, address, work_location, vacation_balance, salary_type, salary_rate, id]
  );
};

export const deleteEmployee = (id) => {
  db.runSync('DELETE FROM attendance WHERE employee_id = ?', [id]);
  db.runSync('DELETE FROM employees WHERE id = ?', [id]);
};

// ─────────────────────────────────────────────
// ATTENDANCE QUERIES
// ─────────────────────────────────────────────

export const getAttendanceForDate = (date) => {
  return db.getAllSync('SELECT * FROM attendance WHERE date = ?', [date]);
};

export const getAttendanceForEmployee = (employeeId) => {
  return db.getAllSync(
    'SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC',
    [employeeId]
  );
};

export const getAllAttendance = (filters = {}) => {
  let query = `
    SELECT a.*, e.name, e.department, e.salary_type, e.salary_rate
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.month) {
    query += ` AND a.date LIKE ?`;
    params.push(`${filters.month}%`);
  }
  if (filters.employeeId) {
    query += ` AND a.employee_id = ?`;
    params.push(filters.employeeId);
  }
  if (filters.department) {
    query += ` AND e.department = ?`;
    params.push(filters.department);
  }

  query += ` ORDER BY a.date DESC, e.name ASC`;
  return db.getAllSync(query, params);
};

export const upsertAttendance = (record) => {
  const {
    employee_id, date, status = 'absent',
    check_in_time = null, check_out_time = null,
    permission_hours = 0, bonus = 0, deduction = 0, notes = ''
  } = record;

  const existing = db.getFirstSync(
    'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
    [employee_id, date]
  );

  if (existing) {
    db.runSync(
      `UPDATE attendance SET
        status = ?, check_in_time = ?, check_out_time = ?,
        permission_hours = ?, bonus = ?, deduction = ?, notes = ?
       WHERE id = ?`,
      [status, check_in_time, check_out_time, permission_hours, bonus, deduction, notes, existing.id]
    );
    return existing.id;
  } else {
    const result = db.runSync(
      `INSERT INTO attendance
        (employee_id, date, status, check_in_time, check_out_time, permission_hours, bonus, deduction, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employee_id, date, status, check_in_time, check_out_time, permission_hours, bonus, deduction, notes]
    );
    return result.lastInsertRowId;
  }
};

export const updateFinancials = (employee_id, date, bonus, deduction, notes) => {
  const existing = db.getFirstSync(
    'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
    [employee_id, date]
  );
  if (existing) {
    db.runSync(
      `UPDATE attendance SET bonus = ?, deduction = ?, notes = ? WHERE id = ?`,
      [bonus, deduction, notes, existing.id]
    );
  } else {
    db.runSync(
      `INSERT INTO attendance (employee_id, date, status, bonus, deduction, notes)
       VALUES (?, ?, 'absent', ?, ?, ?)`,
      [employee_id, date, bonus, deduction, notes]
    );
  }
};

export const deductVacationDay = (employeeId) => {
  db.runSync(
    `UPDATE employees SET vacation_balance = MAX(0, vacation_balance - 1) WHERE id = ?`,
    [employeeId]
  );
};

export const restoreVacationDay = (employeeId) => {
  db.runSync(
    `UPDATE employees SET vacation_balance = vacation_balance + 1 WHERE id = ?`,
    [employeeId]
  );
};

// ─────────────────────────────────────────────
// PAYROLL CALCULATION
// ─────────────────────────────────────────────

export const calculatePayroll = (employeeId, month) => {
  const emp = getEmployee(employeeId);
  if (!emp) return null;

  const records = db.getAllSync(
    `SELECT * FROM attendance WHERE employee_id = ? AND date LIKE ?`,
    [employeeId, `${month}%`]
  );

  let presentDays = 0;
  let vacationDays = 0;
  let sickDays = 0;
  let absentDays = 0;
  let permissionDays = 0;
  let totalBonus = 0;
  let totalDeduction = 0;
  let totalPermissionHours = 0;

  records.forEach(r => {
    const status = r.status || 'absent';
    if (status === 'present')         presentDays++;
    else if (status === 'vacation')   vacationDays++;
    else if (status === 'sick')       sickDays++;
    else if (status === 'absent')     absentDays++;
    else if (status === 'permission') {
      permissionDays++;
      presentDays++;
      totalPermissionHours += (r.permission_hours || 0);
    }
    totalBonus     += (r.bonus || 0);
    totalDeduction += (r.deduction || 0);
  });

  let grossPay = 0;
  if (emp.salary_type === 'daily') {
    grossPay = presentDays * emp.salary_rate;
  } else {
    const workingDaysInMonth = 26;
    const dailyRate = emp.salary_rate / workingDaysInMonth;
    grossPay = emp.salary_rate - (absentDays * dailyRate);
    if (totalPermissionHours > 4) {
      const extraPermHours = totalPermissionHours - 4;
      grossPay -= (dailyRate / 8) * extraPermHours;
    }
  }

  const netPay = Math.max(0, grossPay + totalBonus - totalDeduction);

  return {
    employee: emp,
    month,
    presentDays,
    vacationDays,
    sickDays,
    absentDays,
    permissionDays,
    totalPermissionHours,
    totalBonus,
    totalDeduction,
    grossPay: parseFloat(grossPay.toFixed(2)),
    netPay: parseFloat(netPay.toFixed(2))
  };
};

export const getAllPayroll = (month) => {
  const employees = getEmployees();
  return employees.map(emp => calculatePayroll(emp.id, month)).filter(Boolean);
};

// ─────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────

export const getDashboardStats = (date) => {
  const total = db.getFirstSync('SELECT COUNT(*) as count FROM employees')?.count || 0;
  const present = db.getFirstSync(
    `SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status IN ('present', 'permission')`,
    [date]
  )?.count || 0;
  const vacation = db.getFirstSync(
    `SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'vacation'`,
    [date]
  )?.count || 0;
  const sick = db.getFirstSync(
    `SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'sick'`,
    [date]
  )?.count || 0;
  const absent = total - present - vacation - sick;

  return { total, present, vacation, sick, absent };
};

// Legacy helpers
export const checkIn = (employee_id, date, time) => {
  upsertAttendance({ employee_id, date, status: 'present', check_in_time: time });
};

export const checkOut = (employee_id, date, time) => {
  const existing = db.getFirstSync(
    'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
    [employee_id, date]
  );
  if (existing) {
    db.runSync(
      'UPDATE attendance SET check_out_time = ? WHERE id = ?',
      [time, existing.id]
    );
  }
};
