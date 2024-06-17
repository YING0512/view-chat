const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

// 中間件
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 存儲在線用戶和房間的映射
const rooms = {};

// 監聽端口
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// 處理根路徑請求，返回 index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

// 處理 WebSocket 連接
io.on('connection', (socket) => {
    let userName = '';
    let roomName = '';

    // 當用戶加入聊天室
    socket.on('join', ({ name, room }) => {
        userName = name;
        roomName = room;
        socket.join(room); // 加入房間
        // 初始化房間，如果不存在
        if (!rooms[room]) {
            rooms[room] = [];
        }
        // 將用戶添加到房間的用戶列表中
        rooms[room].push(name);
        // 更新在線人數
        updateOnlineCount(room);
        // 發送消息通知有新用戶加入
        io.to(room).emit('msg', { name: '系統', msg: `${name} 加入了聊天室` });
        // 發送更新用戶列表事件
        io.to(room).emit('users', rooms[room]);
    });

    // 當接收到用戶發送的消息
    socket.on('send', (msg) => {
        // 如果消息不完整，則不處理
        if (Object.keys(msg).length < 3) return;
        // 將消息廣播給房間內所有用戶
        io.to(msg.room).emit('msg', msg);
    });

    // 當用戶斷開連接
    socket.on('disconnect', () => {
        // 如果房間名稱存在且房間中有用戶
        if (roomName && rooms[roomName]) {
            // 從房間的用戶列表中刪除離線的用戶
            rooms[roomName] = rooms[roomName].filter(user => user !== userName);
            // 更新在線人數
            updateOnlineCount(roomName);
            // 發送消息通知有用戶離開
            io.to(roomName).emit('msg', { name: '系統', msg: `${userName} 離開了聊天室` });
            // 發送更新用戶列表事件
            io.to(roomName).emit('users', rooms[roomName]);
        }
    });

    // 更新在線人數的函數
    function updateOnlineCount(room) {
        const onlineCount = rooms[room].length;
        io.to(room).emit('online', onlineCount);
    }
});
