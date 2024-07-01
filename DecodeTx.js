// import { ethers } from "ethers";
const ethers = require("ethers");

// 1. 创建provider和wallet，监听事件时候推荐用wss连接而不是http
// 准备 alchemy API 可以参考https://github.com/AmazingAng/WTFSolidity/blob/main/Topics/Tools/TOOL04_Alchemy/readme.md
const ALCHEMY_MAINNET_WSSURL =
  "wss://eth-mainnet.g.alchemy.com/v2/CkcrUboFNSh9RHdNm09Cud00Ns7_SxSR";
const provider = new ethers.WebSocketProvider(ALCHEMY_MAINNET_WSSURL);

let network = provider.getNetwork();
typeof network;

network.then((res) =>
  console.log(
    `[${new Date().toLocaleTimeString()}]连接到chain-id:${res.chainId}`
  )
);

// 2. 创建interface对象，用于解码交易详情。
const contractABI = ["function transfer(address, uint) public returns (bool)"];
const iface = new ethers.Interface(contractABI);

// 3. 获取函数选择器。
const selector = iface.getFunction("transfer").selector;
console.log(`函数选择器是${selector}`);

// 4. 监听pending的erc20 transfer交易，获取交易详情，然后解码。
// 处理bigInt
function handleBigInt(key, value) {
  if (typeof value === "bigint") {
    return value.toString() + "n"; // or simply return value.toString();
  }
  return value;
}

// let txHash =
//   "0xc5587265c1d681dfbfa78e70c34d4d73c4d635065accfb81496dd795cc5c6d2c";
// let txHash =
//   "0xbd32091e5f550a5adc32ef1bf414d749a3f08bd62617bf697d4f495db2d88e4c";
// let tx = await provider.getTransaction(txHash);
// let res = iface.parseTransaction(tx);

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

function format_usdt(amount_int, decimals) {
  return Number(amount_int) / Number(10 ** decimals);
}

let usdt_contract_addr = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
let usdt_readable_abi = ["function decimals() view returns (uint256)"];

async function get_contract_decimals(contract_addr, abi, provider) {
  let usdt_contract = new ethers.Contract(contract_addr, abi, provider);
  let decimals = await usdt_contract.decimals();
  return Number(decimals);
}

let j = 0;
let contract_decimals;
async function unlimited(txHash) {
  if (txHash) {
    const tx = await provider.getTransaction(txHash);
    j++;
    if (
      tx !== null &&
      tx.data.indexOf(selector) !== -1 &&
      tx.to == "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    ) {
      console.log(
        `[${new Date().toLocaleTimeString()}]监听到第${
          j + 1
        }个pending交易:${txHash}`
      );
      console.log(
        `打印解码交易详情:${JSON.stringify(
          iface.parseTransaction(tx),
          handleBigInt,
          2
        )}`
      );
      console.log(`转账目标地址:${iface.parseTransaction(tx).args[0]}`);
      console.log(
        `转账金额:${format_usdt(
          iface.parseTransaction(tx).args[1],
          contract_decimals
        )}`
      );
      provider.removeListener("pending", this);
    }
  }
}

async function main() {
  contract_decimals = await get_contract_decimals(
    usdt_contract_addr,
    usdt_readable_abi,
    provider
  );
  console.log("contract decimals: ", contract_decimals);
  provider.on("pending", throttle(unlimited, 100));
}

main();
