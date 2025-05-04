import { useContext, useEffect, useState } from "react";
import { Web3Context } from "../context/Web3Context";
import { formatUnits } from "ethers";

const TokenBalance = () => {
  const { yoda, account } = useContext(Web3Context);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (yoda && account) {
        try {
          // Ethers v6 - use .read to call view functions (works for public mappings too)
          const rawBalance = await yoda.read.balanceOf(account);
          const formatted = formatUnits(rawBalance, 2); // ✅ 2 decimals from your YODA contract
          setBalance(formatted);
        } catch (err) {
          console.error("Failed to fetch Yoda balance:", err);
        }
      }
    };

    fetchBalance();
  }, [yoda, account]);

  return (
    <div className="text-sm text-gray-700">
      💰 Yoda Balance: <span className="font-mono">{balance ?? "..."}</span>
    </div>
  );
};

export default TokenBalance;
