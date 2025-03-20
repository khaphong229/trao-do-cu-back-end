import TransactionHistory from '@/models/client/transaction-history'
import User from '@/models/admin/user'
import Post from '@/models/client/post'
import { PCOIN, PCoinHelpers, PCoinMessages } from '@/configs/pcoin-system'
import { abort } from '@/utils/helpers'

// Tạo transaction mới
export async function createTransaction(data) {
    const transaction = new TransactionHistory(data)
    await transaction.save()
    return transaction
}

// Cập nhật số dư P-Coin của user và trả về số dư mới
export async function updateUserBalance(userId, amount, isLocked = false) {
    const user = await User.findById(userId)
    if (!user) {
        abort(404, 'Không tìm thấy người dùng')
    }

    const update = {
        $inc: {
            [`pcoin_balance.${isLocked ? 'locked' : 'total'}`]: amount
        }
    }
    
    const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true })
    return updatedUser.pcoin_balance.total
}

// Xử lý thưởng P-Coin khi bài đăng được duyệt
export async function handlePostReward(postId, adminId) {
    const post = await Post.findById(postId)
    if (!post) {
        abort(404, 'Không tìm thấy bài đăng')
    }

    const rewardAmount = post.pcoin_config?.reward_amount || PCOIN.AMOUNTS.DEFAULT_POST_REWARD

    // Cộng P-Coin và lấy số dư mới
    const newBalance = await updateUserBalance(post.user_id, rewardAmount)

    // Tạo transaction
    await createTransaction({
        type: PCOIN.TRANSACTION_TYPES.POST_REWARD,
        status: PCOIN.TRANSACTION_STATUS.COMPLETED,
        amount: rewardAmount,
        balance_after: newBalance,
        to_user: post.user_id,
        post_id: postId,
        approved_by: adminId
    })

    return rewardAmount
}

// Xử lý khóa P-Coin khi gửi yêu cầu
export async function handleRequestLock(userId, postId, requestId, requestType, amount) {
    const user = await User.findById(userId)
    if (!user) {
        abort(404, 'Không tìm thấy người dùng')
    }

    // Kiểm tra số dư
    if (!PCoinHelpers.checkSufficientBalance(user.pcoin_balance.total, amount)) {
        abort(400, PCoinMessages.INSUFFICIENT_BALANCE(amount, user.pcoin_balance.total))
    }

    // Khóa P-Coin và lấy số dư mới
    const newBalance = await updateUserBalance(userId, -amount)
    await updateUserBalance(userId, amount, true)

    // Tạo transaction
    await createTransaction({
        type: requestType === 'RequestsExchange' ? PCOIN.TRANSACTION_TYPES.EXCHANGE_LOCK : PCOIN.TRANSACTION_TYPES.GIFT_LOCK,
        status: PCOIN.TRANSACTION_STATUS.PENDING,
        amount: -amount,
        balance_after: newBalance,
        from_user: userId,
        to_user: null,
        post_id: postId,
        request_id: requestId,
        request_type: requestType
    })

    return amount
}

// Xử lý mở khóa P-Coin khi hủy/từ chối yêu cầu
export async function handleRequestUnlock(userId, postId, requestId, requestType, amount) {
    // Hoàn trả P-Coin và lấy số dư mới
    const newBalance = await updateUserBalance(userId, amount)
    await updateUserBalance(userId, -amount, true)

    // Tạo transaction
    await createTransaction({
        type: requestType === 'RequestsExchange' ? PCOIN.TRANSACTION_TYPES.EXCHANGE_UNLOCK : PCOIN.TRANSACTION_TYPES.GIFT_UNLOCK,
        status: PCOIN.TRANSACTION_STATUS.COMPLETED,
        amount: amount,
        balance_after: newBalance,
        from_user: null,
        to_user: userId,
        post_id: postId,
        request_id: requestId,
        request_type: requestType
    })

    return amount
}

// Xử lý hoàn tất giao dịch
export async function handleTransactionComplete(userId, postId, requestId, requestType, amount) {
    const post = await Post.findById(postId)
    if (!post) {
        abort(404, 'Không tìm thấy bài đăng')
    }

    // Cập nhật số dư cho cả hai user
    const newBalanceFrom = await updateUserBalance(userId, -amount, true)
    const newBalanceTo = await updateUserBalance(post.user_id, amount)

    // Tạo transaction
    await createTransaction({
        type: requestType === 'RequestsExchange' ? PCOIN.TRANSACTION_TYPES.EXCHANGE_COMPLETE : PCOIN.TRANSACTION_TYPES.GIFT_COMPLETE,
        status: PCOIN.TRANSACTION_STATUS.COMPLETED,
        amount: -amount,
        balance_after: newBalanceFrom,
        from_user: userId,
        to_user: post.user_id,
        post_id: postId,
        request_id: requestId,
        request_type: requestType
    })

    return amount
}

// Lấy lịch sử giao dịch của user
export async function getUserTransactions(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit
    const transactions = await TransactionHistory.find({
        $or: [{ from_user: userId }, { to_user: userId }]
    })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('from_user', 'name email')
        .populate('to_user', 'name email')
        .populate('post_id', 'title')
        .lean()

    const total = await TransactionHistory.countDocuments({
        $or: [{ from_user: userId }, { to_user: userId }]
    })

    return {
        transactions,
        total,
        page,
        limit
    }
}

// Lấy thông tin số dư P-Coin của user
export async function getUserBalance(userId) {
    const user = await User.findById(userId)
    if (!user) {
        abort(404, 'Không tìm thấy người dùng')
    }

    return {
        total: user.pcoin_balance.total,
        locked: user.pcoin_balance.locked,
        available: user.pcoin_balance.total - user.pcoin_balance.locked,
        display: {
            total: PCoinHelpers.format(user.pcoin_balance.total),
            locked: PCoinHelpers.format(user.pcoin_balance.locked),
            available: PCoinHelpers.format(user.pcoin_balance.total - user.pcoin_balance.locked)
        }
    }
}

const getTransactionHistory = async (userId) => {
    const transactions = await TransactionHistory.find({ user_id: userId })
        .sort({ created_at: -1 })
        .lean()

    return transactions
}

const getBalance = async (userId) => {
    const user = await User.findById(userId)
    if (!user) {
        abort(404, 'Không tìm thấy người dùng')
    }
    return user.pcoin_balance
}

const addPoints = async (userId, amount, description) => {
    const user = await User.findById(userId)
    if (!user) {
        abort(404, 'Không tìm thấy người dùng')
    }

    // Cập nhật số dư
    user.pcoin_balance += amount
    await user.save()

    // Lưu lịch sử giao dịch
    await TransactionHistory.create({
        user_id: userId,
        type: 'deposit',
        amount,
        description,
        balance_after: user.pcoin_balance
    })

    return user.pcoin_balance
}

const deductPoints = async (userId, amount, description) => {
    const user = await User.findById(userId)
    if (!user) {
        abort(404, 'Không tìm thấy người dùng')
    }

    if (user.pcoin_balance < amount) {
        abort(400, 'Số dư không đủ')
    }

    // Cập nhật số dư
    user.pcoin_balance -= amount
    await user.save()

    // Lưu lịch sử giao dịch
    await TransactionHistory.create({
        user_id: userId,
        type: 'withdraw',
        amount: -amount,
        description,
        balance_after: user.pcoin_balance
    })

    return user.pcoin_balance
}

export { getTransactionHistory, getBalance, addPoints, deductPoints } 