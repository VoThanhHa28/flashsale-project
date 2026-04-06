const mongoose = require("mongoose");
const FlashSaleCampaign = require("../models/flashSaleCampaign.model");
const Product = require("../models/product.model");
const redisClient = require("../config/redis");
const CONST = require("../constants");
const { BadRequestError, NotFoundError } = require("../core/error.response");

class FlashSaleCampaignService {
    static syncComputedStatus(doc) {
        if (!doc || doc.is_deleted || !doc.isActive) return;
        if (doc.status === "draft" || doc.status === "inactive") return;
        const now = new Date();
        if (doc.endTime <= now) doc.status = "ended";
        else if (doc.startTime > now) doc.status = "scheduled";
        else doc.status = "running";
    }

    static async invalidateCachesForProductIds(productIds) {
        const ids = [...new Set((productIds || []).map(String))];
        await Promise.all(
            ids.map((id) => redisClient.del(CONST.REDIS.PRODUCT_INFO(id)).catch(() => {}))
        );
    }

    static async assertNoOverlappingCampaign(productIds, startTime, endTime, excludeCampaignId) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (start >= end) {
            throw new BadRequestError(CONST.PRODUCT.MESSAGE.INVALID_TIME);
        }
        for (const rawId of productIds) {
            const pid = new mongoose.Types.ObjectId(rawId);
            const filter = {
                is_deleted: false,
                isActive: true,
                productIds: pid,
                startTime: { $lt: end },
                endTime: { $gt: start },
            };
            if (excludeCampaignId) {
                filter._id = { $ne: excludeCampaignId };
            }
            const clash = await FlashSaleCampaign.findOne(filter).select("campaignName").lean();
            if (clash) {
                throw new BadRequestError(
                    `Sản phẩm đã có chiến dịch Flash Sale trùng khung giờ (${clash.campaignName}).`
                );
            }
        }
    }

    static async validateProductIdsExist(productIds) {
        const unique = [...new Set((productIds || []).map(String))];
        if (!unique.length) {
            throw new BadRequestError("Danh sách sản phẩm không được rỗng");
        }
        const count = await Product.countDocuments({
            _id: { $in: unique },
            is_deleted: false,
        });
        if (count !== unique.length) {
            throw new BadRequestError("Một hoặc nhiều sản phẩm không tồn tại");
        }
    }

    static async getReservationWindowMillisForProduct(productId) {
        const product = await Product.findOne({ _id: productId, is_deleted: false }).select("_id").lean();
        if (!product) {
            throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);
        }

        const now = Date.now();
        const pid = new mongoose.Types.ObjectId(productId);
        const active = await FlashSaleCampaign.findOne({
            is_deleted: false,
            isActive: true,
            productIds: pid,
            startTime: { $lte: new Date(now) },
            endTime: { $gte: new Date(now) },
        })
            .select("startTime endTime")
            .sort({ endTime: -1 })
            .lean();

        if (active) {
            return {
                start: new Date(active.startTime).getTime(),
                end: new Date(active.endTime).getTime(),
            };
        }

        const future = await FlashSaleCampaign.findOne({
            is_deleted: false,
            isActive: true,
            productIds: pid,
            startTime: { $gt: new Date(now) },
        })
            .select("startTime")
            .sort({ startTime: 1 })
            .lean();

        if (future) {
            throw new BadRequestError(CONST.PRODUCT.MESSAGE.NOT_STARTED);
        }

        throw new BadRequestError(CONST.PRODUCT.MESSAGE.ENDED);
    }

    static async enrichProductsWithFlashSaleWindow(products) {
        if (!products?.length) return;

        const ids = products.map((p) => p._id.toString());
        const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
        const campaigns = await FlashSaleCampaign.find({
            is_deleted: false,
            isActive: true,
            productIds: { $in: objectIds },
        })
            .select("productIds startTime endTime")
            .lean();

        const now = new Date();
        for (const p of products) {
            const id = p._id.toString();
            const rel = campaigns.filter((c) => c.productIds.some((x) => x.toString() === id));
            let chosen = null;
            const inWindow = rel.filter((c) => c.startTime <= now && c.endTime >= now);
            if (inWindow.length) {
                chosen = inWindow.reduce((a, b) => (a.endTime > b.endTime ? a : b));
            } else {
                const upcoming = rel.filter((c) => c.startTime > now);
                if (upcoming.length) {
                    chosen = upcoming.reduce((a, b) => (a.startTime < b.startTime ? a : b));
                } else {
                    const past = rel.filter((c) => c.endTime < now);
                    if (past.length) {
                        chosen = past.reduce((a, b) => (a.endTime > b.endTime ? a : b));
                    }
                }
            }
            if (chosen) {
                p.productStartTime = chosen.startTime;
                p.productEndTime = chosen.endTime;
            }
        }
    }

    static async getProductStatsBuckets() {
        const now = new Date();

        const activeIds = await FlashSaleCampaign.distinct("productIds", {
            is_deleted: false,
            isActive: true,
            startTime: { $lte: now },
            endTime: { $gte: now },
        });

        const upcomingIds = await FlashSaleCampaign.distinct("productIds", {
            is_deleted: false,
            isActive: true,
            startTime: { $gt: now },
        });

        const pastIds = await FlashSaleCampaign.distinct("productIds", {
            is_deleted: false,
            endTime: { $lt: now },
        });

        const activeSet = new Set(activeIds.map(String));
        const upcomingSet = new Set(upcomingIds.map(String));
        const endedOnly = pastIds.filter(
            (oid) => !activeSet.has(String(oid)) && !upcomingSet.has(String(oid))
        );

        return {
            activeFlashSale: activeSet.size,
            upcomingFlashSale: upcomingSet.size,
            endedFlashSale: endedOnly.length,
        };
    }

    static async findSingleProductCampaign(productId) {
        const pid = new mongoose.Types.ObjectId(productId);
        return FlashSaleCampaign.findOne({
            is_deleted: false,
            productIds: pid,
            $expr: { $eq: [{ $size: "$productIds" }, 1] },
        });
    }

    static async upsertSingleProductWindow({ productId, startTime, endTime, campaignName }) {
        const product = await Product.findOne({ _id: productId, is_deleted: false });
        if (!product) {
            throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new BadRequestError("Thời gian không hợp lệ");
        }
        if (start >= end) {
            throw new BadRequestError(CONST.PRODUCT.MESSAGE.INVALID_TIME);
        }

        let campaign = await this.findSingleProductCampaign(productId);
        if (campaign) {
            await this.assertNoOverlappingCampaign([productId], start, end, campaign._id);
            if (campaignName) campaign.campaignName = campaignName;
            campaign.startTime = start;
            campaign.endTime = end;
            this.syncComputedStatus(campaign);
            await campaign.save();
        } else {
            await this.assertNoOverlappingCampaign([productId], start, end, null);
            campaign = new FlashSaleCampaign({
                campaignName: campaignName || `Flash Sale — ${product.productName}`.slice(0, 200),
                productIds: [product._id],
                startTime: start,
                endTime: end,
                isActive: true,
                status: "scheduled",
            });
            this.syncComputedStatus(campaign);
            await campaign.save();
        }

        await this.invalidateCachesForProductIds([productId]);
        return { campaign, product };
    }

    static async hotUpsertSingleProduct({ productId, durationSeconds }) {
        const product = await Product.findOne({ _id: productId, is_deleted: false });
        if (!product) {
            throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);
        }

        const now = new Date();
        const sec = Math.max(1, Math.floor(Number(durationSeconds) || 3600));
        const endTime = new Date(now.getTime() + sec * 1000);

        let campaign = await this.findSingleProductCampaign(productId);
        if (campaign) {
            await this.assertNoOverlappingCampaign([productId], now, endTime, campaign._id);
            campaign.startTime = now;
            campaign.endTime = endTime;
            this.syncComputedStatus(campaign);
            await campaign.save();
        } else {
            await this.assertNoOverlappingCampaign([productId], now, endTime, null);
            campaign = new FlashSaleCampaign({
                campaignName: `Hot — ${product.productName}`.slice(0, 200),
                productIds: [product._id],
                startTime: now,
                endTime: endTime,
                isActive: true,
                status: "running",
            });
            this.syncComputedStatus(campaign);
            await campaign.save();
        }

        await this.invalidateCachesForProductIds([productId]);
        return { campaign, product };
    }

    static async forceStartProduct(productId) {
        const product = await Product.findOne({ _id: productId, is_deleted: false });
        if (!product) {
            throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);
        }

        const now = new Date();
        const DAY_MS = 24 * 60 * 60 * 1000;
        let campaign = await this.findSingleProductCampaign(productId);

        if (campaign) {
            const end =
                campaign.endTime < now || campaign.endTime < new Date(now.getTime() + DAY_MS)
                    ? new Date(now.getTime() + DAY_MS)
                    : campaign.endTime;
            await this.assertNoOverlappingCampaign([productId], now, end, campaign._id);
            campaign.startTime = now;
            campaign.endTime = end;
            this.syncComputedStatus(campaign);
            await campaign.save();
        } else {
            const end = new Date(now.getTime() + DAY_MS);
            await this.assertNoOverlappingCampaign([productId], now, end, null);
            campaign = new FlashSaleCampaign({
                campaignName: `Force start — ${product.productName}`.slice(0, 200),
                productIds: [product._id],
                startTime: now,
                endTime: end,
                isActive: true,
                status: "running",
            });
            this.syncComputedStatus(campaign);
            await campaign.save();
        }

        await this.invalidateCachesForProductIds([productId]);
        const lean = await Product.findById(product._id).lean();
        await this.enrichProductsWithFlashSaleWindow([lean]);
        return lean;
    }

    static async createCampaign(payload) {
        const { campaignName, productIds, startTime, endTime, status } = payload;
        await this.validateProductIdsExist(productIds);
        await this.assertNoOverlappingCampaign(productIds, startTime, endTime, null);

        const doc = new FlashSaleCampaign({
            campaignName: String(campaignName).trim(),
            productIds: productIds.map((id) => new mongoose.Types.ObjectId(id)),
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            isActive: true,
            status: status || "scheduled",
        });
        this.syncComputedStatus(doc);
        await doc.save();
        await this.invalidateCachesForProductIds(productIds);
        return doc;
    }

    static async listCampaigns({ page = 1, limit = 20, includeDeleted = false }) {
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const filter = includeDeleted ? {} : { is_deleted: false };
        const [items, total] = await Promise.all([
            FlashSaleCampaign.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            FlashSaleCampaign.countDocuments(filter),
        ]);

        return {
            campaigns: items,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        };
    }

    static async getCampaignById(id) {
        const campaign = await FlashSaleCampaign.findOne({ _id: id, is_deleted: false }).lean();
        if (!campaign) {
            throw new NotFoundError("Không tìm thấy chiến dịch");
        }
        return campaign;
    }

    static async updateCampaign(id, payload) {
        const campaign = await FlashSaleCampaign.findOne({ _id: id, is_deleted: false });
        if (!campaign) {
            throw new NotFoundError("Không tìm thấy chiến dịch");
        }

        const prevIds = campaign.productIds.map(String);
        if (payload.campaignName !== undefined) {
            campaign.campaignName = String(payload.campaignName).trim();
        }
        if (payload.productIds !== undefined) {
            await this.validateProductIdsExist(payload.productIds);
            campaign.productIds = payload.productIds.map((x) => new mongoose.Types.ObjectId(x));
        }
        if (payload.startTime !== undefined) {
            campaign.startTime = new Date(payload.startTime);
        }
        if (payload.endTime !== undefined) {
            campaign.endTime = new Date(payload.endTime);
        }
        if (payload.isActive !== undefined) {
            campaign.isActive = Boolean(payload.isActive);
        }
        if (payload.status !== undefined) {
            campaign.status = payload.status;
        }

        if (campaign.startTime >= campaign.endTime) {
            throw new BadRequestError(CONST.PRODUCT.MESSAGE.INVALID_TIME);
        }

        const nextIds = campaign.productIds.map(String);
        await this.assertNoOverlappingCampaign(
            nextIds,
            campaign.startTime,
            campaign.endTime,
            campaign._id
        );

        this.syncComputedStatus(campaign);
        await campaign.save();
        await this.invalidateCachesForProductIds([...new Set([...prevIds, ...nextIds])]);
        return campaign.toObject();
    }

    static async softDeleteCampaign(id) {
        const campaign = await FlashSaleCampaign.findOne({ _id: id, is_deleted: false });
        if (!campaign) {
            throw new NotFoundError("Không tìm thấy chiến dịch");
        }
        campaign.is_deleted = true;
        await campaign.save();
        await this.invalidateCachesForProductIds(campaign.productIds);
        return { deleted: true, id: String(campaign._id) };
    }
}

module.exports = FlashSaleCampaignService;
