import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

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
  const { colors } = useTheme();
  const chevronColor = disabled
    ? colors.textPlaceholder
    : isOpen
    ? colors.primary
    : colors.textMuted;

  return (
    <View style={styles.dropdownSection}>
      {/* Label row */}
      <View style={styles.labelWithHint}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{label}</Text>
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
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
          disabled && styles.dropdownInputDisabled,
          isOpen && { borderColor: colors.primary },
        ]}
        onPress={onToggleOpen}
      >
        <View style={styles.dropdownInputValueContainer}>
          {selectedValues.length > 0 && selectedPreview ? (
            selectedPreview
          ) : (
            <Text style={[styles.dropdownPlaceholder, { color: colors.textPlaceholder }]}>
              {placeholder}
            </Text>
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
        <View
          style={[
            styles.dropdownMenu,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
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
                    { borderBottomColor: colors.borderSubtle },
                    isSelected && { backgroundColor: colors.primaryLight },
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
                        color={isSelected ? colors.primary : colors.textMuted}
                      />
                    )}
                    {item.badge && (
                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor: colors.cardSecondary,
                            borderColor: colors.cardSecondaryBorder,
                          },
                          isSelected && {
                            borderColor: colors.primary,
                            backgroundColor: colors.primaryLight,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            { color: colors.text },
                            isSelected && { color: colors.primary },
                          ]}
                        >
                          {item.badge}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.itemBadgeLabel,
                        { color: colors.textMuted },
                        isSelected && [styles.itemBadgeLabelSelected, { color: colors.text }],
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>

                  {/* Right: checkmark for badge-based single-select items */}
                  {item.badge && isSelected && (
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
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
    borderRadius: 0,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  dropdownInputDisabled: {
    opacity: 0.45,
  },
  dropdownInputValueContainer: {
    flex: 1,
    marginRight: 8,
  },
  dropdownPlaceholder: {
    fontSize: 13,
  },
  dropdownMenu: {
    borderRadius: 0,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownScrollContainer: {
    maxHeight: 190,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  dropdownItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 0,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  itemBadgeLabel: {
    fontSize: 12.5,
    fontWeight: "500",
    flex: 1,
  },
  itemBadgeLabelSelected: {
    fontWeight: "600",
  },
});
