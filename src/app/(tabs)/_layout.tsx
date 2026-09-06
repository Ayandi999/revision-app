import { useAppMigrations } from "@/database/migrator";
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

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
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

  return (
    <GlassView
      glassEffectStyle="regular"
      colorScheme="dark"
      style={styles.tabBar}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? "#3B82F6" : "#64748B";

        const onPress = () => {
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
            style={[styles.tabBarItem, isFocused && styles.tabBarItemFocused]}
          >
            {options.tabBarIcon?.({ color, size: 20, focused: isFocused })}
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
  //-------------Creating the Databse:-----------------------
  const { success, error, retry, resetDatabase } = useAppMigrations();
  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1c1b1b",
          padding: 24,
        }}
      >
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text
          style={{
            color: "#FFFFFF",
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
              backgroundColor: "#3B82F6",
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
              backgroundColor: "#374151",
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
          backgroundColor: "#1c1b1b",
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }
  //--------------------------------------------------------
  return (
    <>
      <StatusBar style="light" backgroundColor="#1c1b1b" />
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
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={20} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="newQuestion/addQuestion"
          options={{
            title: "Add Q",
            tabBarIcon: ({ color }) => (
              <Ionicons name="add" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="revision/revision"
          options={{
            title: "Revision",
            tabBarIcon: ({ color }) => (
              <Ionicons name="eye" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search/search"
          options={{
            title: "Search",
            tabBarIcon: ({ color }) => (
              <Ionicons name="search" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings/settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => (
              <Ionicons name="settings-sharp" size={20} color={color} />
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
    bottom: 24,
    left: 20,
    right: 20,
    height: 64,
    backgroundColor: "#13131db8",
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.12)",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  tabBarItem: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    marginVertical: 6,
    marginHorizontal: 2,
  },
  tabBarItemFocused: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  tabBarLabelFocused: {
    fontWeight: "700",
  },
});
