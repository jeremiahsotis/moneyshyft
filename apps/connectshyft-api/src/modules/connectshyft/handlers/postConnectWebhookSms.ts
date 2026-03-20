import { Request, Response } from 'express';
import { executeConnectShyftInboundWebhookRoute } from '../http/inboundWebhookContext';

export const postConnectWebhookSms = async (req: Request, res: Response) =>
  executeConnectShyftInboundWebhookRoute(req, res, 'sms');
