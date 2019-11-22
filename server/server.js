const request = require('request');

exports = {
    getCampaigns: () => {
        request({
            url: 'https://api.voucherify.io/v1/campaigns',
            method: 'GET',
            headers: {
                'X-App-Id': 'your-voucherify-api-id',
                'X-App-Token': 'your-voucherify-api-key',
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





