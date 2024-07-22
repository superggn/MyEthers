//1.连接到foundry本地网络

// import { ethers } from "ethers";

const ethers = require("ethers");

const anvil_rpc = "http://127.0.0.1:8545";
const sepolia_rpc =
  "wss://eth-sepolia.g.alchemy.com/v2/CkcrUboFNSh9RHdNm09Cud00Ns7_SxSR";
const provider = new ethers.WebSocketProvider(sepolia_rpc);

// chain info
let network = provider.getNetwork();
network.then((res) =>
  console.log(`[${new Date().toLocaleTimeString()}]链接到网络${res.chainId}`)
);

// 这里用的合约是 WTF Solidity 的 ERC721.sol
const contractABI = [
  "function mint() public",
  "function ownerOf(uint256) public view returns (address)",
  "function totalSupply() view returns (uint256)",
];
const contractAddress = "0x8464135c8F25Da09e49BC8782676a84730C318bC";
const contractFM = new ethers.Contract(contractAddress, contractABI, provider);

// get function selector
async function getMintFnSelector() {
  const iface = new ethers.Interface(contractABI);
  const fn_name = "mint";
  const mint_fn_selector = iface.getFunction(fn_name).selector;
  return mint_fn_selector;
}

mint_fn_selector = getMintFnSelector();

// non-frontrun
async function unlimited_normal(txHash) {
  console.log("normal monitor tx, no frontrun");
  try {
    provider.getTransaction(txHash).then(async (tx) => {
      //   console.log("tx:", tx);
      //   console.log("tx.data:", tx.data);
      console.log("tx.to:", tx.to);
      //   console.log("tx.data:", tx.data);
      console.log("txHash:", txHash);
      if (
        tx &&
        tx.data &&
        tx.to == contractAddress &&
        tx.data.indexOf(mint_fn_selector) !== -1
      ) {
        console.log(`[${new Date().toLocaleTimeString()}]监听到交易:${txHash}`);
        console.log(`铸造发起的地址是:${tx.from}`);
        await tx.wait();
        const tokenId = await contractFM.totalSupply();
        console.log(`mint的NFT编号:${tokenId}`);
        console.log(
          `编号${tokenId}NFT的持有者是${await contractFM.ownerOf(tokenId)}`
        );
        console.log(
          `铸造发起的地址是不是对应NFT的持有者:${
            tx.from === (await contractFM.ownerOf(tokenId))
          }`
        );
      }
    });
  } catch (currentError) {
    console.error("fetch tx error:", currentError, txHash);
    console.log("==================================================");
    await sleep(100);
    unlimited_normal(txHash);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function throttle(fn, delay) {
  let timer;
  return function () {
    if (!timer) {
      fn.apply(this, arguments);
      timer = setTimeout(() => {
        clearTimeout(timer);
        timer = null;
      }, delay);
    }
  };
}

// 发送抢跑的钱包
const privateKey = process.env.JS_PK;
const wallet = new ethers.Wallet(privateKey, provider);

//5. 构建正常mint函数，检验mint结果，显示正常。
const normaltx = async () => {
  provider.on("pending", throttle(unlimited_normal, 100));
};

async function unlimitedFrontrun(txHash) {
  try {
    const tx = await provider.getTransaction(txHash);
    // console.log("txHash", txHash);
    if (
      tx &&
      tx.data &&
      tx.to == contractAddress &&
      tx.data.indexOf(mint_fn_selector) !== -1 &&
      tx.from !== wallet.address
    ) {
      console.log(
        `[${new Date().toLocaleTimeString()}]监听到交易:${txHash}\n准备抢先交易`
      );
      const frontRunTx = {
        to: tx.to,
        value: tx.value,
        // V6版本 maxPriorityFeePerGas: tx.maxPriorityFeePerGas * 2n， 其他运算同理。
        // 参考https://docs.ethers.org/v6/migrating/#migrate-bigint
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas * 2n,
        maxFeePerGas: tx.maxFeePerGas * 2n,
        gasLimit: tx.gasLimit * 2n,
        data: tx.data,
      };
      const aimTokenId = (await contractFM.totalSupply()) + 1n;
      console.log(`即将被mint的NFT编号是:${aimTokenId}`); //打印应该被mint的nft编号
      const sentFR = await wallet.sendTransaction(frontRunTx);
      console.log(`正在frontrun交易`);
      const receipt = await sentFR.wait();
      console.log(`frontrun 交易成功,交易hash是:${receipt.transactionHash}`);
      console.log(`铸造发起的地址是:${tx.from}`);
      console.log(
        `编号${aimTokenId}NFT的持有者是${await contractFM.ownerOf(aimTokenId)}`
      ); //刚刚mint的nft持有者并不是tx.from
      console.log(
        `编号${aimTokenId + 1n}的NFT的持有者是:${await contractFM.ownerOf(
          aimTokenId + 1n
        )}`
      ); //tx.from被wallet.address抢跑，mint了下一个nft
      console.log(
        `铸造发起的地址是不是对应NFT的持有者:${
          tx.from === (await contractFM.ownerOf(aimTokenId))
        }`
      ); //比对地址，tx.from被抢跑
      //检验区块内数据结果
      const block = await provider.getBlock(tx.blockNumber);
      console.log(`区块内交易数据明细:${block.transactions}`); //在区块内，后发交易排在先发交易前，抢跑成功。
    }
  } catch (currentError) {
    console.error("fetch tx error:", currentError, txHash);
    console.log("==================================================");
    await sleep(100);
    unlimited_normal(txHash);
  }
}

//6.构建抢跑交易，检验mint结果，抢跑成功！
const frontRun = async () => {
  provider.on("pending", throttle(unlimitedFrontrun, 100));
};

frontRun();
// normaltx();
