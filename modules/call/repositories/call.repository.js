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
  const callId = uuidv4();
  const shopDbId = await getOrCreateShopDbId(data.shopId);

  await db.query(
    `INSERT INTO calls (call_id, shop_id, to_number, channel, status, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [
      callId,
      shopDbId,
      data.to,
      data.channel || null,
      data.status,
    ]
  );

  return {
    _id: callId,
    shop_id: shopDbId,
    shopId: data.shopId,
    to: data.to,
    channel: data.channel,
    status: data.status,
    createdAt: new Date(),
  };
};

exports.Index = async (query, page, size) => {
  const offset = (page - 1) * size;
  const shopDbId = await getShopDbId(query.shopId);
  if (!shopDbId) return [];

  const [rows] = await db.query(
    `SELECT * FROM calls WHERE shop_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`,
    [shopDbId, size, offset]
  );
  return rows;
};

exports.Count = async (query) => {
  const shopDbId = await getShopDbId(query.shopId);
  if (!shopDbId) return 0;

  const [rows] = await db.query(
    `SELECT COUNT(*) as total FROM calls WHERE shop_id = ?`,
    [shopDbId]
  );
  return rows[0].total;
};

exports.Single = async (query) => {
  const [rows] = await db.query(
    `SELECT * FROM calls WHERE call_id = ? LIMIT 1`,
    [query.callId || query._id]
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

  const sql = `UPDATE calls SET ${fields.join(", ")} WHERE call_id = ?`;
  values.push(query.callId || query._id);

  await db.query(sql, values);
};

exports.Delete = async (query) => {
  await db.query(`DELETE FROM calls WHERE call_id = ?`, [
    query.callId || query._id,
  ]);
};
