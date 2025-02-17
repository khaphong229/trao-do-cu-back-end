import createModel from '../base'
import bcrypt from 'bcrypt'

export const infoGeneralUser = {
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        required: true,
    },
    // password: {
    //     type: String,
    //     required: true,
    //     set(password) {
    //         const salt = bcrypt.genSaltSync(10)
    //         return bcrypt.hashSync(password, salt)
    //     },
    // },
    password: {
        type: String,
        required: function () {
            // Chỉ bắt buộc password nếu không phải tài khoản Google
            return !this.isGoogle
        },
        set(password) {
            if (!password) return null
            const salt = bcrypt.genSaltSync(10)
            return bcrypt.hashSync(password, salt)
        },
    },
    googleId: {
        type: String,
        required: false, // Chỉ dùng cho tài khoản Google
    },
    isGoogle: {
        type: Boolean,
        default: false, // Mặc định là tài khoản local
    },
    phone: {
        type: String,
        required: false,
    },
    status: {
        type: String,
        required: true,
        default: 'active',
    },
    avatar: {
        type: String,
        required: false,
    },
}

const Admin = createModel('Admin', 'admins', infoGeneralUser, {
    toJSON: {
        virtuals: false,
        transform(doc, ret) {
            // eslint-disable-next-line no-unused-vars
            const {password, ...result} = ret
            return result
        },
    },
    methods: {
        // verifyPassword(password) {
        //     return bcrypt.compareSync(password, this.password)
        // },
        verifyPassword(password) {
            if (this.isGoogle) {
                // Nếu tài khoản được đăng nhập qua Google, không thể xác thực bằng mật khẩu
                throw new Error('Cannot verify password for Google account')
            }
            return bcrypt.compareSync(password, this.password)
        },
    },
})

export default Admin
