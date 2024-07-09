import path from "path";
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";
import {
  Liquidity,
  LiquidityPoolKeys,
  jsonInfo2PoolKeys,
  LiquidityPoolJsonInfo,
  TokenAccount,
  Token,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  Percent,
  SPL_ACCOUNT_LAYOUT,
} from "@raydium-io/raydium-sdk";
import { Wallet } from "@coral-xyz/anchor";
import fs from "fs";

class RaydiumSwap {
  allPoolKeysJson: LiquidityPoolJsonInfo[];
  connection: Connection;
  wallet: Wallet;

  constructor(RPC_URL: string) {
    this.connection = new Connection(RPC_URL, { commitment: "confirmed" });
    const secretKey = Uint8Array.from(
      JSON.parse(fs.readFileSync(`./keyPair.json`) as unknown as string)
    );
    this.wallet = new Wallet(Keypair.fromSecretKey(secretKey));
  }

  async loadPoolKeys(liquidityFile: string) {
    const filePath = path.join(__dirname, "poolData", "liquidity_mainnet.json");

    let liquidityJson: any = { official: null, unOfficial: null };

    try {
      // Check if the file exists
      const fileExists = await fs.promises
        .access(filePath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);

      if (fileExists) {
        // Read the file if it exists
        const fileContent = await fs.promises.readFile(filePath, "utf-8");
        // Process the file content here
        liquidityJson = JSON.parse(fileContent);
        console.log("Using cached liquidity data.");
      } else {
        // Fetch the file if it doesn't exist
        const liquidityJsonResp = await fetch(liquidityFile);
        if (!liquidityJsonResp.ok) return;
        liquidityJson = await liquidityJsonResp.json();

        // Save the fetched data to the file
        fs.writeFile(filePath, JSON.stringify(liquidityJson), (err) => {
          if (err) {
            console.error("Error writing file:", err);
          } else {
            console.log("File written successfully.");
          }
        });
        console.log("Fetched and saved liquidity data.");
      }

      const allPoolKeysJson = [
        ...(liquidityJson?.official ?? []),
        ...(liquidityJson?.unOfficial ?? []),
      ];

      this.allPoolKeysJson = allPoolKeysJson;
    } catch (error) {
      console.error("Error loading pool keys:", error);
    }
  }

  findPoolInfoForTokens(mintA: string, mintB: string) {
    const poolData = this.allPoolKeysJson.find(
      (i) =>
        (i.baseMint === mintA && i.quoteMint === mintB) ||
        (i.baseMint === mintB && i.quoteMint === mintA)
    );

    if (!poolData) return null;

    return jsonInfo2PoolKeys(poolData) as LiquidityPoolKeys;
  }

  async getOwnerTokenAccounts() {
    const walletTokenAccount = await this.connection.getTokenAccountsByOwner(
      this.wallet.publicKey,
      {
        programId: TOKEN_PROGRAM_ID,
      }
    );

    return walletTokenAccount.value.map((i) => ({
      pubkey: i.pubkey,
      programId: i.account.owner,
      accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
    }));
  }

  async getSwapTransaction(
    toToken: string,
    // fromToken: string,
    amount: number,
    poolKeys: LiquidityPoolKeys,
    maxLamports: number = 100000,
    useVersionedTransaction = true,
    fixedSide: "in" | "out" = "in"
  ): Promise<Transaction | VersionedTransaction> {
    const directionIn = poolKeys.quoteMint.toString() == toToken;
    const { minAmountOut, amountIn } = await this.calcAmountOut(
      poolKeys,
      amount,
      directionIn
    );
    console.log({ minAmountOut, amountIn });
    const userTokenAccounts = await this.getOwnerTokenAccounts();
    const swapTransaction = await Liquidity.makeSwapInstructionSimple({
      connection: this.connection,
      makeTxVersion: useVersionedTransaction ? 0 : 1,
      poolKeys: {
        ...poolKeys,
      },
      userKeys: {
        tokenAccounts: userTokenAccounts,
        owner: this.wallet.publicKey,
      },
      amountIn: amountIn,
      amountOut: minAmountOut,
      fixedSide: fixedSide,
      config: {
        bypassAssociatedCheck: false,
      },
      computeBudgetConfig: {
        microLamports: maxLamports,
      },
    });

    const recentBlockhashForSwap = await this.connection.getLatestBlockhash();
    const instructions =
      swapTransaction.innerTransactions[0].instructions.filter(Boolean);

    if (useVersionedTransaction) {
      const versionedTransaction = new VersionedTransaction(
        new TransactionMessage({
          payerKey: this.wallet.publicKey,
          recentBlockhash: recentBlockhashForSwap.blockhash,
          instructions: instructions,
        }).compileToV0Message()
      );

      versionedTransaction.sign([this.wallet.payer]);

      return versionedTransaction;
    }

    const legacyTransaction = new Transaction({
      blockhash: recentBlockhashForSwap.blockhash,
      lastValidBlockHeight: recentBlockhashForSwap.lastValidBlockHeight,
      feePayer: this.wallet.publicKey,
    });

    legacyTransaction.add(...instructions);

    return legacyTransaction;
  }

  async sendLegacyTransaction(tx: Transaction, maxRetries?: number) {
    const txid = await this.connection.sendTransaction(
      tx,
      [this.wallet.payer],
      {
        skipPreflight: true,
        maxRetries: maxRetries,
      }
    );

    return txid;
  }

  async sendVersionedTransaction(
    tx: VersionedTransaction,
    maxRetries?: number
  ) {
    const txid = await this.connection.sendTransaction(tx, {
      skipPreflight: true,
      maxRetries: maxRetries,
    });

    return txid;
  }

  async simulateLegacyTransaction(tx: Transaction) {
    const txid = await this.connection.simulateTransaction(tx, [
      this.wallet.payer,
    ]);

    return txid;
  }

  async simulateVersionedTransaction(tx: VersionedTransaction) {
    const txid = await this.connection.simulateTransaction(tx);

    return txid;
  }

  getTokenAccountByOwnerAndMint(mint: PublicKey) {
    return {
      programId: TOKEN_PROGRAM_ID,
      pubkey: PublicKey.default,
      accountInfo: {
        mint: mint,
        amount: 0,
      },
    } as unknown as TokenAccount;
  }

  async calcAmountOut(
    poolKeys: LiquidityPoolKeys,
    rawAmountIn: number,
    swapInDirection: boolean
  ) {
    const poolInfo = await Liquidity.fetchInfo({
      connection: this.connection,
      poolKeys,
    });

    let currencyInMint = poolKeys.baseMint;
    let currencyInDecimals = poolInfo.baseDecimals;
    let currencyOutMint = poolKeys.quoteMint;
    let currencyOutDecimals = poolInfo.quoteDecimals;

    if (!swapInDirection) {
      currencyInMint = poolKeys.quoteMint;
      currencyInDecimals = poolInfo.quoteDecimals;
      currencyOutMint = poolKeys.baseMint;
      currencyOutDecimals = poolInfo.baseDecimals;
    }

    const currencyIn = new Token(
      TOKEN_PROGRAM_ID,
      currencyInMint,
      currencyInDecimals
    );
    const amountIn = new TokenAmount(currencyIn, rawAmountIn, false);
    const currencyOut = new Token(
      TOKEN_PROGRAM_ID,
      currencyOutMint,
      currencyOutDecimals
    );
    const slippage = new Percent(5, 100); // 5% slippage

    const {
      amountOut,
      minAmountOut,
      currentPrice,
      executionPrice,
      priceImpact,
      fee,
    } = Liquidity.computeAmountOut({
      poolKeys,
      poolInfo,
      amountIn,
      currencyOut,
      slippage,
    });

    return {
      amountIn,
      amountOut,
      minAmountOut,
      currentPrice,
      executionPrice,
      priceImpact,
      fee,
    };
  }

  async getQuote(
    mintA: string,
    mintB: string,
    amount: number,
    direction: "in" | "out"
  ) {
    const poolKeys = this.findPoolInfoForTokens(mintA, mintB);
    if (!poolKeys) throw new Error("Pool not found for given tokens.");

    const swapInDirection = direction === "in";
    const quote = await this.calcAmountOut(poolKeys, amount, swapInDirection);
    return quote;
  }

  async getTokenPrice(mintA: string, mintB: string) {
    const poolKeys = this.findPoolInfoForTokens(mintA, mintB);
    if (!poolKeys) throw new Error("Pool not found for given tokens.");

    const quote = await this.calcAmountOut(poolKeys, 1, true); // Using 1 unit for calculation
    return quote.currentPrice;
  }
}

export default RaydiumSwap;
