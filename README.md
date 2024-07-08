<p>
 <h3 align="center">Radium Swap<h3>
</p>

# Raydium SDK Swap Example

This project demonstrates how to perform a token swap on the Solana blockchain using Raydium and Chainstack. The example specifically illustrates swapping SOL (native Solana token) for USDC (a stablecoin).

## Features

- Utilizes the Raydium SDK for interacting with the Solana blockchain.
- Supports both versioned and legacy transactions.
- Allows simulation of swap transactions before execution.
- Easy configuration for swap parameters through a dedicated config file.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js installed (v18 or above recommended)
- Yarn
- A Solana wallet with some SOL for testing the swap
- An environment file (.env)

## Usage

Edit the configuration in `src/index.ts` editing:

- Select if you want to send the transaction or only simulate
- The amount to swap
- The tokens to swap
- The liquidity file to pull the pool info from

