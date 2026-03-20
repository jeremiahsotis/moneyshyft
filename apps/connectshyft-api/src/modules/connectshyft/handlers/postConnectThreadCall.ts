import { Request, Response } from 'express';
import { executeConnectShyftThreadOutboundAction } from '../http/threadOutboundContext';

export const postConnectThreadCall = async (req: Request, res: Response) =>
  executeConnectShyftThreadOutboundAction(req, res, 'call');
