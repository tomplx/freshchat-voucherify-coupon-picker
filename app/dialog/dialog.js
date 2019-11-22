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
    .catch(function (error) {
      //Log and notify initialization error
      console.error(error);
      showNotification('danger', 'Unable to initialize the app');
    });
});

/**
 * Call the voucher API and render the view based on the response
 * @param {*} _client
 */
function onAppInitializedCallback(_client) {
  window.client = _client;
  client.instance.resize({ height: '190px' });

  let sourceIdType;
  const templateVouchers = $('#voucher_list').html();
  const templateCampaigns = $('#campaigns_list').html();
  const templateScriptVouchers = Handlebars.compile(templateVouchers);
  const templateScriptCampaigns = Handlebars.compile(templateCampaigns);
  const $loader = $('.fc_loader');
  const $voucherForm = $('#voucherify_options_form');
  const loadVoucher = (userSelectedSourceIdType, userSelectedSourceCampaignName) => {
    /**
     *  Getting information have any voucher been assign to the customer while the same session
     *  @param {string} _sessionId
     */
    async function isVoucherPublishedInSession(_sessionId) {
      return new Promise(resolve => {
        client.db
          .get(`sessions`)
          .then(data => {
            let isVoucherSent = false;

            data.sessionsWithPublishedVoucher.forEach((val => {
              if(val === _sessionId) {
                isVoucherSent = true;
              }
            }));

            resolve(isVoucherSent);
          })
          .catch(error => error)
          .then(error => {
            if(error && error.status === 404) {
              client.db.set( 'sessions', { 'sessionsWithPublishedVoucher': []})
                .catch(error => {
                  console.log('Could not save data, error!', error);
                });
            }

            resolve(false);
          });
        });
    }

    /**
     *  Storing information about voucher assigned to the customer while provided session
     *  Firstly it's iterating over existing stored information, then if there's no session stored,
     *  it will put new one
     *  @param {string} _sessionId
     */
    const storePublishedVoucherInSession = async function(_sessionId) {
      return client.db
        .get('sessions')
        .then(data => {
          const sessionsWithPublishedVoucher = data.sessionsWithPublishedVoucher;

          if(sessionsWithPublishedVoucher) {
            let isSessionFound = false;

            sessionsWithPublishedVoucher.forEach(sessionId => {
              if(sessionId === _sessionId) {
                isSessionFound = true;
              }
            });

            return isSessionFound;
          }
        })
        .then(isSessionFound => {
          // Append new session id if there is no same!
          if(!isSessionFound) {
            client.db
              .update( 'sessions', 'append', { 'sessionsWithPublishedVoucher': [_sessionId]})
              .then(data => data)
              .catch(error => {
                showNotification('We did not save data, error error!')
                console.log('We did not save data, error error!',error);
              });
          }
        });
    }

    /**
     *  Get customer data from FreshChat
     */
    const getUserData = new Promise(resolve => {
      client.data
        .get('user')
        .then(data => {
            resolve({
              ...data.user,
              source_id: data.user.id || '',
              email: data.user.email || ''
            });
        });
    });

    /**
     *  Get sessionId
     */
    const getSessionId = new Promise(resolve => {
      client.data
        .get('conversation')
        .then(data => {
            resolve(data.conversation.conversation_id);
        });
    });

    /**
     *  Import source_id_type and vouchers_per_session flags from iparams config.
     */
    const getIparamsConfiguration = new Promise(resolve => {
      client.iparams
        .get()
        .then(data => {
          resolve({
            source_id_type: data.source_id_type,
            vouchers_per_session: data.vouchers_per_session
          })
        });
    })

    /**
     *  Collecting all informations after all configuration promises are ready.
     *  Checking for one voucher per session logic.
     *  Grabbing all data and sending request to the Voucherify API for getting voucher for specific customer.
     */
    Promise
      .all([getUserData, getSessionId, getIparamsConfiguration])
      .then(async result => {
        const [resolvedUserData, resolvedSessionId, resolvedIparamsConfig] = result;
        const sourceIdsByTypes = {
          'userId': resolvedUserData.source_id,
          'sessionId': resolvedSessionId,
          'email': resolvedUserData.email
        };
        const isVoucherSent = await isVoucherPublishedInSession(resolvedSessionId);
        const finalSourceId = sourceIdsByTypes[userSelectedSourceIdType] || '';

        if (resolvedIparamsConfig.vouchers_per_session === 'one' && typeof isVoucherSent !== 'undefined' && isVoucherSent === true) {
          console.error("resolvedIparamsConfig.vouchers_per_session === 'one' && typeof isVoucherSent !== 'undefined' && isVoucherSent === true", resolvedIparamsConfig.vouchers_per_session, isVoucherSent);
          throw new Error('You cannot send more vouchers while this chat session. Wait for a next session with this customer.');
        }
        else if (resolvedUserData.email === '' || resolvedUserData.first_name === '') {
          console.error("resolvedUserData - no email or no first name!", resolvedUserData);
          throw new Error('You did not provide customer data like mail, first name and last name!');
        }
        else {
          return {
            campaign: {
              name: userSelectedSourceCampaignName,
              count: '1'
            },
            customer: {
              source_id: finalSourceId,
              email: resolvedUserData.email,
              name: `${resolvedUserData.first_name || ''} ${resolvedUserData.last_name || ''}` || ''
            },
            sessionId: resolvedSessionId
          };
        }
      }
    )
    .then(preparedData => {
      if(!preparedData) {
        throw new Error('Wrong');
      }
      else {
        client.request
          .post('<%= iparam.voucher_api %>/publications', {
            headers: {
              'X-App-Id': '<%= iparam.voucher_api_id %>',
              'X-App-Token': '<%= iparam.voucher_api_key %>',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              campaign: {
                ...preparedData.campaign
              },
              customer: {
                  ...preparedData.customer
              }
            })
          })
          .then(data => {
            const parsedResponse = JSON.parse(data.response);

            // Proceed to store info that voucher is published in existing session
            // Show voucher in view
            // Turn loader off
            storePublishedVoucherInSession(preparedData.sessionId);
            showVoucher([parsedResponse.voucher]);
            $voucherForm.toggleClass('show', false);
            $loader.toggleClass('show', false);
            client.instance.resize({ height: "90px" });
          })
          .catch(error => {
            //Log and notify the agent/user
            console.error(error);
            showNotification('danger', 'Unable to get voucher data from API');
            client.instance.close();
          });

          $(document).on('click', '.fc_voucher', voucherClickHandler);
      }
    })
    .catch(error => {
      console.log(error);
      client.instance.close();
      showNotification('danger', error);
    });
  };

  function loadCampaigns() {
    client.request
          .invoke('getCampaigns', {limit: '5'})
          .then(data => {
            let parsedResponse = JSON.parse(data.response);
            const mappedCampaigns = parsedResponse.campaigns.map(campaign => {
              return {
                name: campaign.name,
                description: campaign.description
              }
            })

            // Then putting list of campaigns into view
            showCampaigns(mappedCampaigns);
          })
          .catch(error => {
            //Log and notify the agent/user
            console.error(error);
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
      showNotification('danger', 'Please choose source id type first!');
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

  function showCampaigns(campaignsData) {
    try {
      var html = templateScriptCampaigns({campaigns: campaignsData});
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
  function showNotification(type, message) {
    client.interface.trigger('showNotify', {
      type: type || 'alert',
      message: message || 'NA'
    });
  }
}