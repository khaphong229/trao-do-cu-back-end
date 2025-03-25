import * as giftService from '../../services/client/gift.service'

export async function createPost(req, res) {
    // Lấy số P-Coin yêu cầu từ middleware
    const pcoinRequired = req.pcoinRequired || 0
    
    // Thêm user_req_id vào request body
    req.body.user_req_id = req.currentUser._id
    
    const result = await giftService.create(req.body, pcoinRequired)
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
    const result = await giftService.updateStatus(req)
    
    // Tùy chỉnh thông báo dựa trên trạng thái
    let message = 'Cập nhật trạng thái thành công'
    if (req.body.status === 'accepted') {
        message = 'Đã chấp nhận yêu cầu nhận quà tặng'
    } else if (req.body.status === 'rejected') {
        message = 'Đã từ chối yêu cầu nhận quà tặng'
    } else if (req.body.status === 'canceled') {
        message = 'Đã hủy yêu cầu nhận quà tặng'
    }
    
    res.status(201).jsonify(message)
}

export const deleted = async (req, res) => {
    await giftService.remove(req.params.id)
    res.status(201).jsonify('Từ chối người dùng thành công')
}

// export const countFavorites = async (req, res) => {
//     const result = await giftService.getRequestCountByPost(req.query.postId)
//     res.jsonify(result)
// }

// xử lí lấy nhận xét của userr
export const getAllRequests = async (req, res) => {
    const userId = req.query.userId
    
    const result = await giftService.getAllDisplayRequestsByUser(userId)
    res.json(result)
}

export const getRequestersCount = async (req, res) => {
    const result = await giftService.getRequestCountByPost(req.params.postId)
    res.jsonify(result)
}
