// This code closely follows RelayDefaultNetworkLayer.

import fetchWithRetries from 'fbjs/lib/fetchWithRetries';
import Relay from 'react-relay/classic';

import createRequestError from './__forks__/createRequestError'

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
