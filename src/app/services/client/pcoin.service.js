import TransactionHistory from '@/models/client/transaction-history'
import User from '@/models/admin/user'
import Post from '@/models/client/post'
import {PCOIN, PCoinHelpers, PCoinMessages} from '@/configs/pcoin-system'
import {abort} from '@/utils/helpers'

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

    // Cập nhật số dư P-Coin vô ví chính or ví khóa
    const update = {
        $inc: {
            [`pcoin_balance.${isLocked ? 'locked' : 'total'}`]: amount,
        },
    }

    const updatedUser = await User.findByIdAndUpdate(userId, update, {new: true})
    return updatedUser.pcoin_balance.total
}

// Xử lý thưởng P-Coin đc cộng vô ví chính khi bài đăng được duyệt
// Output: Số P-Coin đc cộng vô ví chính
export async function handlePostReward(postId, adminId) {
    const post = await Post.findById(postId)
    if (!post) {
        abort(404, 'Không tìm thấy bài đăng')
    }

    // 1. Lấy số P-Coin thưởng từ bài đăng or mặc định cấu hình ở config
    const rewardAmount = post.pcoin_config?.reward_amount || PCOIN.AMOUNTS.DEFAULT_POST_REWARD

    // 2. Cộng P-Coin và lấy số dư mới của user => cộng vô ví chính (isLocked = false)
    const newBalance = await updateUserBalance(post.user_id, rewardAmount)

    // Tạo transaction gọi hàm đã định nghĩa luôn cho nhanh.
    await createTransaction({
        type: PCOIN.TRANSACTION_TYPES.POST_REWARD,
        status: PCOIN.TRANSACTION_STATUS.COMPLETED,
        amount: rewardAmount,
        balance_after: newBalance,
        to_user: post.user_id,
        post_id: postId,
        post_type: post.type, // Lưu loại bài đăng (gift hoặc exchange)
        approved_by: adminId,
        request_id: null, // Không có request_id vì đây là thưởng cho bài đăng
        request_type: null, // Không có request_type vì đây là thưởng cho bài đăng
    })

    return rewardAmount
}

// Hàm Xử lý khóa P-Coin khi gửi yêu cầu xin bài / trao đổi
export async function handleRequestLock(userId, postId, requestId, requestType, amount) {
    const user = await User.findById(userId)
    if (!user) {
        abort(404, 'Không tìm thấy người dùng')
    }

    // Lấy thông tin bài đăng để lưu post_type
    const post = await Post.findById(postId)
    if (!post) {
        abort(404, 'Không tìm thấy bài đăng')
    }

    // Kiểm tra xem giao dịch đã được xử lý trước đó chưa
    const existingTransaction = await TransactionHistory.findOne({
        request_id: requestId,
        request_type: requestType,
        type: requestType === 'RequestsExchange' 
            ? PCOIN.TRANSACTION_TYPES.EXCHANGE_LOCK 
            : PCOIN.TRANSACTION_TYPES.GIFT_LOCK,
        status: PCOIN.TRANSACTION_STATUS.PENDING
    })

    // Nếu đã có giao dịch khóa trước đó, không xử lý nữa
    if (existingTransaction) {
        return amount
    }

    // 1. Kiểm tra số dư bằng hàm config sẵn cho ezz
    if (!PCoinHelpers.checkSufficientBalance(user.pcoin_balance.total, amount)) {
        abort(400, PCoinMessages.INSUFFICIENT_BALANCE(amount, user.pcoin_balance.total))
    }

    // 2. Khóa P-Coin và lấy số dư mới
    const newBalance = await updateUserBalance(userId, -amount) // Trừ vô ví chính
    await updateUserBalance(userId, amount, true) // Cộng vô ví khóa

    // 3.Tạo transaction
    await createTransaction({
        type: requestType === 'RequestsExchange' 
            ? PCOIN.TRANSACTION_TYPES.EXCHANGE_LOCK 
            : PCOIN.TRANSACTION_TYPES.GIFT_LOCK,
        status: PCOIN.TRANSACTION_STATUS.PENDING,
        amount: -amount,
        balance_after: newBalance,
        from_user: userId, // Người gửi yêu cầu
        to_user: post.user_id._id, // Người nhận yêu cầu
        post_id: postId,
        post_type: post.type, // Thêm post_type
        request_id: requestId,
        request_type: requestType
    })

    return amount
}

// Hàm Xử lý mở khóa P-Coin khi hủy/từ chối yêu cầu từ chủ bài viết
export async function handleRequestUnlock(userId, postId, requestId, requestType, amount) {
    // Lấy thông tin bài đăng để lưu post_type
    const post = await Post.findById(postId)
    if (!post) {
        abort(404, 'Không tìm thấy bài đăng')
    }

    // Kiểm tra xem giao dịch đã được xử lý trước đó chưa
    const existingTransaction = await TransactionHistory.findOne({
        request_id: requestId,
        request_type: requestType,
        type: requestType === 'RequestsExchange' 
            ? PCOIN.TRANSACTION_TYPES.EXCHANGE_UNLOCK 
            : PCOIN.TRANSACTION_TYPES.GIFT_UNLOCK,
        status: PCOIN.TRANSACTION_STATUS.COMPLETED
    })

    // Nếu đã có giao dịch hoàn trả trước đó, không xử lý nữa
    if (existingTransaction) {
        return amount
    }

    // 1. Hoàn trả P-Coin và lấy số dư mới
    const newBalance = await updateUserBalance(userId, amount) // Cộng vô ví chính
    await updateUserBalance(userId, -amount, true) // Trừ vô ví khóa

    // 2. Tạo transaction
    await createTransaction({
        type: requestType === 'RequestsExchange' 
            ? PCOIN.TRANSACTION_TYPES.EXCHANGE_UNLOCK 
            : PCOIN.TRANSACTION_TYPES.GIFT_UNLOCK,
        status: PCOIN.TRANSACTION_STATUS.COMPLETED,
        amount: amount,
        balance_after: newBalance,
        from_user: post.user_id._id, // Người gửi yêu cầu
        to_user: userId, // Người nhận yêu cầu
        post_id: postId,
        post_type: post.type, // Thêm post_type
        request_id: requestId,
        request_type: requestType
    })

    return amount
}

// Hàm Xử lý hoàn tất giao dịch P-Coin khi chủ bài viết chấp nhận yêu cầu
export async function handleTransactionComplete(userId, postId, requestId, requestType, amount) {
    // Lấy thông tin bài đăng để lưu post_type
    const post = await Post.findById(postId)
    if (!post) {
        abort(404, 'Không tìm thấy bài đăng')
    }

    // Kiểm tra xem giao dịch đã được xử lý trước đó chưa
    const existingTransaction = await TransactionHistory.findOne({
        request_id: requestId,
        request_type: requestType,
        type: requestType === 'RequestsExchange' 
            ? PCOIN.TRANSACTION_TYPES.EXCHANGE_COMPLETE 
            : PCOIN.TRANSACTION_TYPES.GIFT_COMPLETE,
        status: PCOIN.TRANSACTION_STATUS.COMPLETED
    })

    // Nếu đã có giao dịch hoàn tất trước đó, không xử lý nữa
    if (existingTransaction) {
        return amount
    }

    // 1. Trừ P-Coin từ ví khóa
    await updateUserBalance(userId, -amount, true) // Trừ vô ví khóa

    // 2. Tạo transaction
    await createTransaction({
        type: requestType === 'RequestsExchange' 
            ? PCOIN.TRANSACTION_TYPES.EXCHANGE_COMPLETE 
            : PCOIN.TRANSACTION_TYPES.GIFT_COMPLETE,
        status: PCOIN.TRANSACTION_STATUS.COMPLETED,
        amount: -amount,
        balance_after: await getUserBalance(userId).then(balance => balance.total),
        from_user: userId,
        to_user: post.user_id,
        post_id: postId,
        post_type: post.type, // Thêm post_type
        request_id: requestId,
        request_type: requestType
    })

    return amount
}

// Lấy lịch sử giao dịch của user
export async function getUserTransactions(userId, current = 1, pageSize = 10) {
    const skip = (current - 1) * pageSize
    const transactions = await TransactionHistory.find({
        $or: [{from_user: userId}, {to_user: userId}],
    })
        .sort({created_at: -1})
        .skip(skip)
        .pageSize(pageSize)
        .populate('from_user', 'name avatar isGoogle')
        .populate('to_user', 'name avatar isGoogle')
        .populate('post_id', 'title')
        .lean()

    const total = await TransactionHistory.countDocuments({
        $or: [{from_user: userId}, {to_user: userId}],
    })

    return {
        transactions,
        total,
        current,
        pageSize,
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
            available: PCoinHelpers.format(user.pcoin_balance.total - user.pcoin_balance.locked),
        },
    }
}

// const getTransactionHistory = async (userId) => {
//     const transactions = await TransactionHistory.find({ user_id: userId })
//         .sort({ created_at: -1 })
//         .lean()

//     return transactions
// }

// // const getBalance = async (userId) => {
//     const user = await User.findById(userId)
//     if (!user) {
//         abort(404, 'Không tìm thấy người dùng')
//     }
//     return user.pcoin_balance
// }

// const addPoints = async (userId, amount, description) => {
//     const user = await User.findById(userId)
//     if (!user) {
//         abort(404, 'Không tìm thấy người dùng')
//     }

//     // Cập nhật số dư
//     user.pcoin_balance += amount
//     await user.save()

//     // Lưu lịch sử giao dịch
//     await TransactionHistory.create({
//         user_id: userId,
//         type: 'deposit',
//         amount,
//         description,
//         balance_after: user.pcoin_balance
//     })

//     return user.pcoin_balance
// }

// const deductPoints = async (userId, amount, description) => {
//     const user = await User.findById(userId)
//     if (!user) {
//         abort(404, 'Không tìm thấy người dùng')
//     }

//     if (user.pcoin_balance < amount) {
//         abort(400, 'Số dư không đủ')
//     }

//     // Cập nhật số dư
//     user.pcoin_balance -= amount
//     await user.save()

//     // Lưu lịch sử giao dịch
//     await TransactionHistory.create({
//         user_id: userId,
//         type: 'withdraw',
//         amount: -amount,
//         description,
//         balance_after: user.pcoin_balance
//     })

//     return user.pcoin_balance
// }

// export { getTransactionHistory, getBalance, addPoints, deductPoints }
