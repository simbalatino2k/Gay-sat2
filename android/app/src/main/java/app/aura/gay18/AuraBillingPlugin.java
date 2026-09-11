package app.aura.gay18;

import android.content.Intent;
import android.net.Uri;
import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "AuraBilling")
public class AuraBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    private final Map<String, ProductDetails> cachedProductDetails = new HashMap<>();
    private PluginCall activePurchaseCall;

    private static final String[] PRODUCT_IDS = new String[] {
        "aura.premium.monthly",
        "aura.premium.3month",
        "aura.premium.yearly"
    };

    @Override
    public void load() {
        super.load();
        initBillingClient();
    }

    private void initBillingClient() {
        if (billingClient != null) {
            return;
        }

        PendingPurchasesParams pendingPurchasesParams = PendingPurchasesParams.newBuilder()
            .enableOneTimeProducts()
            .build();

        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(pendingPurchasesParams)
            .build();
    }

    @PluginMethod
    public void initializeBilling(PluginCall call) {
        initBillingClient();
        if (billingClient.isReady()) {
            JSObject res = new JSObject();
            res.put("ready", true);
            res.put("platform", "android");
            call.resolve(res);
            return;
        }

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    JSObject res = new JSObject();
                    res.put("ready", true);
                    res.put("platform", "android");
                    call.resolve(res);
                } else {
                    call.reject("Billing connection failed with response code: " + billingResult.getResponseCode());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                // Will retry on next call
            }
        });
    }

    @PluginMethod
    public void getPremiumProducts(PluginCall call) {
        ensureConnected(call, () -> {
            List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
            for (String pid : PRODUCT_IDS) {
                productList.add(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(pid)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                );
            }

            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

            billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Failed to query Google Play product details: " + billingResult.getDebugMessage());
                    return;
                }

                JSArray array = new JSArray();
                cachedProductDetails.clear();

                for (ProductDetails details : productDetailsList) {
                    cachedProductDetails.put(details.getProductId(), details);
                    JSObject item = new JSObject();
                    item.put("id", details.getProductId());
                    item.put("title", details.getTitle());
                    item.put("description", details.getDescription());

                    List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
                    if (offers != null && !offers.isEmpty()) {
                        ProductDetails.SubscriptionOfferDetails firstOffer = offers.get(0);
                        List<ProductDetails.PricingPhase> phases = firstOffer.getPricingPhases().getPricingPhaseList();
                        if (!phases.isEmpty()) {
                            ProductDetails.PricingPhase firstPhase = phases.get(0);
                            item.put("price", firstPhase.getFormattedPrice());
                            item.put("priceAmountMicros", firstPhase.getPriceAmountMicros());
                            item.put("currencyCode", firstPhase.getPriceCurrencyCode());
                            item.put("billingPeriod", firstPhase.getBillingPeriod());
                        }
                    }
                    array.put(item);
                }

                JSObject result = new JSObject();
                result.put("products", array);
                call.resolve(result);
            });
        });
    }

    @PluginMethod
    public void purchasePremium(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.isEmpty()) {
            call.reject("productId is required");
            return;
        }

        ensureConnected(call, () -> {
            ProductDetails details = cachedProductDetails.get(productId);
            if (details == null) {
                // Re-query product if not cached
                List<QueryProductDetailsParams.Product> productList = Collections.singletonList(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                );

                QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(productList)
                    .build();

                billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && !productDetailsList.isEmpty()) {
                        ProductDetails fetched = productDetailsList.get(0);
                        cachedProductDetails.put(productId, fetched);
                        launchBillingFlowForProduct(call, fetched);
                    } else {
                        call.reject("Product not found in Google Play: " + productId);
                    }
                });
            } else {
                launchBillingFlowForProduct(call, details);
            }
        });
    }

    private void launchBillingFlowForProduct(PluginCall call, ProductDetails details) {
        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) {
            call.reject("No subscription offers found for: " + details.getProductId());
            return;
        }

        String offerToken = offers.get(0).getOfferToken();
        List<BillingFlowParams.ProductDetailsParams> productParamsList = Collections.singletonList(
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details)
                .setOfferToken(offerToken)
                .build()
        );

        BillingFlowParams flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(productParamsList)
            .build();

        this.activePurchaseCall = call;

        if (getActivity() != null) {
            BillingResult result = billingClient.launchBillingFlow(getActivity(), flowParams);
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                this.activePurchaseCall = null;
                call.reject("Failed to launch billing flow: " + result.getDebugMessage());
            }
        } else {
            this.activePurchaseCall = null;
            call.reject("Activity is unavailable");
        }
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        if (activePurchaseCall == null) {
            return;
        }

        PluginCall call = activePurchaseCall;
        activePurchaseCall = null;

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    JSObject res = new JSObject();
                    res.put("success", true);
                    res.put("purchaseToken", purchase.getPurchaseToken());
                    res.put("orderId", purchase.getOrderId());
                    res.put("packageName", purchase.getPackageName());
                    res.put("purchaseTime", purchase.getPurchaseTime());
                    res.put("products", new JSArray(purchase.getProducts()));
                    res.put("isAcknowledged", purchase.isAcknowledged());
                    call.resolve(res);
                    return;
                }
            }
            call.reject("Purchase was not in PURCHASED state");
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            call.reject("USER_CANCELED");
        } else {
            call.reject("Purchase failed: " + billingResult.getDebugMessage());
        }
    }

    @PluginMethod
    public void queryPurchases(PluginCall call) {
        ensureConnected(call, () -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

            billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Failed to query Google Play active purchases: " + billingResult.getDebugMessage());
                    return;
                }

                JSArray array = new JSArray();
                for (Purchase p : purchases) {
                    if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                        JSObject obj = new JSObject();
                        obj.put("purchaseToken", p.getPurchaseToken());
                        obj.put("orderId", p.getOrderId());
                        obj.put("packageName", p.getPackageName());
                        obj.put("purchaseTime", p.getPurchaseTime());
                        obj.put("products", new JSArray(p.getProducts()));
                        obj.put("isAcknowledged", p.isAcknowledged());
                        array.put(obj);
                    }
                }

                JSObject result = new JSObject();
                result.put("purchases", array);
                call.resolve(result);
            });
        });
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        queryPurchases(call);
    }

    @PluginMethod
    public void getNativePurchases(PluginCall call) {
        queryPurchases(call);
    }

    @PluginMethod
    public void openManageSubscriptions(PluginCall call) {
        try {
            String packageName = getContext().getPackageName();
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(Uri.parse("https://play.google.com/store/account/subscriptions?package=" + packageName));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to open Google Play subscriptions: " + e.getMessage());
        }
    }

    private void ensureConnected(PluginCall call, Runnable action) {
        initBillingClient();
        if (billingClient.isReady()) {
            action.run();
        } else {
            billingClient.startConnection(new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        action.run();
                    } else {
                        call.reject("Google Play Billing client connection failed: " + billingResult.getResponseCode());
                    }
                }

                @Override
                public void onBillingServiceDisconnected() {
                    // Retry handling
                }
            });
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null && billingClient.isReady()) {
            billingClient.endConnection();
        }
        super.handleOnDestroy();
    }
}
