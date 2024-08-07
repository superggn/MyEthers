// import { ethers } from "ethers";
// import {
//   FlashbotsBundleProvider,
//   FlashbotsBundleResolution,
// } from "@flashbots/ethers-provider-bundle";

const ethers = require("ethers");
const {
  FlashbotsBundleProvider,
  FlashbotsBundleResolution,
} = require("@flashbots/ethers-provider-bundle");

const GWEI = 10n ** 9n;
const CHAIN_ID = 11155111; // sepolia测试网，如果用主网，chainid 改为 1

// 1. 普通rpc （非flashbots rpc）
const ALCHEMY_SEPOLIA_URL =
  "https://eth-sepolia.g.alchemy.com/v2/L3Q6Wq4EjqlEk2W8qQdavHwh9Zuykv3-";
const provider = new ethers.JsonRpcProvider(ALCHEMY_SEPOLIA_URL);

// 2. flashbots声誉私钥，用于建立“声誉”，详情见:
// https://docs.flashbots.net/flashbots-auction/searchers/advanced/reputation
// !!!注意: 这个账户，不要储存资金，也不是flashbots主私钥。
const authKey =
  "0x227dbb8586117d55284e26620bc76534dfbd2394be34cf4a09cb775d593b6f2c";
// authSigner 的 address: 0xcA4B7Ff8710CAB6b75Ab6EEe36d72332d0e7F800
const authSigner = new ethers.Wallet(authKey, provider);

const main = async () => {
  // 3. flashbots rpc（sepolia 测试网），用于发送交易
  const flashbotsProvider = await FlashbotsBundleProvider.create(
    provider,
    authSigner,
    // 使用主网 Flashbots，需要把下面两行删去
    "https://relay-sepolia.flashbots.net",
    "sepolia"
  );

  // 4. 创建一笔交易
  // 交易: 发送0.001 ETH测试币到 WTF Academy 地址
  // WTF Academy addr: 0x25df6DA2f4e5C178DdFF45038378C0b08E0Bce54
  // JS_PK addr: 0xa2cC262Ca2cafdEE79EF9f637cE2d36E61027Baa
  const privateKey = process.env.JS_PK;
  //   ("0x227dbb8586117d55284e26620bc76534dfbd2394be34cf4a09cb775d593b6f2c");
  const wallet = new ethers.Wallet(privateKey, provider);
  // EIP 1559 transaction
  const transaction0 = {
    chainId: CHAIN_ID,
    type: 2,
    to: "0xcA4B7Ff8710CAB6b75Ab6EEe36d72332d0e7F800",
    value: ethers.parseEther("0.001"),
    maxFeePerGas: GWEI * 100n,
    maxPriorityFeePerGas: GWEI * 50n,
  };
  const transaction1 = {
    chainId: CHAIN_ID,
    type: 2,
    to: "0x25df6DA2f4e5C178DdFF45038378C0b08E0Bce54",
    value: ethers.parseEther("0.001"),
    maxFeePerGas: GWEI * 100n,
    maxPriorityFeePerGas: GWEI * 50n,
  };

  // 5. 创建交易 Bundle
  const transactionBundle = [
    {
      signer: wallet, // ethers signer
      transaction: transaction0, // ethers populated transaction object
    },
    {
      signer: wallet,
      transaction: transaction1,
    },
    // 也可以加入mempool中签名好的交易（可以是任何人发送的）
    // {
    //   signedTransaction: SIGNED_ORACLE_UPDATE_FROM_PENDING_POOL, // serialized signed transaction hex
    // },
  ];

  // 6. 模拟交易，交易模拟成功后才能执行
  // 签名交易
  const signedTransactions = await flashbotsProvider.signBundle(
    transactionBundle
  );

  // 设置交易的目标执行区块（在哪个区块执行）
  const targetBlockNumber = (await provider.getBlockNumber()) + 1;
  // 模拟
  const simulation = await flashbotsProvider.simulate(
    signedTransactions,
    targetBlockNumber
  );
  // 检查模拟是否成功
  if ("error" in simulation) {
    console.log(`模拟交易出错: ${simulation.error.message}`);
  } else {
    console.log(`模拟交易成功`);
    console.log(
      JSON.stringify(
        simulation,
        (key, value) => (typeof value === "bigint" ? value.toString() : value), // return everything else unchanged
        2
      )
    );
  }

  // 7. 发送交易上链
  // 因为测试网Flashbots的节点很少，需要尝试很多次才能成功上链，这里我们循环发送 100 个区块。
  for (let i = 1; i <= 100; i++) {
    let targetBlockNumberNew = targetBlockNumber + i - 1;
    // 发送交易
    const res = await flashbotsProvider.sendRawBundle(
      signedTransactions,
      targetBlockNumberNew
    );
    if ("error" in res) {
      throw new Error(res.error.message);
    }
    // 检查交易是否上链
    const bundleResolution = await res.wait();
    // 交易有三个状态: 成功上链/没有上链/Nonce过高。
    if (bundleResolution === FlashbotsBundleResolution.BundleIncluded) {
      console.log(`恭喜, 交易成功上链，区块: ${targetBlockNumberNew}`);
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    } else if (
      bundleResolution === FlashbotsBundleResolution.BlockPassedWithoutInclusion
    ) {
      console.log(`请重试, 交易没有被纳入区块: ${targetBlockNumberNew}`);
    } else if (
      bundleResolution === FlashbotsBundleResolution.AccountNonceTooHigh
    ) {
      console.log("Nonce 太高，请重新设置");
      process.exit(1);
    }
  }
};

main();
