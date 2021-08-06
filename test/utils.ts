import { ethers } from 'ethers';
import { CurrencyAmount, Ether, Token } from '@uniswap/sdk-core';
import { addressEquals, containsAddress, toBaseUnits } from '../src/utils';

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

describe('addressEquals', () => {
    it('Properly finds addresses that equal', () => {
        expect(
            addressEquals(
                '0x5a1c8cc79de18466de12cf1ee8e8ddb13fe42173',
                '0x5a1c8cc79de18466de12cf1ee8e8ddb13fe42173',
            ),
        ).toBeTruthy();
        expect(
            addressEquals(
                '0x5A1c8CC79DE18466de12cf1ee8e8ddb13fe42173',
                '0x5a1c8cc79de18466de12cf1ee8e8ddb13fe42173',
            ),
        ).toBeTruthy();
    });

    it('Properly finds addresses that are not equal', () => {
        expect(
            addressEquals(
                '0x5a1c8cc79de18466de12cf1ee8e8ddb13fe42173',
                '0x5a1c8cc79de18466de12cf1ee8e8ddb13fe4217',
            ),
        ).toBeFalsy();
        expect(
            addressEquals('0x5a1c8cc79de18466de12cf1ee8e8ddb13fe42173', ''),
        ).toBeFalsy();
        expect(
            addressEquals(
                '0x5a1c8cc79de18466de12cf1ee8e8ddb13fe42173',
                '0xa1a113ed7a8ec3fa4bcace96d2b0d3cf2244075a',
            ),
        ).toBeFalsy();
    });
});

describe('containsAddress', () => {
    it('Properly finds addresses in a list', () => {
        expect(
            containsAddress(
                ['0x5a1c8cc79de18466de12cf1ee8e8ddb13fe42173'],
                '0x5a1c8cc79de18466de12cf1ee8e8ddb13fe42173',
            ),
        ).toBeTruthy();
        expect(
            containsAddress(
                [
                    '0x5A1c8CC79DE18466de12cf1ee8e8ddb13fe42173',
                    '0xf986dca575e841c2a3731bacf3b57149bd32b6f2',
                ],
                '0x5a1c8cc79de18466de12cf1ee8e8ddb13fe42173',
            ),
        ).toBeTruthy();
    });

    it('Properly finds addresses to not be in a list', () => {
        expect(
            containsAddress([], '0x5a1c8cc79de18466de12cf1ee8e8ddb13fe42173'),
        ).toBeFalsy();
        expect(
            containsAddress(
                ['0xa1a113ed7a8ec3fa4bcace96d2b0d3cf2244075a'],
                '0x5a1c8cc79de18466de12cf1ee8e8ddb13fe42173',
            ),
        ).toBeFalsy();
        expect(
            containsAddress(
                [
                    '0xa1a113ed7a8ec3fa4bcace96d2b0d3cf2244075b',
                    '0xf986dca575e841c2a3731bacf3b57149bd32b6f2',
                ],
                '0xa1a113ed7a8ec3fa4bcace96d2b0d3cf2244075a',
            ),
        ).toBeFalsy();
    });
});
