const axios = require('axios');
const Web3 = require('web3');
const erc20ABI = require('erc-20-abi');
const BN = require('bn.js');
const numberToBN = require('number-to-bn');
const { Table } = require('console-table-printer');

const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
const zero = new BN(0);
const negative1 = new BN(-1);
const API_KEY=process.env.SNOWTRACE_API_KEY;

async function getErc20Tokens(walletAddress) {
  const url = `https://api.snowtrace.io/api?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=999999999&sort=asc&apikey=${API_KEY}`;

  try {
    const response = await axios.get(url);
    const transactions = response.data.result;

    const tokenMap = new Map();

    for (const tx of transactions) {
      const tokenDetails = {
        tokenName: tx.tokenName,
        tokenSymbol: tx.tokenSymbol,
        contractAddress: tx.contractAddress,
      };
      tokenMap.set(tx.contractAddress.toLowerCase(), tokenDetails);
    }

    return Array.from(tokenMap.values());
  } catch (error) {
    console.error('Error fetching ERC-20 token transactions:', error.message);
    return [];
  }
}

/*
 * Couldn't use web3.utils.fromWei because web3.utils.unitMap was missing 100000000
 * Used by token MNEAV(0xf9d922c055a3f1759299467dafafdf43be844f7a)
 * Function modified from https://github.com/ethjs/ethjs-unit/blob/master/src/index.js#L83
 */
function fromWei(weiInput, decimals, optionsInput) {
  var wei = numberToBN(weiInput);
  var negative = wei.lt(zero);
  const base = numberToBN(decimals);
  const baseLength = decimals.toString().length - 1 || 1;
  const options = optionsInput || {};

  if (negative) {
    wei = wei.mul(negative1);
  }

  var fraction = wei.mod(base).toString(10);

  while (fraction.length < baseLength) {
    fraction = `0${fraction}`;
  }

  if (!options.pad) {
    fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1];
  }

  var whole = wei.div(base).toString(10);

  if (options.commify) {
    whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  var value = `${whole}${fraction == '0' ? '' : `.${fraction}`}`;

  if (negative) {
    value = `-${value}`;
  }

  return value;
}

async function getTokenDecimals(contractAddress) {
  const contract = new web3.eth.Contract(erc20ABI, contractAddress);
  let decimals = await contract.methods.decimals().call();
  return 10 ** decimals;
}

async function getTokenBalanceAtBlock(walletAddress, tokenContractAddress, blockNumber) {
  const tokenContract = new web3.eth.Contract(erc20ABI, tokenContractAddress);
  const balance = await tokenContract.methods.balanceOf(walletAddress).call({}, blockNumber);

  return balance;
}

function getHumanReadableTokenBalance(balanceWei, decimals) {
  if (decimals === undefined) {
    decimals = parseInt(web3.utils.unitMap.ether, 10);
  }

  const humanReadableBalance = fromWei(balanceWei, decimals);
  return humanReadableBalance;
}

(async () => {
  const walletAddress = process.argv[2];
  const blockNumberInput = process.argv[3];
  let blockNumber = blockNumberInput ? parseInt(blockNumberInput, 10) : undefined;

  if (!walletAddress) {
    console.error('Please provide a wallet address');
    process.exit(1);
  }

  console.log('running');
  if (!blockNumber) {
    blockNumber = await web3.eth.getBlockNumber();
  }

  console.log('Collecting values at block number:', blockNumber);

  const gasBalanceWei = await web3.eth.getBalance(walletAddress, blockNumber);

  const walletBalances = [
    {symbol: 'AVAX', address: '<gas token>', balance: getHumanReadableTokenBalance(gasBalanceWei)}
  ]

  const tokenList = await getErc20Tokens(walletAddress);

  for (const tokenInfo of tokenList) {
    const tokenSymbol = tokenInfo.tokenSymbol;
    const tokenContractAddress = tokenInfo.contractAddress;
    const balanceWei = await getTokenBalanceAtBlock(walletAddress, tokenContractAddress, blockNumber);
    const decimals = await getTokenDecimals(tokenContractAddress);
    walletBalances.push({
      symbol: tokenSymbol,
      address: tokenContractAddress,
      balance: getHumanReadableTokenBalance(balanceWei, decimals)
    });
  }

  const table = new Table({
    columns: [
      { name: 'symbol', title: 'Symbol', alignment: 'left' },
      { name: 'address', title: 'Address', alignment: 'left' },
      { name: 'balance', title: 'Balance', alignment: 'left' },
    ]
  });

  for (const balance of walletBalances) {
    table.addRow(balance);
  }
  table.printTable();
})();

