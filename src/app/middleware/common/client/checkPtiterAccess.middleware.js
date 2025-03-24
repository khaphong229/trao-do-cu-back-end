import {abort} from '@/utils/helpers'
import Post from '@/models/client/post'

export const checkPtiterAccess = async (req, res, next) => {
    const post = await Post.findById(req.params.postId || req.body.post_id)
    
    if (!post) {
        return abort(404, 'Không tìm thấy sản phẩm')
    }

    // Nếu bài viết là PTIT Only và user không phải PTITer
    if (post.isPtiterOnly && !req.currentUser.isPtiter) {
        return abort(403, 'Sản phẩm này chỉ dành cho sinh viên PTIT. Vui lòng xác thực tài khoản trong phần tài khoản.')
    }

    next()
} 