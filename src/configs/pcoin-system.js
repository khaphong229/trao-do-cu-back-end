export const PCOIN = {
    // Cấu hình cơ bản
    CONFIG: {
        NAME: process.env.PCOIN_NAME || 'P-Coin',
        UNIT: process.env.PCOIN_UNIT || 'P-Coin',
        SYMBOL: process.env.PCOIN_SYMBOL || 'P',
        TRANSACTION_EXPIRY_DAYS: parseInt(process.env.PCOIN_TRANSACTION_EXPIRY_DAYS) || 7
    },

    // Giá trị mặc định
    AMOUNTS: {
        DEFAULT_POST_REWARD: parseInt(process.env.PCOIN_DEFAULT_POST_REWARD) || 10,
        MIN_POST_REWARD: parseInt(process.env.PCOIN_MIN_POST_REWARD) || 5,
        MAX_POST_REWARD: parseInt(process.env.PCOIN_MAX_POST_REWARD) || 100,
        MIN_REQUIRED: parseInt(process.env.PCOIN_MIN_REQUIRED_AMOUNT) || 1
    },

    // Loại giao dịch
    TRANSACTION_TYPES: {
        POST_REWARD: 'POST_REWARD',           // Thưởng khi bài đăng được duyệt
        EXCHANGE_LOCK: 'EXCHANGE_LOCK',       // Khóa P-Coin khi gửi yêu cầu trao đổi
        EXCHANGE_UNLOCK: 'EXCHANGE_UNLOCK',   // Mở khóa P-Coin khi hủy/từ chối trao đổi
        EXCHANGE_COMPLETE: 'EXCHANGE_COMPLETE', // Hoàn tất giao dịch trao đổi
        GIFT_LOCK: 'GIFT_LOCK',              // Khóa P-Coin khi gửi yêu cầu nhận quà
        GIFT_UNLOCK: 'GIFT_UNLOCK',          // Mở khóa P-Coin khi hủy/từ chối
        GIFT_COMPLETE: 'GIFT_COMPLETE'       // Hoàn tất giao dịch tặng quà
    },

    // Trạng thái giao dịch
    TRANSACTION_STATUS: {
        PENDING: 'pending',    // Đang chờ xử lý
        COMPLETED: 'completed', // Đã hoàn thành
        CANCELLED: 'cancelled', // Đã hủy
        EXPIRED: 'expired'     // Hết hạn
    }
}

// Helper Functions
export const PCoinHelpers = {
    // Format số P-Coin
    format: (amount) => `${amount} ${PCOIN.CONFIG.SYMBOL}`,

    // Validate số P-Coin cho bài đăng
    validatePostReward: (amount) => {
        const value = parseInt(amount)
        return !isNaN(value) && 
               value >= PCOIN.AMOUNTS.MIN_POST_REWARD && 
               value <= PCOIN.AMOUNTS.MAX_POST_REWARD
    },

    // Validate số P-Coin yêu cầu
    validateRequiredAmount: (amount) => {
        if (amount === null) return true
        const value = parseInt(amount)
        return !isNaN(value) && value >= PCOIN.AMOUNTS.MIN_REQUIRED
    },

    // Check đủ số dư
    checkSufficientBalance: (userBalance, requiredAmount) => {
        return userBalance >= requiredAmount
    }
}

// Message Templates
export const PCoinMessages = {
    INSUFFICIENT_BALANCE: (required, current) => 
        `Bạn cần tối thiểu ${PCoinHelpers.format(required)}. Số dư hiện tại: ${PCoinHelpers.format(current)}`,

    INVALID_POST_REWARD: () => 
        `Số ${PCOIN.CONFIG.UNIT} thưởng phải từ ${PCoinHelpers.format(PCOIN.AMOUNTS.MIN_POST_REWARD)} đến ${PCoinHelpers.format(PCOIN.AMOUNTS.MAX_POST_REWARD)}`,

    INVALID_REQUIRED_AMOUNT: () =>
        `Số ${PCOIN.CONFIG.UNIT} yêu cầu phải từ ${PCoinHelpers.format(PCOIN.AMOUNTS.MIN_REQUIRED)} trở lên`,

    TRANSACTION_DESCRIPTION: {
        [PCOIN.TRANSACTION_TYPES.POST_REWARD]: 'Thưởng bài đăng được duyệt',
        [PCOIN.TRANSACTION_TYPES.EXCHANGE_LOCK]: 'Khóa P-Coin cho giao dịch trao đổi',
        [PCOIN.TRANSACTION_TYPES.EXCHANGE_UNLOCK]: 'Hoàn trả P-Coin từ giao dịch trao đổi',
        [PCOIN.TRANSACTION_TYPES.EXCHANGE_COMPLETE]: 'Hoàn tất giao dịch trao đổi',
        [PCOIN.TRANSACTION_TYPES.GIFT_LOCK]: 'Khóa P-Coin cho giao dịch nhận quà',
        [PCOIN.TRANSACTION_TYPES.GIFT_UNLOCK]: 'Hoàn trả P-Coin từ giao dịch nhận quà',
        [PCOIN.TRANSACTION_TYPES.GIFT_COMPLETE]: 'Hoàn tất giao dịch nhận quà'
    }
} 