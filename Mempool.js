// provider.on("pending", listener)
// import { ethers } from "ethers";
// const { ethers } = require("ethers");
const ethers = require("ethers");

console.log("wss RPC");
const ALCHEMY_MAINNET_WSSURL =
  "wss://eth-mainnet.g.alchemy.com/v2/CkcrUboFNSh9RHdNm09Cud00Ns7_SxSR";
const provider = new ethers.WebSocketProvider(ALCHEMY_MAINNET_WSSURL);

// chain info
let network = provider.getNetwork();
network.then((res) =>
  console.log(
    `[${new Date().toLocaleTimeString()}] 连接到 chain ID ${res.chainId}`
  )
);

console.log("\n2. 限制调用rpc接口速率");
// rpc throttle
function throttle(fn, delay) {
  let timer;
  return function () {
    if (!timer) {
      // passing every arguments to this fn
      fn.apply(this, arguments);
      timer = setTimeout(() => {
        clearTimeout(timer);
        timer = null;
      }, delay);
    }
  };
}

const main = async () => {
  let i = 0;
  console.log("print pending txHash");
  // provider.on is a function that listens to mempool's pending transactions
  provider.on("pending", async (txHash) => {
    if (txHash && i < 100) {
      // 打印txHash
      console.log(
        `[${new Date().toLocaleTimeString()}] 监听Pending交易 ${i}: ${txHash} \r`
      );
      i++;
    }
  });
  // 监听pending交易， 并获取交易详情
  console.log("print pending txHash and tx info");
  let j = 0;
  // 这里用 provider.on 拿到的 tx 和上面的不一定一样
  provider.on(
    "pending",
    throttle(async (txHash) => {
      if (txHash && j <= 100) {
        // 获取tx详情
        let tx = await provider.getTransaction(txHash);
        // 打印调用合约特定函数的交易
        const contractABI = [
          "function transfer(address, uint) public returns (bool)",
        ];
        const iface = new ethers.Interface(contractABI);
        // 过滤 fn selector
        const selector = iface.getFunction("transfer").selector;
        if (!(tx !== null && tx.data.indexOf(selector) !== -1)) {
          return;
        }
        console.log(
          `\n[${new Date().toLocaleTimeString()}] 监听Pending交易 ${j}: ${txHash} \r`
        );
        console.log(tx);
        j++;
      }
    }, 1000)
  );
};

main();
