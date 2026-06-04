import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { initDB } from './src/database/db';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';

import DashboardScreen  from './src/screens/DashboardScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import EmployeesScreen  from './src/screens/EmployeesScreen';
import ReportsScreen    from './src/screens/ReportsScreen';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { name: 'Dashboard',  tKey: 'dashboard',  iconOff: 'home-outline',      iconOn: 'home',       color: '#818CF8' },
  { name: 'Attendance', tKey: 'attendance', iconOff: 'checkbox-outline',   iconOn: 'checkbox',   color: '#34D399' },
  { name: 'Employees',  tKey: 'employees',  iconOff: 'people-outline',     iconOn: 'people',     color: '#FBBF24' },
  { name: 'Reports',    tKey: 'reports',    iconOff: 'bar-chart-outline',  iconOn: 'bar-chart',  color: '#C084FC' },
];

// ─── Top Tab Bar ──────────────────────────────────────────────────────────────
function TopTabBar({ currentTab, onTabChange }) {
  const { t, isRTL } = useLanguage();
  // Reverse order for RTL so Dashboard is on the right
  const displayTabs = isRTL ? [...TABS].reverse() : TABS;

  return (
    <View style={tabStyles.bar}>
      {displayTabs.map(tab => {
        const isActive = currentTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={[
              tabStyles.tab,
              isActive
                ? { borderBottomColor: tab.color, borderBottomWidth: 3 }
                : { borderBottomColor: 'transparent', borderBottomWidth: 3 },
            ]}
            onPress={() => onTabChange(tab.name)}
            activeOpacity={0.75}
          >
            {/* Active glow dot */}
            {isActive && <View style={[tabStyles.dot, { backgroundColor: tab.color }]} />}
            <Ionicons
              name={isActive ? tab.iconOn : tab.iconOff}
              size={22}
              color={isActive ? tab.color : '#475569'}
            />
            <Text
              style={[tabStyles.label, { color: isActive ? tab.color : '#475569' }]}
              numberOfLines={1}
            >
              {t(tab.tKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── App Navigator ────────────────────────────────────────────────────────────
function AppNavigator() {
  const [currentTab, setCurrentTab] = useState('Dashboard');

  return (
    <View style={{ flex: 1 }}>
      {/* Tab bar sits below the status bar (inside safe area) */}
      <TopTabBar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Screen content: mount/unmount on tab switch → acts like useFocusEffect */}
      <View style={{ flex: 1 }}>
        {currentTab === 'Dashboard'  && <DashboardScreen />}
        {currentTab === 'Attendance' && <AttendanceScreen />}
        {currentTab === 'Employees'  && <EmployeesScreen />}
        {currentTab === 'Reports'    && <ReportsScreen />}
      </View>
    </View>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    try {
      initDB();
      setDbReady(true);
    } catch (e) {
      console.error('DB init failed:', e);
      setDbError(e.message);
    }
  }, []);

  if (dbError) {
    return (
      <View style={appStyles.centered}>
        <Text style={appStyles.errorText}>Database Error</Text>
        <Text style={appStyles.errorDetail}>{dbError}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={appStyles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          {/* SafeAreaView handles top/left/right; screens handle bottom internally */}
          <SafeAreaView style={appStyles.root} edges={['top', 'left', 'right']}>
            <AppNavigator />
          </SafeAreaView>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 3,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 6,
    width: 4, height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

const appStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  errorText: {
    fontSize: 18, fontWeight: 'bold', color: '#EF4444', marginBottom: 8,
  },
  errorDetail: {
    fontSize: 13, color: '#64748B', textAlign: 'center', paddingHorizontal: 24,
  },
});
