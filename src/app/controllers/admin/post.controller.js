import * as postService from '@/app/services/admin/post.service'

export const readRoot = async (req, res) => {
    const limit = parseInt(req.query.pageSize)
    const current = parseInt(req.query.current)
    const result = await postService.filter(req.query, limit, current)
    res.jsonify(result)
}

export const updateApproval = async (req, res) => {
    const { id } = req.params
    const result = await postService.updatePostApproval(id, req.body)
    res.jsonify(result, 'Cập nhật trạng thái duyệt bài viết thành công')
} 