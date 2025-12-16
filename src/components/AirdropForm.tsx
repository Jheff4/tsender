"use client"

import { InputField } from "@/components/ui/InputField"
import { useMemo, useState } from "react"
import { chainsToTSender, tsenderAbi, erc20Abi } from "@/constants"
import { useChainId, useConfig, useAccount } from "wagmi"
import { readContract } from "@wagmi/core"
import { calculateTotal } from "@/utils/calculateTotal/calculateTotal"

export default function AirdropForm() {
  const [tokenAddress, setTokenAddress] = useState("")
  const [recepients, setRecepients] = useState("")
  const [amounts, setAmounts] = useState("")
  
  const chainId = useChainId()
  const config = useConfig()
  const account = useAccount()
  const total: number = useMemo(() => calculateTotal(amounts), [amounts])
    

  async function getApprovedAmount(tSenderAddress: string | null): Promise<number> {
    if (!tSenderAddress) {
      alert("No address found, please use a supported chain")
      return 0
    }

    const response = await readContract(config, {
      abi: erc20Abi,
      address: tokenAddress as `0x${string}`,
      functionName: "allowance",
      args: [account.address, tSenderAddress as `0x${string}`]
    })

    return response as number
  }

  async function handleSubmit() {
    // 1a. If already approved move to step 2
    // 1b. Approve our tsender contract to send our tokens
    // 2. Call the airdrop function on the tsender contract
    // 3. Wait for transaction to be mined
    // 4. Show success message

    const tSenderAddress = chainsToTSender[chainId].tsender
    const approvedAmount = await getApprovedAmount(tSenderAddress)
    console.log(approvedAmount)


  }
  
  return (
    <div className="bg-white h-screen p-8">
      <InputField 
        label="Token Address" 
        placeholder="0x"
        type="text"
        value={tokenAddress}
        onChange={(e) => {setTokenAddress(e.target.value)}}
      />

      <InputField 
        label="Recepients" 
        placeholder="0x12345, 0x67890"
        type="text"
        value={recepients}
        onChange={(e) => {setRecepients(e.target.value)}}
        large
      />

      <InputField 
        label="Amount" 
        placeholder="100, 200"
        type="text"
        value={amounts}
        onChange={(e) => {setAmounts(e.target.value)}}
        large
      />

      <button
        className={`cursor-pointer flex items-center justify-center w-[200px] py-3 my-4 rounded-[9px] text-white transition-colors font-semibold relative border bg-blue-500 hover:bg-blue-600 border-blue-500`}
        onClick={handleSubmit}
      >
        Send Tokens
      </button>
    </div>
  )
}
