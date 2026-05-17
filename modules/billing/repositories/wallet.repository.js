const WalletModel = require('../models/wallet');
const TransactionModel = require('../models/transaction');

exports.FindByShopId = async (shopId) => {
    return await WalletModel.findOne({ shopId });
}

exports.Create = async (data) => {
    const wallet = new WalletModel(data);
    return await wallet.save();
}

exports.FindOrCreate = async (shopId) => {
    let wallet = await WalletModel.findOne({ shopId });
    if (!wallet) {
        wallet = new WalletModel({
            shopId: shopId,
            balance: 0,
            availableBalance: 0,
            pendingCharges: 0,
        });
        await wallet.save();
    }
    return wallet;
}

exports.Update = async (shopId, update) => {
    return await WalletModel.updateOne({ shopId }, update);
}

exports.CreateTransaction = async (data) => {
    const transaction = new TransactionModel(data);
    return await transaction.save();
}
