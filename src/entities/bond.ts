import invariant from 'tiny-invariant';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { BigNumber, BigNumberish } from 'ethers';
import { toBaseUnits } from '../utils';
import { Tranche } from './tranche';

const TRANCHE_RATIO_GRANULARITY = 1000;

export interface TrancheData {
    id: string;
    ratio: number;
    totalCollateral: BigNumberish;
    token: TokenData;
}

export interface TokenData {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
    totalSupply: BigNumberish;
}

export interface BondData {
    id: string;
    collateral: TokenData;
    tranches: TrancheData[];
    mature: boolean;
    totalDebt: BigNumberish;
    totalCollateral: BigNumberish;
}

export class Bond {
    public collateral: Token;
    public tranches: Tranche[] = [];

    constructor(private data: BondData) {
        this.collateral = new Token(
            1,
            data.collateral.id,
            data.collateral.decimals,
            data.collateral.symbol,
            data.collateral.name,
        );

        for (const tranche of this.data.tranches) {
            this.tranches.push(new Tranche(tranche, this.collateral));
        }
    }

    get address(): string {
        return this.data.id;
    }

    get totalDebt(): BigNumber {
        return BigNumber.from(this.data.totalDebt);
    }

    get totalCollateral(): BigNumber {
        return BigNumber.from(this.data.totalCollateral);
    }

    get dcr(): BigNumber {
        return this.totalDebt.div(this.totalCollateral);
    }

    get mature(): boolean {
        return this.data.mature;
    }

    /**
     * Given a certain amount of deposited collateral, return the tranche tokens that will be minted
     * @param collateralInput the amount of collateral to input into the bond
     * @return output The amount of tranche tokens in order that will be received for the input
     */
    deposit(collateralInput: CurrencyAmount<Token>): CurrencyAmount<Token>[] {
        invariant(
            collateralInput.currency.equals(this.collateral),
            'Invalid input currency - not bond collateral',
        );

        const input = toBaseUnits(collateralInput);
        const result: CurrencyAmount<Token>[] = [];

        for (const tranche of this.tranches) {
            const trancheToken = tranche.token;
            if (BigNumber.from(this.totalCollateral).eq(0)) {
                result.push(CurrencyAmount.fromRawAmount(trancheToken, '0'));
            } else {
                // Multiply input by the tranche ratio and by the debt:collateral ratio
                const outputAmount = input
                    .mul(tranche.ratio)
                    .mul(this.totalDebt)
                    .div(TRANCHE_RATIO_GRANULARITY)
                    .div(this.totalCollateral);
                result.push(
                    CurrencyAmount.fromRawAmount(
                        trancheToken,
                        outputAmount.toString(),
                    ),
                );
            }
        }
        return result;
    }

    /**
     * Given an amount of a single tranche token, return the amount of collateral returned by redeeming after maturity
     * @param amount The amount of the tranche token to redeem
     * @return output The amount of collateral returned
     */
    redeemMature(trancheAmount: CurrencyAmount<Token>): CurrencyAmount<Token> {
        invariant(this.mature, 'Bond is not mature');

        let tranche: Tranche | undefined = undefined;
        for (const t of this.tranches) {
            if (t.address === trancheAmount.currency.address) {
                tranche = t;
            }
        }
        invariant(tranche, 'Invalid tranche for bond');

        return CurrencyAmount.fromRawAmount(
            this.collateral,
            BigNumber.from(tranche.totalCollateral)
                .mul(toBaseUnits(trancheAmount))
                .div(tranche.totalSupply)
                .toString(),
        );
    }

    /**
     * Given a amounts of redeemed tranche tokens, return the amount of collateral that will be returned
     * @param trancheInputs the amounts of tranche tokens to redeem in order of tranche seniority
     * @return output The amount of collateral that will be returned
     */
    redeem(trancheInputs: CurrencyAmount<Token>[]): CurrencyAmount<Token> {
        let totalDebtRedeemed = BigNumber.from(0);
        for (const trancheInput of trancheInputs) {
            totalDebtRedeemed = totalDebtRedeemed.add(
                toBaseUnits(trancheInput),
            );
        }
        return CurrencyAmount.fromRawAmount(
            this.collateral,
            totalDebtRedeemed
                .mul(this.totalCollateral)
                .div(this.totalDebt)
                .toString(),
        );
    }
}
