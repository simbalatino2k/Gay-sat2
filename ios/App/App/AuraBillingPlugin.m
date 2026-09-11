#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(AuraBillingPlugin, "AuraBilling",
    CAP_PLUGIN_METHOD(initializeBilling, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getPremiumProducts, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(purchasePremium, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(restorePurchases, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getNativePurchases, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(openManageSubscriptions, CAPPluginReturnPromise);
)
