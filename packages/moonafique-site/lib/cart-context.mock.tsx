import { fn } from '@storybook/test';
import * as actual from './cart-context';

export const useCartContext = fn(actual.useCartContext).mockName(
  'useCartContext'
);
