/* eslint-disable @typescript-eslint/ban-types */
import { Router, Request, Response } from 'express';

import { asyncHandler } from '../error-handler';

import {
  addWalletWithCapitalProvider,
  getWalletsWithCapitalProviders,
} from './capital.controllers';

import {
  AddWalletWithCapitalProviderRequest,
  AddWalletWithCapitalProviderResponse,
  GetWalletWithCapitalProviderResponse,
} from './capital.requests';

import {
  validateAddWalletWithCapitalProviderRequest,
} from './capital.validators';

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
        validateAddWalletWithCapitalProviderRequest(req.body);
        res.status(200).json(await addWalletWithCapitalProvider(req.body));
      }
    )
  );

}
