// This code closely follows RelayDefaultNetworkLayer.

import fetchWithRetries from 'fbjs/lib/fetchWithRetries';
import Relay from 'react-relay/classic';


export default class NetworkLayer extends Relay.DefaultNetworkLayer {
  sendQueries(requests) {
    return this._sendQueries(requests)
      .then(result => result.json())
      .then(payloads => {
        requests.forEach((request, index) => {
          let payload;
          if (payloads && payloads[index]) {
            payload = payloads[index];
          } else {
            payload = payloads;
          }

          if ('errors' in payload) {
            // eslint-disable-next-line no-use-before-define
            const error = createRequestError(request, '200', payload);
            request.reject(error);
          } else {
            request.resolve({ response: payload.data });
          }
        });
      })
      .catch(error => requests.forEach(request => request.reject(error)));
  }

  _sendQueries(requests) {
    return fetchWithRetries(this._uri, {
      ...this._init,
      body: JSON.stringify(requests.map(request => ({
        query: request.getQueryString(),
        variables: request.getVariables(),
      }))),
      headers: {
        ...this._init.headers,
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  }
}

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

function createRequestError(request, responseStatus, payload) {
  const errorReason =
    typeof payload === 'object'
      ? formatRequestErrors(request, payload.errors)
      : `Server response had an error status: ${responseStatus}`;
  const error = new Error(
    `Server request for query \`${request.getDebugName()}\` ` +
      `failed for the following reasons:\n\n${errorReason}`,
  );
  error.source = payload;
  error.status = responseStatus;
  return error;
}
