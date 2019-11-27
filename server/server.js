const request = require('request');

const getVoucherifyCommonHeaders = function(iparams) {
    return {
        'X-App-Id': iparams.voucher_api_id,
        'X-App-Token': iparams.voucher_api_key,
        'Content-Type': 'application/json'
    }
}

const commonRequestError = {
    message: 'Error while making request'
}

const mapCampaigns = function(_sourceCampaigns) {
    const parsedResponse = JSON.parse(_sourceCampaigns);
    const parsedCampaigns = parsedResponse.campaigns.map(campaign => {
        return {
            name: campaign.name,
            description: campaign.description
        }
    });

    return { campaigns: parsedCampaigns };
};

exports = {
    initialise: (_client) => {
        client = _client;
    },

    publishVoucher: async (_args) => {
        const iparams = _args.iparams;
        const data = _args.data;

        request({
            url: `${iparams.voucher_api}/publications`,
            method: 'POST',
            headers: getVoucherifyCommonHeaders(iparams),
            body: JSON.stringify({
                campaign: data.campaign,
                customer: data.customer
              })
        }, (err, res, body) => {
            const result = JSON.parse(body);

            if (err || typeof result.voucher === 'undefined') {
                console.error(err);

                return renderData(commonRequestError);
            }

            renderData(null, result.voucher);
        })
    },

    getCampaigns: async (_args) => {
        const iparams = _args.iparams;

        request({
            url: `${iparams.voucher_api}/campaigns`,
            method: 'GET',
            headers: getVoucherifyCommonHeaders(iparams)
        }, (err, res, body) => {
            if (err) {
                console.error(err);

                return renderData(commonRequestError);
            }

            renderData(null, mapCampaigns(body));
        });
    }
}