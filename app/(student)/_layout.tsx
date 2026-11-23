import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { AppTabBar } from '@/components/navigation/TabBar';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme/tokens';

export default function StudentLayout() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/(auth)/login');
      } else if (profile && profile.role !== 'student') {
        router.replace('/(caretaker)');
      }
    }
  }, [user, profile, isLoading, router]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="small" color={colors.sky[500]} />
      </View>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...(props as any)} role="student" />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Machines',
        }}
      />
      <Tabs.Screen
        name="wash"
        options={{
          title: 'My wash',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
        }}
      />
      <Tabs.Screen
        name="start"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="timer/[id]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
