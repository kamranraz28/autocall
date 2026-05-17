module.exports = function (options, populate) {
  return function (req, res, next) {
    var query = { shopId: req.shopId };
    if (options.scope != undefined && options.key != undefined) {
      query[options.key] = req[options.scope][options.key];
    }
    else if (options.key != undefined) {
      query[options.key] = req.params[options.key];
    }
    else {
      query['_id'] = req.params.id;
    }

    var model = options.model.findOne(query);
    if (options.populate != undefined) {
      for (let field of options.populate) {
        model.populate({ path: field });
      }
    }
    model.exec((err, doc) => {
      if (err) return next(err);
      if (!doc) return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found.",
          details: {}
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      req['model'] = doc;
      next();
    });
  }
}
