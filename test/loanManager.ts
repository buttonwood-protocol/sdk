import { BigNumber, Contract } from 'ethers';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { encodeSqrtRatioX96, Pool } from '@uniswap/v3-sdk';
import { Bond, BondData, Tranche, TrancheData } from '../src';

function getTrancheData(
    address: string,
    ratio: number,
    totalCollateral: string,
    totalSupply: string,
): TrancheData {
    return {
        id: address,
        ratio,
        totalCollateral,
        token: {
            id: address,
            symbol: 'tranche',
            name: 'tranche Z',
            decimals: 9,
            totalSupply,
        },
    };
}

function getBondData({
    totalDebt = '30000000',
    totalCollateral = '30000000',
    mature = false,
}): BondData {
    const address = '0x8feb0797217962c517fac6da4f8667cc000129ff';
    return {
        id: address,
        maturityDate: '1630532337',
        collateral: {
            id: '0x1439b0429a3ad079c55093fbfd59a7c00c888d00',
            symbol: 'AMPL',
            name: 'Ampleforth',
            decimals: 9,
            totalSupply: '123123123123123',
        },
        tranches: [
            getTrancheData(
                '0xd6d8d269933c02db9f46f0f5b630ae91796a6afc',
                200,
                '1000000',
                '1000000',
            ),
            getTrancheData(
                '0x881d40237659c251811cec9c364ef91dc08d300c',
                300,
                '1000000',
                '1000000',
            ),
            getTrancheData(
                '0xd24400ae8bfebb18ca49be86258a3c749cf46853',
                500,
                '1000000',
                '1000000',
            ),
        ],
        mature,
        totalDebt,
        totalCollateral,
    };
}

describe('Loan Manager', () => {
});
