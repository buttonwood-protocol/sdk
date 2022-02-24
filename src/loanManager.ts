import invariant from 'tiny-invariant';
import { BigNumber, constants, ethers } from 'ethers';
import { Bond } from './entities/bond';
import { CurrencyAmount, Percent, Price, Token } from '@uniswap/sdk-core';
import { addressEquals, containsAddress } from './utils';
import { Amm } from './entities/amm';

export interface BorrowOutput {
    trancheTokens: CurrencyAmount<Token>[];
    currencyOutput: CurrencyAmount<Token>;
}

export interface BorrowInput {
    amount: CurrencyAmount<Token>;
    bond: string;
    currency: string;
    sales: CurrencyAmount<Token>[];
}

export interface GetSalesOptions {
    // true if we should format sales for contract input
    contractInput: boolean;
}

export class LoanManager {
    public currency!: Token;

    constructor(public bond: Bond, public pools: Amm[]) {
        // note we dont need pool for Z tranche
        invariant(pools.length === bond.tranches.length - 1, 'Invalid pools');
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
     * Get the total discount when selling the given tranche tokens
     * @param sales The number of tranche tokens to sell, maybe output from `getSales`
     * @return discount The discount at which the user is getting currency from tranches
     */
    async getDiscount(sales: CurrencyAmount<Token>[]): Promise<Percent> {
        let totalAmountIn = BigNumber.from(0);
        let totalAmountOut = BigNumber.from(0);
        for (let i = 0; i < this.pools.length; i++) {
            const sale = sales[i];
            const pool = this.pools[i];
            const amountOut = (await pool.getOutputAmount(sale))[0];
            totalAmountOut = totalAmountOut.add(amountOut.quotient.toString());
            totalAmountIn = totalAmountIn.add(sale.quotient.toString());
        }
        if (this.currency.decimals < this.bond.collateral.decimals) {
            totalAmountOut = totalAmountOut.mul(
                BigNumber.from(10).pow(
                    this.bond.collateral.decimals - this.currency.decimals,
                ),
            );
        } else if (this.currency.decimals > this.bond.collateral.decimals) {
            totalAmountIn = totalAmountIn.mul(
                BigNumber.from(10).pow(
                    this.currency.decimals - this.bond.collateral.decimals,
                ),
            );
        }

        invariant(totalAmountOut.gt(0), 'No output');

        return new Percent(
            totalAmountIn.sub(totalAmountOut).toString(),
            totalAmountOut.toString(),
        );
    }

    /**
     * Get the total APY a lender is expected to earn on a given deposit
     * @param deposit The amount of currency the lender is depositing
     * @param trancheIndex The tranche that the lender is buying
     * @return Interest The raw amount of interest in percentage terms the lender will earn
     */
    async getLenderInterest(
        deposit: CurrencyAmount<Token>,
        trancheIndex: number,
    ): Promise<Percent> {
        const pool = this.pools[trancheIndex];

        // lender buys tranche tokens with cash
        let expectedOutput = BigNumber.from(
            (await pool.getOutputAmount(deposit))[0].quotient.toString(),
        );
        let depositValue = BigNumber.from(deposit.quotient.toString());

        if (this.currency.decimals < this.bond.collateral.decimals) {
            depositValue = depositValue.mul(
                BigNumber.from(10).pow(
                    this.bond.collateral.decimals - this.currency.decimals,
                ),
            );
        } else if (this.currency.decimals > this.bond.collateral.decimals) {
            expectedOutput = expectedOutput.mul(
                BigNumber.from(10).pow(
                    this.currency.decimals - this.bond.collateral.decimals,
                ),
            );
        }

        // assuming tranche tokens can be sold for $1 later, how much USD will we make
        const expectedProfitUSD = expectedOutput.sub(depositValue);
        return new Percent(
            expectedProfitUSD.toString(),
            depositValue.toString(),
        );
    }

    /**
     * Get the sales required to get the desired output tokens with the given deposit size
     * Tries to minimize discount by selling lower tranches first
     * @param desiredOutput The amount of output currency expected
     * @param deposit The amount of collateral to deposit
     * @param options getSales options
     * @return sales Tranche by tranche the number of tranche tokens that need to be sold
     */
    async getSales(
        desiredOutput: CurrencyAmount<Token>,
        deposit: CurrencyAmount<Token>,
        { contractInput }: GetSalesOptions = { contractInput: false },
    ): Promise<CurrencyAmount<Token>[]> {
        invariant(
            addressEquals(
                desiredOutput.currency.address,
                this.currency.address,
            ),
            'Invalid output currency',
        );

        invariant(
            addressEquals(
                deposit.currency.address,
                this.bond.collateral.address,
            ),
            'Invalid deposit currency',
        );
        const trancheTokens = this.bond.deposit(deposit);

        const sales: CurrencyAmount<Token>[] = [];
        let runningOutput = CurrencyAmount.fromRawAmount(
            desiredOutput.currency,
            0,
        );
        for (let i = 0; i < this.pools.length; i++) {
            const tranche = this.bond.tranches[i];
            const trancheAmount = trancheTokens[i];

            const pool = this.pools[i];

            if (
                runningOutput.greaterThan(desiredOutput) ||
                runningOutput.equalTo(desiredOutput)
            ) {
                sales.push(CurrencyAmount.fromRawAmount(tranche.token, 0));
            } else {
                const maxOutput = (
                    await pool.getOutputAmount(trancheAmount)
                )[0];

                if (runningOutput.add(maxOutput).lessThan(desiredOutput)) {
                    runningOutput = runningOutput.add(maxOutput);
                    if (contractInput) {
                        sales.push(
                            CurrencyAmount.fromRawAmount(
                                tranche.token,
                                constants.MaxUint256.toString(),
                            ),
                        );
                    } else {
                        sales.push(trancheAmount);
                    }
                } else {
                    const input = (
                        await pool.getInputAmount(
                            desiredOutput.subtract(runningOutput),
                        )
                    )[0];
                    sales.push(input);
                    runningOutput = desiredOutput;
                }
            }
        }

        // contract input expects empties for non-sold tokens
        if (contractInput) {
            for (let i = sales.length; i < this.bond.tranches.length; i++) {
                sales.push(
                    CurrencyAmount.fromRawAmount(
                        this.bond.tranches[i].token,
                        0,
                    ),
                );
            }
        }

        invariant(
            runningOutput.greaterThan(desiredOutput) ||
                runningOutput.equalTo(desiredOutput),
            'Insufficient deposit',
        );

        return sales;
    }

    /**
     * Get the maximum required deposit to get the desired amount of output currency
     * Note this calculates the required deposit by only selling A tranches for the minimum discount
     * In other words, this is the maximum collateralization for the given output - using a higher
     * collateralization has no benefit for the user.
     * A user may use a lower collateralization, but will suffer higher discount rates
     */
    async getMaximumRequiredDeposit(
        desiredOutput: CurrencyAmount<Token>,
    ): Promise<CurrencyAmount<Token>> {
        invariant(
            addressEquals(
                desiredOutput.currency.address,
                this.currency.address,
            ),
            'Invalid output currency',
        );

        const aTrancheIn = (
            await this.pools[0].getInputAmount(desiredOutput)
        )[0];
        const deposit = this.bond.getRequiredDeposit(aTrancheIn);
        const output = (await this.borrowMax(deposit)).currencyOutput;

        invariant(
            output.greaterThan(desiredOutput) || output.equalTo(desiredOutput),
            'Insufficient liquidity',
        );

        return this.bond.getRequiredDeposit(aTrancheIn);
    }

    /**
     * Get the minimum required deposit to get the desired amount of output currency
     * Note this calculates the required deposit by selling all tranches except Z
     * In other words, this is the minimum collateralization for the given output - using a higher
     * collateralization would not be able to achieve the desired output amount.
     * A user may use a higher collateralization for lower discount rate
     */
    async getMinimumRequiredDeposit(
        desiredOutput: CurrencyAmount<Token>,
    ): Promise<CurrencyAmount<Token>> {
        invariant(
            addressEquals(
                desiredOutput.currency.address,
                this.currency.address,
            ),
            'Invalid output currency',
        );

        // binary search for proper minimum
        // there isn't a good constant time way to find this value
        // due to the complexities of varying tick liquidity
        // across A and B tranche pools
        const absoluteMax = await this.getMaximumRequiredDeposit(desiredOutput);
        let max = absoluteMax;
        let min = CurrencyAmount.fromRawAmount(absoluteMax.currency, 0);
        const oneUnit = ethers.utils.parseUnits('1', max.currency.decimals);
        // try to get within one unit of the actual minimum
        // stop after 10 binary search loops
        let runs = 0;
        while (max.subtract(min).greaterThan(oneUnit.toString()) && runs < 10) {
            const mid = min.add(max.subtract(min).divide(2));
            const output = (await this.borrowMax(mid)).currencyOutput;
            runs += 1;

            if (output.lessThan(desiredOutput)) {
                min = mid;
            } else {
                max = mid;
            }
        }

        return max;
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
