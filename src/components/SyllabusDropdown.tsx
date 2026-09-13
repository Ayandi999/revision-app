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
  label: React.ReactNode;
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
  const chevronColor = disabled ? "#4B5563" : isOpen ? "#3B82F6" : "#94A3B8";

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
          size={16}
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
                  {/* Left: checkbox / badge + label */}
                  <View style={styles.dropdownItemLeft}>
                    {!item.badge && (
                      <Ionicons
                        name={isSelected ? "checkbox" : "square-outline"}
                        size={16}
                        color={isSelected ? "#3B82F6" : "#6B7280"}
                      />
                    )}
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

                  {/* Right: checkmark for badge-based single-select items */}
                  {item.badge && isSelected && (
                    <Ionicons name="checkmark" size={16} color="#3B82F6" />
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
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  dropdownSection: {
    marginTop: 14,
    gap: 7,
  },
  dropdownInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1E2028",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownInputActive: {
    borderColor: "rgba(59, 130, 246, 0.35)",
  },
  dropdownInputDisabled: {
    opacity: 0.45,
  },
  dropdownInputValueContainer: {
    flex: 1,
    marginRight: 8,
  },
  dropdownPlaceholder: {
    color: "#6B7280",
    fontSize: 13,
  },
  dropdownMenu: {
    backgroundColor: "#1E2028",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
    overflow: "hidden",
  },
  dropdownScrollContainer: {
    maxHeight: 190,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  dropdownItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  typeBadge: {
    backgroundColor: "#1c1b1b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  typeBadgeSelected: {
    borderColor: "rgba(59, 130, 246, 0.4)",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  typeBadgeText: {
    color: "#E5E7EB",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  typeBadgeTextSelected: {
    color: "#3B82F6",
  },
  itemBadgeLabel: {
    color: "#94A3B8",
    fontSize: 12.5,
    fontWeight: "500",
    flex: 1,
  },
  itemBadgeLabelSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
