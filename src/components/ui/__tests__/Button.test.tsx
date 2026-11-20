import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children correctly', async () => {
    const { getByText } = await render(<Button>Start wash</Button>);
    expect(getByText('Start wash')).toBeTruthy();
  });

  it('triggers onPress when clicked', async () => {
    const onPressMock = jest.fn();
    const { getByText } = await render(<Button onPress={onPressMock}>Start wash</Button>);

    fireEvent.press(getByText('Start wash'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', async () => {
    const onPressMock = jest.fn();
    const { getByText } = await render(
      <Button disabled onPress={onPressMock}>
        Start wash
      </Button>
    );

    fireEvent.press(getByText('Start wash'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator and hides text when loading', async () => {
    const { queryByText, getByTestId } = await render(<Button loading>Start wash</Button>);

    expect(queryByText('Start wash')).toBeNull();
    expect(getByTestId('button-loading-indicator')).toBeTruthy();
  });
});
