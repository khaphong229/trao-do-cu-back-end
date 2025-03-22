import * as exchangeService from '../../services/client/exchange.service'

export async function createPost(req, res) {
    // Lấy số P-Coin yêu cầu từ middleware
    const pcoinRequired = req.pcoinRequired || 0
    
    // Thêm user_req_id vào request body
    req.body.user_req_id = req.currentUser._id
    
    const result = await exchangeService.create(req.body, pcoinRequired)
    res.status(201).jsonify('Yêu cầu trao đổi đã được gửi đến chủ bài đăng')
}

export const readList = async (req, res) => {
    const limit = parseInt(req.query.pageSize)
    const current = parseInt(req.query.current)
    const result = await exchangeService.filter(req.query, limit, current, req)
    res.jsonify(result)
}

export const readListMe = async (req, res) => {
    const limit = parseInt(req.query.pageSize)
    const current = parseInt(req.query.current)
    const result = await exchangeService.filterMe(req.query, limit, current, req)
    res.jsonify(result)
}

export const success = async (req, res) => {
    // Phê duyệt yêu cầu trao đổi
    await exchangeService.updateStatus(req)
    res.status(201).jsonify('Phê duyệt yêu cầu trao đổi thành công')
}

export const deleted = async (req, res) => {
    await exchangeService.remove(req.params.id)
    res.status(201).jsonify('Từ chối yêu cầu trao đổi thành công')
}

export const countFavorites = async (req, res) => {
    const result = await exchangeService.getRequestCountByPost(req.query.postId)
    res.json(result)
}

export const getAllRequests = async (req, res) => {
    const userId = req.query.userId
    const result = await exchangeService.getAllDisplayRequestsByUser(userId)
    res.json(result)
}

export const getRequestersCount = async (req, res) => {
    const result = await exchangeService.getRequestCountByPost(req.params.postId)
    res.jsonify(result)
}

export const getOthersCount = async (req, res) => {
    const result = await exchangeService.getRequestersCount(req.params.postId) 
    res.jsonify(result)
} 