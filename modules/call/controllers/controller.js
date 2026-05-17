/**
 * Call Controller
 */

const CallRepo = require('../repositories/call.repository');

/* Router Methods */

exports.Create = async (req, res, next) => {
    try {
        var { to, shopId, channel } = req.body;

        if (!to) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "to (destination phone number) is required.", details: {} },
                meta: { timestamp: new Date().toISOString() }
            });
        }

        if (!shopId) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "shopId is required.", details: {} },
                meta: { timestamp: new Date().toISOString() }
            });
        }

        var phoneRegex = /^(\+?880|0)\d{7,14}$/;
        if (!phoneRegex.test(to)) {
            return res.status(400).json({
                success: false,
                error: { code: "INVALID_PHONE", message: "Invalid phone number. Must be E.164 (+880...) or local (016...) format.", details: {} },
                meta: { timestamp: new Date().toISOString() }
            });
        }

        var callData = {
            shopId: shopId,
            to: to,
            channel: channel || "var_char_100",
            status: 'queued',
            direction: 'outbound'
        };

        let call = await CallRepo.Create(callData);

        const ariService = require("../../../asterisk/ari.service");

        await ariService.makeCall({
            to: to,
            callId: call._id,
            shopId: shopId,
        });

        return res.status(202).json({
            success: true,
            data: {
                callId: call._id,
                shopId: call.shopId,
                status: call.status,
                to: call.to,
                queuedAt: call.createdAt
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

exports.Index = async (req, res, next) => {

    var query = { shopId: req.shopId },
        page = 1,
        limit = 20;

    if ('page' in req.query) page = parseInt(req.query.page);
    if ('limit' in req.query) limit = Math.min(parseInt(req.query.limit), 100);

    if ('status' in req.query) query['status'] = req.query.status;
    if ('to' in req.query) query['to'] = req.query.to;
    if ('from' in req.query) query['from'] = req.query.from;
    if ('recordingId' in req.query) query['recordingId'] = req.query.recordingId;

    if ('dateFrom' in req.query || 'dateTo' in req.query) {
        query['startedAt'] = {};
        if ('dateFrom' in req.query) query['startedAt']['$gte'] = new Date(req.query.dateFrom);
        if ('dateTo' in req.query) query['startedAt']['$lte'] = new Date(req.query.dateTo);
    }

    let sortQuery;
    if ('sort' in req.query) {
        sortQuery = {};
        var field = req.query.sort;
        var order = -1;
        if (field.startsWith('-')) {
            field = field.substring(1);
            order = -1;
        }
        sortQuery[field] = order;
    }

    try {
        const calls = await CallRepo.Index(query, page, limit, sortQuery);
        const total = await CallRepo.Count(query);
        const totalPages = Math.ceil(total / limit);
        const pagination = {
            page: page,
            limit: limit,
            total: total,
            totalPages: totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };
        return res.json({
            success: true,
            data: calls,
            meta: {
                requestId: req.get('x-request-id') || '',
                timestamp: new Date().toISOString(),
                pagination: pagination
            }
        });
    } catch (error) {
        console.error(error);
        return next(error);
    }
};
