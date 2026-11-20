import React from 'react';
import { render } from '@testing-library/react-native';
import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('renders basic skeleton with accessible progressbar role', async () => {
    const { getByLabelText } = await render(<Skeleton width={120} height={20} />);
    const skeleton = getByLabelText('Loading content');
    expect(skeleton).toBeTruthy();
  });

  it('renders Skeleton.Line and Skeleton.Circle presets', async () => {
    const { getAllByLabelText } = await render(
      <>
        <Skeleton.Line width="60%" />
        <Skeleton.Circle size={48} />
        <Skeleton.Card />
      </>
    );

    const skeletons = getAllByLabelText('Loading content');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });
});
