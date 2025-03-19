import * as exchangeService from '../../services/client/exchange.service'

export async function createPost(req, res) {
    await exchangeService.create(req.body, req, res)
    res.status(201).jsonify('Yêu cầu đã được gửi đến chủ bài đăng')
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
    await exchangeService.updateStatus(req)
    res.status(201).jsonify('Phê duyệt thành công')
}

export const deleted = async (req, res) => {
    await exchangeService.remove(req.params.id)
    res.status(201).jsonify('Từ chối người dùng thành công')
}

export const countFavorites = async (req, res) => {
    const result = await exchangeService.getRequestCountByPost(req.query.postId)
    res.json(result)
}

export const getAllRequests = async (req, res) => {
    const userId = req.currentUser._id
    const result = await exchangeService.getAllRequestsByUser(userId)
    res.json(result)
} 