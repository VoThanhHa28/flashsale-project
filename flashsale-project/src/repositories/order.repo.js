const OrderModel = require("../models/order.model");
const {
    escapeRegex,
    mapFeStatusToMongoMatch,
    buildCreatedAtRange,
    buildSort,
} = require("../utils/orderQuery.util");

const findByUserId = async (userId, options = {}) => {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 6));
    const skip = (page - 1) * limit;

    const match = { userId: String(userId) };

    const statusPart = mapFeStatusToMongoMatch(options.status);
    if (statusPart) Object.assign(match, statusPart);

    const dateRange = buildCreatedAtRange(options.dateFrom || "", options.dateTo || "");
    if (dateRange) match.createdAt = dateRange;

    const sortSpec = buildSort(options.sort || "newest");
    const searchTrim = (options.search || "").trim();
    const escaped = searchTrim ? escapeRegex(searchTrim) : "";

    const pipeline = [{ $match: match }];

    pipeline.push({
        $lookup: {
            from: "products",
            let: { pid: "$productId" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $eq: [
                                "$_id",
                                {
                                    $convert: {
                                        input: "$$pid",
                                        to: "objectId",
                                        onError: null,
                                        onNull: null,
                                    },
                                },
                            ],
                        },
                    },
                },
                { $project: { productName: 1, productPrice: 1, productThumb: 1 } },
            ],
            as: "__product",
        },
    });

    if (searchTrim) {
        pipeline.push({
            $match: {
                $or: [
                    {
                        $expr: {
                            $regexMatch: {
                                input: { $toString: "$_id" },
                                regex: escaped,
                                options: "i",
                            },
                        },
                    },
                    {
                        $expr: {
                            $regexMatch: {
                                input: {
                                    $let: {
                                        vars: { p: { $arrayElemAt: ["$__product", 0] } },
                                        in: { $ifNull: ["$$p.productName", ""] },
                                    },
                                },
                                regex: escaped,
                                options: "i",
                            },
                        },
                    },
                ],
            },
        });
    }

    pipeline.push({
        $facet: {
            totalCount: [{ $count: "total" }],
            data: [
                { $sort: sortSpec },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        userId: 1,
                        quantity: 1,
                        price: 1,
                        totalPrice: 1,
                        status: 1,
                        orderTime: 1,
                        processedAt: 1,
                        errorMessage: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        productId: {
                            $cond: {
                                if: { $gt: [{ $size: "$__product" }, 0] },
                                then: { $arrayElemAt: ["$__product", 0] },
                                else: "$productId",
                            },
                        },
                    },
                },
            ],
        },
    });

    const [agg] = await OrderModel.aggregate(pipeline).exec();
    const totalOrders = agg?.totalCount?.[0]?.total ?? 0;
    const orders = agg?.data ?? [];
    const totalPages = limit > 0 ? Math.ceil(totalOrders / limit) : 0;

    return {
        orders,
        pagination: {
            page,
            limit,
            totalOrders,
            totalPages,
        },
    };
};

const findByIdAndUserId = async (orderId, userId) => {
    const order = await OrderModel.findOne({
        _id: orderId,
        userId: userId.toString(),
    })
        .populate("productId", "productName productPrice productThumb")
        .lean();
    return order;
};

module.exports = {
    findByUserId,
    findByIdAndUserId,
};
