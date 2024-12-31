import Joi from 'joi'
import mongoose from 'mongoose'
import {MAX_STRING_SIZE, VALIDATE_PHONE_REGEX} from '@/configs'

export const createReceiveRequestValidate = Joi.object({
    post_id: Joi.string()
        .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                return helpers.error('any.invalid')
            }
            return value
        })
        .required()
        .label('ID bài post'),

    user_req_id: Joi.string()
        .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                return helpers.error('any.invalid')
            }
            return value
        })
        .required()
        .label('ID người yêu cầu'),

    contact_phone: Joi.string()
        .trim()
        .pattern(VALIDATE_PHONE_REGEX)
        .optional()
        .label('Số điện thoại liên hệ'),

    contact_social_media: Joi.object({
        facebook: Joi.string().uri().optional(),
        zalo: Joi.string().optional(),
        instagram: Joi.string().uri().optional(),
    })
        .optional()
        .allow('')
        .label('Liên hệ mạng xã hội'),

    contact_address: Joi.string().trim().max(MAX_STRING_SIZE).optional().label('Địa chỉ liên hệ'),

    reason_receive: Joi.string().trim().min(10).max(MAX_STRING_SIZE).allow('').label('Lý do nhận'),

    status: Joi.string()
        .valid('pending', 'accepted', 'rejected')
        .optional()
        .default('pending')
        .label('Trạng thái yêu cầu'),
})
