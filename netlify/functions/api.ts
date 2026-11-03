import type { Handler, HandlerResponse } from '@netlify/functions';
import serverless from 'serverless-http';
import { createApp } from '../../server';

const functionPrefix = '/.netlify/functions/api';
let appHandlerPromise: Promise<ReturnType<typeof serverless>> | undefined;

export const handler: Handler = async (event, context) => {
  appHandlerPromise ??= createApp().then(app => serverless(app));
  const appHandler = await appHandlerPromise;
  const path = event.path.startsWith(functionPrefix)
    ? `/api${event.path.slice(functionPrefix.length)}`
    : event.path;
  const response = await appHandler({ ...event, path }, context);
  return response as HandlerResponse;
};
