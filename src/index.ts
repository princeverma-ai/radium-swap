import express from "express";
import "dotenv/config";

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
  useVersionedTransaction: true,
  tokenAAmount: 0.01, // Swap 0.01 SOL for USDT in this example
  tokenAAddress: "So11111111111111111111111111111111111111112", // Token to swap for the other, SOL in this case
  tokenBAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC address
  maxLamports: 1500000, // Micro lamports for priority fee
  direction: "out" as "in" | "out", // Swap direction: 'in' or 'out'
  liquidityFile: "https://api.raydium.io/v2/sdk/liquidity/mainnet.json",
  maxRetries: 20,
};

app.post("/swap", async (req, res) => {
  try {
    const swapConfig = {
      ...defaultSwapConfig,
      ...req.body,
    };
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

app.post("/quote", async (req, res) => {
  try {
    const swapConfig = {
      ...defaultSwapConfig,
      ...req.body,
    };

    const quoteResult = await quote(swapConfig);

    res.status(200).send({
      quoteResult,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error getting quote",
    });
  }
});

app.post("/price", async (req, res) => {
  try {
    const swapConfig = {
      ...defaultSwapConfig,
      ...req.body,
    };
    const priceResult = await getTokenPrice(swapConfig);

    res.status(200).send({
      priceResult,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error getting prices",
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
