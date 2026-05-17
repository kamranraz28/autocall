/**
 * Recording Controller
 */

const RecordingRepo = require("../repositories/recording.repository");

/* Router Methods */

exports.Index = async (req, res, next) => {
  var shopId = req.query.shopId;

  if (!shopId) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "shopId query parameter is required.",
        details: {},
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }

  var query = { shopId: shopId },
    page = 1,
    limit = 20;

  if ("page" in req.query) page = parseInt(req.query.page);
  if ("limit" in req.query) limit = Math.min(parseInt(req.query.limit), 100);

  if ("status" in req.query) query["status"] = req.query.status;
  if ("type" in req.query) query["type"] = req.query.type;

  let sortQuery;
  if ("sort" in req.query) {
    sortQuery = {};
    var field = req.query.sort;
    var order = -1;
    if (field.startsWith("-")) {
      field = field.substring(1);
      order = -1;
    }
    sortQuery[field] = order;
  }

  try {
    const recordings = await RecordingRepo.Index(query, page, limit, sortQuery);
    const total = await RecordingRepo.Count(query);
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page: page,
      limit: limit,
      total: total,
      totalPages: totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
    return res.json({
      success: true,
      data: recordings,
      meta: {
        requestId: req.get("x-request-id") || "",
        timestamp: new Date().toISOString(),
        pagination: pagination,
      },
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

exports.Create = async (req, res, next) => {
  try {
    var { textMessage, type, shopId } = req.body;

    if (!textMessage || !type || !shopId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "textMessage, type, and shopId are required.",
          details: {},
        },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    if (textMessage.length > 2000) {
      return res.status(422).json({
        success: false,
        error: {
          code: "TEXT_MESSAGE_TOO_LONG",
          message: "textMessage exceeds max length of 2000 characters.",
          details: {},
        },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    var recordingData = {
      shopId: shopId,
      textMessage: textMessage,
      type: type,
      status: "processing",
    };

    let recording = await RecordingRepo.Create(recordingData);

    const ttsService = require("../../../asterisk/ari.service");
    const ttsResult = await ttsService.generateTTS(textMessage, recording._id);

    if (ttsResult.success) {
      await RecordingRepo.Update(
        { recordingId: recording._id },
        { file_url: ttsResult.filePath, status: "active" }
      );
      recording = await RecordingRepo.Single({ recordingId: recording._id });
    }

    return res.status(201).json({
      success: true,
      data: recording,
      meta: {
        requestId: req.get("x-request-id") || "",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

exports.Single = async (req, res, next) => {
  try {
    const recording = await RecordingRepo.Single({ recordingId: req.params.id });
    if (!recording) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Recording not found.", details: {} },
        meta: { timestamp: new Date().toISOString() },
      });
    }
    return res.json({
      success: true,
      data: recording,
      meta: {
        requestId: req.get("x-request-id") || "",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

exports.Update = async (req, res, next) => {
  try {
    const recording = await RecordingRepo.Single({ recordingId: req.params.id });
    if (!recording) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Recording not found.", details: {} },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    var allowedFields = ["status", "file_url", "duration"];
    var updates = {};
    for (var field of allowedFields) {
      if (field in req.body) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid update fields. Allowed: status, file_url, duration.",
          details: {},
        },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    await RecordingRepo.Update({ recordingId: req.params.id }, updates);
    const updated = await RecordingRepo.Single({ recordingId: req.params.id });
    return res.json({
      success: true,
      data: updated,
      meta: {
        requestId: req.get("x-request-id") || "",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

exports.Delete = async (req, res, next) => {
  try {
    const recording = await RecordingRepo.Single({ recordingId: req.params.id });
    if (!recording) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Recording not found.", details: {} },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    await RecordingRepo.Delete({ recordingId: req.params.id });
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return next(error);
  }
};
