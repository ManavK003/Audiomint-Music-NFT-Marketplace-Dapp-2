import { useContext } from "react";
import { Web3Context } from "../context/Web3Context";
import TokenBalance from "./TokenBalance";

const WalletInfo = () => {
  const { account } = useContext(Web3Context);

  return (
    <div className="flex flex-col items-end">
      {account ? (
        <>
          <span className="text-sm font-mono mb-1">🦊 {account}</span>
          <TokenBalance />
        </>
      ) : (
        <span className="text-sm">⏳ Connecting wallet...</span>
      )}
    </div>
  );
};

export default WalletInfo;
