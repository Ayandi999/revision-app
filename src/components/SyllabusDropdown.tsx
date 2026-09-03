import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DropdownItem {
  /** The raw string value (for simple string lists) */
  value: string;
  /** Optional badge label shown before the item text (e.g. "MCQ") */
  badge?: string;
  /** Full display label */
  label: string;
}

interface SyllabusDropdownProps {
  label: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  items: DropdownItem[];
  /** Currently selected values (pass one-item array for single-select) */
  selectedValues: string[];
  onSelectItem: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  /**
   * Optional rendered preview shown inside the trigger when a value is
   * already selected. Falls back to placeholder text when absent.
   */
  selectedPreview?: React.ReactNode;
  /** Extra hint shown next to the label (e.g. "3 selected", "Pick a subject first") */
  hint?: React.ReactNode;
  /** Removable chip row shown above the trigger */
  chips?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SyllabusDropdown({
  label,
  isOpen,
  onToggleOpen,
  items,
  selectedValues,
  onSelectItem,
  disabled = false,
  placeholder,
  selectedPreview,
  hint,
  chips,
}: SyllabusDropdownProps) {
  const chevronColor = disabled
    ? "#4B5563"
    : isOpen
      ? "#a6f63cff"
      : "#9CA3AF";

  return (
    <View style={styles.dropdownSection}>
      {/* Label row */}
      <View style={styles.labelWithHint}>
        <Text style={styles.sectionLabel}>{label}</Text>
        {hint}
      </View>

      {/* Selected chips */}
      {chips}

      {/* Trigger */}
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={disabled}
        style={[
          styles.dropdownInput,
          disabled && styles.dropdownInputDisabled,
          isOpen && styles.dropdownInputActive,
        ]}
        onPress={onToggleOpen}
      >
        <View style={styles.dropdownInputValueContainer}>
          {selectedValues.length > 0 && selectedPreview ? (
            selectedPreview
          ) : (
            <Text style={styles.dropdownPlaceholder}>{placeholder}</Text>
          )}
        </View>

        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color={chevronColor}
        />
      </TouchableOpacity>

      {/* Menu */}
      {isOpen && !disabled && (
        <View style={styles.dropdownMenu}>
          <ScrollView
            nestedScrollEnabled
            style={styles.dropdownScrollContainer}
            showsVerticalScrollIndicator
          >
            {items.map((item, index) => {
              const isSelected = selectedValues.includes(item.value);
              return (
                <TouchableOpacity
                  key={item.value}
                  activeOpacity={0.7}
                  style={[
                    styles.dropdownItem,
                    isSelected && styles.dropdownItemSelected,
                    index === items.length - 1 && styles.lastDropdownItem,
                  ]}
                  onPress={() => onSelectItem(item.value)}
                >
                  {/* Left: optional badge + label */}
                  <View style={styles.dropdownItemLeft}>
                    {item.badge && (
                      <View
                        style={[
                          styles.typeBadge,
                          isSelected && styles.typeBadgeSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            isSelected && styles.typeBadgeTextSelected,
                          ]}
                        >
                          {item.badge}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.itemBadgeLabel,
                        isSelected && styles.itemBadgeLabelSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>

                  {/* Right: checkmark (single-select) or checkbox (multi-select) */}
                  {item.badge ? (
                    isSelected && (
                      <Ionicons name="checkmark" size={18} color="#a6f63cff" />
                    )
                  ) : (
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={18}
                      color={isSelected ? "#a6f63cff" : "#6B7280"}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  labelWithHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  dropdownSection: {
    marginTop: 24,
    gap: 12,
  },
  dropdownInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#262525",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownInputActive: {
    borderColor: "#a6f63c88",
  },
  dropdownInputDisabled: {
    opacity: 0.45,
  },
  dropdownInputValueContainer: {
    flex: 1,
    marginRight: 10,
  },
  dropdownPlaceholder: {
    color: "#6B7280",
    fontSize: 14,
  },
  dropdownMenu: {
    backgroundColor: "#262525",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  dropdownScrollContainer: {
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(166, 246, 60, 0.07)",
  },
  dropdownItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  typeBadge: {
    backgroundColor: "#1c1b1b",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  typeBadgeSelected: {
    borderColor: "#a6f63c88",
    backgroundColor: "rgba(166, 246, 60, 0.15)",
  },
  typeBadgeText: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  typeBadgeTextSelected: {
    color: "#a6f63cff",
  },
  itemBadgeLabel: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },
  itemBadgeLabelSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
