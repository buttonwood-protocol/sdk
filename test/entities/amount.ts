import { ethers } from 'ethers';
import { CurrencyAmount, Ether, Token } from '@uniswap/sdk-core';
import { toBaseUnits } from '../../src/entities/amount';

describe('toBaseUnits', () => {
    it('Converts amount to base units', () => {
        const amount = CurrencyAmount.fromRawAmount(
            new Token(1, '0x0083bf75b537c09c2a79510df77c72485b10142c', 18),
            5,
        );
        expect(toBaseUnits(amount).toString()).toEqual('5');
    });

    it('Converts ETH amount to base units', () => {
        const amount = CurrencyAmount.fromRawAmount(
            Ether.onChain(1),
            ethers.utils.parseEther('5').toString(),
        );
        expect(toBaseUnits(amount).toString()).toEqual('5000000000000000000');
    });
});
