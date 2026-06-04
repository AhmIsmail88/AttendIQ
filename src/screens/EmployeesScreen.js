import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// useFocusEffect replaced with useEffect (screens mount/unmount on tab switch)
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../database/db';
import { useLanguage } from '../context/LanguageContext';

const EMPTY_FORM = {
  name: '', department: '', phone: '', job_title: '',
  employee_code: '', address: '', work_location: '',
  vacation_balance: '21', salary_type: 'monthly', salary_rate: '',
};

export default function EmployeesScreen() {
  const { t, locale, isRTL } = useLanguage();
  const [employees, setEmployees]   = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [searchText, setSearchText] = useState('');

  // Sidebar section navigation
  const [activeSection, setActiveSection] = useState('personal');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SECTIONS = [
    { key: 'personal', label: t('personalInfoSection'), icon: 'person-outline' },
    { key: 'work',     label: t('workInfoSection'),     icon: 'briefcase-outline' },
    { key: 'salary',   label: t('salaryInfoSection'),   icon: 'cash-outline' },
  ];

  const SALARY_TYPES = [
    { key: 'monthly', label: t('monthly') },
    { key: 'daily',   label: t('daily') },
  ];

  const loadData = () => {
    try {
      setEmployees(getEmployees());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setActiveSection('personal');
    setSidebarOpen(false);
    setModalVisible(true);
  };

  const openEdit = (emp) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name || '',
      department: emp.department || '',
      phone: emp.phone || '',
      job_title: emp.job_title || '',
      employee_code: emp.employee_code || '',
      address: emp.address || '',
      work_location: emp.work_location || '',
      vacation_balance: String(emp.vacation_balance ?? 21),
      salary_type: emp.salary_type || 'monthly',
      salary_rate: emp.salary_rate ? String(emp.salary_rate) : '',
    });
    setActiveSection('personal');
    setSidebarOpen(false);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      Alert.alert(t('alert'), t('pleaseEnterName'));
      return;
    }
    const payload = {
      ...form,
      vacation_balance: parseInt(form.vacation_balance) || 21,
      salary_rate: parseFloat(form.salary_rate) || 0,
    };
    try {
      if (editingId) {
        updateEmployee(editingId, payload);
      } else {
        addEmployee(payload);
      }
      setModalVisible(false);
      loadData();
    } catch (e) {
      Alert.alert(t('error'), t('errorSaving'));
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert(
      t('confirmDelete'),
      t('confirmDeleteMessage', { name }),
      [
        { text: t('cancelBtn'), style: 'cancel' },
        {
          text: t('deleteBtn'), style: 'destructive',
          onPress: () => {
            try { deleteEmployee(id); loadData(); }
            catch (e) { Alert.alert(t('error'), t('errorDeleting')); }
          }
        }
      ]
    );
  };

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const directionRow = isRTL ? 'row-reverse' : 'row';
  const textAlignStyle = isRTL ? 'right' : 'left';
  const alignItemsStyle = isRTL ? 'flex-end' : 'flex-start';

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={[styles.cardTop, { flexDirection: directionRow }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <View style={[styles.cardInfo, { marginRight: isRTL ? 12 : 0, marginLeft: isRTL ? 0 : 12, alignItems: alignItemsStyle }]}>
          <Text style={styles.empName}>{item.name}</Text>
          {item.employee_code ? <Text style={styles.empCode}>#{item.employee_code}</Text> : null}
          {item.job_title ? (
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>{item.job_title}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.cardActions, { flexDirection: directionRow }]}>
          <TouchableOpacity style={[styles.editBtn, { marginRight: isRTL ? 4 : 0, marginLeft: isRTL ? 0 : 4 }]} onPress={() => openEdit(item)}>
            <Ionicons name="create-outline" size={20} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.name)}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.cardMeta, { flexDirection: directionRow }]}>
        {item.department ? (
          <View style={[styles.metaChip, { flexDirection: directionRow }]}>
            <Ionicons name="business-outline" size={13} color="#6B7280" />
            <Text style={styles.metaText}>{item.department}</Text>
          </View>
        ) : null}
        {item.work_location ? (
          <View style={[styles.metaChip, { flexDirection: directionRow }]}>
            <Ionicons name="location-outline" size={13} color="#6B7280" />
            <Text style={styles.metaText}>{item.work_location}</Text>
          </View>
        ) : null}
        {item.phone ? (
          <View style={[styles.metaChip, { flexDirection: directionRow }]}>
            <Ionicons name="call-outline" size={13} color="#6B7280" />
            <Text style={styles.metaText}>{item.phone}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.cardFooter, { flexDirection: directionRow }]}>
        <View style={[styles.footerItem, { flexDirection: directionRow }]}>
          <Ionicons name="cash-outline" size={15} color="#10B981" />
          <Text style={styles.footerVal}>
            {item.salary_type === 'monthly' ? `${t('monthly')}: ` : `${t('daily')}: `}
            {item.salary_rate ? `${item.salary_rate} ${t('egpCurrency')}` : 'N/A'}
          </Text>
        </View>
        <View style={[styles.footerItem, { flexDirection: directionRow }]}>
          <Ionicons name="umbrella-outline" size={15} color="#3B82F6" />
          <Text style={styles.footerVal}>
            {t('vacations')}: {item.vacation_balance ?? 21} {(item.vacation_balance ?? 21) > 10 ? t('dayLabel') : t('daysLabel')}
          </Text>
        </View>
      </View>
    </View>
  );

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Render the form content based on active section
  const renderFormSection = () => {
    switch (activeSection) {
      case 'personal':
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder={t('employeeNameLabel')}
              placeholderTextColor="#94A3B8"
              value={form.name}
              onChangeText={v => setField('name', v)}
              textAlign={textAlignStyle}
            />
            <TextInput
              style={styles.input}
              placeholder={t('employeeCodeLabel')}
              placeholderTextColor="#94A3B8"
              value={form.employee_code}
              onChangeText={v => setField('employee_code', v)}
              textAlign={textAlignStyle}
            />
            <TextInput
              style={styles.input}
              placeholder={t('phoneNumberLabel')}
              placeholderTextColor="#94A3B8"
              value={form.phone}
              onChangeText={v => setField('phone', v)}
              textAlign={textAlignStyle}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder={t('addressLabel')}
              placeholderTextColor="#94A3B8"
              value={form.address}
              onChangeText={v => setField('address', v)}
              textAlign={textAlignStyle}
            />
          </>
        );
      case 'work':
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder={t('jobTitleLabel')}
              placeholderTextColor="#94A3B8"
              value={form.job_title}
              onChangeText={v => setField('job_title', v)}
              textAlign={textAlignStyle}
            />
            <TextInput
              style={styles.input}
              placeholder={t('departmentLabel')}
              placeholderTextColor="#94A3B8"
              value={form.department}
              onChangeText={v => setField('department', v)}
              textAlign={textAlignStyle}
            />
            <TextInput
              style={styles.input}
              placeholder={t('workLocationLabel')}
              placeholderTextColor="#94A3B8"
              value={form.work_location}
              onChangeText={v => setField('work_location', v)}
              textAlign={textAlignStyle}
            />
          </>
        );
      case 'salary':
        return (
          <>
            <Text style={[styles.fieldGroupLabel, { textAlign: textAlignStyle }]}>{t('salaryTypeLabel')}</Text>
            <View style={[styles.salaryTypeRow, { flexDirection: directionRow }]}>
              {SALARY_TYPES.map(tOption => (
                <TouchableOpacity
                  key={tOption.key}
                  style={[styles.typeBtn, form.salary_type === tOption.key && styles.typeBtnActive]}
                  onPress={() => setField('salary_type', tOption.key)}
                >
                  <Text style={[styles.typeBtnText, form.salary_type === tOption.key && styles.typeBtnTextActive]}>
                    {tOption.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder={form.salary_type === 'monthly' ? t('monthlySalaryLabel') : t('dailyRateLabel')}
              placeholderTextColor="#94A3B8"
              value={form.salary_rate}
              onChangeText={v => setField('salary_rate', v)}
              textAlign={textAlignStyle}
              keyboardType="decimal-pad"
            />
            <Text style={[styles.fieldGroupLabel, { textAlign: textAlignStyle, marginTop: 16 }]}>{t('vacationBalanceSection')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('annualVacationBalanceLabel')}
              placeholderTextColor="#94A3B8"
              value={form.vacation_balance}
              onChangeText={v => setField('vacation_balance', v)}
              textAlign={textAlignStyle}
              keyboardType="number-pad"
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={[styles.header, { alignItems: alignItemsStyle }]}>
        <Text style={styles.headerTitle}>{t('employees')}</Text>
        <Text style={styles.headerSub}>{t('registeredEmployeesCount', { count: employees.length })}</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchBox, { flexDirection: directionRow }]}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" style={[styles.searchIcon, { marginLeft: isRTL ? 8 : 0, marginRight: isRTL ? 0 : 8 }]} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={setSearchText}
          textAlign={textAlignStyle}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>{t('noEmployeesRegistered')}</Text>
            <Text style={styles.emptyHint}>{t('noEmployeesHint')}</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, isRTL ? { left: 24 } : { right: 24 }]} onPress={openAdd}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Drag Handle */}
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View style={[styles.modalHeader, { flexDirection: directionRow }]}>
              {/* Hamburger / section toggle button */}
              <TouchableOpacity style={styles.menuToggleBtn} onPress={() => setSidebarOpen(o => !o)}>
                <View style={styles.menuLine} />
                <View style={[styles.menuLine, { width: 18 }]} />
                <View style={styles.menuLine} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingId ? t('editEmployeeTitle') : t('addEmployeeTitle')}
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Body: sidebar + content */}
            <View style={[styles.modalBody, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* ─── Sidebar ─── */}
              {sidebarOpen && (
                <View style={styles.sidebar}>
                  {SECTIONS.map((sec, idx) => {
                    const isActive = activeSection === sec.key;
                    return (
                      <TouchableOpacity
                        key={sec.key}
                        style={[
                          styles.sidebarItem,
                          isActive && styles.sidebarItemActive,
                          idx < SECTIONS.length - 1 && styles.sidebarItemBorder,
                        ]}
                        onPress={() => {
                          setActiveSection(sec.key);
                          setSidebarOpen(false);
                        }}
                      >
                        <View style={[styles.sidebarIcon, isActive && styles.sidebarIconActive]}>
                          <Ionicons name={sec.icon} size={18} color={isActive ? '#6366F1' : '#94A3B8'} />
                        </View>
                        <Text style={[styles.sidebarLabel, isActive && styles.sidebarLabelActive]}>
                          {sec.label}
                        </Text>
                        {isActive && <View style={styles.sidebarActiveIndicator} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* ─── Form Content ─── */}
              <ScrollView
                style={styles.formContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Section Title */}
                <View style={[styles.sectionTitleRow, { flexDirection: directionRow }]}>
                  {SECTIONS.filter(s => s.key === activeSection).map(sec => (
                    <React.Fragment key={sec.key}>
                      <View style={styles.sectionIconBg}>
                        <Ionicons name={sec.icon} size={16} color="#6366F1" />
                      </View>
                      <Text style={styles.sectionTitle}>{sec.label}</Text>
                    </React.Fragment>
                  ))}
                </View>

                {renderFormSection()}

                {/* Section navigation dots */}
                <View style={[styles.sectionDots, { flexDirection: directionRow }]}>
                  {SECTIONS.map(sec => (
                    <TouchableOpacity
                      key={sec.key}
                      onPress={() => setActiveSection(sec.key)}
                      style={[styles.dot, activeSection === sec.key && styles.dotActive]}
                    />
                  ))}
                </View>

                {/* Next / Save buttons */}
                {(() => {
                  const currentIdx = SECTIONS.findIndex(s => s.key === activeSection);
                  const isFirst = currentIdx === 0;
                  const isLast = currentIdx === SECTIONS.length - 1;
                  const prevSection = !isFirst ? SECTIONS[currentIdx - 1] : null;
                  const nextSection = !isLast ? SECTIONS[currentIdx + 1] : null;
                  return (
                    <View style={[styles.modalActions, { flexDirection: directionRow }]}>
                      {/* Cancel (first page) or Prev */}
                      {isFirst ? (
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                          <Text style={styles.cancelText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.navActionBtn}
                          onPress={() => setActiveSection(prevSection.key)}
                        >
                          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={18} color="#6366F1" />
                          <Text style={styles.navActionText}>{prevSection.label}</Text>
                        </TouchableOpacity>
                      )}
                      {/* Next or Save */}
                      {isLast ? (
                        <TouchableOpacity
                          style={[styles.saveBtn, { flexDirection: directionRow, flex: 1 }]}
                          onPress={handleSave}
                        >
                          <Ionicons name="checkmark" size={20} color="#FFF" />
                          <Text style={styles.saveText}>{t('save')}</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.saveBtn, { flexDirection: directionRow, flex: 1 }]}
                          onPress={() => setActiveSection(nextSection.key)}
                        >
                          <Text style={styles.saveText}>{nextSection.label}</Text>
                          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#FFF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })()}
                <View style={{ height: 24 }} />
              </ScrollView>
            </View>
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
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFF' },
  headerSub:  { fontSize: 14, color: '#94A3B8', marginTop: 4 },

  searchBox: {
    backgroundColor: '#FFF',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchIcon:  {},
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1E293B' },

  list: { padding: 16, paddingTop: 8, paddingBottom: 100 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 14,
    padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop: { alignItems: 'flex-start', marginBottom: 12 },

  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },

  cardInfo: { flex: 1 },
  empName:  { fontSize: 17, fontWeight: 'bold', color: '#1E293B' },
  empCode:  { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  badgeRow: { flexDirection: 'row', marginTop: 5 },
  badge: {
    backgroundColor: '#EEF2FF', color: '#6366F1',
    fontSize: 12, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, fontWeight: '600',
  },

  cardActions: { gap: 4 },
  editBtn:   { padding: 6, borderRadius: 8, backgroundColor: '#EEF2FF' },
  deleteBtn: { padding: 6, borderRadius: 8, backgroundColor: '#FEF2F2' },

  cardMeta: { flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  metaChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, gap: 4,
  },
  metaText: { fontSize: 12, color: '#6B7280' },

  cardFooter: {
    justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10,
  },
  footerItem: { alignItems: 'center', gap: 5 },
  footerVal: { fontSize: 13, color: '#475569', fontWeight: '500' },

  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 17, color: '#94A3B8', marginTop: 16, fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#CBD5E1', marginTop: 8 },

  fab: {
    position: 'absolute', bottom: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6366F1', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E2E8F0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 8,
  },

  // Modal Header bar
  modalHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  menuToggleBtn: {
    padding: 8,
    gap: 4,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    width: 38,
    height: 38,
  },
  menuLine: {
    width: 22, height: 2.5, backgroundColor: '#475569', borderRadius: 2,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17, fontWeight: 'bold', color: '#1E293B',
    textAlign: 'center',
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },

  // Body layout
  modalBody: {
    flex: 0,
    minHeight: 380,
  },

  // ── Sidebar ──
  sidebar: {
    width: 120,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingVertical: 8,
  },
  sidebarItem: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    position: 'relative',
  },
  sidebarItemActive: {
    backgroundColor: '#EEF2FF',
  },
  sidebarItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sidebarIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },
  sidebarIconActive: {
    backgroundColor: '#EEF2FF',
  },
  sidebarLabel: {
    fontSize: 10, color: '#94A3B8', fontWeight: '600',
    textAlign: 'center',
  },
  sidebarLabelActive: { color: '#6366F1' },
  sidebarActiveIndicator: {
    position: 'absolute',
    right: 0, top: 14, bottom: 14,
    width: 3, borderRadius: 2,
    backgroundColor: '#6366F1',
  },

  // ── Form Content ──
  formContent: {
    flex: 1,
    padding: 18,
    paddingTop: 12,
  },

  sectionTitleRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  sectionIconBg: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15, fontWeight: 'bold', color: '#1E293B',
  },

  fieldGroupLabel: {
    fontSize: 12, fontWeight: 'bold', color: '#94A3B8',
    marginBottom: 8, letterSpacing: 0.5,
  },

  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, padding: 13, fontSize: 15,
    color: '#1E293B', marginBottom: 10,
  },

  salaryTypeRow: {
    gap: 10, marginBottom: 12,
  },
  typeBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  typeBtnActive: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  typeBtnText: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  typeBtnTextActive: { color: '#6366F1' },

  // Section dots
  sectionDots: {
    justifyContent: 'center',
    gap: 6,
    marginVertical: 16,
    alignSelf: 'center',
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  dotActive: {
    backgroundColor: '#6366F1',
    width: 22,
  },

  modalActions: {
    gap: 10, marginTop: 4,
  },
  navActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navActionText: { color: '#6366F1', fontWeight: 'bold', fontSize: 14 },
  saveBtn: {
    flex: 1, backgroundColor: '#6366F1',
    justifyContent: 'center', alignItems: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
  },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: {
    flex: 1, backgroundColor: '#F1F5F9',
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  cancelText: { color: '#64748B', fontWeight: 'bold', fontSize: 16 },
});
