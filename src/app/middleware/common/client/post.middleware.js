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
