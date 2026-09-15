import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import {
  getNotificationsEnabled,
  sendInstantTestNotification,
  setNotificationsEnabled,
} from "@/services/notificationService";

export const NotificationCard: React.FC = () => {
  const { colors } = useTheme();
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    getNotificationsEnabled().then(setIsEnabled);
  }, []);

  const handleToggle = async (val: boolean) => {
    setIsEnabled(val);
    await setNotificationsEnabled(val);
  };

  const handleTestNotification = async () => {
    setIsSendingTest(true);
    setTestSent(false);
    try {
      const success = await sendInstantTestNotification();
      if (success) {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 4000);
      } else {
        Alert.alert(
          "Permission Required",
          "Please allow notification permissions in your device settings to receive revision alerts.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setIsSendingTest(false);
    }
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
      {/* ── Header with Switch ── */}
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

      {/* ── Schedule Info & Test Button ── */}
      {isEnabled && (
        <View style={styles.detailsContainer}>
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: colors.cardSecondary,
                borderColor: colors.cardSecondaryBorder,
              },
            ]}
          >
            <View style={styles.infoItem}>
              <Ionicons name="sunny-outline" size={14} color="#F59E0B" />
              <Text style={[styles.infoText, { color: colors.text }]}>
                <Text style={styles.boldText}>10:00 AM:</Text> Notifies if questions are due today
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="moon-outline" size={14} color="#8B5CF6" />
              <Text style={[styles.infoText, { color: colors.text }]}>
                <Text style={styles.boldText}>6:00 PM:</Text> Follow-up if test is not yet completed
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                Automatically muted once today's revision is done
              </Text>
            </View>
          </View>

          {/* Test Notification Button */}
          <TouchableOpacity
            style={[
              styles.testButton,
              {
                borderColor: colors.borderSubtle,
                backgroundColor: testSent ? colors.successBg : colors.cardSecondary,
              },
            ]}
            activeOpacity={0.7}
            onPress={handleTestNotification}
            disabled={isSendingTest}
          >
            {isSendingTest ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons
                  name={testSent ? "checkmark" : "paper-plane-outline"}
                  size={14}
                  color={testSent ? colors.success : colors.primary}
                />
                <Text
                  style={[
                    styles.testButtonText,
                    { color: testSent ? colors.success : colors.primary },
                  ]}
                >
                  {testSent ? "Alert Sent! Check Notification Tray" : "Send Test Notification"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 12,
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
  detailsContainer: {
    gap: 10,
  },
  infoBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 7,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  boldText: {
    fontWeight: "700",
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
