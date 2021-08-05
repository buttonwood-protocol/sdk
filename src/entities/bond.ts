import invariant from 'tiny-invariant';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { BigNumber, BigNumberish } from 'ethers';
import { toBaseUnits } from './amount';

const TRANCHE_RATIO_GRANULARITY = 1000;

export interface TrancheData {
    address: string;
    ratio: number;
    totalCollateral: BigNumberish;
    token: TokenData;
}

export interface TokenData {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    totalSupply: BigNumberish;
}

export interface BondData {
    address: string;
    collateral: TokenData;
    tranches: TrancheData[];
    mature: boolean;
    totalDebt: BigNumberish;
    totalCollateral: BigNumberish;
}

export class Bond {
    public collateral: Token;

    constructor(public data: BondData) {
        this.collateral = new Token(
            1,
            data.collateral.address,
            data.collateral.decimals,
            data.collateral.symbol,
            data.collateral.name,
        );
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

        for (const tranche of this.data.tranches) {
            const trancheToken = this.getTrancheToken(tranche);
            if (BigNumber.from(this.data.totalCollateral).eq(0)) {
                result.push(CurrencyAmount.fromRawAmount(trancheToken, '0'));
            } else {
                // Multiply input by the tranche ratio and by the debt:collateral ratio
                const outputAmount = input
                    .mul(tranche.ratio)
                    .mul(this.data.totalDebt)
                    .div(TRANCHE_RATIO_GRANULARITY)
                    .div(this.data.totalCollateral);
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
        invariant(this.data.mature, 'Bond is not mature');

        let tranche: TrancheData | undefined = undefined;
        for (const trancheData of this.data.tranches) {
            if (trancheData.address === trancheAmount.currency.address) {
                tranche = trancheData;
            }
        }
        invariant(tranche, 'Invalid tranche for bond');

        return CurrencyAmount.fromRawAmount(
            this.collateral,
            BigNumber.from(tranche.totalCollateral)
                .mul(toBaseUnits(trancheAmount))
                .div(tranche.token.totalSupply)
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
                .mul(this.data.totalCollateral)
                .div(this.data.totalDebt)
                .toString(),
        );
    }

    /**
     * Build a token object from the given tranche data
     */
    private getTrancheToken(tranche: TrancheData) {
        return new Token(1, tranche.address, this.data.collateral.decimals);
    }
}
