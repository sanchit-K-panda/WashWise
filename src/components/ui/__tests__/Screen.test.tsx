import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Screen } from '../Screen';

describe('Screen', () => {
  it('renders children and screen title header', async () => {
    const { getByText } = await render(
      <Screen header={{ title: 'Machine list', subtitle: 'Hostel A' }}>
        <Text>Content inside screen</Text>
      </Screen>
    );

    expect(getByText('Machine list')).toBeTruthy();
    expect(getByText('Hostel A')).toBeTruthy();
    expect(getByText('Content inside screen')).toBeTruthy();
  });

  it('fires back action when back button is pressed', async () => {
    const onBackMock = jest.fn();
    const { getByLabelText } = await render(
      <Screen header={{ title: 'Settings', onBack: onBackMock }}>
        <Text>Screen Body</Text>
      </Screen>
    );

    fireEvent.press(getByLabelText('Go back'));
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it('renders offline banner when offline', async () => {
    const { getByText, getByLabelText } = await render(
      <Screen offlineBanner={{ isOffline: true, lastSyncedAt: '10:45 AM' }}>
        <Text>Content</Text>
      </Screen>
    );

    expect(getByLabelText('Offline banner')).toBeTruthy();
    expect(getByText('Offline · Last synced 10:45 AM')).toBeTruthy();
  });
});
