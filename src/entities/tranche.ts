import { BigNumber, Contract } from 'ethers';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { addressEquals, invariant, toBaseUnits } from '../utils';
import TrancheAbi from '../../abis/Tranche.json';
import { TrancheData } from './bond';

export class Tranche {
    constructor(
        private _data: TrancheData,
        private _collateral: Token,
        private _chainId = 1,
    ) {}

    get address(): string {
        return this._data.id;
    }

    get ratio(): number {
        return parseInt(this._data.ratio, 10);
    }

    get index(): number {
        return parseInt(this._data.index, 10);
    }

    get totalCollateral(): BigNumber {
        return BigNumber.from(this._data.totalCollateral);
    }

    get totalCollateralAtMaturity(): BigNumber {
        return BigNumber.from(this._data.totalCollateralAtMaturity || 0);
    }

    get decimals(): number {
        return parseInt(this._data.token.decimals, 10);
    }

    get totalSupply(): BigNumber {
        return BigNumber.from(this._data.token.totalSupply);
    }

    get totalSupplyAtMaturity(): BigNumber {
        return BigNumber.from(this._data.totalSupplyAtMaturity || 0);
    }

    get symbol(): string {
        return this._data.token.symbol;
    }

    get name(): string {
        return this._data.token.name;
    }

    get token(): Token {
        return new Token(
            this._chainId,
            this.address,
            this.decimals,
            this.symbol,
            this.name,
        );
    }

    get collateralToken(): Token {
        return this._collateral;
    }

    get contract(): Contract {
        return new Contract(this.address, TrancheAbi);
    }

    redeemValue(amount: CurrencyAmount<Token>): CurrencyAmount<Token> {
        invariant(
            addressEquals(amount.currency.address, this.address),
            'Invalid tranche amount',
        );
        return CurrencyAmount.fromRawAmount(
            this._collateral,
            this.totalCollateral
                .mul(toBaseUnits(amount))
                .div(this.totalSupply)
                .toString(),
        );
    }
}
