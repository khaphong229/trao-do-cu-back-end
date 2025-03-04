import Joi from 'joi'
import mongoose from 'mongoose'
import { enumTypeEvent } from '@/configs/enumDB'

export const batchInteractionsValidate = Joi.object({
    interactions: Joi.array().items(
        Joi.object({
            event_type: Joi.string()
                .valid(...enumTypeEvent)
                .required()
                .label('Loại sự kiện'),
            category: Joi.string()
                .custom((value, helpers) => {
                    if (!mongoose.Types.ObjectId.isValid(value)) {
                        return helpers.error('any.invalid')
                    }
                    return value
                })
                .required()
                .label('ID danh mục'),
            time_event: Joi.date()
                .default(Date.now)
                .label('Thời điểm tương tác')
        })
    ).required().min(1).label('Danh sách tương tác')
}) 