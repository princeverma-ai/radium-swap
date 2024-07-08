import RaydiumSwap from "./RaydiumSwap";
import { Transaction, VersionedTransaction } from "@solana/web3.js";

const swap = async (swapConfig: {
  tokenAAmount: number;
  tokenAAddress: string;
  tokenBAddress: string;
  liquidityFile: string;
  maxLamports: number;
  useVersionedTransaction: boolean;
  direction: "in" | "out";
  simulateSwap: boolean;
  maxRetries: number;
}) => {
  const raydiumSwap = new RaydiumSwap(process.env.RPC_URL);
  console.log(`Raydium swap initialized`);
  console.log(
    `Swapping ${swapConfig.tokenAAmount} of ${swapConfig.tokenAAddress} for ${swapConfig.tokenBAddress}...`
  );

  await raydiumSwap.loadPoolKeys(swapConfig.liquidityFile);
  console.log(`Loaded pool keys`);

  const poolInfo = raydiumSwap.findPoolInfoForTokens(
    swapConfig.tokenAAddress,
    swapConfig.tokenBAddress
  );
  if (!poolInfo) {
    console.error("Pool info not found");
    return "Pool info not found";
  } else {
    console.log("Found pool info");
  }

  const tx = await raydiumSwap.getSwapTransaction(
    swapConfig.tokenBAddress,
    swapConfig.tokenAAmount,
    poolInfo,
    swapConfig.maxLamports,
    swapConfig.useVersionedTransaction,
    swapConfig.direction
  );

  console.log(tx);

  if (swapConfig.simulateSwap) {
    const simRes = swapConfig.useVersionedTransaction
      ? await raydiumSwap.simulateVersionedTransaction(
          tx as VersionedTransaction
        )
      : await raydiumSwap.simulateLegacyTransaction(tx as Transaction);

    return simRes;
  } else {
    const txid = swapConfig.useVersionedTransaction
      ? await raydiumSwap.sendVersionedTransaction(
          tx as VersionedTransaction,
          swapConfig.maxRetries
        )
      : await raydiumSwap.sendLegacyTransaction(
          tx as Transaction,
          swapConfig.maxRetries
        );

    return `https://solscan.io/tx/${txid}`;
  }
};

export default swap;
