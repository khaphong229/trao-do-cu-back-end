import * as postService from '../../services/client/post.service'

export async function createPost(req, res) {
    await postService.create(req.body, req)
    res.status(201).jsonify('Tạo mới bài đăng thành công.')
}

// [GET] : /post?
export const readRoot = async (req, res) => {
    const limit = parseInt(req.query.pageSize)
    const current = parseInt(req.query.current)
    const result = await postService.filter(req.query, limit, current)
    res.jsonify(result)
}

export const readRootMe = async (req, res) => {
    const limit = parseInt(req.query.pageSize)
    const current = parseInt(req.query.current)
    const result = await postService.filterMe(req.query, limit, current, req)
    res.jsonify(result)
}

// [GET] : /post/:id
export const detailPost = async (req, res) => {
    const result = await postService.details(req.params.id)
    res.jsonify(result)
}
