import invariant from 'tiny-invariant';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import BondAbi from '../../abis/BondController.json';
import { BigNumber, BigNumberish, Contract } from 'ethers';
import { addressEquals, toBaseUnits } from '../utils';
import { Tranche } from './tranche';

export const TRANCHE_RATIO_GRANULARITY = 1000;

export interface TrancheData {
    id: string;
    index: string;
    ratio: string;
    totalCollateral: BigNumberish;
    token: TokenData;
}

export interface TokenData {
    id: string;
    symbol: string;
    name: string;
    decimals: string;
    totalSupply: BigNumberish;
}

export interface BondData {
    id: string;
    maturityDate: BigNumberish;
    collateral: TokenData;
    tranches: TrancheData[];
    isMature: boolean;
    totalDebt: BigNumberish;
    totalCollateral: BigNumberish;
}

export class Bond {
    public collateral: Token;
    public tranches: Tranche[] = [];

    constructor(private data: BondData, chainId = 1) {
        invariant(data.tranches.length >= 2, 'Invalid tranches');
        this.collateral = new Token(
            chainId,
            data.collateral.id,
            parseInt(data.collateral.decimals, 10),
            data.collateral.symbol,
            data.collateral.name,
        );

        const sortedTranches = [...this.data.tranches].sort((a, b) =>
            a.index > b.index ? 1 : -1,
        );
        for (const tranche of sortedTranches) {
            this.tranches.push(new Tranche(tranche, this.collateral, chainId));
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
        return this.totalDebt.mul(100).div(this.totalCollateral);
    }

    get maturityDate(): BigNumber {
        return BigNumber.from(this.data.maturityDate);
    }

    get mature(): boolean {
        return this.data.isMature;
    }

    get contract(): Contract {
        return new Contract(this.address, BondAbi);
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
                result.push(
                    CurrencyAmount.fromRawAmount(
                        trancheToken,
                        input
                            .mul(tranche.ratio)
                            .div(TRANCHE_RATIO_GRANULARITY)
                            .toString(),
                    ),
                );
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
            if (addressEquals(t.address, trancheAmount.currency.address)) {
                tranche = t;
            }
        }
        invariant(tranche, 'Invalid input currency');
        invariant(
            trancheAmount.lessThan(tranche.totalCollateral.toString()) ||
                trancheAmount.equalTo(tranche.totalCollateral.toString()),
            'Insufficient collateral',
        );

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
        invariant(
            trancheInputs.length === this.tranches.length,
            'Invalid tranche inputs',
        );
        let totalDebtRedeemed = BigNumber.from(0);
        for (let i = 0; i < trancheInputs.length; i++) {
            const trancheInput = trancheInputs[i];
            const tranche = this.tranches[i];
            invariant(
                addressEquals(trancheInput.currency.address, tranche.address),
                'Invalid tranche inputs',
            );

            totalDebtRedeemed = totalDebtRedeemed.add(
                toBaseUnits(trancheInput),
            );
        }

        invariant(
            totalDebtRedeemed.lte(this.totalCollateral.toString()),
            'Insufficient collateral',
        );

        return CurrencyAmount.fromRawAmount(
            this.collateral,
            totalDebtRedeemed
                .mul(this.totalCollateral)
                .div(this.totalDebt)
                .toString(),
        );
    }

    /**
     * Given a certain amount of deposited collateral, return the tranche tokens that will be minted
     * @param collateralInput the amount of collateral to input into the bond
     * @return output The amount of tranche tokens in order that will be received for the input
     */
    getRequiredDeposit(
        desiredTrancheOutput: CurrencyAmount<Token>,
    ): CurrencyAmount<Token> {
        for (const tranche of this.tranches) {
            if (
                addressEquals(
                    tranche.address,
                    desiredTrancheOutput.currency.address,
                )
            ) {
                if (BigNumber.from(this.totalCollateral).eq(0)) {
                    return CurrencyAmount.fromRawAmount(
                        this.collateral,
                        toBaseUnits(desiredTrancheOutput)
                            .mul(TRANCHE_RATIO_GRANULARITY)
                            .div(tranche.ratio)
                            .toString(),
                    );
                } else {
                    return CurrencyAmount.fromRawAmount(
                        this.collateral,
                        toBaseUnits(desiredTrancheOutput)
                            .mul(TRANCHE_RATIO_GRANULARITY)
                            .mul(this.totalCollateral)
                            .div(tranche.ratio)
                            .div(this.totalDebt)
                            .toString(),
                    );
                }
            }
        }

        throw new Error('Invalid desired output - not a tranche token');
    }
}
