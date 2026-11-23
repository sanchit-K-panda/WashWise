import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { AppTabBar } from '../TabBar';
import * as useActiveSessionModule from '@/hooks/useActiveSession';
import * as useIssuesModule from '@/hooks/useIssues';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSegments: () => [],
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

describe('AppTabBar', () => {
  const mockNavigation: any = {
    emit: jest.fn().mockReturnValue({ defaultPrevented: false }),
    navigate: jest.fn(),
  };

  const defaultDescriptors: any = {
    r1: { options: { title: 'Machines' } },
    r2: { options: { title: 'My wash' } },
    r3: { options: { title: 'History' } },
    r4: { options: { title: 'Account' } },
  };

  const defaultStudentState: any = {
    index: 0,
    routes: [
      { key: 'r1', name: 'index' },
      { key: 'r2', name: 'wash' },
      { key: 'r3', name: 'history' },
      { key: 'r4', name: 'account' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(useActiveSessionModule, 'useActiveSession').mockReturnValue({
      activeSession: null,
      isLoading: false,
      refetch: jest.fn(),
    });
    jest.spyOn(useIssuesModule, 'useIssues').mockReturnValue({
      issues: [],
      openCount: 0,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders student navigation tabs (Machines, My wash, History, Account)', async () => {
    const { getByText } = await render(
      <AppTabBar
        state={defaultStudentState}
        descriptors={defaultDescriptors}
        navigation={mockNavigation}
        insets={{ top: 0, bottom: 20, left: 0, right: 0 }}
        role="student"
      />
    );

    expect(getByText('Machines')).toBeTruthy();
    expect(getByText('My wash')).toBeTruthy();
    expect(getByText('History')).toBeTruthy();
    expect(getByText('Account')).toBeTruthy();
  });

  it('navigates to tab when pressed', async () => {
    const { getByLabelText } = await render(
      <AppTabBar
        state={defaultStudentState}
        descriptors={defaultDescriptors}
        navigation={mockNavigation}
        insets={{ top: 0, bottom: 20, left: 0, right: 0 }}
        role="student"
      />
    );

    fireEvent.press(getByLabelText('History'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('history');
  });

  it('renders dot badge on My wash when active session is running', async () => {
    jest.spyOn(useActiveSessionModule, 'useActiveSession').mockReturnValue({
      activeSession: { id: 's1', status: 'running' } as any,
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId } = await render(
      <AppTabBar
        state={defaultStudentState}
        descriptors={defaultDescriptors}
        navigation={mockNavigation}
        insets={{ top: 0, bottom: 20, left: 0, right: 0 }}
        role="student"
      />
    );

    expect(getByTestId('wash-running-dot')).toBeTruthy();
  });

  it('renders open issues count badge on caretaker Issues tab', async () => {
    jest.spyOn(useIssuesModule, 'useIssues').mockReturnValue({
      issues: [{ id: '1' }] as any,
      openCount: 3,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const caretakerState: any = {
      index: 0,
      routes: [
        { key: 'c1', name: 'index' },
        { key: 'c2', name: 'issues' },
        { key: 'c3', name: 'account' },
      ],
    };

    const caretakerDescriptors: any = {
      c1: { options: { title: 'Machines' } },
      c2: { options: { title: 'Issues' } },
      c3: { options: { title: 'Account' } },
    };

    const { getByTestId, getByText } = await render(
      <AppTabBar
        state={caretakerState}
        descriptors={caretakerDescriptors}
        navigation={mockNavigation}
        insets={{ top: 0, bottom: 20, left: 0, right: 0 }}
        role="caretaker"
      />
    );

    expect(getByTestId('issues-count-badge')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('hides tab bar on start or timer modal screens', async () => {
    const hiddenState: any = {
      index: 0,
      routes: [{ key: 's1', name: 'start' }],
    };

    const { toJSON } = await render(
      <AppTabBar
        state={hiddenState}
        descriptors={{ s1: { options: {} } } as any}
        navigation={mockNavigation}
        insets={{ top: 0, bottom: 20, left: 0, right: 0 }}
        role="student"
      />
    );

    expect(toJSON()).toBeNull();
  });
});
