import RaydiumSwap from "./RaydiumSwap";
const getTokenPrice = async (swapConfig: {
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
  console.log(`Raydium  initialized`);
  await raydiumSwap.loadPoolKeys(swapConfig.liquidityFile);
  console.log(`Loaded pool keys`);

  const price = await raydiumSwap.getTokenPrice(
    swapConfig.tokenAAddress,
    swapConfig.tokenBAddress
  );

  return price;
};
export default getTokenPrice;
