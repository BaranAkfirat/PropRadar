const WebSocket = require('ws');

class LocalWSServer {
    constructor(port, onMessageCallback, onStatusChangeCallback) {
        this.port = port;
        this.wss = null;
        this.clients = new Set();
        this.onMessage = onMessageCallback; 
        this.onStatusChange = onStatusChangeCallback; 
    }

    start() {
        this.wss = new WebSocket.Server({ port: this.port });
        
        this.wss.on('listening', () => {
            console.log(`[Sunucu] WebSocket Server ws://localhost:${this.port} adresinde çalışıyor.`);
        });

        this.wss.on('connection', (ws) => {
            console.log(`[Sunucu] Yeni bir tarayıcı eklentisi bağlandı!`);
            this.clients.add(ws);
            
            // HATA ÇÖZÜMÜ: Fonksiyonun gerçekten var olup olmadığını kontrol ediyoruz
            if (typeof this.onStatusChange === 'function') {
                this.onStatusChange(true, this.clients.size);
            }
            
            ws.on('message', (message) => {
                try {
                    const parsedMessage = JSON.parse(message);
                    if (typeof this.onMessage === 'function') {
                        this.onMessage(parsedMessage);
                    }
                } catch (e) {
                    console.error("[Sunucu] Hatalı JSON formatı alındı:", message);
                }
            });

            ws.on('close', () => {
                console.log(`[Sunucu] Tarayıcı eklentisinin bağlantısı koptu.`);
                this.clients.delete(ws);
                if (typeof this.onStatusChange === 'function') {
                    this.onStatusChange(this.clients.size > 0, this.clients.size);
                }
            });
        });
    }

    sendCommandToExtension(commandPayload) {
        if (this.clients.size === 0) {
            console.warn("[Sunucu] Komut gönderilemiyor: Bağlı eklenti yok.");
            return false;
        }
        
        const messageStr = JSON.stringify(commandPayload);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
        return true;
    }
}

module.exports = LocalWSServer;