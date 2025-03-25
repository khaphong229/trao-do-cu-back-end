import {LINK_RESET_PASSWORD_URL, TOKEN_TYPE} from '@/configs'
import {abort, generateToken, getToken} from '@/utils/helpers'
import * as authService from '../../services/client/auth.service'
import * as userService from '../../services/admin/user.service'
import { User } from '@/models'

export async function login(req, res) {
    const validLogin = await authService.checkValidLogin(req.body)
    // console.log('validLogin', validLogin)
    if (validLogin) {
        res.jsonify(authService.authToken(validLogin))
    } else {
        abort(400, 'Email hoặc mật khẩu không đúng.')
    }
}

export async function register(req, res) {
    const newUser = await authService.register(req.body)
    const result = authService.authToken(newUser)
    res.status(201).jsonify(result, 'Đăng ký thành công.')
}

export async function logout(req, res) {
    const token = getToken(req.headers)
    await authService.blockToken(token)
    res.jsonify('Đăng xuất thành công.')
}

export async function me(req, res) {
    const result = await authService.profile(req.currentUser._id)
    res.jsonify(result)
}

export async function updateProfile(req, res) {
    await authService.updateProfile(req.currentUser, req.body)
    res.status(201).jsonify('Cập nhật thông tin cá nhân thành công.')
}

export async function changePassword(req, res) {
    await userService.resetPassword(req.currentUser, req.body.new_password)
    res.status(201).jsonify('Cập nhật mật khẩu thành công.')
}

export function forgotPassword(req, res) {
    const token = generateToken({user_id: req.currentUser._id}, TOKEN_TYPE.FORGOT_PASSWORD, 600)
    console.log(token)
    res.sendMail(req.currentUser.email, 'Quên mật khẩu', 'emails/forgot-password', {
        name: req.currentUser.name,
        linkResetPassword: `${LINK_RESET_PASSWORD_URL}?token=${encodeURIComponent(token)}`,
    })
    res.status(200).jsonify('Yêu cầu lấy lại mật khẩu thành công! Vui lòng kiểm tra email của bạn.')
}

export async function resetPassword(req, res) {
    await userService.resetPassword(req.currentUser, req.body.new_password)
    await authService.blockToken(req.params.token)
    res.status(201).jsonify('Cập nhật mật khẩu thành công.')
}

export const loginSuccess = async (req, res) => {
    try {
        const {googleId, email, name, avatar} = req.body
        
        if (!googleId) {
            return res.status(400).json({
                success: false,
                message: 'Google ID là bắt buộc'
            })
        }
        
        // Kiểm tra xem người dùng đã tồn tại chưa
        const existingUser = await User.findOne({ googleId: googleId })
        
        if (existingUser) {
            // Nếu người dùng đã tồn tại, trả về token
            return res.jsonify(authService.authToken(existingUser))
        } else {
            // Nếu không tìm thấy người dùng và có email
            if (email) {
                // Kiểm tra xem email đã tồn tại chưa
                const userWithEmail = await User.findOne({ email: email })
                
                if (userWithEmail) {
                    // Nếu email đã tồn tại, cập nhật googleId
                    userWithEmail.googleId = googleId
                    userWithEmail.isGoogle = true
                    await userWithEmail.save()
                    
                    return res.jsonify(authService.authToken(userWithEmail))
                } else {
                    // Tạo người dùng mới
                    const newUser = new User({
                        name: name || 'Google User',
                        email: email,
                        googleId: googleId,
                        avatar: avatar || '',
                        isGoogle: true,
                        status: 'active',
                        // Tạo mật khẩu ngẫu nhiên
                        password: Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10)
                    })
                    
                    await newUser.save()
                    
                    return res.jsonify(authService.authToken(newUser))
                }
            } else {
                // Nếu không có email, trả về lỗi
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy tài khoản Google và không có email để tạo tài khoản mới'
                })
            }
        }
    } catch (error) {
        console.error('Lỗi đăng nhập Google:', error)
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xử lý đăng nhập Google'
        })
    }
}

export const updateDefaultAddress = async (req, res) => {
    const { address_id } = req.body
    const user = await authService.updateDefaultAddress(address_id, req.currentUser._id)
    res.status(200).jsonify(user, 'Cập nhật địa chỉ mặc định thành công')
}
