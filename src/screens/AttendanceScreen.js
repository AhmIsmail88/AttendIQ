import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, ScrollView, Dimensions, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// useFocusEffect replaced with useEffect (screens mount/unmount on tab switch)
import {
  getEmployees, getAttendanceForDate,
  upsertAttendance, deductVacationDay, restoreVacationDay, getEmployee
} from '../database/db';
import { useLanguage } from '../context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Time Picker Modal ────────────────────────────────────────────────────────
// A clean dropdown-style time picker: choose hour then minute

function TimePickerModal({ visible, value, onConfirm, onClose, title, isRTL }) {
  // Parse initial value
  const parseTime = (v) => {
    if (!v) return { hour: 8, minute: 0 };
    const parts = v.split(':');
    return {
      hour: parseInt(parts[0]) || 0,
      minute: parseInt(parts[1]) || 0,
    };
  };

  const [pickerStep, setPickerStep] = useState('hour'); // 'hour' | 'minute'
  const [selectedHour, setSelectedHour] = useState(8);
  const [selectedMinute, setSelectedMinute] = useState(0);

  // Reset when modal opens
  React.useEffect(() => {
    if (visible) {
      const parsed = parseTime(value);
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
      setPickerStep('hour');
    }
  }, [visible]);

  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const pad = (n) => String(n).padStart(2, '0');

  const handleHourSelect = (h) => {
    setSelectedHour(h);
    setPickerStep('minute');
  };

  const handleMinuteSelect = (m) => {
    setSelectedMinute(m);
    const timeStr = `${pad(selectedHour)}:${pad(m)}`;
    onConfirm(timeStr);
  };

  const handleBack = () => setPickerStep('hour');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={pickerStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={pickerStyles.card}>
            {/* Header */}
            <View style={[pickerStyles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {pickerStep === 'minute' && (
                <TouchableOpacity onPress={handleBack} style={pickerStyles.backBtn}>
                  <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color="#6366F1" />
                </TouchableOpacity>
              )}
              <Text style={pickerStyles.headerTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Current selection preview */}
            <View style={pickerStyles.preview}>
              <Text style={pickerStyles.previewTime}>
                {pad(selectedHour)}:{pad(pickerStep === 'minute' ? selectedMinute : 0)}
              </Text>
              <Text style={pickerStyles.previewStep}>
                {pickerStep === 'hour' ? '← اختر الساعة' : '← اختر الدقائق'}
              </Text>
            </View>

            {/* Step indicator */}
            <View style={[pickerStyles.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[pickerStyles.stepDot, pickerStep === 'hour' && pickerStyles.stepDotActive]}>
                <Text style={[pickerStyles.stepDotText, pickerStep === 'hour' && pickerStyles.stepDotTextActive]}>١</Text>
              </View>
              <View style={pickerStyles.stepLine} />
              <View style={[pickerStyles.stepDot, pickerStep === 'minute' && pickerStyles.stepDotActive]}>
                <Text style={[pickerStyles.stepDotText, pickerStep === 'minute' && pickerStyles.stepDotTextActive]}>٢</Text>
              </View>
            </View>

            {/* Hour/Minute grid */}
            {pickerStep === 'hour' ? (
              <ScrollView style={pickerStyles.gridScroll} showsVerticalScrollIndicator={false}>
                <View style={pickerStyles.grid}>
                  {HOURS.map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[pickerStyles.cell, selectedHour === h && pickerStyles.cellActive]}
                      onPress={() => handleHourSelect(h)}
                    >
                      <Text style={[pickerStyles.cellText, selectedHour === h && pickerStyles.cellTextActive]}>
                        {pad(h)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View style={pickerStyles.grid}>
                {MINUTES.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[pickerStyles.cell, pickerStyles.cellLg, selectedMinute === m && pickerStyles.cellActive]}
                    onPress={() => handleMinuteSelect(m)}
                  >
                    <Text style={[pickerStyles.cellText, selectedMinute === m && pickerStyles.cellTextActive]}>
                      :{pad(m)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 360,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: 16, fontWeight: 'bold', color: '#1E293B', textAlign: 'center',
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  preview: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  previewTime: {
    fontSize: 38, fontWeight: 'bold', color: '#6366F1', letterSpacing: 2,
  },
  previewStep: {
    fontSize: 12, color: '#94A3B8', marginTop: 4,
  },
  stepRow: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  stepLine: {
    flex: 1, maxWidth: 40, height: 2, backgroundColor: '#E2E8F0', borderRadius: 1,
  },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 2, borderColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#6366F1', borderColor: '#6366F1',
  },
  stepDotText: {
    fontSize: 13, fontWeight: 'bold', color: '#94A3B8',
  },
  stepDotTextActive: { color: '#FFF' },
  gridScroll: { maxHeight: 200 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  cell: {
    width: 52, height: 44, borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center',
  },
  cellLg: {
    width: 68,
  },
  cellActive: {
    backgroundColor: '#6366F1', borderColor: '#6366F1',
  },
  cellText: {
    fontSize: 15, fontWeight: '600', color: '#475569',
  },
  cellTextActive: { color: '#FFF' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d, locale = 'ar') {
  if (locale === 'ar') {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return `${days[d.getDay()]}  ${d.toLocaleDateString('ar-EG')}`;
  } else {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${days[d.getDay()]}  ${d.toLocaleDateString('en-US')}`;
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AttendanceScreen() {
  const { t, locale, isRTL } = useLanguage();
  const [employees, setEmployees] = useState([]);
  const [todayAtt, setTodayAtt]   = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const todayStr = selectedDate.toISOString().split('T')[0];

  // Status definitions
  const STATUSES = [
    { key: 'present',    label: t('statusLabels.present'),    icon: 'checkmark-circle',   color: '#10B981', bg: '#ECFDF5' },
    { key: 'absent',     label: t('statusLabels.absent'),     icon: 'close-circle',       color: '#EF4444', bg: '#FEF2F2' },
    { key: 'vacation',   label: t('statusLabels.vacation'),   icon: 'sunny',              color: '#F59E0B', bg: '#FFFBEB' },
    { key: 'permission', label: t('statusLabels.permission'), icon: 'time',               color: '#8B5CF6', bg: '#F5F3FF' },
    { key: 'sick',       label: t('statusLabels.sick'),       icon: 'medkit',             color: '#3B82F6', bg: '#EFF6FF' },
  ];

  const getStatusDef = (key) => STATUSES.find(s => s.key === key) || STATUSES[1];

  // Modal state for recording attendance
  const [modalEmp, setModalEmp]               = useState(null);
  const [modalStatus, setModalStatus]         = useState('present');
  const [modalCheckIn, setModalCheckIn]       = useState('');
  const [modalCheckOut, setModalCheckOut]     = useState('');
  const [modalPermHours, setModalPermHours]   = useState('');
  const [modalBonus, setModalBonus]           = useState('');
  const [modalDeduction, setModalDeduction]   = useState('');
  const [modalNotes, setModalNotes]           = useState('');
  const [modalVisible, setModalVisible]       = useState(false);

  // Time Picker state
  const [timePickerVisible, setTimePickerVisible]   = useState(false);
  const [timePickerTarget, setTimePickerTarget]     = useState('in'); // 'in' | 'out'
  const [permHoursPickerVisible, setPermHoursPickerVisible] = useState(false);

  const loadData = useCallback(() => {
    try {
      const emps = getEmployees();
      setEmployees(emps);
      const att = getAttendanceForDate(todayStr);
      const map = {};
      att.forEach(a => { map[a.employee_id] = a; });
      setTodayAtt(map);
    } catch (e) {
      console.error(e);
    }
  }, [todayStr]);

  useEffect(() => { loadData(); }, [loadData]);

  const openModal = (emp) => {
    const rec = todayAtt[emp.id];
    setModalEmp(emp);
    setModalStatus(rec?.status || 'present');
    setModalCheckIn(rec?.check_in_time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    setModalCheckOut(rec?.check_out_time || '');
    setModalPermHours(rec?.permission_hours ? String(rec.permission_hours) : '');
    setModalBonus(rec?.bonus ? String(rec.bonus) : '');
    setModalDeduction(rec?.deduction ? String(rec.deduction) : '');
    setModalNotes(rec?.notes || '');
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!modalEmp) return;

    const prevRec = todayAtt[modalEmp.id];
    const prevStatus = prevRec?.status;

    if (prevStatus === 'vacation' && modalStatus !== 'vacation') {
      restoreVacationDay(modalEmp.id);
    } else if (prevStatus !== 'vacation' && modalStatus === 'vacation') {
      const emp = getEmployee(modalEmp.id);
      if ((emp?.vacation_balance ?? 0) <= 0) {
        Alert.alert(t('alert'), t('vacationBalanceZero'));
        return;
      }
      deductVacationDay(modalEmp.id);
    }

    try {
      upsertAttendance({
        employee_id: modalEmp.id,
        date: todayStr,
        status: modalStatus,
        check_in_time: (modalStatus === 'present' || modalStatus === 'permission') ? (modalCheckIn || null) : null,
        check_out_time: (modalStatus === 'present' || modalStatus === 'permission') ? (modalCheckOut || null) : null,
        permission_hours: parseFloat(modalPermHours) || 0,
        bonus: parseFloat(modalBonus) || 0,
        deduction: parseFloat(modalDeduction) || 0,
        notes: modalNotes,
      });
      setModalVisible(false);
      loadData();
    } catch (e) {
      Alert.alert(t('error'), t('errorSaving'));
    }
  };

  const quickAction = (emp, action) => {
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const rec = todayAtt[emp.id];
    if (action === 'in') {
      upsertAttendance({
        employee_id: emp.id, date: todayStr, status: 'present',
        check_in_time: now,
        check_out_time: rec?.check_out_time || null,
        permission_hours: rec?.permission_hours || 0,
        bonus: rec?.bonus || 0, deduction: rec?.deduction || 0, notes: rec?.notes || '',
      });
    } else {
      const existing = { ...rec };
      upsertAttendance({
        employee_id: emp.id, date: todayStr, status: existing.status || 'present',
        check_in_time: existing.check_in_time || null,
        check_out_time: now,
        permission_hours: existing.permission_hours || 0,
        bonus: existing.bonus || 0, deduction: existing.deduction || 0, notes: existing.notes || '',
      });
    }
    loadData();
  };

  const changeDate = (delta) => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  };

  const stats = employees.reduce((acc, emp) => {
    const rec = todayAtt[emp.id];
    const s = rec?.status || 'absent';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const directionRow = isRTL ? 'row-reverse' : 'row';
  const textAlignStyle = isRTL ? 'right' : 'left';
  const alignItemsStyle = isRTL ? 'flex-end' : 'flex-start';

  // Time display button component
  const TimeButton = ({ value, placeholder, onPress, color = '#6366F1' }) => (
    <TouchableOpacity
      style={[styles.timePickerBtn, value ? { borderColor: color, backgroundColor: color + '10' } : {}]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {value ? (
        <Text style={[styles.timePickerBtnText, { color }]}>{value}</Text>
      ) : (
        <Text style={styles.timePickerBtnPlaceholder}>{placeholder}</Text>
      )}
      <Ionicons name="time-outline" size={18} color={value ? color : '#94A3B8'} />
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => {
    const rec = todayAtt[item.id];
    const status = rec?.status || 'absent';
    const def = getStatusDef(status);

    return (
      <TouchableOpacity style={[styles.card, { flexDirection: directionRow }]} onPress={() => openModal(item)} activeOpacity={0.8}>
        <View style={{ marginLeft: isRTL ? 10 : 0, marginRight: isRTL ? 0 : 10, alignItems: 'center' }}>
          <View style={[styles.avatar, { backgroundColor: def.color }]}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
        </View>

        <View style={styles.cardMiddle}>
          <Text style={[styles.empName, { textAlign: textAlignStyle }]}>{item.name}</Text>
          {item.job_title ? <Text style={[styles.empTitle, { textAlign: textAlignStyle }]}>{item.job_title}</Text> : null}
          {item.department ? (
            <View style={[styles.deptRow, { flexDirection: directionRow }]}>
              <Ionicons name="business-outline" size={11} color="#94A3B8" />
              <Text style={styles.deptText}>{item.department}</Text>
            </View>
          ) : null}

          {(rec?.check_in_time || rec?.check_out_time) && (
            <View style={[styles.timesRow, { flexDirection: directionRow }]}>
              {rec?.check_in_time ? (
                <View style={[styles.timeChip, { flexDirection: directionRow }]}>
                  <Ionicons name="log-in-outline" size={12} color="#10B981" />
                  <Text style={styles.timeChipText}>{rec.check_in_time}</Text>
                </View>
              ) : null}
              {rec?.check_out_time ? (
                <View style={[styles.timeChip, { backgroundColor: '#FEF2F2', flexDirection: directionRow }]}>
                  <Ionicons name="log-out-outline" size={12} color="#EF4444" />
                  <Text style={[styles.timeChipText, { color: '#EF4444' }]}>{rec.check_out_time}</Text>
                </View>
              ) : null}
            </View>
          )}

          {status === 'permission' && rec?.permission_hours ? (
            <Text style={[styles.permText, { textAlign: textAlignStyle }]}>⏱ {t('permissionShort')}: {rec.permission_hours}h</Text>
          ) : null}
          {rec?.bonus > 0 && <Text style={[styles.bonusText, { textAlign: textAlignStyle }]}>🎁 {t('bonus')}: {rec.bonus} {t('egpCurrency')}</Text>}
          {rec?.deduction > 0 && <Text style={[styles.deductionText, { textAlign: textAlignStyle }]}>⚠️ {t('deduction')}: {rec.deduction} {t('egpCurrency')}</Text>}
        </View>

        <View style={styles.cardRight}>
          <View style={[styles.statusBadge, { backgroundColor: def.bg, flexDirection: directionRow }]}>
            <Ionicons name={def.icon} size={16} color={def.color} />
            <Text style={[styles.statusLabel, { color: def.color }]}>{def.label}</Text>
          </View>

          {(status === 'absent' || !rec?.check_in_time) && (
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => quickAction(item, 'in')}
            >
              <Text style={styles.quickBtnText}>{t('quickPresent')}</Text>
            </TouchableOpacity>
          )}
          {status === 'present' && rec?.check_in_time && !rec?.check_out_time && (
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#F59E0B' }]}
              onPress={() => quickAction(item, 'out')}
            >
              <Text style={styles.quickBtnText}>{t('quickOut')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Permission hours picker (simple hour buttons 0.5..8) ──
  const PERM_HOUR_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8];

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('quickAttendanceTitle')}</Text>
        {/* Date Navigation */}
        <View style={[styles.dateNav, { flexDirection: directionRow }]}>
          <TouchableOpacity onPress={() => changeDate(isRTL ? 1 : -1)} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color="#94A3B8" />
          </TouchableOpacity>
          <Text style={styles.dateText}>{formatDate(selectedDate, locale)}</Text>
          <TouchableOpacity onPress={() => changeDate(isRTL ? -1 : 1)} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats strip */}
      <View style={[styles.statsStrip, { flexDirection: directionRow }]}>
        {[
          { key: 'present', label: t('legendPresent'), color: '#10B981' },
          { key: 'absent', label: t('legendAbsent'), color: '#EF4444' },
          { key: 'vacation', label: t('legendVacation'), color: '#F59E0B' },
          { key: 'permission', label: locale === 'ar' ? 'إذن' : 'Perm', color: '#8B5CF6' },
          { key: 'sick', label: t('legendSick'), color: '#3B82F6' },
        ].map(s => (
          <View key={s.key} style={styles.statItem}>
            <Text style={[styles.statNum, { color: s.color }]}>{stats[s.key] || 0}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <FlatList
        data={employees}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>{t('noEmployees')}</Text>
            <Text style={styles.emptyHint}>{t('noEmployeesReportsHint')}</Text>
          </View>
        }
      />

      {/* ── Time Picker Modal ── */}
      <TimePickerModal
        visible={timePickerVisible}
        value={timePickerTarget === 'in' ? modalCheckIn : modalCheckOut}
        title={timePickerTarget === 'in' ? t('checkInTime') : t('checkOutTime')}
        isRTL={isRTL}
        onConfirm={(time) => {
          if (timePickerTarget === 'in') setModalCheckIn(time);
          else setModalCheckOut(time);
          setTimePickerVisible(false);
        }}
        onClose={() => setTimePickerVisible(false)}
      />

      {/* ── Permission Hours Picker Modal ── */}
      <Modal visible={permHoursPickerVisible} transparent animationType="fade" onRequestClose={() => setPermHoursPickerVisible(false)}>
        <TouchableOpacity
          style={pickerStyles.overlay}
          activeOpacity={1}
          onPress={() => setPermHoursPickerVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[pickerStyles.card, { padding: 18 }]}>
              <Text style={[pickerStyles.headerTitle, { marginBottom: 14, fontSize: 15 }]}>{t('permissionHours')}</Text>
              <View style={pickerStyles.grid}>
                {PERM_HOUR_OPTIONS.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[pickerStyles.cell, pickerStyles.cellLg,
                      parseFloat(modalPermHours) === h && pickerStyles.cellActive
                    ]}
                    onPress={() => {
                      setModalPermHours(String(h));
                      setPermHoursPickerVisible(false);
                    }}
                  >
                    <Text style={[pickerStyles.cellText,
                      parseFloat(modalPermHours) === h && pickerStyles.cellTextActive
                    ]}>{h}h</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Attendance Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{modalEmp?.name}</Text>
              {modalEmp?.job_title ? (
                <Text style={styles.modalSub}>{modalEmp.job_title}</Text>
              ) : null}

              {/* Status selector */}
              <Text style={[styles.sectionLabel, { textAlign: textAlignStyle }]}>{t('status')}</Text>
              <View style={[styles.statusGrid, { flexDirection: directionRow }]}>
                {STATUSES.map(s => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.statusOption, { flexDirection: directionRow }, modalStatus === s.key && { borderColor: s.color, backgroundColor: s.bg }]}
                    onPress={() => setModalStatus(s.key)}
                  >
                    <Ionicons name={s.icon} size={20} color={modalStatus === s.key ? s.color : '#94A3B8'} />
                    <Text style={[styles.statusOptionText, modalStatus === s.key && { color: s.color }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Times — only show for present/permission */}
              {(modalStatus === 'present' || modalStatus === 'permission') && (
                <>
                  <Text style={[styles.sectionLabel, { textAlign: textAlignStyle }]}>{t('times')}</Text>
                  <View style={[styles.timeRow, { flexDirection: directionRow }]}>
                    <View style={styles.timeField}>
                      <Text style={styles.timeFieldLabel}>{t('checkInTime')}</Text>
                      <TimeButton
                        value={modalCheckIn}
                        placeholder="08:00"
                        color="#10B981"
                        onPress={() => {
                          setTimePickerTarget('in');
                          setTimePickerVisible(true);
                        }}
                      />
                    </View>
                    <View style={styles.timeField}>
                      <Text style={styles.timeFieldLabel}>{t('checkOutTime')}</Text>
                      <TimeButton
                        value={modalCheckOut}
                        placeholder="17:00"
                        color="#EF4444"
                        onPress={() => {
                          setTimePickerTarget('out');
                          setTimePickerVisible(true);
                        }}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Permission hours */}
              {modalStatus === 'permission' && (
                <>
                  <Text style={[styles.sectionLabel, { textAlign: textAlignStyle }]}>{t('permissionHours')}</Text>
                  <TouchableOpacity
                    style={[styles.timePickerBtn, modalPermHours ? { borderColor: '#8B5CF6', backgroundColor: '#F5F3FF' } : {}]}
                    onPress={() => setPermHoursPickerVisible(true)}
                  >
                    {modalPermHours ? (
                      <Text style={[styles.timePickerBtnText, { color: '#8B5CF6' }]}>{modalPermHours} h</Text>
                    ) : (
                      <Text style={styles.timePickerBtnPlaceholder}>{t('permissionHours')}</Text>
                    )}
                    <Ionicons name="hourglass-outline" size={18} color={modalPermHours ? '#8B5CF6' : '#94A3B8'} />
                  </TouchableOpacity>
                </>
              )}

              {/* Bonus & Deduction */}
              <Text style={[styles.sectionLabel, { textAlign: textAlignStyle }]}>{t('bonusAndDeductions')}</Text>
              <View style={[styles.timeRow, { flexDirection: directionRow }]}>
                <View style={styles.timeField}>
                  <Text style={styles.timeFieldLabel}>{t('bonus')}</Text>
                  <View style={[styles.timeInput, { borderColor: '#10B981' }]}>
                    <TextInput
                      style={styles.innerInput}
                      value={modalBonus}
                      onChangeText={setModalBonus}
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      textAlign="center"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <View style={styles.timeField}>
                  <Text style={styles.timeFieldLabel}>{t('deduction')}</Text>
                  <View style={[styles.timeInput, { borderColor: '#EF4444' }]}>
                    <TextInput
                      style={styles.innerInput}
                      value={modalDeduction}
                      onChangeText={setModalDeduction}
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      textAlign="center"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>

              <TextInput
                style={[styles.input, { height: 70 }]}
                placeholder={t('notesPlaceholder')}
                placeholderTextColor="#94A3B8"
                value={modalNotes}
                onChangeText={setModalNotes}
                textAlign={textAlignStyle}
                multiline
              />

              <View style={[styles.modalActions, { flexDirection: directionRow }]}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { flexDirection: directionRow }]} onPress={handleSave}>
                  <Ionicons name="checkmark" size={20} color="#FFF" />
                  <Text style={styles.saveText}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  header: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  dateNav: { alignItems: 'center', marginTop: 10, gap: 8 },
  navBtn: { padding: 4 },
  dateText: { fontSize: 15, color: '#94A3B8', flex: 1, textAlign: 'center' },

  statsStrip: {
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },

  list: { padding: 14, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 12,
    padding: 14,
    alignItems: 'flex-start',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  cardMiddle: { flex: 1, marginHorizontal: 10 },
  empName:  { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  empTitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  deptRow:  { alignItems: 'center', marginTop: 3, gap: 3 },
  deptText: { fontSize: 11, color: '#94A3B8' },
  timesRow: { gap: 6, marginTop: 6, flexWrap: 'wrap' },
  timeChip: {
    alignItems: 'center', gap: 3,
    backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  timeChipText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  permText: { fontSize: 12, color: '#8B5CF6', marginTop: 4 },
  bonusText: { fontSize: 12, color: '#10B981', marginTop: 2 },
  deductionText: { fontSize: 12, color: '#EF4444', marginTop: 2 },

  cardRight: { alignItems: 'center', gap: 8, minWidth: 72 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    alignItems: 'center', gap: 3,
  },
  statusLabel: { fontSize: 11, fontWeight: '700' },
  quickBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8,
  },
  quickBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 17, color: '#94A3B8', marginTop: 16, fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#CBD5E1', marginTop: 6 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingTop: 12, maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E2E8F0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', textAlign: 'center' },
  modalSub:   { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4, marginBottom: 4 },

  sectionLabel: {
    fontSize: 12, fontWeight: 'bold', color: '#94A3B8',
    marginTop: 16, marginBottom: 10, letterSpacing: 0.5,
  },
  statusGrid: {
    flexWrap: 'wrap', gap: 8,
  },
  statusOption: {
    alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  statusOptionText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },

  timeRow: { gap: 12, marginBottom: 4 },
  timeField: { flex: 1, alignItems: 'center' },
  timeFieldLabel: { fontSize: 12, color: '#64748B', marginBottom: 6, fontWeight: '600' },

  // Time picker button (replaces direct TextInput)
  timePickerBtn: {
    width: '100%', backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 4,
  },
  timePickerBtnText: {
    fontSize: 18, fontWeight: 'bold', letterSpacing: 1,
  },
  timePickerBtnPlaceholder: {
    fontSize: 15, color: '#94A3B8',
  },

  timeInput: {
    width: '100%', backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
    overflow: 'hidden',
  },
  innerInput: {
    padding: 12, fontSize: 16, color: '#1E293B',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, padding: 13, fontSize: 15,
    color: '#1E293B', marginBottom: 10, textAlignVertical: 'top',
  },
  modalActions: { gap: 12, marginTop: 16 },
  saveBtn: {
    flex: 1, backgroundColor: '#6366F1',
    justifyContent: 'center', alignItems: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
  },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#64748B', fontWeight: 'bold', fontSize: 16 },
});
