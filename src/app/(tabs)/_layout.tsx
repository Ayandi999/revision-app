import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { GlassView } from "expo-glass-effect";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <GlassView
      glassEffectStyle="regular"
      colorScheme="dark"
      style={styles.tabBar}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? "#5ffa3c" : "#9CA3AF";

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
            style={styles.tabBarItem}
          >
            {options.tabBarIcon?.({ color, size: 20, focused: isFocused })}
            <Text style={[styles.tabBarLabel, { color }]}>{options.title}</Text>
          </TouchableOpacity>
        );
      })}
    </GlassView>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
        name="settings/settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings-sharp" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    height: 64,
    backgroundColor: "rgba(26, 26, 46, 0.72)",
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
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
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
});
