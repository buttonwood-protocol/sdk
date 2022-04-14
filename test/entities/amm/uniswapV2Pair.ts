import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { Pair } from '@uniswap/v2-sdk';
import { UniswapV2Pair } from '../../../src';

describe('UniswapV2Pair', () => {
    const token0 = new Token(
        1,
        '0x2d27301821b05265a3f26bf6ad10745028791524',
        18,
        'TEST',
        'test',
    );

    const token1 = new Token(
        1,
        '0x881d40237659c251811cec9c364ef91dc08d300c',
        18,
        'SQUANCH',
        'squanch',
    );

    it('instantiates with normal pair parameters', () => {
        const token0Amount = CurrencyAmount.fromRawAmount(token0, 500);
        const token1Amount = CurrencyAmount.fromRawAmount(token1, 500);
        const uniswapV2Pair = new UniswapV2Pair(token0Amount, token1Amount);
        const pair = new Pair(token0Amount, token1Amount);

        expect(uniswapV2Pair.token0.equals(pair.token0)).toBeTruthy();
        expect(uniswapV2Pair.token1.equals(pair.token1)).toBeTruthy();
    });

    it('properly fetches prices', () => {
        const token0Amount = CurrencyAmount.fromRawAmount(token0, 500);
        const token1Amount = CurrencyAmount.fromRawAmount(token1, 500);
        const uniswapV2Pair = new UniswapV2Pair(token0Amount, token1Amount);
        const pair = new Pair(token0Amount, token1Amount);

        expect(uniswapV2Pair.token0Price).toEqual(pair.token0Price);
        expect(uniswapV2Pair.token1Price).toEqual(pair.token1Price);
    });

    it('properly instantiates from pair', () => {
        const token0Amount = CurrencyAmount.fromRawAmount(token0, 500);
        const token1Amount = CurrencyAmount.fromRawAmount(token1, 500);
        const pair = new Pair(token0Amount, token1Amount);
        const uniswapV2Pair = UniswapV2Pair.fromPair(pair);

        expect(uniswapV2Pair.token0Price).toEqual(pair.token0Price);
        expect(uniswapV2Pair.token1Price).toEqual(pair.token1Price);
    });

    it('gets output amount', async () => {
        const token0Amount = CurrencyAmount.fromRawAmount(token0, 500);
        const token1Amount = CurrencyAmount.fromRawAmount(token1, 500);
        const pair = new Pair(token0Amount, token1Amount);
        const uniswapV2Pair = UniswapV2Pair.fromPair(pair);

        const amountIn = CurrencyAmount.fromRawAmount(token0, 5);
        expect(
            pair
                .getOutputAmount(amountIn)[0]
                .equalTo((await uniswapV2Pair.getOutputAmount(amountIn))[0]),
        ).toBeTruthy();
    });

    it('gets input amount', async () => {
        const token0Amount = CurrencyAmount.fromRawAmount(token0, 500);
        const token1Amount = CurrencyAmount.fromRawAmount(token1, 500);
        const pair = new Pair(token0Amount, token1Amount);
        const uniswapV2Pair = UniswapV2Pair.fromPair(pair);

        const amountOut = CurrencyAmount.fromRawAmount(token0, 5);
        expect(
            pair
                .getInputAmount(amountOut)[0]
                .equalTo((await uniswapV2Pair.getInputAmount(amountOut))[0]),
        ).toBeTruthy();
    });
});
