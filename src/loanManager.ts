import invariant from 'tiny-invariant';
import { Bond } from './entities/bond';
import { Pool } from '@uniswap/v3-sdk';
import { CurrencyAmount, Price, Token } from '@uniswap/sdk-core';
import { addressEquals, containsAddress } from './utils';

export interface BorrowOutput {
    trancheTokens: CurrencyAmount<Token>[];
    currencyOutput: CurrencyAmount<Token>;
}

export class LoanManager {
    public currency!: Token;

    constructor(public bond: Bond, public pools: Pool[]) {
        invariant(pools.length === bond.tranches.length, 'Invalid pools');
        invariant(pools.length > 0, 'No pools');

        for (let i = 0; i < pools.length; i++) {
            const pool = pools[i];
            const tranche = bond.tranches[i];
            invariant(
                containsAddress(
                    [pool.token0.address, pool.token1.address],
                    tranche.address,
                ),
                'Invalid pools',
            );

            this.currency = addressEquals(pool.token0.address, tranche.address)
                ? pool.token1
                : pool.token0;
        }
    }

    getTranchePrice(trancheIndex: number): Price<Token, Token> {
        const pool = this.pools[trancheIndex];
        return this.bond.tranches[trancheIndex].address === pool.token0.address
            ? pool.token0Price
            : pool.token1Price;
    }

    /**
     * Get the output from borrowing all tranche tokens from A-Y.
     * Mocks a deposit of the collateral into tranche, selling all tranches other than Z, and returning the result to the user
     * @param collateralAmount The amount of collateral to deposit
     * @returns BorrowOutput The amount of tranche tokens and currency returned to the user
     */
    async borrowMax(
        collateralAmount: CurrencyAmount<Token>,
    ): Promise<BorrowOutput> {
        const trancheAmounts: CurrencyAmount<Token>[] =
            this.bond.deposit(collateralAmount);
        let currencyOutput = CurrencyAmount.fromRawAmount(this.currency, 0);
        const trancheTokens: CurrencyAmount<Token>[] = [];
        for (let i = 0; i < trancheAmounts.length - 1; i++) {
            currencyOutput = currencyOutput.add(
                (await this.pools[i].getOutputAmount(trancheAmounts[i]))[0],
            );
            trancheTokens.push(
                CurrencyAmount.fromRawAmount(trancheAmounts[i].currency, 0),
            );
        }
        trancheTokens.push(trancheAmounts[trancheAmounts.length - 1]);

        return {
            trancheTokens,
            currencyOutput,
        };
    }

    /**
     * Get the output from borrowing all tranche tokens from A-Y.
     * Mocks a deposit of the collateral into tranche, selling all tranches other than Z, and returning the result to the user
     * @param collateralAmount The amount of collateral to deposit
     * @returns BorrowOutput The amount of tranche tokens and currency returned to the user
     */
    async borrow(
        collateralAmount: CurrencyAmount<Token>,
        sales: CurrencyAmount<Token>[],
    ): Promise<BorrowOutput> {
        const trancheAmounts: CurrencyAmount<Token>[] =
            this.bond.deposit(collateralAmount);
        let currencyOutput = CurrencyAmount.fromRawAmount(this.currency, 0);
        const trancheTokens: CurrencyAmount<Token>[] = [];
        for (let i = 0; i < trancheAmounts.length - 1; i++) {
            invariant(
                sales[i].lessThan(trancheAmounts[i]) ||
                    sales[i].equalTo(trancheAmounts[i]),
                'Invalid sale',
            );
            currencyOutput = currencyOutput.add(
                (await this.pools[i].getOutputAmount(sales[i]))[0],
            );
            trancheTokens.push(trancheAmounts[i].subtract(sales[i]));
        }
        trancheTokens.push(trancheAmounts[trancheAmounts.length - 1]);

        return {
            trancheTokens,
            currencyOutput,
        };
    }
}
