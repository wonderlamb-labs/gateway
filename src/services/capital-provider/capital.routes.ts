/* eslint-disable @typescript-eslint/ban-types */
import { Router, Request, Response } from 'express';

import { asyncHandler } from '../error-handler';

import {
  addWalletWithCapitalProvider,
  removeWallet,
  getWalletsWithCapitalProviders,
} from './capital.controllers';

import {
  AddWalletWithCapitalProviderRequest,
  AddWalletWithCapitalProviderResponse,
  RemoveWalletRequest,
  GetWalletWithCapitalProviderResponse,
} from './capital.requests';

import {
  validateAddWalletRequest,
  validateRemoveWalletRequest,
} from './wallet.validators';

export namespace WalletRoutes {
  export const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res: Response<GetWalletWithCapitalProviderResponse[], {}>) => {
      const response = await getWalletsWithCapitalProviders();
      res.status(200).json(response);
    })
  );

  router.post(
    '/add',
    asyncHandler(
      async (
        req: Request<{}, {}, AddWalletWithCapitalProviderRequest>,
        res: Response<AddWalletWithCapitalProviderResponse, {}>
      ) => {
        validateAddWalletRequest(req.body);
        res.status(200).json(await addWalletWithCapitalProvider(req.body));
      }
    )
  );

  router.delete(
    '/remove',
    asyncHandler(
      async (
        req: Request<{}, {}, RemoveWalletRequest>,
        res: Response<void, {}>
      ) => {
        validateRemoveWalletRequest(req.body);
        await removeWallet(req.body);
        res.status(200).json();
      }
    )
  );

}
