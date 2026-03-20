import { Request, Response } from 'express';
import { executeConnectShyftThreadOutboundAction } from '../http/threadOutboundContext';

export const postConnectThreadMessage = async (req: Request, res: Response) =>
  executeConnectShyftThreadOutboundAction(req, res, 'message');
