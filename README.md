<div align="center">

# 🧠 RevLog `v1.2`

**An offline-first, intelligent spaced-repetition revision companion & question bank engineered for competitive exam mastery.**

[![Expo SDK](https://img.shields.io/badge/Expo-v55.0-000020?style=for-the-badge&logo=expo&logoColor=white)](https://docs.expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.83-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-19.2-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![SQLite](https://img.shields.io/badge/Expo_SQLite-55.0-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
[![Google Drive Sync](https://img.shields.io/badge/Google_Drive-Cloud_Sync-4285F4?style=for-the-badge&logo=googledrive&logoColor=white)](#-cloud-backup--sync-architecture)
[![EAS Updates](https://img.shields.io/badge/EAS-OTA_Updates-000020?style=for-the-badge&logo=expo&logoColor=white)](#-over-the-air-ota-updates)
[![Platform](https://img.shields.io/badge/Platform-Android_%7C_iOS-blue?style=for-the-badge&logo=android&logoColor=white)](#)

<br/>

<p align="center">
  Capture question papers, extract text via on-device OCR, organize by exam taxonomy, and master difficult concepts using an automated <b>1 → 3 → 7 → 15 → 30 → 60 → 120 → 240 → 365 day</b> spaced-repetition schedule with Google Drive cloud backup.
</p>

</div>

---

## 🌟 Key Features

- **Snap, Crop & Ingest**: Multi-page camera and gallery capture for questions and solutions with automatic 720p downscaling and local persistence.
- **On-Device OCR & Search**: Native text extraction (`expo-text-extractor`) enabling full-text offline search across questions, solutions, and notes.
- **Exam Taxonomy**: Support for NEET, JEE Main, JEE Advanced, and custom streams with a 3-tier hierarchy (**Subject → Topic → Subtopic**).
- **Multiple Problem Types**: Support for **MCQ** (Single Correct), **MSQ** (Multiple Correct), and **NAT** (Numerical Answer Type).
- **Spaced Repetition System (SRS)**: Automated 9-tier memory decay scheduling (`1 → 3 → 7 → 15 → 30 → 60 → 120 → 240 → 365` days).
- **Simulated Exam Mode**: Timed revision quizzes with pinch-to-zoom image inspection, negative marking, and session recovery.
- **Google Drive Cloud Sync**: OAuth 2.0 backup of SQLite database snapshots and an incremental background image queue to private `appDataFolder`.
- **EAS OTA Updates & Theming**: Seamless over-the-air updates, fluid animations, and complete Dark / Light theme support.

---

## 🔁 Spaced Repetition & Scoring Engine

RevLog reinforces long-term retention using an automated **9-tier exponential review schedule**:

$$\text{Intervals (in days)} = [1 \rightarrow 3 \rightarrow 7 \rightarrow 15 \rightarrow 30 \rightarrow 60 \rightarrow 120 \rightarrow 240 \rightarrow 365]$$

| Outcome | Points | SRS Action | Description |
| :--- | :---: | :---: | :--- |
| **Correct** | `+4` | Advance ($+1$ Stage) | Moves to the next interval (repeats annually at 365 days) |
| **Incorrect** | `-1` | Reset to Stage 1 | Reschedules for tomorrow (1 day) to immediately address weakness |
| **Partial (MSQ)** | `0` / partial | Reset to Stage 1 | Incomplete selection resets schedule for review |
| **Unanswered** | `0` | Retain Stage | Rolled over to the next day without penalty |

---

## ☁️ Cloud Backup & Sync Architecture

RevLog operates offline-first with background Google Drive synchronization:

1. **Incremental Image Sync**: Images are stored locally and queued in a `backup_images` table. Pending files sync to the user's private Google Drive `appDataFolder` in the background (configurable Wi-Fi / cellular rules).
2. **Atomic Database Snapshots**: Once pending image uploads clear, WAL checkpoints flush local changes and upload `revlog_database.db` with header verification.
3. **Safe Cloud Restore**: Restores validate the SQLite format header, back up the existing database locally, and pull missing images via `manifest.json`.

---

## 📁 Project Structure

```plaintext
native-app/
├── assets/          # App branding, icons, syllabus taxonomies, scoring schemes
├── drizzle/         # Generated Drizzle SQL schema migrations
├── src/
│   ├── app/         # Expo Router file-based pages (dashboard, add, revision, search, settings)
│   ├── components/  # Reusable UI widgets, modals, revision quiz cards, and syllabus pickers
│   ├── config/      # Exam definitions and syllabus mappings
│   ├── constants/   # Color palettes, typography, and design tokens
│   ├── context/     # React Context providers (CloudSync, Exam, Theme)
│   ├── database/    # Drizzle ORM client, dynamic SQLite migrator, and table schemas
│   ├── functions/   # OCR processing, scoring calculator, search engine, image helpers
│   ├── hooks/       # Custom React hooks (image picker, OTA update listener)
│   ├── services/    # Google Drive REST client, OAuth 2.0, backup orchestration
│   └── types/       # TypeScript models for questions, attempts, and syllabus
├── app.json         # Expo configuration & plugins
└── eas.json         # EAS Build & Update profiles
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+
- **Package Manager**: `pnpm` (recommended), `npm`, or `yarn`
- **Development Client**: Android emulator/device or iOS simulator with custom dev build (`expo-dev-client`) for native OCR and Google Auth.

### Setup & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ayandi999/revision-app.git
   cd revision-app/native-app
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   Create `.env` in `native-app`:
   ```env
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
   ```

4. **Generate Database Migrations & Start**:
   ```bash
   pnpm run db:generate
   pnpm start
   ```

5. **Run on Target Platform**:
   ```bash
   pnpm run android   # Android
   pnpm run ios       # iOS
   ```

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm start` | Start Expo development server with Metro |
| `pnpm run android` | Build and run on Android dev client |
| `pnpm run ios` | Build and run on iOS simulator |
| `pnpm run db:generate` | Generate Drizzle migrations from schema |
| `pnpm run db:migrate` | Apply database migrations |
| `pnpm run db:push` | Push schema changes directly to SQLite |
| `pnpm run db:studio` | Launch Drizzle Studio web inspector |
| `pnpm run lint` | Run ESLint checks |

---

## 📲 Over-The-Air (OTA) Updates

Publish updates instantly with EAS Update:

```bash
# Push update to preview channel
npx eas-cli update --channel preview --platform android --message "Description of changes"

# Push update to production channel
npx eas-cli update --channel production --platform android --message "Release v1.2"
```

---

<div align="center">
  <sub>Built with ❤️ for focused, scientific exam preparation.</sub>
</div>
