import type {
  Abi,
  Account,
  Address,
  Chain,
  ContractFunctionArgs,
  ContractFunctionName,
} from 'viem'
import {
  type SimulateContractParameters as viem_SimulateContractParameters,
  type SimulateContractReturnType as viem_SimulateContractReturnType,
  simulateContract as viem_simulateContract,
} from 'viem/actions'

import { type Config } from '../createConfig.js'
import type { SelectChains } from '../types/chain.js'
import type {
  AccountParameter,
  ChainIdParameter,
  ConnectorParameter,
} from '../types/properties.js'
import type {
  OneOf,
  PartialBy,
  UnionEvaluate,
  UnionOmit,
} from '../types/utils.js'
import { assertActiveChain } from '../utils/assertActiveChain.js'
import { getConnectorClient } from './getConnectorClient.js'

export type SimulateContractParameters<
  abi extends Abi | readonly unknown[] = Abi,
  functionName extends ContractFunctionName<
    abi,
    'nonpayable' | 'payable'
  > = ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  args extends ContractFunctionArgs<
    abi,
    'nonpayable' | 'payable',
    functionName
  > = ContractFunctionArgs<abi, 'nonpayable' | 'payable', functionName>,
  config extends Config = Config,
  chainId extends
    | config['chains'][number]['id']
    | undefined = config['chains'][number]['id'],
  ///
  chains extends readonly Chain[] = SelectChains<config, chainId>,
> = {
  [key in keyof chains]: UnionEvaluate<
    UnionOmit<
      viem_SimulateContractParameters<
        abi,
        functionName,
        args,
        chains[key],
        chains[key]
      >,
      'account' | 'chain'
    > &
      ChainIdParameter<config, chainId> &
      OneOf<AccountParameter | ConnectorParameter>
  >
}[number]

export type SimulateContractReturnType<
  abi extends Abi | readonly unknown[] = Abi,
  functionName extends ContractFunctionName<
    abi,
    'nonpayable' | 'payable'
  > = ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  args extends ContractFunctionArgs<
    abi,
    'nonpayable' | 'payable',
    functionName
  > = ContractFunctionArgs<abi, 'nonpayable' | 'payable', functionName>,
  config extends Config = Config,
  chainId extends
    | config['chains'][number]['id']
    | undefined = config['chains'][number]['id'],
  ///
  chains extends readonly Chain[] = SelectChains<config, chainId>,
> = {
  [key in keyof chains]: viem_SimulateContractReturnType<
    abi,
    functionName,
    args,
    chains[key]
  > extends infer type extends viem_SimulateContractReturnType<
    abi,
    functionName,
    args
  >
    ? UnionEvaluate<
        UnionOmit<type, 'request'> & {
          request: UnionEvaluate<
            UnionOmit<type['request'], 'chain'> &
              PartialBy<
                { __mode: 'prepared'; chainId: chainId },
                chainId extends config['chains'][number]['id']
                  ? never
                  : 'chainId'
              >
          >
        }
      >
    : never
}[number]

export type SimulateContractError = Error

/** https://alpha.wagmi.sh/core/actions/simulateContract */
export async function simulateContract<
  config extends Config,
  const abi extends Abi | readonly unknown[],
  functionName extends ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  args extends ContractFunctionArgs<
    abi,
    'nonpayable' | 'payable',
    functionName
  >,
  chainId extends config['chains'][number]['id'] | undefined = undefined,
>(
  config: config,
  parameters: SimulateContractParameters<
    abi,
    functionName,
    args,
    config,
    chainId
  >,
): Promise<
  SimulateContractReturnType<abi, functionName, args, config, chainId>
> {
  const { abi, chainId, connector, ...rest } =
    parameters as SimulateContractParameters

  let account: Address | Account
  let activeChainId: number | undefined
  if (parameters.account) account = parameters.account
  else {
    const connectorClient = await getConnectorClient(config, {
      chainId,
      connector,
    })
    account = connectorClient.account
    activeChainId = connectorClient.chain.id
  }
  if (chainId) assertActiveChain(config, { activeChainId, chainId })

  const client = config.getClient({ chainId })
  const { result, request } = await viem_simulateContract(client, {
    ...rest,
    abi,
    account,
  })

  return {
    result,
    request: { __mode: 'prepared', ...request, chainId },
  } as unknown as SimulateContractReturnType<
    abi,
    functionName,
    args,
    config,
    chainId
  >
}