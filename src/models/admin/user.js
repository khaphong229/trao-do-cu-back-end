import bcrypt from 'bcrypt'
import createModel from '../base'
import {infoGeneralUser} from './admin'
import mongoose from 'mongoose'

const infoFulledUser = {
    ...infoGeneralUser,
    address: [
        // input: _id trong address
        // Thêm 1 api sửa địa chỉ => only 1 true
        {
            address: { type: String, required: true },
            isDefault: { type: Boolean, default: false }
        }
    ],
    birth_date: {
        type: Date,
    },
    gender: {
        type: String,
    },
    isPtiter: {
        type: Boolean,
        default: false
    },
    category_care: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        },
    ],
    social_media: {
        type: {
            facebook: { type: String, default: '' },
            zalo: { type: String, default: '' },
            instagram: { type: String, default: '' }
        },
        default: {
            facebook: '',
            zalo: '',
            instagram: ''
        }
    },
    successful_exchanges: {
        type: Number,
        default: 0,
    },
    last_login: {
        type: Date,
    },
    isSurveyed: {
        type: Boolean,
        default: false,
    },
    pcoin_balance: {
        total: {
            type: Number,
            default: 0
        },
        locked: {
            type: Number,
            default: 0
        }
    }
}

const User = createModel('User', 'users', infoFulledUser, {
    toJSON: {
        virtuals: false,
        transform(doc, ret) {
            // eslint-disable-next-line no-unused-vars
            const {password, ...result} = ret
            return result
        },
    },
    methods: {
        verifyPassword(password) {
            return bcrypt.compareSync(password, this.password)
        },
    },
})

export default User
