import Category from '@/models/client/category'
import Post from '@/models/client/post'

export async function create(requestBody) {
    const data = new Category(requestBody)
    await data.save()
    return data
}

export async function filter() {
    // Tìm danh mục cha (parent: null)
    const categories = await Category.find({parent: null}).lean()

    // Hàm đệ quy lấy danh mục con
    const getChildren = async (category) => {
        // Tìm tất cả danh mục con của category
        const children = await Category.find({parent: category._id}).lean()

        // Nếu có danh mục con, tiếp tục đệ quy để tìm các danh mục con của chúng
        for (const child of children) {
            // Đệ quy và gán children cho mỗi child
            child.children = await getChildren(child)
        }

        return children // Trả về danh sách danh mục con
    }

    // Lấy danh mục con cho từng danh mục cha
    for (const category of categories) {
        category.children = await getChildren(category)
    }

    // Để kiểm tra kết quả
    // console.log(JSON.stringify(categories, null, 2))

    return categories
}

export async function filterPost(body) {
    console.log(body)
    // Tách chuỗi thành mảng
    const categoryIdsArray = body.category_id.split(',')

    // Lấy ID đầu tiên trong mảng
    const firstCategoryId = categoryIdsArray[0]
    console.log(firstCategoryId)
    const data = await Post.find({category_id: firstCategoryId})
    return data
}
