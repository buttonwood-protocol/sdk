import { BigNumber, Contract } from 'ethers';
import { Token } from '@uniswap/sdk-core';
import { Tranche, TrancheData } from '../../src';

function getTrancheData(): TrancheData {
    const address = '0xf96499dd6074d44401eb87e37b6e58c5c78ba007';
    return {
        id: address,
        ratio: 500,
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

describe('Tranche', () => {
    it('Fetches tranche address', () => {
        const trancheData = getTrancheData();
        const tranche = new Tranche(trancheData);
        expect(tranche.address).toEqual(trancheData.id);
    });

    it('Fetches tranche ratio', () => {
        const trancheData = getTrancheData();
        const tranche = new Tranche(trancheData);
        expect(tranche.ratio).toEqual(trancheData.ratio);
    });

    it('Fetches tranche total collateral', () => {
        const trancheData = getTrancheData();
        const tranche = new Tranche(trancheData);
        expect(tranche.totalCollateral).toEqual(
            BigNumber.from(trancheData.totalCollateral),
        );
    });

    it('Fetches tranche total supply', () => {
        const trancheData = getTrancheData();
        const tranche = new Tranche(trancheData);
        expect(tranche.totalSupply).toEqual(
            BigNumber.from(trancheData.token.totalSupply),
        );
    });

    it('Fetches tranche decimals', () => {
        const trancheData = getTrancheData();
        const tranche = new Tranche(trancheData);
        expect(tranche.decimals).toEqual(trancheData.token.decimals);
    });

    it('Fetches token', () => {
        const trancheData = getTrancheData();
        const tranche = new Tranche(trancheData);
        expect(tranche.token).toEqual(
            new Token(
                1,
                trancheData.token.id,
                parseInt(trancheData.token.decimals, 10),
            ),
        );
    });

    it('Fetches contract', () => {
        const tranche = new Tranche(getTrancheData());
        expect(tranche.contract.address).toEqual(tranche.address);
        expect(tranche.contract instanceof Contract).toBeTruthy();
    });
});
