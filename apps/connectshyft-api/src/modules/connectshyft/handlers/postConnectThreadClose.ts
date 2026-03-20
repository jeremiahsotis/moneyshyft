import { Request, Response } from 'express';
import { executeConnectShyftThreadLifecycleAction } from '../http/threadLifecycleContext';

export const postConnectThreadClose = async (req: Request, res: Response) =>
  executeConnectShyftThreadLifecycleAction(req, res, 'close');
