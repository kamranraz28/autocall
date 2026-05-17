/**
 * Billing / Wallet Controller
 */

const WalletRepo = require('../repositories/wallet.repository');

/* Router Methods */

exports.GetWallet = async (req, res, next) => {
    try {
        let wallet = await WalletRepo.FindOrCreate(req.shopId);
        return res.json({
            success: true,
            data: {
                shopId: wallet.shopId,
                currency: wallet.currency,
                balance: wallet.balance,
                availableBalance: wallet.availableBalance,
                pendingCharges: wallet.pendingCharges,
                autoRecharge: wallet.autoRecharge,
                billingAddress: wallet.billingAddress,
                lastUpdated: wallet.updatedAt
            },
            meta: {
                requestId: req.get('x-request-id') || '',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error(error);
        return next(error);
    }
}

exports.UpdateWallet = async (req, res, next) => {
    try {
        var { action, amount, paymentMethodId, autoRecharge } = req.body;

        if (!action) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "action is required.", details: {} },
                meta: { timestamp: new Date().toISOString() }
            });
        }

        let wallet = await WalletRepo.FindOrCreate(req.shopId);

        switch (action) {
            case 'top-up':
                if (!amount || amount <= 0) {
                    return res.status(400).json({
                        success: false,
                        error: { code: "VALIDATION_ERROR", message: "amount is required and must be positive for top-up.", details: {} },
                        meta: { timestamp: new Date().toISOString() }
                    });
                }

                // TODO: Process real payment via payment processor
                wallet.balance += amount;
                wallet.availableBalance += amount;
                await wallet.save();

                let transaction = await WalletRepo.CreateTransaction({
                    shopId: req.shopId,
                    type: 'credit',
                    amount: amount,
                    description: 'Manual top-up',
                    status: 'completed'
                });

                return res.json({
                    success: true,
                    data: {
                        shopId: wallet.shopId,
                        currency: wallet.currency,
                        balance: wallet.balance,
                        availableBalance: wallet.availableBalance,
                        pendingCharges: wallet.pendingCharges,
                        lastTransaction: {
                            id: transaction._id,
                            type: transaction.type,
                            amount: transaction.amount,
                            description: transaction.description,
                            status: transaction.status,
                            createdAt: transaction.createdAt
                        },
                        lastUpdated: wallet.updatedAt
                    },
                    meta: {
                        requestId: req.get('x-request-id') || '',
                        timestamp: new Date().toISOString()
                    }
                });

            case 'set-auto-recharge':
                if (!autoRecharge) {
                    return res.status(400).json({
                        success: false,
                        error: { code: "VALIDATION_ERROR", message: "autoRecharge object is required for set-auto-recharge.", details: {} },
                        meta: { timestamp: new Date().toISOString() }
                    });
                }

                wallet.autoRecharge = autoRecharge;
                await wallet.save();

                return res.json({
                    success: true,
                    data: {
                        shopId: wallet.shopId,
                        currency: wallet.currency,
                        balance: wallet.balance,
                        availableBalance: wallet.availableBalance,
                        pendingCharges: wallet.pendingCharges,
                        autoRecharge: wallet.autoRecharge,
                        lastUpdated: wallet.updatedAt
                    },
                    meta: {
                        requestId: req.get('x-request-id') || '',
                        timestamp: new Date().toISOString()
                    }
                });

            case 'update-payment-method':
                if (!paymentMethodId) {
                    return res.status(400).json({
                        success: false,
                        error: { code: "VALIDATION_ERROR", message: "paymentMethodId is required for update-payment-method.", details: {} },
                        meta: { timestamp: new Date().toISOString() }
                    });
                }

                if (!wallet.autoRecharge) wallet.autoRecharge = {};
                wallet.autoRecharge.paymentMethodId = paymentMethodId;
                await wallet.save();

                return res.json({
                    success: true,
                    data: {
                        shopId: wallet.shopId,
                        currency: wallet.currency,
                        balance: wallet.balance,
                        availableBalance: wallet.availableBalance,
                        pendingCharges: wallet.pendingCharges,
                        autoRecharge: wallet.autoRecharge,
                        lastUpdated: wallet.updatedAt
                    },
                    meta: {
                        requestId: req.get('x-request-id') || '',
                        timestamp: new Date().toISOString()
                    }
                });

            default:
                return res.status(400).json({
                    success: false,
                    error: { code: "VALIDATION_ERROR", message: "Invalid action. Must be one of: top-up, set-auto-recharge, update-payment-method.", details: {} },
                    meta: { timestamp: new Date().toISOString() }
                });
        }
    } catch (error) {
        console.error(error);
        return next(error);
    }
}
