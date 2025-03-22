import * as postService from '@/app/services/admin/post.service'

export const readRoot = async (req, res) => {
    const limit = parseInt(req.query.pageSize)
    const current = parseInt(req.query.current)
    const result = await postService.filter(req.query, limit, current)
    res.jsonify(result)
}

export const updateApproval = async (req, res) => {
    const { id } = req.params
    const { isApproved, reason, rewardAmount, requiredAmount } = req.body
    
    // Lấy ID của admin từ thông tin người dùng hiện tại
    const adminId = req.currentUser._id
    
    const result = await postService.updatePostApproval(id, { 
        isApproved, 
        reason, 
        rewardAmount: rewardAmount ? parseInt(rewardAmount) : null,
        requiredAmount: requiredAmount ? parseInt(requiredAmount) : null,
        adminId // Truyền adminId vào service
    })
    
    res.jsonify(result, 'Cập nhật trạng thái duyệt bài viết thành công')
} 

// Thêm controller để cập nhật slug cho tất cả bài viết (chỉ admin mới được dùng)
export const updateAllSlugs = async (req, res) => {
    const result = await postService.generateSlugsForExistingPosts()
    res.jsonify(result)
}
