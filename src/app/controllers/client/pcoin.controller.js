import * as pcoinService from '../../services/client/pcoin.service'

// Lấy số dư P-Coin của user
export async function getBalance(req, res) {
    const balance = await pcoinService.getUserBalance(req.currentUser._id)
    res.jsonify(balance)
}

// Lấy lịch sử giao dịch P-Coin
export async function getTransactionHistory(req, res) {
    const { page = 1, limit = 10 } = req.query
    const history = await pcoinService.getUserTransactions(
        req.currentUser._id,
        parseInt(page),
        parseInt(limit)
    )
    res.jsonify(history)
} 