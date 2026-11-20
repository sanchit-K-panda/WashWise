import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from '../Text';

describe('Text', () => {
  it('renders text with screenTitle variant', async () => {
    const { getByText } = await render(<Text variant="screenTitle">WashWise</Text>);
    const textElement = getByText('WashWise');
    expect(textElement).toBeTruthy();
    expect(textElement.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontSize: 28 })])
    );
  });

  it('renders monoTimer variant with tabular-nums', async () => {
    const { getByText } = await render(<Text variant="monoTimer">28:45</Text>);
    const textElement = getByText('28:45');
    expect(textElement).toBeTruthy();
    expect(textElement.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontVariant: ['tabular-nums'],
        }),
      ])
    );
  });

  it('applies color correctly', async () => {
    const { getByText } = await render(<Text color="available">Free</Text>);
    const textElement = getByText('Free');
    expect(textElement.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#1E9E6A' })])
    );
  });

  it('enables dynamic type via allowFontScaling by default', async () => {
    const { getByText } = await render(<Text>Dynamic type enabled</Text>);
    const textElement = getByText('Dynamic type enabled');
    expect(textElement.props.allowFontScaling).toBe(true);
  });
});
