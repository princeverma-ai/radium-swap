import RaydiumSwap from "./RaydiumSwap";

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

  const quote = await raydiumSwap.getQuote(
    swapConfig.tokenAAddress,
    swapConfig.tokenBAddress,
    swapConfig.tokenAAmount,
    swapConfig.direction
  );

  return quote;
};

export default swap;
