import * as notificationService from '../../services/client/notification.service'
export async function readRoot(req, res) {
    // Lấy số lượng bài đăng mỗi trang và trang hiện tại từ query
    const limit = parseInt(req.query.pageSize)
    const current = parseInt(req.query.current)

    // Gọi service filter để xử lý query và phân trang
    const result = await notificationService.filter(req.query, limit, current, req)

    // Trả về kết quả dưới dạng JSON
    res.jsonify(result)
}
