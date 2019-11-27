/**
 * Voucher Dialog
 */
$(document).ready(function () {
  app
    .initialized()
    .then(_client => {
      return _client;
    })
    .then(onAppInitializedCallback)
    .catch(() => showNotification('danger', 'Unable to initialize the app'));
});

/**
 * Call the voucher API and render the view based on the response
 * @param {*} _client
 */
function onAppInitializedCallback(_client) {
  window.client = _client;
  client.instance.resize({ height: '240px' });

  let sourceIdType;
  const $templateVouchers = $('#voucher_list').html();
  const $templateCampaigns = $('#campaigns_list').html();
  const templateScriptVouchers = Handlebars.compile($templateVouchers);
  const templateScriptCampaigns = Handlebars.compile($templateCampaigns);
  const $loader = $('.fc_loader');
  const $voucherForm = $('#voucherify_options_form');
  const voucherService = new VoucherService(client);

  const isVoucherPerSessionRestricted = function(_vouchersPerSession, _isVoucherSent) {
    return _vouchersPerSession === 'one' && typeof isVoucherSent !== 'undefined' && isVoucherSent;
  };

  const prepareDataForVoucherPublication = async function(_context, _userSelectedSourceIdType, _userSelectedSourceCampaignName) {
    const clientData = _context.data.clientData;
    const sessionId = _context.data.sessionId;
    const iParamsConfig = _context.data.iParamsConfig;
    const sourceIdsByTypes = {
      'userId': clientData.source_id,
      'sessionId': sessionId,
      'email': clientData.email
    };
    const isVoucherSent = await voucherService.isVoucherPublishedInSession(sessionId);
    const finalSourceId = sourceIdsByTypes[_userSelectedSourceIdType] || clientData.source_id || clientData.email || sessionId || '';

    if (isVoucherPerSessionRestricted(iParamsConfig.vouchers_per_session, isVoucherSent)) {
      throw new Error('You cannot send more vouchers while this chat session. Wait for a next session with this customer.');
    }
    else {
      return {
        campaign: {
          name: _userSelectedSourceCampaignName,
          count: '1'
        },
        customer: {
          source_id: finalSourceId,
          email: clientData.email,
          name: `${clientData.first_name || ''} ${clientData.last_name || ''}` || ''
        },
        sessionId: sessionId
      };
    }
  }

  const proceedWithVoucherPublication = function(_voucher, _sessionId) {
    // Proceed to store info that voucher is published in existing session
    // Show voucher in view
    // Turn loader off
    voucherService.storePublishedVoucherInSession(_sessionId);
    showVoucher([_voucher]);
    $voucherForm.toggleClass('show', false);
    $loader.toggleClass('show', false);
    client.instance.resize({ height: "90px" });
  };

  const loadVoucher = (_userSelectedSourceIdType, _userSelectedSourceCampaignName) => {
    /**
     *  Collecting all informations after all configuration promises are ready.
     *  Checking for one voucher per session logic.
     *  Grabbing all data and sending request to the Voucherify API for getting voucher for specific customer.
     */
    client.instance
      .context()
      .then(_context => prepareDataForVoucherPublication(_context, _userSelectedSourceIdType, _userSelectedSourceCampaignName)
    )
    .then(preparedData => {
      if(!preparedData) {
        throw new Error('Wrong data provided! Please, contact support');
      }
      else {
        client.request
          .invoke('publishVoucher', { data: preparedData })
          .then(data => { proceedWithVoucherPublication(data.response, preparedData.sessionId) })
          .catch(error => {
            showNotification('danger', 'Unable to get voucher data from API');
            client.instance.close();
          });

          $(document).on('click', '.fc_voucher', voucherClickHandler);
      }
    })
    .catch(error => {
      client.instance.close();
      showNotification('danger', error);
    });
  };

  function loadCampaigns() {
    client.request
      .invoke('getCampaigns', {limit: '5'})
      .then(showCampaigns)
      .catch(error => {
        showNotification('danger', 'Unable to get campaigns data from API');
        client.instance.close();
      });
  }

  loadCampaigns();

  /**
   * Handles click on the radio button and sets variable value as a radio value
   * @param {radio} radio input
   */
  window.handleSourceIdType = function(radio) {
    sourceIdType = radio.value;
  };

  window.handlePublishVoucher = function(event) {
    event.preventDefault();

    const selectedCampaign = $('#campaignsList').val();

    if(typeof sourceIdType !== 'undefined') {
      $loader.toggleClass('show', true);
      loadVoucher(sourceIdType, selectedCampaign);
    }
    else {
      $loader.toggleClass('show', true);
      loadVoucher('fallback', selectedCampaign);
    }
  }

  /**
   * Renders the voucher list upon clicking the voucher icon in the conversation message editor area
   * @param {*} data
   */
  function showVoucher(voucherData) {
    try {
      var html = templateScriptVouchers({vouchers: voucherData});
      $("#vouchers").html(html);
    } catch (e) {
      console.error(e);
      showNotification('danger', 'Unable to render view');
      client.instance.close();
    }
  }

  function showCampaigns(_campaigns) {
    try {
      var html = templateScriptCampaigns(_campaigns.response);
      $("#campaignsList").html(html);
    } catch (e) {
      console.error(e);
      showNotification('danger', 'Unable to render view');
      client.instance.close();
    }
  }

  /**
   * Handles clicking the voucher. Gets the voucher details and appends it to the message editor automatically
   * @param {*} event
   */
  function voucherClickHandler(event) {
    const voucher_name = $(event.target).data('vouchertitle') || 'N.A';
    const voucher_message = `We are so sorry about the inconvenience we have caused. Here is a Voucher Code :  ${voucher_name}`;

    client.interface.trigger('setValue', { id: 'editor', value: voucher_message })
      .then(function () {
        client.instance.close();
      })
      .catch(function (error) {
        console.error('Error occured while setting editor value', error);
        client.instance.close();
      });
  };

  /**
   * Shows notification to the agent
   * @param {string} type
   * @param {string} message
   */
  window.showNotification = function(type, message) {
    client.interface.trigger('showNotify', {
      type: type || 'alert',
      message: message || 'NA'
    });
  }
}