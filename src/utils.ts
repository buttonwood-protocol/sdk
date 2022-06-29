import { Currency, CurrencyAmount } from '@uniswap/sdk-core';
import { BigNumber } from 'ethers';

export function addressEquals(address1: string, address2: string): boolean {
    return address1.toLowerCase() === address2.toLowerCase();
}

export function containsAddress(addresses: string[], test: string): boolean {
    for (const address of addresses) {
        if (addressEquals(address, test)) {
            return true;
        }
    }

    return false;
}

export function toBaseUnits<T extends Currency>(
    amount: CurrencyAmount<T>,
): BigNumber {
    return BigNumber.from(amount.quotient.toString());
}

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function invariant(condition: any, message: string): asserts condition {
    if (!condition) {
        throw new Error(`Invariant failed: ${message}`);
    }
}
/* eslint-enable @typescript-eslint/explicit-module-boundary-types */
/* eslint-enable @typescript-eslint/no-explicit-any */
