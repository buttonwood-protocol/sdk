import { BigNumber, Contract } from 'ethers';
import invariant from 'tiny-invariant';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { toBaseUnits } from '../utils';
import TrancheAbi from '../../abis/Tranche.json';
import { TrancheData } from './bond';

export class Tranche {
    constructor(
        private data: TrancheData,
        private collateral: Token,
        private chainId = 1,
    ) {}

    get address(): string {
        return this.data.id;
    }

    get ratio(): number {
        return parseInt(this.data.ratio, 10);
    }

    get index(): number {
        return parseInt(this.data.index, 10);
    }

    get totalCollateral(): BigNumber {
        return BigNumber.from(this.data.totalCollateral);
    }

    get decimals(): number {
        return parseInt(this.data.token.decimals, 10);
    }

    get totalSupply(): BigNumber {
        return BigNumber.from(this.data.token.totalSupply);
    }

    get symbol(): string {
        return this.data.token.symbol;
    }

    get name(): string {
        return this.data.token.name;
    }

    get token(): Token {
        return new Token(
            this.chainId,
            this.address,
            this.decimals,
            this.symbol,
            this.name,
        );
    }

    get contract(): Contract {
        return new Contract(this.address, TrancheAbi);
    }

    redeemValue(amount: CurrencyAmount<Token>): CurrencyAmount<Token> {
        invariant(
            amount.currency.address.toLowerCase() ===
                this.address.toLowerCase(),
            'Invalid tranche amount',
        );
        return CurrencyAmount.fromRawAmount(
            this.collateral,
            this.totalCollateral
                .mul(toBaseUnits(amount))
                .div(this.totalSupply)
                .toString(),
        );
    }
}
