import Joi from 'joi'
import mongoose from 'mongoose'

export const updateInterestsValidate = Joi.object({
    interests: Joi.array().items(
        Joi.object({
            category_id: Joi.string()
                .custom((value, helpers) => {
                    if (!mongoose.Types.ObjectId.isValid(value)) {
                        return helpers.error('any.invalid')
                    }
                    return value
                })
                .required()
                .label('ID danh mục'),
            category_name: Joi.string().required().label('Tên danh mục'),
        })
    ).required().label('Danh sách quan tâm'),
}) 