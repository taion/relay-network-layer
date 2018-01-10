/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * https://github.com/facebook/relay/commit/6b0ec649a6292ff6c5e3869dc3a8ac22b0a0585d
 */
function formatRequestErrors(request, errors) {
  const CONTEXT_BEFORE = 20;
  const CONTEXT_LENGTH = 60;

  const queryLines = request.getQueryString().split('\n');
  return errors
    .map(({ locations, message }, ii) => {
      const prefix = `${ii + 1}`;
      const indent = ' '.repeat(prefix.length);

      // custom errors thrown in graphql-server may not have locations
      if (!locations) return prefix + message;

      const l = locations
        .map(({ column, line }) => {
          const queryLine = queryLines[line - 1];
          const offset = Math.min(column - 1, CONTEXT_BEFORE);
          return [
            queryLine.substr(column - 1 - offset, CONTEXT_LENGTH),
            `${' '.repeat(Math.max(0, offset))}^^^`,
          ]
            .map(messageLine => indent + messageLine)
            .join('\n');
        })
        .join('\n');

      return `${prefix + message}\n${l}`;
    })
    .join('\n');
}

export default function createRequestError(request, responseStatus, payload) {
  const errorReason =
    typeof payload === 'object'
      ? formatRequestErrors(request, payload.errors)
      : `Server response had an error status: ${responseStatus}`;
  const error = new Error(
    `Server request for query \`${request.getDebugName()}\` ` +
      `failed for the following reasons:\n\n${errorReason}`
  );
  error.source = payload;
  error.status = responseStatus;
  return error;
}
