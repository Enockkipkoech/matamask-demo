import "./App.css";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { providers, utils } from "ethers";
import Web3Modal from "web3modal";
import CoinbaseWalletSDK from "@coinbase/wallet-sdk";

import config from "./config/config";

function App() {
  const web3ModalRef = useRef();

  const [userAddress, setUserAddress] = useState(null);
  const [userName, setUserName] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    async function fetchData() {
      userAddress && toast(`WE FINALLY GOT userAddress: - ${userAddress}`);
      // You can await here
    }
    fetchData();
  }, [userAddress]);

  const handleConnectWallet = async () => {
    try {
      web3ModalRef.current = new Web3Modal({
        network: "bsctestnet",
        // providerOptions: getProviderOptions(),
        theme: "dark",
      });

      await web3ModalRef.current.connect();

      const signer = await getProviderOrSigner(true);
      if (signer) {
        let _address = await signer.getAddress();
        setUserName(humanizeAddress(_address));
        setUserAddress(_address);
        subscribeProvider(signer);
      }
    } catch (err) {
      toast.error("Failed to connect wallet");
    }
  };

  const getProviderOptions = () => {
    const infuraId = config.REACT_APP_INFURA_ID;
    const providerOptions = {
      // walletconnect: {
      //   package: WalletConnect,
      //   options: {
      //     infuraId,
      //   },
      // },
      // torus: {
      //   package: Torus,
      // },
      coinbasewallet: {
        package: CoinbaseWalletSDK,
        options: {
          appName: config.REACT_APP_NAME,
          infuraId,
        },
      },
    };
    return providerOptions;
  };

  const subscribeProvider = async (provider) => {
    if (!provider.on) {
      return;
    }
    provider.on("close", () => resetApp());
    provider.on("accountsChanged", async (accounts) => {
      setUserAddress(accounts[0]);
    });
    provider.on("chainChanged", async (chainId) => {
      toast("chainChanged", chainId);
      if (!config.SUPPORTED_CHAID_IDS.includes(chainId)) {
        toast.error("Change network to BSC testnet");
      }
    });

    provider.on("networkChanged", async (networkId) => {
      toast("networkChanged", networkId);
      if (!config.SUPPORTED_CHAID_IDS.includes(networkId)) {
        toast.error("Change network to BSC testnet");
      }
    });
  };
  const resetApp = async () => {
    await web3ModalRef.current.clearCachedProvider();
    setUserName(null);
    setUserAddress(null);
    toast("Wallet disconnected");
  };

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = new providers.Web3Provider(window.ethereum);

    const { chainId } = await provider.getNetwork();

    if (!config.SUPPORTED_CHAID_IDS.includes(chainId)) {
      toast.error("Change network to BSC testnet");
      return null;
    }

    if (needSigner) {
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      if (signer) {
        return signer;
      }
      toast.error("You need to allow MetaMask.");
      return null;
    }

    return provider;
  };

  const humanizeAddress = (address) => {
    return address.slice(0, 6) + "..." + address.slice(-4);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();

    if (!userAddress) {
      toast.error("You need to connect wallet");
      return;
    }

    if (!recipient || !amount) {
      toast.error("You need to fill all fields");
      return;
    }

    try {
      const signer = await getProviderOrSigner(true);
      if (!signer) {
        return;
      }

      const balance = await signer.getBalance();
      const balanceInBNB = utils.formatEther(balance);

      if (Number(amount) > Number(balanceInBNB)) {
        toast.error("You dont have enough BNB balance");
        toast(`balanceAmount: ${balanceInBNB} BNB, Required: ${amount} BNB`);
        return;
      }
      toast("Transferring...");
      const tx = await signer.sendTransaction({
        to: recipient,
        value: utils.parseEther(amount),
      });
      toast.success("Transfer success at tx: " + tx.hash);

      setRecipient("");
      setAmount("");
      console.log(tx);
    } catch (err) {
      toast.error(err);
      return;
    }
  };

  return (
    <div>
      {userAddress ? (
        <>
          <p>Connected with {userName} </p>
          <button onClick={resetApp}>Disconnect</button>
          <form>
            <label> Transfer funds to someone: </label>
            <p>
              To:
              <input
                type="text"
                name="to"
                onChange={(e) => setRecipient(e.target.value)}
              />
            </p>
            <p>
              Amount:
              <input
                type="text"
                name="amount"
                onChange={(e) => setAmount(e.target.value)}
              />
            </p>
            <button type="submit" onClick={handleTransfer}>
              Send
            </button>
          </form>
        </>
      ) : (
        <button onClick={() => handleConnectWallet()}>Connect Wallet</button>
      )}
    </div>
  );
}

export default App;
