import mongoose from 'mongoose'
import createModel from '../base'

const Category = createModel(
    'Category',
    'categories',
    {
        name: {
            type: String,
            required: true,
            uniqe: true,
        },
        description: String,
        logo: String,
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },
    },
    {}
)

export default Category
