import {isValidObjectId} from 'mongoose'
import {abort} from '@/utils/helpers'
import Post from '@/models/client/post'

export async function checkId(req, res, next) {
    if (isValidObjectId(req.params.id)) {
        const data = await Post.findOne({_id: req.params.id})
        if (data) {
            req.data = data
            next()
            return
        }
    }
    abort(404, 'Không tìm thấy bài đăng này.')
}

// Thêm middleware mới để kiểm tra slug => có slug => có bài post r
export async function checkSlug(req, res, next) {
    const { slug } = req.params
    
    if (!slug) {
        return abort(400, 'Slug không được để trống')
    }
    
    const post = await Post.findOne({ slug })
    
    if (!post) {
        return abort(404, 'Không tìm thấy bài đăng này.')
    }
    
    req.data = post
    next()
}
