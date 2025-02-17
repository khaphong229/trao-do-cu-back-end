import {dataVN} from '@/constants/dataVN'
import {VIETNAMESE_CITIES} from '@/constants/cityVN'
// export async function read() {
//     const locationData = await Location.find({})
//     return locationData
// }

export function read() {
    return dataVN
}

export function getCity() {
    return VIETNAMESE_CITIES
}
