import { Contract } from '@ethersproject/contracts'
import { InterfaceEventName } from '@uniswap/analytics-events'
import {
  CHAIN_TO_ADDRESSES_MAP,
  MULTICALL_ADDRESSES,
  NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
  V2_ROUTER_ADDRESSES,
  V3_MIGRATOR_ADDRESSES,
} from '@uniswap/sdk-core'
import IUniswapV2PairJson from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import IUniswapV2Router02Json from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import NonfungiblePositionManagerJson from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json'
import V3MigratorJson from '@uniswap/v3-periphery/artifacts/contracts/V3Migrator.sol/V3Migrator.json'
import UniswapInterfaceMulticallJson from '@uniswap/v3-periphery/artifacts/contracts/lens/UniswapInterfaceMulticall.sol/UniswapInterfaceMulticall.json'
import { useAccount } from 'hooks/useAccount'
import { useEthersProvider } from 'hooks/useEthersProvider'
import { useEffect, useMemo } from 'react'
import ERC20_ABI from 'uniswap/src/abis/erc20.json'
import { Erc20, Erc721, Weth } from 'uniswap/src/abis/types'
import { NonfungiblePositionManager, UniswapInterfaceMulticall } from 'uniswap/src/abis/types/v3'
import { V3Migrator } from 'uniswap/src/abis/types/v3/V3Migrator'
import WETH_ABI from 'uniswap/src/abis/weth.json'
import { WRAPPED_NATIVE_CURRENCY } from 'uniswap/src/constants/tokens'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { getContract } from 'utilities/src/contracts/getContract'
import { logger } from 'utilities/src/logger/logger'

const { abi: IUniswapV2PairABI } = IUniswapV2PairJson
const { abi: IUniswapV2Router02ABI } = IUniswapV2Router02Json
const { abi: MulticallABI } = UniswapInterfaceMulticallJson
const { abi: NFTPositionManagerABI } = NonfungiblePositionManagerJson
const { abi: V2MigratorABI } = V3MigratorJson

// returns null on errors
export function useContract<T extends Contract = Contract>(
  address: string | undefined,
  ABI: any,
  withSignerIfPossible = true,
  chainId?: UniverseChainId,
): T | null {
  const account = useAccount()
  const provider = useEthersProvider({ chainId: chainId ?? account.chainId })

  return useMemo(() => {
    if (!address || !ABI || !provider) {
      return null
    }
    try {
      return getContract(address, ABI, provider, withSignerIfPossible && account.address ? account.address : undefined)
    } catch (error) {
      const wrappedError = new Error('failed to get contract', { cause: error })
      logger.warn('useContract', 'useContract', wrappedError.message, {
        error: wrappedError,
        contractAddress: address,
        accountAddress: account.address,
      })
      return null
    }
  }, [address, ABI, provider, withSignerIfPossible, account.address]) as T
}

export function useV2MigratorContract() {
  const account = useAccount()
  return useContract<V3Migrator>(
    account.chainId ? V3_MIGRATOR_ADDRESSES[account.chainId] : undefined,
    V2MigratorABI,
    true,
  )
}

export function useTokenContract(tokenAddress?: string, withSignerIfPossible?: boolean, chainId?: UniverseChainId) {
  return useContract<Erc20>(tokenAddress, ERC20_ABI, withSignerIfPossible, chainId)
}

export function useWETHContract(withSignerIfPossible?: boolean, chainId?: UniverseChainId) {
  return useContract<Weth>(
    chainId ? WRAPPED_NATIVE_CURRENCY[chainId]?.address : undefined,
    WETH_ABI,
    withSignerIfPossible,
    chainId,
  )
}

export function usePairContract(pairAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(pairAddress, IUniswapV2PairABI, withSignerIfPossible)
}

export function useV2RouterContract(): Contract | null {
  const { chainId } = useAccount()
  return useContract(chainId ? V2_ROUTER_ADDRESSES[chainId] : undefined, IUniswapV2Router02ABI, true)
}

export function useInterfaceMulticall(chainId?: UniverseChainId) {
  const account = useAccount()
  const chain = chainId ?? account.chainId
  return useContract<UniswapInterfaceMulticall>(
    chain ? MULTICALL_ADDRESSES[chain] : undefined,
    MulticallABI,
    false,
    chain,
  ) as UniswapInterfaceMulticall
}

export function useV3NFTPositionManagerContract(
  withSignerIfPossible?: boolean,
  chainId?: UniverseChainId,
): NonfungiblePositionManager | null {
  const account = useAccount()
  const chainIdToUse = chainId ?? account.chainId
  const contract = useContract<NonfungiblePositionManager>(
    chainIdToUse ? NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainIdToUse] : undefined,
    NFTPositionManagerABI,
    withSignerIfPossible,
    chainIdToUse,
  )
  useEffect(() => {
    if (contract && account.isConnected) {
      sendAnalyticsEvent(InterfaceEventName.WALLET_PROVIDER_USED, {
        source: 'useV3NFTPositionManagerContract',
        contract: {
          name: 'V3NonfungiblePositionManager',
          address: contract.address,
          withSignerIfPossible,
          chainId: chainIdToUse,
        },
      })
    }
  }, [account.isConnected, chainIdToUse, contract, withSignerIfPossible])
  return contract
}

/**
 * NOTE: the return type of this contract and the ABI used are just a generic ERC721,
 * so you can only use this to call tokenURI or other Position NFT related functions.
 */
export function useV4NFTPositionManagerContract(
  withSignerIfPossible?: boolean,
  chainId?: UniverseChainId,
): Erc721 | null {
  const account = useAccount()
  const chainIdToUse = chainId ?? account.chainId

  const contract = useContract<Erc721>(
    // monad testnet does not have v4 support
    chainIdToUse && chainIdToUse !== UniverseChainId.MonadTestnet
      ? CHAIN_TO_ADDRESSES_MAP[chainIdToUse].v4PositionManagerAddress
      : undefined,
    NFTPositionManagerABI,
    withSignerIfPossible,
    chainIdToUse,
  )
  useEffect(() => {
    if (contract && account.isConnected) {
      sendAnalyticsEvent(InterfaceEventName.WALLET_PROVIDER_USED, {
        source: 'useV4NFTPositionManagerContract',
        contract: {
          name: 'V4NonfungiblePositionManager',
          address: contract.address,
          withSignerIfPossible,
          chainId: chainIdToUse,
        },
      })
    }
  }, [account.isConnected, chainIdToUse, contract, withSignerIfPossible])
  return contract
}
