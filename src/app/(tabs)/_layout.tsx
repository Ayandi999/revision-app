import { useTheme } from "@/context/ThemeContext";
import { useAppMigrations } from "@/database/migrator";
import { hapticSelection } from "@/functions/hapticFeedback";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { GlassView } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (isKeyboardVisible) {
    return null;
  }

  const bottomPadding = insets.bottom > 0 ? insets.bottom : 6;
  const barHeight = 52 + bottomPadding;

  return (
    <GlassView
      glassEffectStyle="regular"
      colorScheme={colors.glassScheme}
      style={[
        styles.tabBar,
        {
          height: barHeight,
          paddingBottom: bottomPadding,
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.border,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? colors.tabBarActive : colors.tabBarInactive;

        const onPress = () => {
          hapticSelection();
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.7}
            style={[
              styles.tabBarItem,
              isFocused && [
                styles.tabBarItemFocused,
                {
                  borderTopColor: colors.primary,
                  backgroundColor: colors.primaryLight,
                },
              ],
            ]}
          >
            <View style={styles.iconContainer}>
              {options.tabBarIcon?.({
                color,
                size: 19,
                focused: isFocused,
              })}
            </View>
            <Text
              style={[
                styles.tabBarLabel,
                { color },
                isFocused && styles.tabBarLabelFocused,
              ]}
            >
              {options.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </GlassView>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  //-------------Creating the Databse:-----------------------
  const { success, error, retry, resetDatabase } = useAppMigrations();
  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bg,
          padding: 24,
        }}
      >
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "700",
            marginTop: 12,
            marginBottom: 8,
          }}
        >
          Database Migration Error
        </Text>
        <Text
          style={{
            color: "#EF4444",
            fontSize: 13,
            textAlign: "center",
            lineHeight: 18,
            marginBottom: 20,
          }}
        >
          {error.message}
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
            }}
            onPress={retry}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: colors.cardSecondary,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
            }}
            onPress={resetDatabase}
          >
            <Text style={{ color: "#F87171", fontWeight: "600" }}>
              Reset Database
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  if (!success) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  //--------------------------------------------------------
  return (
    <>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.bg} />
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={focused ? 21 : 20}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="newQuestion/addQuestion"
          options={{
            title: "Add Q",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "add-circle" : "add-circle-outline"}
                size={focused ? 22 : 20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="revision/revision"
          options={{
            title: "Revision",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "eye" : "eye-outline"}
                size={focused ? 21 : 20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="search/search"
          options={{
            title: "Search",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "search" : "search-outline"}
                size={focused ? 21 : 20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings/settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "settings" : "settings-outline"}
                size={focused ? 21 : 20}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 0,
    overflow: "hidden",
    borderTopWidth: 1,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
  },
  tabBarItem: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 2,
    borderRadius: 0,
    borderTopWidth: 2,
    borderTopColor: "transparent",
  },
  tabBarItemFocused: {
    // borderTopColor applied dynamically via colors.primary
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  tabBarLabelFocused: {
    fontWeight: "800",
  },
});
