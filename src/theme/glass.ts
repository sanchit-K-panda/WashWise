import { Platform, ViewStyle, TextStyle } from 'react-native';
import { colors } from './tokens';

export const glassCard: ViewStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.78)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.85)',
  shadowColor: '#1F6FA8',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 24,
  elevation: 2,
  ...(Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(18px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.6)',
      } as any)
    : {}),
};

export const glassPill: ViewStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.78)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.95)',
  borderRadius: 99,
};

export const btnPrimary: ViewStyle = {
  minHeight: 50,
  borderRadius: 16,
  backgroundColor: '#2F8BD0',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingHorizontal: 16,
  shadowColor: '#2F8BD0',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.32,
  shadowRadius: 18,
  elevation: 3,
};

export const btnPrimaryText: TextStyle = {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '500',
  fontFamily: 'PlusJakartaSans_500Medium',
};

export const btnSecondary: ViewStyle = {
  minHeight: 50,
  borderRadius: 16,
  backgroundColor: 'rgba(255, 255, 255, 0.6)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.9)',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingHorizontal: 16,
  ...(Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as any)
    : {}),
};

export const btnSecondaryText: TextStyle = {
  color: colors.ink.DEFAULT,
  fontSize: 14,
  fontWeight: '500',
  fontFamily: 'PlusJakartaSans_500Medium',
};

export const btnDestructive: ViewStyle = {
  minHeight: 50,
  borderRadius: 16,
  backgroundColor: '#CF4B4B',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingHorizontal: 16,
  shadowColor: '#CF4B4B',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 18,
  elevation: 3,
};

export const btnDestructiveText: TextStyle = {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '500',
  fontFamily: 'PlusJakartaSans_500Medium',
};

export const glassPanel: ViewStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.88)',
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.90)',
  shadowColor: '#0B2233',
  shadowOffset: { width: 0, height: -12 },
  shadowOpacity: 0.18,
  shadowRadius: 40,
  elevation: 8,
  ...(Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(26px) saturate(1.7)',
        WebkitBackdropFilter: 'blur(26px) saturate(1.7)',
      } as any)
    : {}),
};

export const glassSheet = glassPanel;

export const btnGhost: ViewStyle = {
  minHeight: 44,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingHorizontal: 16,
  backgroundColor: 'transparent',
};

export const btnGhostText: TextStyle = {
  color: '#B83A3A',
  fontSize: 14,
  fontWeight: '500',
  fontFamily: 'PlusJakartaSans_500Medium',
};
