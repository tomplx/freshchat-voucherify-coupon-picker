window.VoucherService = function(_client) {
    const findSessionInStore = function(_data, _sessionId) {
        return _data && _data.sessionsWithPublishedVoucher.find(sessionId => sessionId === _sessionId);
    }

    const storeSessionPublishedState = function(_sessionId) {
        client.db
        .update( 'sessions', 'append', { 'sessionsWithPublishedVoucher': [_sessionId]})
        .then(data => data)
        .catch(() => {
            showNotification('danger', 'Cannot append data to store, contact support!');
        });
    }

    return {
        /**
         *  Getting information have any voucher been assign to the customer while the same session
         *  @param {string} _sessionId
         */
        isVoucherPublishedInSession(_sessionId) {
            return new Promise(resolve => {
                _client.db
                    .get(`sessions`)
                    .then(_data => {
                        resolve(findSessionInStore(_data, _sessionId));
                    })
                    .catch(error => error)
                    .then(error => {
                        if(error && error.status === 404) {
                        client.db.set( 'sessions', { 'sessionsWithPublishedVoucher': []})
                            .catch(error => {
                            console.error('Could not save data, error!', error);
                            });
                        }

                        resolve(false);
                    });
                });
        },
        /**
         *  Storing information about voucher assigned to the customer while provided session
         *  Firstly it's iterating over existing stored information, then if there's no session stored,
         *  it will put new one
         *  @param {string} _sessionId
         */
        storePublishedVoucherInSession(_sessionId) {
            return _client.db
            .get('sessions')
            .then(data => { return findSessionInStore(data) })
            .then(isSessionFound => {
                // Append new session id if there is no same!
                if(!isSessionFound) {
                    storeSessionPublishedState(_sessionId);
                }
            });
        }
    }
}