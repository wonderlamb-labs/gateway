import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import {
  kavaClient,
} from '../apollo/client'

export const POOL_TRANSACTIONS = gql`
  query joins($address: Bytes!) {
    joins(first:1, orderBy: timestamp, orderDirection: asc, where: {pool_: {id: $address}}, subgraphError: allow) {
      timestamp
      liquidity
      pool {
        weight1
        weight0
      }
      amountsIn
    }
  }
`

/**
 * Fetch initial pool data
 */
 export async function getInitialPoolData(address) {
  const response = await kavaClient.query({
    query:POOL_TRANSACTIONS,
    variables: {
      address: address
    }
  });
  return response.data.joins[0];
}