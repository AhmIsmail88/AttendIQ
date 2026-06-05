# 📊 AttendIQ

<img width="1024" height="583" alt="image" src="https://github.com/user-attachments/assets/35ffa2ec-bb2c-4b1b-a95a-06da787695f4" />


**AttendIQ** is a modern, offline-first, and highly performant mobile application built with **React Native** and **Expo (SDK 54)**. Designed for small-to-medium businesses, it provides a comprehensive suite for managing employee records, tracking daily attendance, handling hourly permissions/leaves, and calculating payrolls with direct Excel exports.

---

## 🚀 Key Features

- **🌐 Dual-Language & Dynamic RTL Layouts**
  - Full localization for **English (LTR)** and **Arabic (RTL)**.
  - Dynamically mirrors the layout, text alignment, and navigation elements based on the active language.
- **⚡ Offline-First SQLite Architecture**
  - Powered by local database storage using `expo-sqlite` (v16).
  - Fast and resilient; works fully offline with automated migrations and schema integrity.
- **📈 Real-Time Dashboard**
  - Visual summary of key metrics: Total Employees, Today's Check-in Rate, Active Leaves, and Payroll statistics.
  - Quick action shortcuts and monthly overview charts.
- **👥 Employee Directory**
  - Complete Employee lifecycle management (Add, Edit, Delete).
  - Advanced search and status-based group filtering.
- **⏰ Flexible Attendance & Leave Management**
  - Track daily status: **Present**, **Absent**, **Late**, or **On Permission**.
  - Log leave permissions down to specific hours, integrating seamlessly into payroll calculations.
- **📊 Professional Excel Export**
  - Generate beautifully styled Excel spreadsheets (`.xlsx`) directly on the device using SheetJS.
  - Includes automated Excel formulas for totals, hours, and attendance percentages.
  - Instantly share or save reports via Native Sharing API.
- **📱 Fluid Navigation**
  - Built with a custom state-based **Top Tab Navigator** to resolve common Expo navigation lag, providing smooth tab transitions.

---

## 🛠️ Tech Stack & Architecture

- **Framework:** [Expo (SDK 54)](https://expo.dev/) / React Native 0.81
- **Database:** [expo-sqlite](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/) (v16)
- **Styling:** Vanilla StyleSheet with dynamic HSL-based palettes
- **Animation:** [React Native Reanimated](https://docs.expo.dev/versions/v54.0.0/sdk/reanimated/) (v4.1.1) & Worklets
- **Excel Processing:** [xlsx (SheetJS)](https://sheetjs.com/) + custom Base64 Polyfill
- **Icons:** Expo Vector Icons (Ionicons)

---

## 📂 Project Structure

```
AttendIQ2/
├── assets/                  # App icon, splash screen, and static resources
├── src/
│   ├── context/
│   │   └── LanguageContext.js  # App-wide localization provider
│   ├── database/
│   │   └── db.js            # SQLite initialization, schema definition & queries
│   ├── i18n/
│   │   └── translations.js  # English & Arabic translation dictionaries
│   └── screens/
│       ├── DashboardScreen.js  # Highlights key stats & quick links
│       ├── EmployeesScreen.js  # CRUD management for team members
│       ├── AttendanceScreen.js # Daily check-ins & check-outs
│       └── ReportsScreen.js    # Data filters & Excel sheet generation
├── App.js                   # Application root, Tab Navigator, & DB initialization
├── index.js                 # App entry point with polyfills
├── app.json                 # Expo configuration & plugins
└── eas.json                 # Expo Application Services profiles (preview/production)
```

---

## 📦 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Expo Go](https://expo.dev/client) app on your mobile device (for development testing), or emulator setup.
- [EAS CLI](https://docs.expo.dev/build/setup/) (if generating standalone builds)

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/attendiq.git
   cd attendiq
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the Expo development server:

- **Android:**
  ```bash
  npm run android
  ```
- **iOS:**
  ```bash
  npm run ios
  ```
- **Web:**
  ```bash
  npm run web
  ```

---

## 🛠️ Build & Distribution (EAS Build)

This project is pre-configured for **EAS Build** to compile standalone Android binaries.

### Android Preview (APK)
To build an APK for local testing on Android devices:
```bash
npx eas-cli build -p android --profile preview
```

### Production Build
To prepare a release-ready production build:
```bash
npx eas-cli build -p android --profile production
```

---

## 📂 Database Schema Overview

The local SQLite database initialized in `db.js` consists of the following key tables:

1. **`employees`**: Stores personal details, salary information, joined date, and active/inactive status.
2. **`attendance`**: Tracks daily attendance logs mapped to employee IDs, check-in times, and work hours.
3. **`leave_permissions`**: Records time-off permissions with specific durations (in hours) linked directly to the payroll periods.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](file:///d:/JS%20Apps/AttendIQ2%20-%2001/LICENSE) file for details.
