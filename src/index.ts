import express from "express";
import "dotenv/config";
import fs from "fs";
import path from "path";
import swap from "./swap";
import quote from "./quote";
import getTokenPrice from "./price";
const app = express();

// ENV
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

const defaultSwapConfig = {
  simulateSwap: true, // Send tx when false, simulate tx when true
  useVersionedTransaction: false,
  tokenAAmount: 0.01, // Swap 0.01 SOL for USDT in this example
  tokenAAddress: "So11111111111111111111111111111111111111112", // Token to swap for the other, SOL in this case
  tokenBAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC address
  maxLamports: 1500000, // Micro lamports for priority fee
  direction: "out" as "in" | "out", // Swap direction: 'in' or 'out'
  liquidityFile: "https://api.raydium.io/v2/sdk/liquidity/mainnet.json",
  maxRetries: 20,
};

app.post("/api/v1/buy", async (req, res) => {
  try {
    const swapConfig = {
      ...defaultSwapConfig,
      ...req.body,
    };
    swapConfig.direction = "in";
    swapConfig.tokenBAddress = req.body.tokenAddress;
    swapConfig.tokenAAmount = req.body.solAmount;
    const swapResult = await swap(swapConfig);

    res.status(200).send({
      swapResult,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error swapping tokens",
    });
  }
});
app.post("/api/v1/sell", async (req, res) => {
  try {
    const swapConfig = {
      ...defaultSwapConfig,
      ...req.body,
    };

    swapConfig.direction = "out";
    swapConfig.tokenBAddress = req.body.tokenAddress;
    swapConfig.tokenAAmount = req.body.solAmount;
    const swapResult = await swap(swapConfig);

    res.status(200).send({
      swapResult,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error swapping tokens",
    });
  }
});

function formatAmount(amount) {
  const numerator = parseInt(amount.numerator, 16);
  const denominator = parseInt(amount.denominator, 16);
  const value = numerator / denominator;
  return `${value.toFixed(amount.currency.decimals)} `;
}

function formatPrice(price) {
  const numerator = parseInt(price.numerator, 16);
  const denominator = parseInt(price.denominator, 16);
  const value = numerator / denominator;
  return `${value.toFixed(price.baseCurrency.decimals)} `;
}

app.post("/api/v1/buy/quote", async (req, res) => {
  try {
    const swapConfig = {
      ...defaultSwapConfig,
      ...req.body,
    };
    swapConfig.direction = "in";
    swapConfig.tokenBAddress = req.body.tokenAddress;
    swapConfig.tokenAAmount = req.body.solAmount;
    const quoteResult = await quote(swapConfig);

    console.log(quoteResult);

    const amountIn = formatAmount(quoteResult.amountIn);
    const amountOut = formatAmount(quoteResult.amountOut);
    const minAmountOut = formatAmount(quoteResult.minAmountOut);
    const currentPrice = formatPrice(quoteResult.currentPrice);
    const executionPrice = formatPrice(quoteResult.executionPrice);
    const priceImpact = `${
      (parseInt(quoteResult.priceImpact.numerator, 16) /
        parseInt(quoteResult.priceImpact.denominator, 16)) *
      100
    }%`;
    const fee = formatAmount(quoteResult.fee);

    res.status(200).send({
      baseMint: swapConfig.tokenAAddress,
      quoteMint: swapConfig.tokenBAddress,
      baseAmount: swapConfig.tokenAAmount,
      amountIn,
      amountOut,
      minAmountOut,
      currentPrice,
      executionPrice,
      priceImpact,
      fee,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error getting quote",
    });
  }
});
app.post("/api/v1/sell/quote", async (req, res) => {
  try {
    const swapConfig = {
      ...defaultSwapConfig,
      ...req.body,
    };
    swapConfig.direction = "out";
    swapConfig.tokenBAddress = req.body.tokenAddress;
    swapConfig.tokenAAmount = req.body.solAmount;
    const quoteResult = await quote(swapConfig);
    console.log(quoteResult);

    const amountIn = formatAmount(quoteResult.amountIn);
    const amountOut = formatAmount(quoteResult.amountOut);
    const minAmountOut = formatAmount(quoteResult.minAmountOut);
    const currentPrice = formatPrice(quoteResult.currentPrice);
    const executionPrice = formatPrice(quoteResult.executionPrice);
    const priceImpact = `${
      (parseInt(quoteResult.priceImpact.numerator, 16) /
        parseInt(quoteResult.priceImpact.denominator, 16)) *
      100
    }%`;
    const fee = formatAmount(quoteResult.fee);

    res.status(200).send({
      baseMint: swapConfig.tokenAAddress,
      quoteMint: swapConfig.tokenBAddress,
      baseAmount: swapConfig.tokenAAmount,
      amountIn,
      amountOut,
      minAmountOut,
      currentPrice,
      executionPrice,
      priceImpact,
      fee,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error getting quote",
    });
  }
});
function formatPriceResult(priceResult) {
  const numerator = parseInt(priceResult.numerator, 16);
  const denominator = parseInt(priceResult.denominator, 16);
  const value = numerator / denominator;

  return {
    price: `${value.toFixed(priceResult.baseCurrency.decimals)}`,
    baseCurrency: {
      mint: priceResult.baseCurrency.mint,
      decimals: priceResult.baseCurrency.decimals,
    },
    quoteCurrency: {
      mint: priceResult.quoteCurrency.mint,
      decimals: priceResult.quoteCurrency.decimals,
    },
    scalar: {
      numerator: parseInt(priceResult.scalar.numerator, 16),
      denominator: parseInt(priceResult.scalar.denominator, 16),
    },
  };
}

app.post("/api/v1/price", async (req, res) => {
  try {
    const swapConfig = {
      ...defaultSwapConfig,
      ...req.body,
    };
    const priceResult = await getTokenPrice(swapConfig);
    const prices = formatPriceResult(priceResult);
    res.status(200).send({
      prices,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error getting prices",
    });
  }
});

app.delete("/api/v1/pool", async (req, res) => {
  //use fs module to delete the file
  const filePath = path.join(__dirname, "poolData", "liquidity_mainnet.json");

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting file:", err);
      return res.status(500).send({
        message: "Error deleting pool keys",
      });
    }
    console.log("File deleted successfully");
  });
  res.status(200).send({
    message: "Pool keys deleted",
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
