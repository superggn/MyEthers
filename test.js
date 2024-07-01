// 利用Wallet类发送ETH
// 由于playcode不支持ethers.Wallet.createRandom()函数，我们只能用VScode运行这一讲代码
// import { ethers } from "ethers";

const { ethers } = require("ethers");
// 利用Alchemy的rpc节点连接以太坊测试网络
// 准备 alchemy API 可以参考https://github.com/AmazingAng/WTFSolidity/blob/main/Topics/Tools/TOOL04_Alchemy/readme.md
const ALCHEMY_SEPOLIA_URL =
  "https://eth-sepolia.g.alchemy.com/v2/L3Q6Wq4EjqlEk2W8qQdavHwh9Zuykv3-";
const provider = new ethers.JsonRpcProvider(ALCHEMY_SEPOLIA_URL);

// 创建随机的wallet对象

// 利用私钥和provider创建wallet对象
const privateKey =
  "0x227dbb8586117d55284e26620bc76534dfbd2394be34cf4a09cb775d593b6f2b";
// 0xe16C1623c1AA7D919cd2241d8b36d9E79C1Be2A2
const myWallet = new ethers.Wallet(privateKey, provider);

// 从助记词创建wallet对象

MyAddr = "TODO modify this";

const main = async () => {
  // 1. 获取钱包 addr + private key
  const addr = await myWallet.getAddress();
  console.log(`wallet addr: ${addr}`);
  console.log(`private key: ${myWallet.privateKey}`);
  // addr tx count
  const txCount = await provider.getTransactionCount(myWallet);
  console.log(`addr txCount: ${txCount}`);

  // faucet
  // 1. chainlink: https://faucets.chain.link/sepolia
  // 2. paradigm: https://faucet.paradigm.xyz/
  raw_balance = await provider.getBalance(myWallet);
  formatted_balance = ethers.formatEther(raw_balance);
  console.log(`raw_balance: ${raw_balance}`);
  console.log(`formatted_balance: ${formatted_balance}`);
  // build tx
  const tx = {
    to: addr,
    // parseEther: decimal => BigInt
    value: ethers.parseEther("0.01"),
  };
  // this take some time
  const receipt = await myWallet.sendTransaction(tx);
  await receipt.wait(); // 等待链上确认交易
  console.log(receipt); // 打印交易详情
  // iv. 打印交易后余额
  //   console.log(`\niii. 发送后余额`);
  //   console.log(`钱包1: ${ethers.formatEther()} ETH`);
  raw_balance = await provider.getBalance(myWallet);
  formatted_balance = ethers.formatEther(raw_balance);
  console.log(`formatted_balance: ${formatted_balance}`);
};

main();
