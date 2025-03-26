import http from 'http'
import createApp from './app'

const app = createApp()
const server = http.createServer(app)

// Tăng timeout lên 5 phút (300000ms)
server.timeout = 300000

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})

export default server 