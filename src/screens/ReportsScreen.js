import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ScrollView, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// useFocusEffect replaced with useEffect (screens mount/unmount on tab switch)
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { getAllAttendance, getAllPayroll, getEmployees } from '../database/db';
import { useLanguage } from '../context/LanguageContext';

// ─── Base64 helper — pure JS, no Buffer/Node dependency (Hermes safe) ─────────
function uint8ToBase64(bytes) {
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary); // btoa is a global in React Native (Hermes)
}

// ─── Shared style definitions ──────────────────────────────────────────────────
const S_TITLE = {
  font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1E293B' }, type: 'pattern', patternType: 'solid' },
  alignment: { horizontal: 'center', vertical: 'center' },
};
const S_SUB = {
  font: { italic: true, sz: 10, color: { rgb: '64748B' } },
  fill: { fgColor: { rgb: 'F8FAFC' }, type: 'pattern', patternType: 'solid' },
  alignment: { horizontal: 'center', vertical: 'center' },
};
const S_HDR = {
  font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '6366F1' }, type: 'pattern', patternType: 'solid' },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
  border: { top: { style: 'medium', color: { rgb: '4338CA' } }, bottom: { style: 'medium', color: { rgb: '4338CA' } }, left: { style: 'thin', color: { rgb: '818CF8' } }, right: { style: 'thin', color: { rgb: '818CF8' } } },
};
const S_TOT = {
  font: { bold: true, sz: 11, color: { rgb: '4338CA' } },
  fill: { fgColor: { rgb: 'EEF2FF' }, type: 'pattern', patternType: 'solid' },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: { top: { style: 'medium', color: { rgb: '6366F1' } }, bottom: { style: 'medium', color: { rgb: '6366F1' } }, left: { style: 'thin', color: { rgb: 'A5B4FC' } }, right: { style: 'thin', color: { rgb: 'A5B4FC' } } },
};
const dataBorder = { top: { style: 'hair', color: { rgb: 'E2E8F0' } }, bottom: { style: 'hair', color: { rgb: 'E2E8F0' } }, left: { style: 'hair', color: { rgb: 'E2E8F0' } }, right: { style: 'hair', color: { rgb: 'E2E8F0' } } };
const sData = (even) => ({
  fill: { fgColor: { rgb: even ? 'F8FAFC' : 'FFFFFF' }, type: 'pattern', patternType: 'solid' },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: dataBorder,
});

// cell builders
const t_cell  = (v) => ({ v, t: 's', s: S_TITLE });
const s_cell  = (v) => ({ v, t: 's', s: S_SUB });
const h_cell  = (v) => ({ v, t: 's', s: S_HDR });
const tot_n   = (v, z) => ({ v: v ?? 0, t: 'n', z, s: S_TOT });
const tot_s   = (v)    => ({ v: v ?? '', t: 's', s: S_TOT });
const sum_f   = (ref, v, z) => ({ f: `SUM(${ref})`, v: v ?? 0, t: 'n', z, s: S_TOT });
const d_n     = (v, i, z) => ({ v: v ?? 0, t: 'n', z, s: sData(i % 2 === 0) });
const d_s     = (v, i)    => ({ v: v ?? '', t: 's', s: sData(i % 2 === 0) });
const d_f     = (f, v, i, z) => ({ f, v: v ?? 0, t: 'n', z, s: sData(i % 2 === 0) });
const blank   = () => ({ t: 'z', s: { fill: { fgColor: { rgb: 'FFFFFF' }, type: 'pattern', patternType: 'solid' } } });

// Build sheet from array-of-arrays with merges/cols/freeze
function buildSheet(aoa, merges, colWidths, freezeRow) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
  ws['!rows'] = aoa.map((_, i) => ({ hpx: i === 0 ? 32 : i === 1 ? 20 : i === 3 ? 26 : 20 }));
  if (freezeRow) ws['!freeze'] = { xSplit: 0, ySplit: freezeRow };
  return ws;
}

// ─── Share XLSX workbook ───────────────────────────────────────────────────────
async function shareExcel(workbook, filename, tRef) {
  try {
    const arr = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
    const base64 = uint8ToBase64(new Uint8Array(arr));
    const uri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(uri, base64, {
      encoding: 'base64',
    });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: tRef('sharingReportTitle') || 'Export Report',
      });
    } else {
      Alert.alert(tRef('error'), tRef('sharingUnsupported'));
    }
  } catch (err) {
    console.error('Error sharing excel:', err);
    throw err;
  }
}

// Get current month as YYYY-MM
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function ReportsScreen() {
  const { t, locale, isRTL } = useLanguage();
  const [activeTab, setActiveTab]     = useState('attendance');
  const [logs, setLogs]               = useState([]);
  const [payroll, setPayroll]         = useState([]);
  const [month, setMonth]             = useState(currentMonth());
  const [employees, setEmployees]     = useState([]);
  const [filterEmp, setFilterEmp]     = useState(null);  // null = all
  const [searchText, setSearchText]   = useState('');

  const STATUS_LABELS = {
    present: t('statusLabels.present'),
    absent: t('statusLabels.absent'),
    vacation: t('statusLabels.vacation'),
    permission: t('statusLabels.permission'),
    sick: t('statusLabels.sick'),
  };

  const STATUS_COLORS = {
    present:    '#10B981',
    absent:     '#EF4444',
    vacation:   '#F59E0B',
    permission: '#8B5CF6',
    sick:       '#3B82F6',
  };

  const TABS = [
    { key: 'attendance', label: t('exportAttendanceTitle'), icon: 'calendar' },
    { key: 'payroll',    label: t('exportPayrollTitle'), icon: 'cash' },
  ];

  const loadData = useCallback(() => {
    try {
      const emps = getEmployees();
      setEmployees(emps);

      const filters = { month };
      if (filterEmp) filters.employeeId = filterEmp;
      setLogs(getAllAttendance(filters));
      setPayroll(getAllPayroll(month));
    } catch (e) {
      console.error(e);
    }
  }, [month, filterEmp]);

  useEffect(() => { loadData(); }, [loadData]);

  // Month navigation
  const changeMonth = (delta) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long' });
  };

  // Export Attendance Excel
  const exportAttendance = async () => {
    if (logs.length === 0) { Alert.alert(t('alert'), t('noRecordsMonth')); return; }
    try {
      const hdrs = [
        t('excelHeaders.date'), t('excelHeaders.employeeName'), t('excelHeaders.department'),
        t('excelHeaders.status'), t('excelHeaders.checkIn'), t('excelHeaders.checkOut'),
        t('excelHeaders.permissionHours'), t('excelHeaders.bonus'), t('excelHeaders.deduction'), t('excelHeaders.notes')
      ];
      const aoa = [
        [t_cell(t('exportAttendanceTitle'))],
        [s_cell(t('reportMonth') + ': ' + monthLabel())],
        [],
        hdrs.map(h_cell)
      ];
      
      let totPerm = 0, totBonus = 0, totDed = 0;

      logs.forEach((log, i) => {
        totPerm += Number(log.permission_hours || 0);
        totBonus += Number(log.bonus || 0);
        totDed += Number(log.deduction || 0);

        aoa.push([
          d_s(log.date, i),
          d_s(log.name, i),
          d_s(log.department || '-', i),
          d_s(STATUS_LABELS[log.status] || log.status, i),
          d_s(log.check_in_time || '-', i),
          d_s(log.check_out_time || '-', i),
          d_n(log.permission_hours, i, '0.0'),
          d_n(log.bonus, i, '#,##0.00'),
          d_n(log.deduction, i, '#,##0.00'),
          d_s(log.notes || '-', i)
        ]);
      });

      const lastRow = aoa.length + 1;
      // Add Totals row with formulas
      aoa.push([
        tot_s(t('total')), blank(), blank(), blank(), blank(), blank(),
        sum_f(`G5:G${lastRow - 1}`, totPerm, '0.0'),
        sum_f(`H5:H${lastRow - 1}`, totBonus, '#,##0.00'),
        sum_f(`I5:I${lastRow - 1}`, totDed, '#,##0.00'),
        blank()
      ]);

      const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
        { s: { r: lastRow - 1, c: 0 }, e: { r: lastRow - 1, c: 5 } } // Merge total label
      ];
      const cols = [12, 25, 20, 15, 12, 12, 15, 15, 15, 30];
      
      const ws = buildSheet(aoa, merges, cols, 4);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('attendance'));
      await shareExcel(wb, `${t('exportAttendanceTitle')}_${month}.xlsx`, t);
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), `${t('errorSharing') || 'Error during export'}: ${e.message}`);
    }
  };

  // Export Payroll Excel
  const exportPayroll = async () => {
    if (payroll.length === 0) { Alert.alert(t('alert'), t('noPayrollData')); return; }
    try {
      const hdrs = [
        t('excelHeaders.employeeName'), t('excelHeaders.department'), t('excelHeaders.jobTitle'),
        t('excelHeaders.salaryType'), t('excelHeaders.salaryRate'),
        t('excelHeaders.presentDays'), t('excelHeaders.absentDays'), t('excelHeaders.vacationDays'),
        t('excelHeaders.sickDays'), t('excelHeaders.permissionDays'), t('excelHeaders.totalPermissionHours'),
        t('excelHeaders.totalBonus'), t('excelHeaders.totalDeduction'),
        t('excelHeaders.grossPay'), t('excelHeaders.netPay')
      ];
      
      const aoa = [
        [t_cell(t('exportPayrollTitle'))],
        [s_cell(t('reportMonth') + ': ' + monthLabel())],
        [],
        hdrs.map(h_cell)
      ];

      let totBonus = 0, totDed = 0, totGross = 0, totNet = 0;

      payroll.forEach((p, i) => {
        totBonus += Number(p.totalBonus || 0);
        totDed += Number(p.totalDeduction || 0);
        totGross += Number(p.grossPay || 0);
        totNet += Number(p.netPay || 0);
        const r = i + 5; // row index in excel (1-based)

        aoa.push([
          d_s(p.employee.name, i),
          d_s(p.employee.department || '-', i),
          d_s(p.employee.job_title || '-', i),
          d_s(p.employee.salary_type === 'monthly' ? t('monthly') : t('daily'), i),
          d_n(p.employee.salary_rate, i, '#,##0.00'),
          d_n(p.presentDays, i, '0'),
          d_n(p.absentDays, i, '0'),
          d_n(p.vacationDays, i, '0'),
          d_n(p.sickDays, i, '0'),
          d_n(p.permissionDays, i, '0'),
          d_n(p.totalPermissionHours, i, '0.0'),
          d_n(p.totalBonus, i, '#,##0.00'),
          d_n(p.totalDeduction, i, '#,##0.00'),
          d_f(`E${r} + L${r} - M${r}`, p.grossPay, i, '#,##0.00'), // Example formula for Net Pay if monthly, but we use netPay for simplicity. Actually, let's just use the calculated netPay but as formula: Gross + Bonus - Ded
          d_n(p.netPay, i, '#,##0.00') // Net pay from our engine
        ]);
      });

      const lastRow = aoa.length + 1;
      aoa.push([
        tot_s(t('total')), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(),
        sum_f(`L5:L${lastRow - 1}`, totBonus, '#,##0.00'),
        sum_f(`M5:M${lastRow - 1}`, totDed, '#,##0.00'),
        sum_f(`N5:N${lastRow - 1}`, totGross, '#,##0.00'),
        sum_f(`O5:O${lastRow - 1}`, totNet, '#,##0.00')
      ]);

      const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },
        { s: { r: lastRow - 1, c: 0 }, e: { r: lastRow - 1, c: 10 } }
      ];
      const cols = [25, 20, 20, 15, 15, 12, 12, 12, 12, 12, 15, 15, 15, 15, 15];

      const ws = buildSheet(aoa, merges, cols, 4);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('payroll'));
      await shareExcel(wb, `${t('exportPayrollTitle')}_${month}.xlsx`, t);
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), `${t('errorSharing') || 'Error during export'}: ${e.message}`);
    }
  };

  // Filtered logs for attendance tab
  const filteredLogs = logs.filter(l =>
    l.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const directionRow = isRTL ? 'row-reverse' : 'row';
  const textAlignStyle = isRTL ? 'right' : 'left';
  const alignItemsStyle = isRTL ? 'flex-end' : 'flex-start';

  // Attendance row
  const renderLog = ({ item }) => {
    const statusColor = STATUS_COLORS[item.status] || '#6B7280';
    return (
      <View style={[styles.logCard, { flexDirection: directionRow }]}>
        <View style={{ justifyContent: 'center', marginLeft: isRTL ? 12 : 0, marginRight: isRTL ? 0 : 12 }}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
        <View style={[styles.logMiddle, { alignItems: alignItemsStyle }]}>
          <Text style={styles.logName}>{item.name}</Text>
          <Text style={styles.logDate}>{item.date}</Text>
          <View style={[styles.logTimesRow, { flexDirection: directionRow }]}>
            {item.check_in_time  && <Text style={styles.logTime}>{t('checkInShort')} {item.check_in_time}</Text>}
            {item.check_out_time && <Text style={[styles.logTime, { color: '#EF4444' }]}>{t('checkOutShort')} {item.check_out_time}</Text>}
          </View>
          {item.status === 'permission' && item.permission_hours > 0 && (
            <Text style={styles.permText}>{t('permissionShort')}: {item.permission_hours} {t('hoursLabel') || 'hours'}</Text>
          )}
          {item.notes ? <Text style={styles.notesText}>{t('notesLabel')}: {item.notes}</Text> : null}
        </View>
        <View style={styles.logRight}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
          {(item.bonus > 0 || item.deduction > 0) && (
            <View style={styles.financialBadge}>
              {item.bonus > 0 && <Text style={styles.bonusText}>+{item.bonus}</Text>}
              {item.deduction > 0 && <Text style={styles.deductText}>-{item.deduction}</Text>}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Payroll row
  const renderPayroll = ({ item }) => (
    <View style={styles.payrollCard}>
      <View style={[styles.payrollHeader, { flexDirection: directionRow }]}>
        <View style={styles.payrollAvatar}>
          <Text style={styles.payrollAvatarText}>{item.employee.name.charAt(0)}</Text>
        </View>
        <View style={[styles.payrollInfo, { alignItems: alignItemsStyle }]}>
          <Text style={styles.payrollName}>{item.employee.name}</Text>
          {item.employee.job_title ? (
            <Text style={styles.payrollTitle}>{item.employee.job_title}</Text>
          ) : null}
          <Text style={styles.payrollType}>
            {item.employee.salary_type === 'monthly' ? t('salaryTypeMonthly') : t('salaryTypeDaily')}
          </Text>
        </View>
        <View style={styles.netPayBox}>
          <Text style={styles.netPayLabel}>{t('netSalary')}</Text>
          <Text style={styles.netPayValue}>
            {item.netPay.toLocaleString()} {t('egpCurrency')}
          </Text>
        </View>
      </View>

      <View style={[styles.payrollGrid, { flexDirection: directionRow }]}>
        <View style={styles.payrollGridItem}>
          <Text style={styles.gridVal}>{item.presentDays}</Text>
          <Text style={styles.gridLabel}>{t('legendPresent')}</Text>
        </View>
        <View style={styles.payrollGridItem}>
          <Text style={[styles.gridVal, { color: '#EF4444' }]}>{item.absentDays}</Text>
          <Text style={styles.gridLabel}>{t('legendAbsent')}</Text>
        </View>
        <View style={styles.payrollGridItem}>
          <Text style={[styles.gridVal, { color: '#F59E0B' }]}>{item.vacationDays}</Text>
          <Text style={styles.gridLabel}>{t('legendVacation')}</Text>
        </View>
        <View style={styles.payrollGridItem}>
          <Text style={[styles.gridVal, { color: '#3B82F6' }]}>{item.sickDays}</Text>
          <Text style={styles.gridLabel}>{t('legendSick')}</Text>
        </View>
      </View>

      <View style={styles.payrollFinancials}>
        <View style={[styles.finRow, { flexDirection: directionRow }]}>
          <Text style={styles.finLabel}>{t('basicSalary')}</Text>
          <Text style={styles.finVal}>{item.grossPay.toLocaleString()}{t('egpCurrencySuffix')}</Text>
        </View>
        {item.totalBonus > 0 && (
          <View style={[styles.finRow, { flexDirection: directionRow }]}>
            <Text style={styles.finLabel}>{t('bonuses')}</Text>
            <Text style={[styles.finVal, { color: '#10B981' }]}>+{item.totalBonus.toLocaleString()}{t('egpCurrencySuffix')}</Text>
          </View>
        )}
        {item.totalDeduction > 0 && (
          <View style={[styles.finRow, { flexDirection: directionRow }]}>
            <Text style={styles.finLabel}>{t('deductions')}</Text>
            <Text style={[styles.finVal, { color: '#EF4444' }]}>-{item.totalDeduction.toLocaleString()}{t('egpCurrencySuffix')}</Text>
          </View>
        )}
        <View style={[styles.finRow, styles.finRowTotal, { flexDirection: directionRow }]}>
          <Text style={styles.finLabelTotal}>{t('netSalaryTotalLabel')}</Text>
          <Text style={styles.finValTotal}>{item.netPay.toLocaleString()}{t('egpCurrencySuffix')}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('reports')}</Text>

        {/* Month nav */}
        <View style={[styles.monthNav, { flexDirection: directionRow }]}>
          <TouchableOpacity onPress={() => changeMonth(isRTL ? 1 : -1)} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color="#94A3B8" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel()}</Text>
          <TouchableOpacity onPress={() => changeMonth(isRTL ? -1 : 1)} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { flexDirection: directionRow }]}>
        {TABS.map(tOption => (
          <TouchableOpacity
            key={tOption.key}
            style={[styles.tab, { flexDirection: directionRow }, activeTab === tOption.key && styles.tabActive]}
            onPress={() => setActiveTab(tOption.key)}
          >
            <Ionicons name={tOption.icon} size={18} color={activeTab === tOption.key ? '#6366F1' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === tOption.key && styles.tabTextActive]}>{tOption.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── ATTENDANCE TAB ── */}
      {activeTab === 'attendance' && (
        <>
          <View style={[styles.toolbar, { flexDirection: directionRow }]}>
            <View style={[styles.searchBox, { flexDirection: directionRow }]}>
              <Ionicons name="search-outline" size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder={t('searchPlaceholderReports')}
                placeholderTextColor="#94A3B8"
                value={searchText}
                onChangeText={setSearchText}
                textAlign={textAlignStyle}
              />
            </View>
            <TouchableOpacity style={[styles.exportBtn, { flexDirection: directionRow }]} onPress={exportAttendance}>
              <Ionicons name="download-outline" size={18} color="#FFF" />
              <Text style={styles.exportText}>{t('exportBtnText')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={filteredLogs}
            keyExtractor={item => item.id.toString()}
            renderItem={renderLog}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="document-outline" size={60} color="#CBD5E1" />
                <Text style={styles.emptyText}>{t('noRecordsMonth')}</Text>
              </View>
            }
          />
        </>
      )}

      {/* ── PAYROLL TAB ── */}
      {activeTab === 'payroll' && (
        <>
          <View style={[styles.toolbar, { flexDirection: directionRow }]}>
            <Text style={[styles.payrollCount, { textAlign: textAlignStyle }]}>
              {t('employeeCount', { count: payroll.length })}
            </Text>
            <TouchableOpacity style={[styles.exportBtn, { flexDirection: directionRow }]} onPress={exportPayroll}>
              <Ionicons name="download-outline" size={18} color="#FFF" />
              <Text style={styles.exportText}>{t('exportBtnText')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={payroll}
            keyExtractor={item => item.employee.id.toString()}
            renderItem={renderPayroll}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="cash-outline" size={60} color="#CBD5E1" />
                <Text style={styles.emptyText}>{t('noPayrollData')}</Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  header: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  monthNav: {
    alignItems: 'center',
    marginTop: 10, gap: 8,
  },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 15, color: '#94A3B8', flex: 1, textAlign: 'center' },

  tabs: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#6366F1' },
  tabText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  tabTextActive: { color: '#6366F1' },

  toolbar: {
    alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  searchBox: {
    flex: 1, alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 10,
    paddingHorizontal: 10, gap: 6,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 14, color: '#1E293B' },
  payrollCount: { flex: 1, color: '#64748B', fontSize: 14 },
  exportBtn: {
    alignItems: 'center', gap: 5,
    backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  exportText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  list: { padding: 14, paddingBottom: 40 },

  // Log card
  logCard: {
    backgroundColor: '#FFF', borderRadius: 12,
    marginBottom: 10, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  logMiddle: { flex: 1 },
  logName:  { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  logDate:  { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  logTimesRow: { gap: 10, marginTop: 5 },
  logTime:  { fontSize: 13, color: '#10B981', fontWeight: '600' },
  permText: { fontSize: 12, color: '#8B5CF6', marginTop: 3 },
  notesText:{ fontSize: 12, color: '#94A3B8', marginTop: 3, fontStyle: 'italic' },
  logRight: { alignItems: 'center', justifyContent: 'center', gap: 5 },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  financialBadge: { alignItems: 'center' },
  bonusText:  { fontSize: 11, color: '#10B981', fontWeight: '600' },
  deductText: { fontSize: 11, color: '#EF4444', fontWeight: '600' },

  // Payroll card
  payrollCard: {
    backgroundColor: '#FFF', borderRadius: 16,
    marginBottom: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  payrollHeader: {
    alignItems: 'center',
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12,
  },
  payrollAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center',
  },
  payrollAvatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  payrollInfo: { flex: 1 },
  payrollName:  { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  payrollTitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  payrollType:  { fontSize: 12, color: '#6366F1', fontWeight: '600', marginTop: 3 },
  netPayBox: { alignItems: 'center', backgroundColor: '#ECFDF5', padding: 10, borderRadius: 12 },
  netPayLabel: { fontSize: 11, color: '#6B7280' },
  netPayValue: { fontSize: 16, fontWeight: 'bold', color: '#10B981', marginTop: 2 },

  payrollGrid: {
    paddingVertical: 12,
    paddingHorizontal: 14, gap: 8,
  },
  payrollGridItem: { flex: 1, alignItems: 'center' },
  gridVal:   { fontSize: 20, fontWeight: 'bold', color: '#10B981' },
  gridLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  payrollFinancials: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  finRow:      { justifyContent: 'space-between', paddingVertical: 4 },
  finRowTotal: {
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
    marginTop: 6, paddingTop: 8,
  },
  finLabel:     { fontSize: 14, color: '#64748B' },
  finVal:       { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  finLabelTotal:{ fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  finValTotal:  { fontSize: 16, fontWeight: 'bold', color: '#10B981' },

  emptyBox:  { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 17, color: '#94A3B8', marginTop: 16, fontWeight: '600' },
});
