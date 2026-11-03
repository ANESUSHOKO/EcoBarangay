import type { Handler, HandlerResponse } from '@netlify/functions';
import serverless from 'serverless-http';

const functionPrefix = '/.netlify/functions/api';
let appHandlerPromise: Promise<ReturnType<typeof serverless>> | undefined;

function loadAppHandler() {
  // Import lazily so configuration errors (e.g. missing Firebase credentials)
  // surface as a JSON error response instead of crashing the function runtime.
  appHandlerPromise ??= import('../../server')
    .then(({ createApp }) => createApp())
    .then(app => serverless(app))
    .catch(error => {
      appHandlerPromise = undefined;
      throw error;
    });
  return appHandlerPromise;
}

export const handler: Handler = async (event, context) => {
  let appHandler: ReturnType<typeof serverless>;
  try {
    appHandler = await loadAppHandler();
  } catch (error) {
    console.error('EcoBarangay API failed to initialize:', error);
    return {
      statusCode: 503,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: 'The API is not configured correctly. Check the function logs for details.',
      }),
    };
  }

  const path = event.path.startsWith(functionPrefix)
    ? `/api${event.path.slice(functionPrefix.length)}`
    : event.path;
  const response = await appHandler({ ...event, path }, context);
  return response as HandlerResponse;
};
