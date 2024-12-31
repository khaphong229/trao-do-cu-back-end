import * as categoryAdminService from '../../services/admin/categoryAdmin.service'

export async function create(req, res) {
    await categoryAdminService.create(req.body)
    res.status(201).jsonify('Tạo mới danh mục thành công.')
}

// [GET] : /category
export const readRoot = async (req, res) => {
    const result = await categoryAdminService.filter(req)
    res.jsonify(result)
}

export const readPost = async (req, res) => {
    const result = await categoryAdminService.filterPost(req.body)
    res.jsonify(result)
}
