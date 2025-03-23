import User from '@/models/admin/user'
import Post from '@/models/client/post'
import { PCOIN, PCoinHelpers, PCoinMessages } from '@/configs/pcoin-system'
import { abort } from '@/utils/helpers'

// Middleware kiểm tra số dư P-Coin khi gửi yêu cầu
export const checkPCoinBalance = async (req, res, next) => {
    try {
        const { post_id } = req.body
        const userId = req.currentUser._id

        // Lấy thông tin bài đăng
        const post = await Post.findById(post_id)
        if (!post) {
            return abort(404, 'Không tìm thấy bài đăng')
        }

        // Lấy số P-Coin yêu cầu từ bài đăng
        const requiredAmount = post.pcoin_config?.required_amount || PCOIN.AMOUNTS.DEFAULT_REQUEST_COST

        // Nếu không yêu cầu P-Coin (requiredAmount = 0), bỏ qua kiểm tra
        if (requiredAmount <= 0) {
            req.pcoinRequired = 0
            return next()
        }

        // Lấy thông tin người dùng
        const user = await User.findById(userId)
        if (!user) {
            return abort(404, 'Không tìm thấy người dùng')
        }

        // Kiểm tra số dư
        if (!PCoinHelpers.checkSufficientBalance(user.pcoin_balance.total, requiredAmount)) {
            return abort(400, PCoinMessages.INSUFFICIENT_BALANCE(requiredAmount, user.pcoin_balance.total))
        }

        // Lưu số P-Coin yêu cầu vào request để sử dụng trong controller
        req.pcoinRequired = requiredAmount
        next()
    } catch (error) {
        next(error)
    }
} 