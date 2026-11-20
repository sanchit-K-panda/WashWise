import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ProgressRing } from '../ProgressRing';

describe('ProgressRing', () => {
  it('renders progress ring with centered children', async () => {
    const { getByText, getByTestId } = await render(
      <ProgressRing progress={65}>
        <Text>28:45</Text>
      </ProgressRing>
    );

    expect(getByTestId('progress-ring-container')).toBeTruthy();
    expect(getByText('28:45')).toBeTruthy();
  });
});
