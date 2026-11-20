import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Chip } from '../Chip';

describe('Chip', () => {
  it('renders available status with label and icon', async () => {
    const { getByText, getByLabelText } = await render(<Chip variant="available" />);
    expect(getByText('Available')).toBeTruthy();
    expect(getByLabelText('Status: Available')).toBeTruthy();
  });

  it('renders in_use status with custom time label', async () => {
    const { getByText } = await render(<Chip variant="in_use" label="14m left" />);
    expect(getByText('14m left')).toBeTruthy();
  });

  it('renders broken status with label and color', async () => {
    const { getByText } = await render(<Chip variant="broken" />);
    const textElement = getByText('Broken');
    expect(textElement.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#CF4B4B' })])
    );
  });

  it('handles filter chip selection and press events', async () => {
    const onPressMock = jest.fn();
    const { getByText } = await render(
      <Chip variant="filter" label="Quick" selected onPress={onPressMock} />
    );

    const chip = getByText('Quick');
    expect(chip).toBeTruthy();
    fireEvent.press(chip);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});
