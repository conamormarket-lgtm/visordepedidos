/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║         Servidor Local de Impresión ZPL                  ║
 * ║         Zebra ZD230 — Red LAN                            ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Uso:        node print-server.js
 * Puerto:     3001 (HTTP — recibe ZPL desde la tablet/app)
 * Impresora:  192.168.18.71:9100 (TCP — Zebra ZD230)
 *
 * Instalar como servicio Windows (arranque automático):
 *   npm install -g pm2
 *   pm2 start print-server.js --name "visor-impresion"
 *   pm2 startup
 *   pm2 save
 */

const http = require('http');
const net = require('net');

// ─── Configuración ────────────────────────────────────────────────────────────
const CONFIG = {
    PRINTER_IP: '192.168.18.71',
    PRINTER_PORT: 9100,
    SERVER_PORT: 3001,
};
// ─────────────────────────────────────────────────────────────────────────────

const timestamp = () => new Date().toLocaleTimeString('es-PE');

const sendResponse = (res, status, payload) => {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(payload));
};

const server = http.createServer((req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

    // ── GET /ping — health check ───────────────────────────────────────────────
    if (req.method === 'GET' && req.url === '/ping') {
        sendResponse(res, 200, {
            ok: true,
            message: 'Servidor de impresión activo',
            printer: `${CONFIG.PRINTER_IP}:${CONFIG.PRINTER_PORT}`,
        });
        return;
    }

    // ── POST /imprimir — enviar ZPL a la impresora ────────────────────────────
    if (req.method === 'POST' && req.url === '/imprimir') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            // Parsear JSON
            let zpl;
            try {
                const parsed = JSON.parse(body);
                zpl = parsed.zpl;
            } catch {
                sendResponse(res, 400, { ok: false, error: 'Cuerpo JSON inválido' });
                return;
            }

            if (!zpl || typeof zpl !== 'string' || zpl.trim() === '') {
                sendResponse(res, 400, { ok: false, error: 'El campo "zpl" es requerido y no puede estar vacío' });
                return;
            }

            console.log(`\n[${timestamp()}] Nueva solicitud de impresión de: ${req.socket.remoteAddress}`);
            console.log(`  → Conectando a ${CONFIG.PRINTER_IP}:${CONFIG.PRINTER_PORT}...`);

            // Enviar ZPL por TCP al puerto 9100 de la impresora
            const socket = new net.Socket();
            let responded = false;

            const reply = (status, data) => {
                if (!responded) {
                    responded = true;
                    sendResponse(res, status, data);
                }
            };

            socket.setTimeout(6000);

            socket.connect(CONFIG.PRINTER_PORT, CONFIG.PRINTER_IP, () => {
                socket.write(zpl, 'utf8', () => {
                    socket.destroy();
                    console.log(`  ✓ ZPL enviado correctamente`);
                    reply(200, { ok: true, message: 'Ticket enviado a la impresora' });
                });
            });

            socket.on('error', (err) => {
                console.error(`  ✗ Error de conexión: ${err.message}`);
                reply(500, {
                    ok: false,
                    error: `No se pudo conectar a la impresora (${CONFIG.PRINTER_IP}): ${err.message}`,
                });
            });

            socket.on('timeout', () => {
                socket.destroy();
                console.error(`  ✗ Timeout — la impresora no respondió`);
                reply(504, {
                    ok: false,
                    error: 'La impresora no respondió (timeout). Verifica que esté encendida y en red.',
                });
            });
        });
        return;
    }

    // 404
    sendResponse(res, 404, { ok: false, error: 'Ruta no encontrada' });
});

server.listen(CONFIG.SERVER_PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║   Servidor de Impresión ZPL — Activo     ║');
    console.log('  ╠══════════════════════════════════════════╣');
    console.log(`  ║  Escuchando en:  0.0.0.0:${CONFIG.SERVER_PORT}             ║`);
    console.log(`  ║  Impresora:      ${CONFIG.PRINTER_IP}:${CONFIG.PRINTER_PORT}     ║`);
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
    console.log('  Esperando solicitudes de impresión...');
    console.log('');
});
