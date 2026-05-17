const db = require("../../../config/db");
const { v4: uuidv4 } = require("uuid");

async function getOrCreateShopDbId(shopId) {
  const [shop] = await db.query(
    "SELECT id FROM shops WHERE shop_id = ? LIMIT 1",
    [shopId]
  );
  if (shop.length) return shop[0].id;

  const [result] = await db.query(
    "INSERT INTO shops (shop_id, name, created_at) VALUES (?, ?, NOW())",
    [shopId, shopId]
  );
  return result.insertId;
}

exports.Create = async (data) => {
  const recordingId = uuidv4();
  const shopDbId = await getOrCreateShopDbId(data.shopId);

  await db.query(
    `INSERT INTO recordings (recording_id, shop_id, text_message, type, file_url, duration, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      recordingId,
      shopDbId,
      data.textMessage || null,
      data.type || null,
      data.fileUrl || null,
      data.duration || 0,
      data.status || "processing",
    ]
  );

  return {
    _id: recordingId,
    shopId: data.shopId,
    textMessage: data.textMessage,
    type: data.type,
    fileUrl: data.fileUrl,
    duration: data.duration,
    status: data.status,
    createdAt: new Date(),
  };
};

exports.Index = async (query, page, size) => {
  const offset = (page - 1) * size;
  const shopDbId = await getShopDbId(query.shopId);
  if (!shopDbId) return [];

  let sql = "SELECT * FROM recordings WHERE shop_id = ?";
  const params = [shopDbId];

  if (query.type) {
    sql += " AND type = ?";
    params.push(query.type);
  }
  if (query.status) {
    sql += " AND status = ?";
    params.push(query.status);
  }

  sql += " ORDER BY id DESC LIMIT ? OFFSET ?";
  params.push(size, offset);

  const [rows] = await db.query(sql, params);
  return rows;
};

exports.Count = async (query) => {
  const shopDbId = await getShopDbId(query.shopId);
  if (!shopDbId) return 0;

  let sql = "SELECT COUNT(*) as total FROM recordings WHERE shop_id = ?";
  const params = [shopDbId];

  if (query.type) {
    sql += " AND type = ?";
    params.push(query.type);
  }
  if (query.status) {
    sql += " AND status = ?";
    params.push(query.status);
  }

  const [rows] = await db.query(sql, params);
  return rows[0].total;
};

exports.Single = async (query) => {
  const [rows] = await db.query(
    "SELECT * FROM recordings WHERE recording_id = ? LIMIT 1",
    [query.recordingId || query._id]
  );
  return rows[0] || null;
};

exports.Update = async (query, update) => {
  const fields = [];
  const values = [];

  for (let key in update) {
    fields.push(`${key} = ?`);
    values.push(update[key]);
  }

  if (fields.length === 0) return;

  const sql = `UPDATE recordings SET ${fields.join(", ")} WHERE recording_id = ?`;
  values.push(query.recordingId || query._id);

  await db.query(sql, values);
};

exports.Delete = async (query) => {
  await db.query("DELETE FROM recordings WHERE recording_id = ?", [
    query.recordingId || query._id,
  ]);
};
