'use client'

import Image from 'next/image'
import styles from './page.module.css'
import React, { useState, useEffect, useRef } from 'react'
import { IPaymaster, BiconomyPaymaster } from '@biconomy/paymaster'
import { IBundler, Bundler } from '@biconomy/bundler'
import { BiconomySmartAccountV2, DEFAULT_ENTRYPOINT_ADDRESS } from "@biconomy/account"
import { ECDSAOwnershipValidationModule, DEFAULT_ECDSA_OWNERSHIP_MODULE, BaseValidationModule } from "@biconomy/modules"
import { Wallet, providers, ethers } from 'ethers';
import { ChainId } from "@biconomy/core-types"
import SocialLogin from "@biconomy/web3-auth";
import "@biconomy/web3-auth/dist/src/style.css"

const bundler: IBundler = new Bundler({
  bundlerUrl:
    `https://bundler.biconomy.io/api/v2/${ChainId.AVALANCHE_TESTNET}/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44`,
    chainId: ChainId.AVALANCHE_TESTNET,
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
});

const rpc_provider = new providers.JsonRpcProvider(
  "https://avalanche-fuji-c-chain.publicnode.com"
);
const wallet = new Wallet("your_private_key", rpc_provider);

console.log('new wallet ', wallet);

const paymaster = new BiconomyPaymaster({
  paymasterUrl: ""
});

export default function Home() {
const [smartAccount, setSmartAccount] = useState<BiconomySmartAccountV2 | null>(null)
const [interval, enableInterval] = useState(false)
const sdkRef = useRef<SocialLogin | null>(null)
const [loading, setLoading] = useState<boolean>(false)
const [provider, setProvider] = useState<any>(null)

useEffect(() => {
    let configureLogin: any
    if (interval) {
      configureLogin = setInterval(() => {
        if (!!sdkRef.current?.provider) {
          setupSmartAccount()
          clearInterval(configureLogin)
        }
      }, 1000)
    }
  }, [interval])
  

  async function login() {
    if (!sdkRef.current) {
      console.log("Entro...")
      const socialLoginSDK = new SocialLogin()
      const signature1 = await socialLoginSDK.whitelistUrl("http://localhost:3000/")
      await socialLoginSDK.init({
        chainId: ethers.utils.hexValue(ChainId.AVALANCHE_TESTNET).toString(),
        network: "testnet",
        whitelistUrls: {
          "http://localhost:3000/": signature1,
        },
      })
      console.log("socialLoginSDK =>", socialLoginSDK)

      sdkRef.current = socialLoginSDK
    }
    if (!sdkRef.current.provider) {
      sdkRef.current.showWallet()
      enableInterval(true)
    } else {
      setupSmartAccount()
    }
  }

  async function setupSmartAccount() {
    if (!sdkRef?.current?.provider) {
      return
    }
    sdkRef.current.hideWallet()
    setLoading(true)
    const web3Provider = new ethers.providers.Web3Provider(sdkRef.current.provider)
    setProvider(web3Provider)
    try {
      const signer_module = await ECDSAOwnershipValidationModule.create({
        signer: wallet, // you will need to supply a signer from an EOA in this step
        moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE
      })
      
      const smartAccount = await BiconomySmartAccountV2.create({
        chainId: ChainId.AVALANCHE_TESTNET,
        bundler: bundler, 
        entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
        defaultValidationModule: signer_module,
        activeValidationModule: signer_module
      })
      console.log("SMA -> ", smartAccount);

      const acct = await smartAccount.getAccountAddress();
      console.log("-->> ", acct)
      // setSmartAccount(acct)
      setLoading(false)
    } catch (err) {
      console.log("error setting up smart account... ", err)
    }
  }
  


  return (
    <main className={styles.main}>
      <div className={styles.description}>
      {!loading && !smartAccount && <button onClick={login} className={styles.connect}>Connect to Based Web3</button>}
      {loading && <p>Loading Smart Account...</p>}
      {smartAccount && <h2>Smart Account: {smartAccount.accountAddress}</h2>}
      </div>

    </main>
  )
}
