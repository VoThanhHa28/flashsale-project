module.exports = {
    /**
     * Nguồn gốc của reservation log.
     *
     * - redis_claim  : Redis đã trừ kho thành công (Lua script), slot được giữ.
     * - worker_commit: Worker đã lưu Order vào MongoDB thành công.
     * - rollback     : Worker xử lý thất bại, kho Redis được hoàn lại.
     */
    SOURCE: {
        REDIS_CLAIM: 'redis_claim',
        WORKER_COMMIT: 'worker_commit',
        ROLLBACK: 'rollback',
    },

    MESSAGE: {
        LOG_FAILED: '[ReservationLog] Ghi log thất bại:',
        SLOT_WON: 'Người dùng giành được slot Flash Sale',
        SLOT_COMMITTED: 'Đơn hàng đã được lưu vào hệ thống',
        SLOT_ROLLBACK: 'Hoàn kho do xử lý thất bại',
    },
};
