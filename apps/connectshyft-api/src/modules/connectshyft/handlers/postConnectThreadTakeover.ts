import { Request, Response } from 'express';
import { executeConnectShyftThreadLifecycleAction } from '../http/threadLifecycleContext';

export const postConnectThreadTakeover = async (req: Request, res: Response) =>
  executeConnectShyftThreadLifecycleAction(req, res, 'takeover');
