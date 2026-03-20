import { Request, Response } from 'express';
import { executeConnectShyftThreadLifecycleAction } from '../http/threadLifecycleContext';

export const postConnectThreadClaim = async (req: Request, res: Response) =>
  executeConnectShyftThreadLifecycleAction(req, res, 'claim');
