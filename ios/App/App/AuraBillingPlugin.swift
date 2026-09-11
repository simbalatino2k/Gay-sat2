import Foundation
import Capacitor
import StoreKit

@available(iOS 15.0, *)
@objc(AuraBillingPlugin)
public class AuraBillingPlugin: CAPPlugin {

    private let productIds: Set<String> = [
        "aura.premium.monthly",
        "aura.premium.3month",
        "aura.premium.yearly"
    ]

    private var cachedProducts: [String: Product] = [:]
    private var updatesTask: Task<Void, Never>? = nil

    public override func load() {
        super.load()
        listenForTransactionUpdates()
    }

    deinit {
        updatesTask?.cancel()
    }

    private func listenForTransactionUpdates() {
        updatesTask = Task.detached {
            for await result in Transaction.updates {
                do {
                    let transaction = try self.checkVerified(result)
                    await transaction.finish()
                } catch {
                    print("[AuraBillingStoreKit] Transaction update unverified: \(error)")
                }
            }
        }
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let safe):
            return safe
        }
    }

    @objc func initializeBilling(_ call: CAPPluginCall) {
        var res: [String: Any] = [:]
        res["ready"] = true
        res["platform"] = "ios"
        call.resolve(res)
    }

    @objc func getPremiumProducts(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: productIds)
                var productList: [[String: Any]] = []

                for product in products {
                    cachedProducts[product.id] = product
                    var item: [String: Any] = [:]
                    item["id"] = product.id
                    item["title"] = product.displayName
                    item["description"] = product.description
                    item["price"] = product.displayPrice
                    if let subscription = product.subscription {
                        item["billingPeriod"] = "\(subscription.subscriptionPeriod.value) \(subscription.subscriptionPeriod.unit)"
                    }
                    productList.append(item)
                }

                var res: [String: Any] = [:]
                res["products"] = productList
                call.resolve(res)
            } catch {
                call.reject("Failed to query StoreKit products: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchasePremium(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }

        Task {
            do {
                var product = cachedProducts[productId]
                if product == nil {
                    let fetched = try await Product.products(for: [productId])
                    product = fetched.first
                }

                guard let product = product else {
                    call.reject("Product not found in App Store: \(productId)")
                    return
                }

                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    let transaction = try checkVerified(verification)
                    // Obtain the signed JWS transaction string from StoreKit 2 verification result
                    let jwsRepresentation = verification.jwsRepresentation

                    await transaction.finish()

                    var res: [String: Any] = [:]
                    res["success"] = true
                    res["transactionId"] = String(transaction.id)
                    res["originalTransactionId"] = String(transaction.originalID)
                    res["productId"] = transaction.productID
                    res["purchaseDate"] = transaction.purchaseDate.timeIntervalSince1970
                    res["expiresDate"] = transaction.expirationDate?.timeIntervalSince1970
                    res["jwsRepresentation"] = jwsRepresentation
                    res["transactionJws"] = jwsRepresentation
                    call.resolve(res)

                case .userCancelled:
                    call.reject("USER_CANCELED")

                case .pending:
                    call.reject("PURCHASE_PENDING")

                @unknown default:
                    call.reject("UNKNOWN_PURCHASE_STATE")
                }
            } catch {
                call.reject("StoreKit purchase failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                // Sync with App Store
                try await AppStore.sync()

                var verifiedTransactions: [[String: Any]] = []

                for await result in Transaction.currentEntitlements {
                    do {
                        let transaction = try checkVerified(result)
                        var item: [String: Any] = [:]
                        item["transactionId"] = String(transaction.id)
                        item["originalTransactionId"] = String(transaction.originalID)
                        item["productId"] = transaction.productID
                        item["purchaseDate"] = transaction.purchaseDate.timeIntervalSince1970
                        item["expiresDate"] = transaction.expirationDate?.timeIntervalSince1970
                        item["jwsRepresentation"] = result.jwsRepresentation
                        item["transactionJws"] = result.jwsRepresentation
                        verifiedTransactions.append(item)
                    } catch {
                        print("[AuraBillingStoreKit] Unverified entitlement: \(error)")
                    }
                }

                var res: [String: Any] = [:]
                res["purchases"] = verifiedTransactions
                res["transactions"] = verifiedTransactions
                call.resolve(res)
            } catch {
                call.reject("StoreKit restore failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func getNativePurchases(_ call: CAPPluginCall) {
        restorePurchases(call)
    }

    @objc func openManageSubscriptions(_ call: CAPPluginCall) {
        Task {
            do {
                if let windowScene = await UIApplication.shared.connectedScenes.first as? UIWindowScene {
                    try await AppStore.showManageSubscriptions(in: windowScene)
                    var res: [String: Any] = [:]
                    res["success"] = true
                    call.resolve(res)
                } else if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
                    await UIApplication.shared.open(url)
                    var res: [String: Any] = [:]
                    res["success"] = true
                    call.resolve(res)
                } else {
                    call.reject("Unable to open App Store subscriptions")
                }
            } catch {
                call.reject("Failed to open App Store subscriptions: \(error.localizedDescription)")
            }
        }
    }
}
