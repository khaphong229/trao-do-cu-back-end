import * as giftService from '../../services/client/gift.service'

export async function createPost(req, res) {
    await giftService.create(req.body, req, res)
    res.status(201).jsonify('Yêu cầu đã được gửi đến chủ bài đăng')
}

export const readList = async (req, res) => {
    const limit = parseInt(req.query.pageSize)
    const current = parseInt(req.query.current)
    const result = await giftService.filter(req.query, limit, current, req)
    res.jsonify(result)
}

export const readListMe = async (req, res) => {
    const limit = parseInt(req.query.pageSize)
    const current = parseInt(req.query.current)
    const result = await giftService.filterMe(req.query, limit, current, req)
    res.jsonify(result)
}

export const success = async (req, res) => {
    // Trước khi phê duyệt nên xóa các yêu cầu đã phê duyệt trước đó
    await giftService.updateStatus(req)
    res.status(201).jsonify('Phê duyệt thành công')
}

export const deleted = async (req, res) => {
    await giftService.remove(req.params.id)
    res.status(201).jsonify('Từ chối người dùng thành công')
}

export const countFavorites = async (req, res) => {
    const result = await giftService.getRequestCountByPost(req.query.postId)
    res.jsonify(result)
}

export const getAllRequests = async (req, res) => {
    const userId = req.currentUser._id
    const result = await giftService.getAllRequestsByUser(userId)
    res.json(result)
}

