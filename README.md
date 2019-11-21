## Voucherify coupon picker App for Freshchat


*What is the App target*

This application is used to provide fast voucher distribution via FreshChat conversations with your customers.
It also sends additional info like source_id, wich may be used later in Voucherify campaigns.

This application is not yet in the FreshWorks Apps Market, it's only local machine preview with the FDK.

*Prerequisites - FreshWorks API!*

1. Make sure you have the development environment setup with the latest version of FDK. If you are starting from scratch, You can have a look at the  [quick start](https://developers.freshchat.com/v2/docs/quick-start/) mentioned here. Skip this step if you already have the FDK installed


*Procedure to run the app and use it*

1. Put your initial configuration in ./config/iparams_test_parameters.json and ./config/iparams.json, like API id and key for Voucherify API!

2. Run the app locally using the [`fdk run`](https://developers.freshchat.com/v2/docs/freshworks-cli/#run) command.

3. You'll find Voucherify icon just below conversation, beside tool icons.
![](readme_resources/record2.png)

4. Be sure to have at least email or first_name of your customer!

5. Click on the Voucherify logo to open App dialog.

6. Choose type of source id that we'll be used later in Voucherify.

7. Click "Load voucher".

8. The voucher will load from the API and you'll see it, now click on it to send it to the user.