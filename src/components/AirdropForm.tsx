"use client"

import { InputField } from "@/components/ui/InputField"
import { useMemo, useState, useEffect } from "react"
import { chainsToTSender, tsenderAbi, erc20Abi } from "@/constants"
import { useChainId, useConfig, useAccount, useWriteContract } from "wagmi"
import { readContract, waitForTransactionReceipt } from "@wagmi/core"
import { calculateTotal } from "@/utils"
import { parseUnits } from "viem"

export default function AirdropForm() {
  const [tokenAddress, setTokenAddress] = useState("")
  const [tokenName, setTokenName] = useState<string | null>(null)
  const [recepients, setRecepients] = useState("")
  const [amounts, setAmounts] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
  const saved = localStorage.getItem("airdrop-form")
  if (saved) {
    const parsed = JSON.parse(saved)
    setTokenAddress(parsed.tokenAddress || "")
    setRecepients(parsed.recepients || "")
    setAmounts(parsed.amounts || "")
  }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      "airdrop-form",
      JSON.stringify({ tokenAddress, recepients, amounts })
    )
  }, [tokenAddress, recepients, amounts])

  useEffect(() => {
    if (tokenAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      fetchTokenName()
    } else {
      setTokenName(null)
    }
  }, [tokenAddress])

  const chainId = useChainId()
  const config = useConfig()
  const account = useAccount()
  const total: number = useMemo(() => calculateTotal(amounts), [amounts])
  const totalWei = useMemo(() => {
  if (total <= 0) return null
  return parseUnits(total.toString(), 18)
}, [total])

  const { writeContractAsync } = useWriteContract()
    
  async function getApprovedAmount(tSenderAddress: string): Promise<bigint> {
    try {
      const response = await readContract(config, {
        abi: erc20Abi,
        address: tokenAddress as `0x${string}`,
        functionName: "allowance",
        args: [account.address as `0x${string}`, tSenderAddress as `0x${string}`]
      })
      return response as bigint
    } catch (err) {
      console.error("Failed to get approved amount:", err)
      throw new Error("Failed to check token allowance")
    }
  }

    async function fetchTokenName() {
    try {
      const name = await readContract(config, {
        abi: erc20Abi,
        address: tokenAddress as `0x${string}`,
        functionName: "name",
      })
      setTokenName(name as string)
    } catch {
      setTokenName(null)
    }
  }

  function validateInputs(): string | null {
    if (!tokenAddress || !tokenAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return "Please enter a valid token address"
    }
    
    const recipientList = recepients.split(/[,\n]+/).map(addr => addr.trim()).filter(addr => addr !== '')
    const amountList = amounts.split(/[,\n]+/).map(amt => amt.trim()).filter(amt => amt !== '')
    
    if (recipientList.length === 0) {
      return "Please enter at least one recipient"
    }
    
    if (amountList.length === 0) {
      return "Please enter at least one amount"
    }
    
    if (recipientList.length !== amountList.length) {
      return "Number of recipients must match number of amounts"
    }
    
    for (const addr of recipientList) {
      if (!addr.match(/^0x[a-fA-F0-9]{40}$/)) {
        return `Invalid address: ${addr}`
      }
    }
    
    for (const amt of amountList) {
      if (isNaN(Number(amt)) || Number(amt) <= 0) {
        return `Invalid amount: ${amt}`
      }
    }
    
    if (total <= 0) {
      return "Total amount must be greater than 0"
    }
    
    return null
  }

  function clearForm() {
    if (isLoading) return

    setTokenAddress("")
    setRecepients("")
    setAmounts("")
    setError(null)
    setSuccess(false)
    setTokenName(null)

    localStorage.removeItem("airdrop-form")
  }

  async function handleSubmit() {
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      // Validate inputs
      const validationError = validateInputs()
      if (validationError) {
        setError(validationError)
        return
      }

      // Check if account is connected
      if (!account.address) {
        setError("Please connect your wallet")
        return
      }

      // Get TSender address
      const tSenderAddress = chainsToTSender[chainId]?.tsender
      if (!tSenderAddress) {
        setError("Unsupported chain. Please switch to a supported network.")
        return
      }

      // Parse recipients and amounts
      const recipientList = recepients.split(/[,\n]+/).map(addr => addr.trim()).filter(addr => addr !== '')
      const amountList = amounts.split(/[,\n]+/).map(amt => amt.trim()).filter(amt => amt !== '')

      // Convert total to BigInt (assuming token has 18 decimals, adjust if needed)
      const totalBigInt = parseUnits(total.toString(), 18)

      // Check approved amount
      const approvedAmount = await getApprovedAmount(tSenderAddress)

      // If not approved or approval is insufficient, request approval
      if (approvedAmount < totalBigInt) {
        console.log("Requesting approval...")
        const approvalHash = await writeContractAsync({
          abi: erc20Abi,
          address: tokenAddress as `0x${string}`,
          functionName: "approve",
          args: [tSenderAddress as `0x${string}`, totalBigInt]
        })

        console.log("Waiting for approval transaction...")
        const approvalReceipt = await waitForTransactionReceipt(config, {
          hash: approvalHash
        })

        console.log("Approval receipt:", approvalReceipt)
      }

      // Execute airdrop
      console.log("Executing airdrop...")
      const airdropHash = await writeContractAsync({
        abi: tsenderAbi,
        address: tSenderAddress as `0x${string}`,
        functionName: "airdropERC20",
        args: [
          tokenAddress as `0x${string}`,
          recipientList as `0x${string}`[],
          amountList.map(amt => parseUnits(amt, 18)),
          totalBigInt,
        ],
      })

      console.log("Waiting for airdrop transaction...")
      const airdropReceipt = await waitForTransactionReceipt(config, {
        hash: airdropHash
      })

      console.log("Airdrop receipt:", airdropReceipt)
      setSuccess(true)

    } catch (err: any) {
      console.error("Transaction failed:", err)
      setError(err?.message || "Transaction failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }
    
  return (
    <div className="bg-white h-screen p-8">
      <div className="flex justify-end mb-2">
        <button
          onClick={clearForm}
          disabled={isLoading}
          className={`text-sm px-3 py-1 rounded border transition-colors ${
            isLoading
              ? "text-gray-400 border-gray-300 cursor-not-allowed"
              : "text-black border-black hover:bg-black"
          }`}
        >
          Clear form
        </button>
      </div>

      <InputField 
        label="Token Address" 
        placeholder="0x..."
        type="text"
        value={tokenAddress}
        onChange={(e) => {setTokenAddress(e.target.value)}}
        disabled={isLoading}
      />

      <InputField 
        label="Recipients (comma or newline separated)" 
        placeholder="0x12345, 0x67890"
        type="text"
        value={recepients}
        onChange={(e) => {setRecepients(e.target.value)}}
        large
        disabled={isLoading}
      />

      <InputField 
        label="Amounts (comma or newline separated)" 
        placeholder="100, 200"
        type="text"
        value={amounts}
        onChange={(e) => {setAmounts(e.target.value)}}
        large
        disabled={isLoading}
      />

      {total > 0 && (
        <p className="text-sm text-gray-600 mb-2">
          Total to send: <span className="font-semibold">{total}</span>
        </p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          Airdrop completed successfully!
        </div>
      )}

      {total > 0 && (
        <div className="border border-zinc-200 text-black rounded-lg p-4 bg-gray-50 mb-4">
          <h3 className="font-semibold mb-2 ">Transaction Details</h3>

          <div className="text-sm space-y-1">
            <p>
              <span className="">Token:</span>{" "}
              <span className="font-medium">
                {tokenName ?? "Unknown Token"}
              </span>
            </p>

            <p>
              <span className="">Amount (tokens):</span>{" "}
              <span className="font-medium">{total}</span>
            </p>

            {totalWei && (
              <p className="break-all">
                <span className="">Amount (wei):</span>{" "}
                <span className="font-mono text-xs">
                  {totalWei.toString()}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      <button
        className={`cursor-pointer flex items-center justify-center w-[200px] py-3 my-4 rounded-[9px] text-white transition-colors font-semibold relative border ${
          isLoading 
            ? 'bg-gray-400 border-gray-400 cursor-not-allowed' 
            : 'bg-blue-500 hover:bg-blue-600 border-blue-500'
        }`}
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : "Send Tokens"}
      </button>
    </div>
  )
}