const chart = async (tokenAddress) => {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
};

export default chart;
