export type ThemeMode = "system" | "light" | "dark";

export interface ThemeColors {
  bg: string;
  card: string;
  cardSecondary: string;
  cardBorder: string;
  cardSecondaryBorder: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textPlaceholder: string;
  border: string;
  borderSubtle: string;
  inputBg: string;
  inputBorder: string;
  inputBorderActive: string;
  primary: string;
  primaryLight: string;
  accent: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  modalBackdrop: string;
  modalCard: string;
  modalBorder: string;
  modalHeaderBorder: string;
  success: string;
  successBg: string;
  error: string;
  errorBg: string;
  danger: string;
  dangerBg: string;
  warning: string;
  warningBg: string;
  info: string;
  infoBg: string;
  shadow: string;
  glassScheme: "dark" | "light";
  statusBarStyle: "light" | "dark";
}

export const darkTheme: ThemeColors = {
  bg: "#121216",
  card: "#1A1A22",
  cardSecondary: "#13131C",
  cardBorder: "rgba(255, 255, 255, 0.08)",
  cardSecondaryBorder: "rgba(255, 255, 255, 0.04)",
  text: "#FFFFFF",
  textSecondary: "#CBD5E1",
  textTertiary: "#64748B",
  textMuted: "#94A3B8",
  textPlaceholder: "#64748B",
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",
  inputBg: "#1E2028",
  inputBorder: "rgba(255, 255, 255, 0.1)",
  inputBorderActive: "#3B82F6",
  primary: "#3B82F6",
  primaryLight: "rgba(59, 130, 246, 0.15)",
  accent: "#38BDF8",
  tabBarBg: "#13131db8",
  tabBarBorder: "rgba(255, 255, 255, 0.08)",
  tabBarActive: "#38BDF8",
  tabBarInactive: "#64748B",
  modalBackdrop: "rgba(0, 0, 0, 0.72)",
  modalCard: "#1E2028",
  modalBorder: "rgba(255, 255, 255, 0.08)",
  modalHeaderBorder: "rgba(255, 255, 255, 0.06)",
  success: "#10B981",
  successBg: "rgba(16, 185, 129, 0.14)",
  error: "#EF4444",
  errorBg: "rgba(239, 68, 68, 0.14)",
  danger: "#EF4444",
  dangerBg: "rgba(239, 68, 68, 0.14)",
  warning: "#F59E0B",
  warningBg: "rgba(245, 158, 11, 0.14)",
  info: "#3B82F6",
  infoBg: "rgba(59, 130, 246, 0.14)",
  shadow: "#000000",
  glassScheme: "dark",
  statusBarStyle: "light",
};

export const lightTheme: ThemeColors = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  cardSecondary: "#F1F5F9",
  cardBorder: "#E2E8F0",
  cardSecondaryBorder: "#E2E8F0",
  text: "#0F172A",
  textSecondary: "#334155",
  textTertiary: "#94A3B8",
  textMuted: "#64748B",
  textPlaceholder: "#94A3B8",
  border: "#E2E8F0",
  borderSubtle: "#F1F5F9",
  inputBg: "#FFFFFF",
  inputBorder: "#CBD5E1",
  inputBorderActive: "#2563EB",
  primary: "#2563EB",
  primaryLight: "rgba(37, 99, 235, 0.1)",
  accent: "#0284C7",
  tabBarBg: "rgba(255, 255, 255, 0.92)",
  tabBarBorder: "rgba(0, 0, 0, 0.08)",
  tabBarActive: "#0284C7",
  tabBarInactive: "#94A3B8",
  modalBackdrop: "rgba(15, 23, 42, 0.5)",
  modalCard: "#FFFFFF",
  modalBorder: "#E2E8F0",
  modalHeaderBorder: "#E2E8F0",
  success: "#059669",
  successBg: "rgba(5, 150, 105, 0.1)",
  error: "#DC2626",
  errorBg: "rgba(220, 38, 38, 0.1)",
  danger: "#DC2626",
  dangerBg: "rgba(220, 38, 38, 0.1)",
  warning: "#D97706",
  warningBg: "rgba(217, 119, 6, 0.1)",
  info: "#2563EB",
  infoBg: "rgba(37, 99, 235, 0.1)",
  shadow: "#64748B",
  glassScheme: "light",
  statusBarStyle: "dark",
};
