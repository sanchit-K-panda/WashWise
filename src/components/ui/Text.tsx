import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
  StyleProp,
} from 'react-native';
import { colors, typography } from '@/theme/tokens';

export type TextVariant =
  'screenTitle' | 'section' | 'body' | 'caption' | 'monoTimer' | 'monoMachineId' | 'monoCaption';

export type TextColor =
  | 'ink'
  | 'muted'
  | 'primary'
  | 'accent'
  | 'available'
  | 'inUse'
  | 'maintenance'
  | 'broken'
  | 'white';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  tabular?: boolean;
}

const colorMap: Record<TextColor, string> = {
  ink: colors.ink.DEFAULT,
  muted: colors.ink.muted,
  primary: colors.sky[500],
  accent: colors.sky[700],
  available: colors.status.available,
  inUse: colors.status.in_use,
  maintenance: colors.status.maintenance,
  broken: colors.status.broken,
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  screenTitle: {
    ...typography.screenTitle,
  },
  section: {
    ...typography.section,
  },
  body: {
    ...typography.body,
  },
  caption: {
    ...typography.caption,
  },
  monoTimer: {
    ...typography.monoTimer,
    fontVariant: ['tabular-nums'],
  },
  monoMachineId: {
    ...typography.monoMachineId,
    fontVariant: ['tabular-nums'],
  },
  monoCaption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: 'JetBrainsMono_500Medium',
    fontVariant: ['tabular-nums'],
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'ink',
  tabular,
  style,
  children,
  ...rest
}) => {
  const combinedStyle: StyleProp<TextStyle> = [
    styles[variant],
    { color: colorMap[color] },
    tabular && styles.tabular,
    style,
  ];

  return (
    <RNText style={combinedStyle} {...rest}>
      {children}
    </RNText>
  );
};

Text.displayName = 'Text';

export default Text;
