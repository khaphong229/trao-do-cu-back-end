import Joi from 'joi'
import { tryValidateOrDefault } from '@/utils/helpers'
import { MAX_STRING_SIZE_TEXT } from '@/configs'
import { PCOIN } from '@/configs/pcoin-system'

export const readRoot = Joi.object({
    // Hiện đang không dùng
    q: tryValidateOrDefault(Joi.string().trim(), ''),
    page: tryValidateOrDefault(Joi.number().integer().min(1), 1),
    per_page: tryValidateOrDefault(Joi.number().integer().min(1).max(100), 20),
    status: tryValidateOrDefault(Joi.string().valid('active', 'inactive', 'all'), 'all'),
    isApproved: tryValidateOrDefault(Joi.boolean(), null),
    sort_field: tryValidateOrDefault(Joi.string().valid('created_at', 'title'), 'created_at'),
    sort_order: tryValidateOrDefault(Joi.string().valid('asc', 'desc'), 'desc'),
})

export const updateApproval = Joi.object({
    isApproved: Joi.boolean().required().label('Trạng thái duyệt'),
    reason: Joi.string().when('isApproved', {
        is: false,
        then: Joi.string().required().min(0).max(MAX_STRING_SIZE_TEXT).label('Lý do từ chối'),
        otherwise: Joi.string().allow('').optional()
    }),
    rewardAmount: Joi.number().integer().min(PCOIN.AMOUNTS.MIN_POST_REWARD).max(PCOIN.AMOUNTS.MAX_POST_REWARD)
        .optional()
        .label('Số P-Coin thưởng cho người đăng bài'),
    requiredAmount: Joi.number().integer().min(PCOIN.AMOUNTS.MIN_REQUIRED).max(PCOIN.AMOUNTS.MAX_REQUEST_COST)
        .optional()
        .label('Số P-Coin yêu cầu để xin bài')
}) 