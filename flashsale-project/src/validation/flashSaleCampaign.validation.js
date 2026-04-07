git merge fix/prevent-concurrent-orders
const Joi = require("joi");

const objectId = Joi.string().hex().length(24);

const listFlashSaleCampaigns = {
    query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        includeDeleted: Joi.boolean().default(false),
    }),
};

const createFlashSaleCampaign = {
    body: Joi.object({
        campaignName: Joi.string().trim().min(1).max(200).required(),
        productIds: Joi.array().items(objectId).min(1).required(),
        startTime: Joi.date().iso().required(),
        endTime: Joi.date().iso().greater(Joi.ref("startTime")).required(),
        status: Joi.string().valid("draft", "scheduled", "running", "ended", "inactive"),
    }),
};

const flashSaleCampaignIdParam = {
    params: Joi.object({
        id: objectId.required(),
    }),
};

const updateFlashSaleCampaign = {
    params: Joi.object({
        id: objectId.required(),
    }),
    body: Joi.object({
        campaignName: Joi.string().trim().min(1).max(200),
        productIds: Joi.array().items(objectId).min(1),
        startTime: Joi.date().iso(),
        endTime: Joi.date().iso(),
        isActive: Joi.boolean(),
        status: Joi.string().valid("draft", "scheduled", "running", "ended", "inactive"),
    })
        .min(1)
        .custom((value, helpers) => {
            if (value.startTime && value.endTime) {
                const a = new Date(value.startTime);
                const b = new Date(value.endTime);
                if (a >= b) {
                    return helpers.error("custom.endAfterStart");
                }
            }
            return value;
        })
        .messages({
            "custom.endAfterStart": "Thời gian kết thúc phải sau thời gian bắt đầu",
        }),
};

module.exports = {
    listFlashSaleCampaigns,
    createFlashSaleCampaign,
    flashSaleCampaignIdParam,
    updateFlashSaleCampaign,
};
