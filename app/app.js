/**
 * Voucher sample app for Freshchat
 *
 * This app can be invoked from the conversation message editor area. It is available as a 'voucher' icon below the editor.
 * Shows the voucher list from an API which can be directly added to the editor area
 */

$(document).ready(function () {
  app.initialized()
    .then(onAppInitializedCallback)
    .catch(function (error) {
      //Log and notify initialization error
      console.error(error);
      showNotification('danger', 'Unable to initialize the app');
    });
});

/**
 *  Get customer data from FreshChat
 */
const getClientData = function(_client) {
  return new Promise(resolve => {
    _client.data
      .get('user')
      .then(data => {
          resolve({
            ...data.user,
            source_id: data.user.id || '',
            email: data.user.email || ''
          });
      });
  });
};

/**
 *  Get sessionId
 */
const getSessionId = function(_client) {
  return new Promise(resolve => {
    _client.data
      .get('conversation')
      .then(data => {
          resolve(data.conversation.conversation_id);
      });
  });
};

const getIparamsConfiguration = function(_client) {
  return new Promise(resolve => {
    _client.iparams
        .get()
        .then(data => {
            resolve({
                source_id_type: data.source_id_type,
                vouchers_per_session: data.vouchers_per_session
            })
        });
    });
};

/**
 * Open the voucher dialog once the icon is clicked.
 * @param {*} _client
 */
const onAppInitializedCallback = async function(_client) {
  const clientData = await getClientData(_client);
  const sessionId = await getSessionId(_client);
  const iParamsConfiguration = await getIparamsConfiguration(_client);

  window.client = _client;

  client.events.on('app.activated', function () {
    // Open the voucher dialog
    client.interface
      .trigger('showDialog', {
        title: 'Voucherify coupon publisher',
        template: 'dialog/dialog.html',
        data: {
          clientData: clientData,
          sessionId: sessionId,
          iParamsConfig: iParamsConfiguration
        }
      })
      .catch(function (error) {
        // Log and Notify the agent/user that something went wrong while opening the dialog
        console.error(error);
        showNotification('danger', 'Unable to open the dialog');
      });
  });
}

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