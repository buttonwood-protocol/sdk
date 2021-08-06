import { BigNumber, Contract } from 'ethers';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { Bond, BondData, Tranche, TrancheData } from '../../src';

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

function getBondData(): BondData {
    const address = '0x8feb0797217962c517fac6da4f8667cc000129ff';
    return {
        id: address,
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
        mature: false,
        totalDebt: '3000000',
        totalCollateral: '10000000',
    };
}

describe('Bond', () => {
    it('Fetches bond address', () => {
        const bondData = getBondData();
        const bond = new Bond(bondData);
        expect(bond.address).toEqual(bondData.id);
    });

    it('Fetches bond total debt', () => {
        const bondData = getBondData();
        const bond = new Bond(bondData);
        expect(bond.totalDebt).toEqual(BigNumber.from(bondData.totalDebt));
    });

    it('Fetches bond total collateral', () => {
        const bondData = getBondData();
        const bond = new Bond(bondData);
        expect(bond.totalCollateral).toEqual(
            BigNumber.from(bondData.totalCollateral),
        );
    });

    it('Fetches bond dcr', () => {
        const bondData = getBondData();
        const bond = new Bond(bondData);
        expect(bond.dcr).toEqual(
            BigNumber.from(bondData.totalDebt).div(bondData.totalCollateral),
        );
    });

    it('Fetches bond mature', () => {
        const bondData = getBondData();
        const bond = new Bond(bondData);
        expect(bond.mature).toEqual(bondData.mature);
    });

    it('Fetches bond collateral', () => {
        const bondData = getBondData();
        const bond = new Bond(bondData);
        expect(bond.collateral).toEqual(
            new Token(
                1,
                bondData.collateral.id,
                bondData.collateral.decimals,
                bondData.collateral.symbol,
                bondData.collateral.name,
            ),
        );
    });

    it('Fetches bond tranches', () => {
        const bondData = getBondData();
        const bond = new Bond(bondData);
        const tranches = bond.tranches;
        for (let i = 0; i < tranches.length; i++) {
            const tranche = tranches[i];
            expect(tranche).toEqual(new Tranche(bondData.tranches[i]));
        }
    });

    it('Fetches contract', () => {
        const bond = new Bond(getBondData());
        expect(bond.contract.address).toEqual(bond.address);
        expect(bond.contract instanceof Contract).toBeTruthy();
    });

    describe('Deposit', () => {
        it('properly calculates deposit output', () => {
            const bondData = getBondData();
            const bond = new Bond(bondData);
            const collateral = bond.collateral;
            const input = CurrencyAmount.fromRawAmount(collateral, '100000000');
            const output = bond.deposit(input);
            for (const tranche of output) {
                console.log(tranche.quotient.toString());
            }
        });

        it('fails with invalid input', () => {
            const bondData = getBondData();
            const bond = new Bond(bondData);
            const input = CurrencyAmount.fromRawAmount(
                bond.tranches[0].token,
                '123',
            );
            expect(() => bond.deposit(input)).toThrow(
                'Invariant failed: Invalid input currency - not bond collateral',
            );
        });
    });
});
