import { Request, Response } from 'express';
import { executeConnectShyftInboundWebhookRoute } from '../http/inboundWebhookContext';

export const postConnectWebhookInbound = async (req: Request, res: Response) =>
  executeConnectShyftInboundWebhookRoute(req, res, 'inbound');
