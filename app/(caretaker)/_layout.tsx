import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { AppTabBar } from '@/components/navigation/TabBar';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme/tokens';

export default function CaretakerLayout() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/(auth)/login');
      } else if (profile && profile.role !== 'caretaker') {
        router.replace('/(student)');
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
      tabBar={(props) => <AppTabBar {...(props as any)} role="caretaker" />}
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
        name="issues"
        options={{
          title: 'Issues',
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
        }}
      />
      <Tabs.Screen
        name="machine/[id]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
