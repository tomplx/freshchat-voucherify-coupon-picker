const request = require('request');

exports = {
    getCampaigns: () => {
        request({
            url: 'https://api.voucherify.io/v1/campaigns',
            method: 'GET',
            headers: {
                'X-App-Id': 'f4d349de-751e-425b-b5c2-54705aa5e40b',
                'X-App-Token': 'a3c8826e-f379-425d-8763-cd6d694c2fe2',
                'Accept': 'application/json'
            }
        }, function(err, res, body) {
            if (err) {
                return renderData({
                    message: 'Error while making request'
                });
            }
            renderData(null, body);
        });
    }
};





