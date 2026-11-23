import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WashingMachine, Timer, History, User, ClipboardCheck, Flag } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useIssues } from '@/hooks/useIssues';

export interface AppTabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors: Record<string, { options: { title?: string; href?: string | null } }>;
  navigation?: {
    emit?: (event: { type: string; target: string; canPreventDefault: boolean }) => {
      defaultPrevented: boolean;
    };
    navigate?: (name: any) => void;
  };
  insets?: { top: number; bottom: number; left: number; right: number };
  role: 'student' | 'caretaker';
}

export function AppTabBar({
  state,
  descriptors,
  navigation,
  insets: customInsets,
  role,
}: AppTabBarProps) {
  const router = useRouter();
  let systemInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    systemInsets = useSafeAreaInsets();
  } catch {
    systemInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  }
  const insets = customInsets || systemInsets;
  const { activeSession } = useActiveSession();
  const { openCount } = useIssues();

  // If currently on a modal/stack screen without tabs, hide tab bar
  const currentRoute = state.routes[state.index]?.name;
  if (
    currentRoute === 'start' ||
    currentRoute?.startsWith('timer') ||
    currentRoute?.startsWith('machine')
  ) {
    return null;
  }

  const hasRunningWash = !!activeSession && activeSession.status === 'running';

  const visibleRoutes = state.routes.filter((route) => {
    const descriptor = descriptors[route.key];
    const options = descriptor?.options || {};
    return options.href !== null;
  });

  const activeIndex = visibleRoutes.findIndex((r) => r.name === currentRoute);

  return (
    <View
      style={[
        styles.outerContainer,
        {
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={styles.pillContainer} accessibilityRole="tablist">
        {/* Animated indicator pill background */}
        {activeIndex >= 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.indicatorPill,
              {
                width: `${100 / visibleRoutes.length}%`,
                left: `${(activeIndex * 100) / visibleRoutes.length}%`,
              },
            ]}
          />
        )}

        {visibleRoutes.map((route) => {
          const descriptor = descriptors[route.key];
          const options = descriptor?.options || {};
          const isFocused = route.name === currentRoute;
          const routeName = route.name;

          let label = options.title !== undefined ? options.title : route.name;
          let IconComponent = WashingMachine;

          if (role === 'student') {
            if (routeName === 'index') {
              label = 'Machines';
              IconComponent = WashingMachine;
            } else if (routeName === 'wash') {
              label = 'My wash';
              IconComponent = Timer;
            } else if (routeName === 'history') {
              label = 'History';
              IconComponent = History;
            } else if (routeName === 'account') {
              label = 'Account';
              IconComponent = User;
            }
          } else {
            if (routeName === 'index') {
              label = 'Machines';
              IconComponent = ClipboardCheck;
            } else if (routeName === 'issues') {
              label = 'Issues';
              IconComponent = Flag;
            } else if (routeName === 'account') {
              label = 'Account';
              IconComponent = User;
            }
          }

          const activeColor = '#1F6FA8';
          const inactiveColor = colors.ink.muted;
          const iconColor = isFocused ? activeColor : inactiveColor;

          const onPress = () => {
            let defaultPrevented = false;
            try {
              if (navigation && typeof navigation.emit === 'function') {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                defaultPrevented = event?.defaultPrevented || false;
              }
            } catch {
              defaultPrevented = false;
            }

            if (!isFocused && !defaultPrevented) {
              try {
                if (navigation && typeof navigation.navigate === 'function') {
                  navigation.navigate(route.name);
                  return;
                }
              } catch {
                // fall through to expo-router router
              }

              // Fallback navigation directly via expo-router
              if (role === 'student') {
                if (routeName === 'index') router.navigate('/(student)');
                else if (routeName === 'wash') router.navigate('/(student)/wash');
                else if (routeName === 'history') router.navigate('/(student)/history');
                else if (routeName === 'account') router.navigate('/(student)/account');
              } else {
                if (routeName === 'index') router.navigate('/(caretaker)');
                else if (routeName === 'issues') router.navigate('/(caretaker)/issues');
                else if (routeName === 'account') router.navigate('/(caretaker)/account');
              }
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
              onPress={onPress}
              style={styles.tabButton}
            >
              <View style={styles.iconContainer}>
                <IconComponent size={21} strokeWidth={isFocused ? 2.1 : 1.8} color={iconColor} />
                {/* Dot badge on My wash when active session is running */}
                {role === 'student' && routeName === 'wash' && hasRunningWash && (
                  <View style={styles.dotBadge} testID="wash-running-dot" />
                )}
                {/* Count badge on Issues for caretaker */}
                {role === 'caretaker' && routeName === 'issues' && openCount > 0 && (
                  <View style={styles.countBadge} testID="issues-count-badge">
                    <Text style={styles.countBadgeText}>{openCount > 99 ? '99+' : openCount}</Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? activeColor : inactiveColor,
                    fontWeight: isFocused ? '500' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    width: '100%',
    alignSelf: 'center',
    zIndex: 10,
    ...(Platform.OS === 'web'
      ? {
          maxWidth: 430,
        }
      : {}),
  },
  pillContainer: {
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    padding: 6,
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(18px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.6)',
        } as any)
      : {}),
  },
  indicatorPill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 2,
    zIndex: 1,
  },
  tabButton: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    gap: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  dotBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2F8BD0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  countBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#CF4B4B',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
