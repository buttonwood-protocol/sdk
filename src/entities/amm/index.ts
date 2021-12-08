import { CurrencyAmount, Price, Token } from '@uniswap/sdk-core';

export interface Amm {
    token0: Token;
    token1: Token;
    token0Price: Price<Token, Token>;
    token1Price: Price<Token, Token>;
    getOutputAmount(
        amountIn: CurrencyAmount<Token>,
    ): Promise<[CurrencyAmount<Token>, Amm]>;
    getInputAmount(
        amountOut: CurrencyAmount<Token>,
    ): Promise<[CurrencyAmount<Token>, Amm]>;
}

export * from './uniswapV2Pair';
