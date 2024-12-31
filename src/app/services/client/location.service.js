import Location from '@/models/client/locationsData'

// export async function read() {
//     const locationData = await Location.find({})
//     return locationData
// }

export async function read(body) {
    const locationData = await Location.create(body)
    return locationData
}
