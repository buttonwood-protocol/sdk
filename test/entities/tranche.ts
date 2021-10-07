import { BigNumber, Contract } from 'ethers';
import { Token } from '@uniswap/sdk-core';
import { Tranche, TrancheData } from '../../src';

function getTrancheData(): TrancheData {
    const address = '0xf96499dd6074d44401eb87e37b6e58c5c78ba007';
    return {
        id: address,
        ratio: '500',
        index: '1',
        totalCollateral: '120000000000',
        token: {
            id: address,
            symbol: 'tranche',
            name: 'tranche Z',
            decimals: '18',
            totalSupply: '1230012300',
        },
    };
}

const collateral = new Token(
    1,
    '0x1439b0429a3ad079c55093fbfd59a7c00c888d00',
    9,
    'AMPL',
    'Ampleforth',
);

describe('Tranche', () => {
    it('Fetches tranche address', () => {
        const trancheData = getTrancheData();
        const tranche = new Tranche(trancheData, collateral);
        expect(tranche.address).toEqual(trancheData.id);
    });

    it('Fetches tranche ratio', () => {
        const trancheData = getTrancheData();
        const tranche = new Tranche(trancheData, collateral);
        expect(tranche.ratio).toEqual(parseInt(trancheData.ratio, 10));
    });

    it('Fetches tranche total collateral', () => {
        const trancheData = getTrancheData();
        const tranche = new Tranche(trancheData, collateral);
        expect(tranche.totalCollateral).toEqual(
            BigNumber.from(trancheData.totalCollateral),
        );
    });

    it('Fetches tranche total supply', () => {
        const trancheData = getTrancheData();
        const tranche = new Tranche(trancheData, collateral);
        expect(tranche.totalSupply).toEqual(
            BigNumber.from(trancheData.token.totalSupply),
        );
    });

    it('Fetches tranche decimals', () => {
        const trancheData = getTrancheData();
        const tranche = new Tranche(trancheData, collateral);
        expect(tranche.decimals).toEqual(
            parseInt(trancheData.token.decimals, 10),
        );
    });

    it('Fetches token', () => {
        const trancheData = getTrancheData();
        const tranche = new Tranche(trancheData, collateral);
        expect(tranche.token).toEqual(
            new Token(
                1,
                trancheData.token.id,
                parseInt(trancheData.token.decimals, 10),
                'tranche',
                'tranche Z',
            ),
        );
    });

    it('Fetches contract', () => {
        const tranche = new Tranche(getTrancheData(), collateral);
        expect(tranche.contract.address).toEqual(tranche.address);
        expect(tranche.contract instanceof Contract).toBeTruthy();
    });
});
