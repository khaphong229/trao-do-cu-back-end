import {abort} from '@/utils/helpers'
import Post from '@/models/client/post'

export const checkPtiterAccess = async (req, res, next) => {
    const post = await Post.findById(req.params.postId || req.body.post_id)
    
    if (!post) {
        return abort(404, 'Không tìm thấy bài viết')
    }

    // Nếu bài viết là PTIT Only và user không phải PTITer
    if (post.isPtiterOnly && !req.currentUser.isPtiter) {
        return abort(403, 'Bài viết này chỉ dành cho sinh viên PTIT. Vui lòng xác thực tài khoản trong phần cài đặt.')
    }

    next()
} 