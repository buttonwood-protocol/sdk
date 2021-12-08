import { Amm } from '.';
import { Pair } from '@uniswap/v2-sdk';
import { CurrencyAmount, Price, Token } from '@uniswap/sdk-core';

/**
 * Wraps the Uniswap V2 Pair class to properly implement the Am interface
 */
export class UniswapV2Pair implements Amm {
    private pair: Pair;
    public token0: Token;
    public token1: Token;
    public token0Price: Price<Token, Token>;
    public token1Price: Price<Token, Token>;

    constructor(
        token0Amount: CurrencyAmount<Token>,
        token1Amount: CurrencyAmount<Token>,
    ) {
        this.pair = new Pair(token0Amount, token1Amount);
        this.token0 = this.pair.token0;
        this.token1 = this.pair.token1;
        this.token0Price = this.pair.token0Price;
        this.token1Price = this.pair.token1Price;
    }

    public static fromPair(pair: Pair): UniswapV2Pair {
        return new UniswapV2Pair(pair.reserve0, pair.reserve1);
    }

    public async getOutputAmount(
        inputAmount: CurrencyAmount<Token>,
    ): Promise<[CurrencyAmount<Token>, Amm]> {
        const [amount, pair] = this.pair.getOutputAmount(inputAmount);
        return [amount, UniswapV2Pair.fromPair(pair)];
    }

    public async getInputAmount(
        outputAmount: CurrencyAmount<Token>,
    ): Promise<[CurrencyAmount<Token>, Amm]> {
        const [amount, pair] = this.pair.getInputAmount(outputAmount);
        return [amount, UniswapV2Pair.fromPair(pair)];
    }
}
