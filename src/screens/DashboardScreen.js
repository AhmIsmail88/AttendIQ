import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDashboardStats, getAllPayroll, getEmployees } from '../database/db';
import { useLanguage } from '../context/LanguageContext';

function formatDate(d, locale = 'ar') {
  if (locale === 'ar') {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return `${days[d.getDay()]}، ${d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  } else {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${days[d.getDay()]}, ${d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function DashboardScreen() {
  const { t, locale, isRTL, toggleLanguage } = useLanguage();
  const today = new Date().toISOString().split('T')[0];
  const [stats, setStats]     = useState({ total: 0, present: 0, absent: 0, vacation: 0, sick: 0 });
  const [payroll, setPayroll] = useState([]);
  const [employees, setEmployees] = useState([]);

  const loadData = () => {
    try {
      setStats(getDashboardStats(today));
      setEmployees(getEmployees());
      setPayroll(getAllPayroll(currentMonth()));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + (stats.sick || 0)) / stats.total) * 100)
    : 0;

  const totalNetPay = payroll.reduce((sum, p) => sum + p.netPay, 0);

  const STAT_CARDS = [
    { label: t('totalEmployees'), value: stats.total,       icon: 'people',          color: '#6366F1', bg: '#EEF2FF' },
    { label: t('presentToday'),     value: stats.present,      icon: 'checkmark-circle', color: '#10B981', bg: '#ECFDF5' },
    { label: t('absentToday'),     value: stats.absent,       icon: 'close-circle',    color: '#EF4444', bg: '#FEF2F2' },
    { label: t('vacations'),         value: stats.vacation || 0, icon: 'sunny',          color: '#F59E0B', bg: '#FFFBEB' },
    { label: t('sickLeave'),    value: stats.sick || 0,    icon: 'medkit',          color: '#3B82F6', bg: '#EFF6FF' },
    { label: t('attendanceRate'),    value: `${attendanceRate}%`, icon: 'stats-chart',   color: '#8B5CF6', bg: '#F5F3FF' },
  ];

  // Low vacation balance employees (≤ 5 days)
  const lowVacation = employees.filter(e => (e.vacation_balance ?? 21) <= 5);

  const directionRow = isRTL ? 'row-reverse' : 'row';
  const textAlignStyle = isRTL ? 'right' : 'left';
  const alignItemsStyle = isRTL ? 'flex-end' : 'flex-start';

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: directionRow }]}>
        <View style={{ alignItems: alignItemsStyle }}>
          <Text style={styles.greeting}>{t('welcome')}</Text>
          <Text style={styles.appName}>{t('appName')}</Text>
        </View>
        <View style={[styles.headerRight, { flexDirection: directionRow, alignItems: 'center', gap: 10 }]}>
          <TouchableOpacity onPress={toggleLanguage} style={styles.langBtn}>
            <Ionicons name="globe-outline" size={16} color="#FFF" />
            <Text style={styles.langBtnText}>{locale === 'ar' ? 'English' : 'العربية'}</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>{formatDate(new Date(), locale)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* KPI Cards Grid */}
        <Text style={[styles.sectionTitle, { textAlign: textAlignStyle }]}>{t('todayStats')}</Text>
        <View style={[styles.grid, { flexDirection: directionRow }]}>
          {STAT_CARDS.map((c, i) => (
            <View key={i} style={[styles.kpiCard, { backgroundColor: c.bg }]}>
              <View style={[styles.kpiIconBox, { backgroundColor: c.color + '25' }]}>
                <Ionicons name={c.icon} size={22} color={c.color} />
              </View>
              <Text style={[styles.kpiValue, { color: c.color }]}>{c.value}</Text>
              <Text style={styles.kpiLabel}>{c.label}</Text>
            </View>
          ))}
        </View>

        {/* Attendance Progress Bar */}
        <View style={styles.progressCard}>
          <View style={[styles.progressHeader, { flexDirection: directionRow }]}>
            <Text style={styles.progressTitle}>{t('attendanceDistribution')}</Text>
            <Text style={styles.progressPercent}>{attendanceRate}%</Text>
          </View>
          <View style={[styles.progressBar, { flexDirection: directionRow }]}>
            {stats.total === 0 ? (
              <View style={[styles.progressFillEmpty, { flex: 1 }]} />
            ) : (
              <>
                {stats.present > 0 && <View style={[styles.progressFill, { flex: stats.present }]} />}
                {(stats.vacation || 0) > 0 && <View style={[styles.progressFillVac, { flex: stats.vacation }]} />}
                {(stats.sick || 0) > 0 && <View style={[styles.progressFillSick, { flex: stats.sick }]} />}
                {stats.absent > 0 && <View style={[styles.progressFillAbsent, { flex: stats.absent }]} />}
              </>
            )}
          </View>
          <View style={[styles.progressLegend, { flexDirection: directionRow }]}>
            {[
              { label: t('legendPresent'), color: '#10B981' },
              { label: t('legendVacation'), color: '#F59E0B' },
              { label: t('legendSick'), color: '#3B82F6' },
              { label: t('legendAbsent'), color: '#EF4444' },
            ].map(l => (
              <View key={l.label} style={[styles.legendItem, { flexDirection: directionRow }]}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Monthly Payroll Summary */}
        <View style={styles.payrollSummary}>
          <View style={[styles.payrollSummaryHeader, { flexDirection: directionRow }]}>
            <Ionicons name="cash-outline" size={22} color="#10B981" />
            <Text style={styles.payrollSummaryTitle}>{t('totalSalariesMonth')}</Text>
          </View>
          <Text style={styles.payrollSummaryValue}>
            {locale === 'ar' 
              ? `${totalNetPay.toLocaleString('ar-EG')} ج.م` 
              : `${totalNetPay.toLocaleString('en-US')} EGP`
            }
          </Text>
          <Text style={styles.payrollSummaryNote}>
            {t('employeeCount', { count: payroll.length })}
          </Text>
        </View>

        {/* Low Vacation Balance Alert */}
        {lowVacation.length > 0 && (
          <View style={styles.alertCard}>
            <View style={[styles.alertHeader, { flexDirection: directionRow }]}>
              <Ionicons name="warning-outline" size={20} color="#F59E0B" />
              <Text style={styles.alertTitle}>{t('lowVacationBalance')}</Text>
            </View>
            {lowVacation.map(emp => (
              <View key={emp.id} style={[styles.alertRow, { flexDirection: directionRow }]}>
                <View style={styles.alertAvatar}>
                  <Text style={styles.alertAvatarText}>{emp.name.charAt(0)}</Text>
                </View>
                <Text style={[styles.alertEmpName, { textAlign: textAlignStyle }]}>{emp.name}</Text>
                <Text style={styles.alertBalance}>
                  {emp.vacation_balance} {emp.vacation_balance > 10 ? t('dayLabel') : t('daysLabel')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent employees */}
        {employees.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { textAlign: textAlignStyle }]}>{t('quickEmployeeList')}</Text>
            {employees.slice(0, 5).map(emp => (
              <View key={emp.id} style={[styles.empRow, { flexDirection: directionRow }]}>
                <View style={[styles.empAvatar, { backgroundColor: '#6366F1' }]}>
                  <Text style={styles.empAvatarText}>{emp.name.charAt(0)}</Text>
                </View>
                <View style={[styles.empRowInfo, { alignItems: alignItemsStyle }]}>
                  <Text style={styles.empRowName}>{emp.name}</Text>
                  <Text style={styles.empRowDept}>{emp.job_title || emp.department || 'Employee'}</Text>
                </View>
                <View style={[styles.empVacChip, { flexDirection: directionRow }]}>
                  <Ionicons name="umbrella-outline" size={13} color="#6366F1" />
                  <Text style={styles.empVacText}>
                    {emp.vacation_balance ?? 21} {t('daysLabel')}
                  </Text>
                </View>
              </View>
            ))}
            {employees.length > 5 && (
              <Text style={[styles.moreText, { textAlign: 'center' }]}>
                {t('moreEmployees', { count: employees.length - 5 })}
              </Text>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  header: {
    backgroundColor: '#1E293B',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  greeting: { fontSize: 13, color: '#94A3B8' },
  appName:  { fontSize: 26, fontWeight: 'bold', color: '#FFF', marginTop: 2 },
  headerRight: { alignItems: 'center' },
  dateText: { fontSize: 11, color: '#94A3B8', opacity: 0.8 },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  langBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  scroll: { padding: 16 },

  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#1E293B',
    marginBottom: 12, marginTop: 8,
  },

  grid: {
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    width: '31%',
    borderRadius: 14, padding: 14,
    alignItems: 'center',
  },
  kpiIconBox: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  kpiValue: { fontSize: 22, fontWeight: 'bold' },
  kpiLabel: { fontSize: 10, color: '#64748B', textAlign: 'center', marginTop: 4, lineHeight: 14 },

  progressCard: {
    backgroundColor: '#FFF', borderRadius: 16,
    padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  progressHeader: {
    justifyContent: 'space-between', marginBottom: 12,
  },
  progressTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  progressPercent: { fontSize: 15, fontWeight: 'bold', color: '#6366F1' },
  progressBar: {
    height: 12, borderRadius: 6,
    backgroundColor: '#F1F5F9', overflow: 'hidden', marginBottom: 12,
  },
  progressFill:       { backgroundColor: '#10B981' },
  progressFillVac:    { backgroundColor: '#F59E0B' },
  progressFillSick:   { backgroundColor: '#3B82F6' },
  progressFillAbsent: { backgroundColor: '#EF4444' },
  progressFillEmpty:  { backgroundColor: '#CBD5E1' },
  progressLegend: { justifyContent: 'space-around' },
  legendItem: { alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#64748B' },

  payrollSummary: {
    backgroundColor: '#0F172A', borderRadius: 16,
    padding: 20, marginBottom: 14, alignItems: 'center',
  },
  payrollSummaryHeader: { alignItems: 'center', gap: 8, marginBottom: 8 },
  payrollSummaryTitle: { fontSize: 14, color: '#94A3B8' },
  payrollSummaryValue: { fontSize: 28, fontWeight: 'bold', color: '#10B981' },
  payrollSummaryNote: { fontSize: 13, color: '#475569', marginTop: 4 },

  alertCard: {
    backgroundColor: '#FFFBEB', borderRadius: 16,
    borderWidth: 1, borderColor: '#FDE68A',
    padding: 14, marginBottom: 14,
  },
  alertHeader: { alignItems: 'center', gap: 8, marginBottom: 10 },
  alertTitle: { fontSize: 14, fontWeight: 'bold', color: '#92400E' },
  alertRow: {
    alignItems: 'center',
    paddingVertical: 6, gap: 10,
  },
  alertAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center',
  },
  alertAvatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  alertEmpName: { flex: 1, fontSize: 14, color: '#78350F' },
  alertBalance: { fontSize: 13, fontWeight: 'bold', color: '#EF4444' },

  empRow: {
    alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12, padding: 12,
    marginBottom: 8, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  empAvatar: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  empAvatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  empRowInfo: { flex: 1 },
  empRowName: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  empRowDept: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  empVacChip: {
    alignItems: 'center', gap: 4,
    backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  empVacText: { fontSize: 12, color: '#6366F1', fontWeight: '600' },
  moreText: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
});
