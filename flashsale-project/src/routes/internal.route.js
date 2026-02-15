"use strict";

/**
 * Route nội bộ: chỉ cho Worker (hoặc service cùng hệ thống) gọi.
 * Dùng khi Redis chết → Worker không emit Socket qua Redis adapter được
 * → Worker gọi HTTP tới Main App → Main App emit system-error tới client (Case 3).
 *
 * Env: INTERNAL_EMIT_SECRET (nếu set thì header X-Internal-Secret phải khớp).
 */
const express = require("express");
const router = express.Router();
const { getIO } = require("../config/socket");
const CONST = require("../constants");

// Secret để chỉ Worker/main app gọi được (set trong .env, cả Main App và Worker dùng chung)
const INTERNAL_SECRET = process.env.INTERNAL_EMIT_SECRET || "flashsale-internal-dev";

/**
 * POST /internal/emit-system-error
 * Body: { message?: string }
 * Header: X-Internal-Secret (bắt buộc khớp INTERNAL_EMIT_SECRET)
 * → Main App emit system-error qua Socket cho toàn bộ client đang kết nối.
 */
router.post("/emit-system-error", (req, res) => {
    const secret = req.headers["x-internal-secret"];
    if (secret !== INTERNAL_SECRET) {
        return res.status(403).json({ statusCode: 403, message: "Forbidden" });
    }

    const message = req.body?.message || "Hệ thống đang bảo trì";
    try {
        const io = getIO();
        io.emit(CONST.SOCKET.SOCKET_EVENT.SYSTEM_ERROR, { message });
        console.log("[Internal] Đã emit system-error tới client:", message);
        return res.status(200).json({ ok: true, message: "Emitted" });
    } catch (err) {
        console.warn("[Internal] Emit system-error thất bại:", err?.message);
        return res.status(500).json({ statusCode: 500, message: err?.message || "Emit failed" });
    }
});

module.exports = router;
