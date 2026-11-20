import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { CheckCircle2, Clock, Wrench, Ban, Info, LucideIcon } from 'lucide-react-native';
import { colors, radius } from '@/theme/tokens';
import { MachineStatus } from '@/types';

export type ChipVariant = MachineStatus | 'filter' | 'neutral';

export interface ChipProps {
  variant?: ChipVariant;
  label?: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const statusConfig: Record<
  MachineStatus,
  { defaultLabel: string; color: string; Icon: LucideIcon }
> = {
  available: {
    defaultLabel: 'Available',
    color: colors.status.available,
    Icon: CheckCircle2,
  },
  in_use: {
    defaultLabel: 'In use',
    color: colors.status.in_use,
    Icon: Clock,
  },
  maintenance: {
    defaultLabel: 'Maintenance',
    color: colors.status.maintenance,
    Icon: Wrench,
  },
  broken: {
    defaultLabel: 'Broken',
    color: colors.status.broken,
    Icon: Ban,
  },
};

export const Chip: React.FC<ChipProps> = ({
  variant = 'neutral',
  label,
  selected = false,
  onPress,
  icon: CustomIcon,
  style,
  accessibilityLabel,
}) => {
  const isStatus =
    variant === 'available' ||
    variant === 'in_use' ||
    variant === 'maintenance' ||
    variant === 'broken';

  if (isStatus) {
    const config = statusConfig[variant as MachineStatus];
    const displayLabel = label || config.defaultLabel;
    const IconComponent = CustomIcon || config.Icon;

    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel || `Status: ${displayLabel}`}
        style={[styles.base, styles.statusContainer, style]}
      >
        <IconComponent size={14} strokeWidth={2} color={config.color} />
        <Text style={[styles.text, { color: config.color }]}>{displayLabel}</Text>
      </View>
    );
  }

  if (variant === 'filter') {
    const isInteractive = typeof onPress === 'function';
    return (
      <Pressable
        disabled={!isInteractive}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={accessibilityLabel || label}
        style={[
          styles.base,
          styles.filterContainer,
          selected ? styles.filterSelected : styles.filterUnselected,
          style,
        ]}
      >
        {CustomIcon && (
          <CustomIcon
            size={14}
            strokeWidth={1.75}
            color={selected ? colors.sky[700] : colors.ink.DEFAULT}
            style={styles.iconSpacing}
          />
        )}
        <Text
          style={[styles.text, selected ? styles.filterTextSelected : styles.filterTextUnselected]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  // Neutral variant
  const NeutralIcon = CustomIcon || Info;
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || label}
      style={[styles.base, styles.neutralContainer, style]}
    >
      <NeutralIcon size={14} strokeWidth={1.75} color={colors.ink.muted} />
      <Text style={[styles.text, styles.neutralText]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.chip,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 6,
  },
  statusContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  filterContainer: {
    borderWidth: 1,
  },
  filterSelected: {
    backgroundColor: colors.sky[50],
    borderColor: colors.sky[500],
  },
  filterUnselected: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
  },
  neutralContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
  },
  filterTextSelected: {
    color: colors.sky[700],
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontWeight: '600',
  },
  filterTextUnselected: {
    color: colors.ink.DEFAULT,
  },
  neutralText: {
    color: colors.ink.muted,
  },
  iconSpacing: {
    marginRight: 2,
  },
});

export default Chip;
