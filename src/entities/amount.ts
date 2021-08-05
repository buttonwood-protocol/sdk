import { Currency, CurrencyAmount } from '@uniswap/sdk-core';
import { BigNumber } from 'ethers';

export function toBaseUnits<T extends Currency>(
    amount: CurrencyAmount<T>,
): BigNumber {
    return BigNumber.from(amount.quotient.toString());
}
