import invariant from 'tiny-invariant';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { Amm } from './entities/amm';
import { LoanManager } from './loanManager';

export interface LeverageOutput {
    collateralOutput: CurrencyAmount<Token>;
    zTrancheOutput: CurrencyAmount<Token>;
}

export class LeverageManager {
    constructor(
        public readonly loanManager: LoanManager,
        public readonly swapBackPairs: Amm[],
    ) {}

    /**
     * Get the output from levering the collateral with the given parameters
     * @param collateralAmount The amount of collateral to deposit
     * @param iterations The number of times to borrowMax
     * @returns LeverOutput The amount of tranche tokens and currency returned to the user
     */
    async lever(
        collateralAmount: CurrencyAmount<Token>,
        iterations: number,
    ): Promise<LeverageOutput> {
        invariant(
            collateralAmount.currency.equals(this.loanManager.bond.collateral),
            'Invalid collateral',
        );

        let amms = this.swapBackPairs;
        let zTrancheOutput = CurrencyAmount.fromRawAmount(
            this.loanManager.bond.tranches[
                this.loanManager.bond.tranches.length - 1
            ].token,
            0,
        );
        let collateralBalance = collateralAmount;
        for (let i = 0; i < iterations; i++) {
            const { trancheTokens, currencyOutput } =
                await this.loanManager.borrowMax(collateralBalance);
            zTrancheOutput = zTrancheOutput.add(
                trancheTokens[this.loanManager.bond.tranches.length - 1],
            );

            const [collateralOut, newAmms] = await this.swapBack(
                currencyOutput,
                amms,
            );
            amms = newAmms;
            collateralBalance = collateralOut;
        }

        return {
            zTrancheOutput,
            collateralOutput: collateralBalance,
        };
    }

    /**
     * Get the output from swapping the given amount of currency back for collateral
     * @param currencyAmount The amount of currency to swap
     * @param amms The path of AMMS to swap through
     * @return CollateralAmount The amount of collateral returned
     * @return Amm[] The amms after swaps have occurred
     */
    private async swapBack(
        currencyAmount: CurrencyAmount<Token>,
        amms: Amm[],
    ): Promise<[CurrencyAmount<Token>, Amm[]]> {
        let currentAmount = currencyAmount;
        const newAmms: Amm[] = [];
        for (const amm of amms) {
            const [newCurrentAmount, newAmm] = await amm.getOutputAmount(
                currentAmount,
            );
            currentAmount = newCurrentAmount;
            newAmms.push(newAmm);
        }

        return [currentAmount, newAmms];
    }
}
