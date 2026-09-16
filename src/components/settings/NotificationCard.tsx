import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import {
  getNotificationsEnabled,
  setNotificationsEnabled,
} from "@/services/notificationService";

export const NotificationCard: React.FC = () => {
  const { colors } = useTheme();
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    getNotificationsEnabled().then(setIsEnabled);
  }, []);

  const handleToggle = async (val: boolean) => {
    setIsEnabled(val);
    await setNotificationsEnabled(val);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="notifications-outline" size={18} color={colors.primary} />
        </View>

        <View style={styles.titleGroup}>
          <Text style={[styles.title, { color: colors.text }]}>
            Revision Reminders
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {isEnabled ? "Alerts at 10:00 AM & 6:00 PM" : "Reminders are disabled"}
          </Text>
        </View>

        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: colors.cardSecondary, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: "500",
  },
});
