// import { ethers } from "ethers";
const ethers = require("ethers");

// 1. 创建provider和wallet，监听事件时候推荐用wss连接而不是http
// 准备 alchemy API 可以参考https://github.com/AmazingAng/WTFSolidity/blob/main/Topics/Tools/TOOL04_Alchemy/readme.md
const ALCHEMY_MAINNET_WSSURL =
  "wss://eth-mainnet.g.alchemy.com/v2/CkcrUboFNSh9RHdNm09Cud00Ns7_SxSR";
const ALCHEMY_MAINNET_URL =
  "https://eth-mainnet.g.alchemy.com/v2/CkcrUboFNSh9RHdNm09Cud00Ns7_SxSR";

const ws_provider = new ethers.WebSocketProvider(ALCHEMY_MAINNET_WSSURL);
const provider = new ethers.JsonRpcProvider(ALCHEMY_MAINNET_URL);

let usdt_contract_addr = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
let usdt_readable_abi = ["function decimals() view returns (uint256)"];
let usdt_contract = new ethers.Contract(
  usdt_contract_addr,
  usdt_readable_abi,
  ws_provider
);

const main = async () => {
  let res = await usdt_contract.decimals();
  console.log("res", res);
  return;
};

main();
