const express = require('express');
const router = express.Router();
const db = require('../banco');
const { verificarToken, verificarAdmin } = require('../middlewares/auth');

const clientes = new Map();

router.get('/pedidos', verificarToken, (req, res) => {
    const pedidoID = parseInt(req.query.pedido_id);
    const clienteID = req.usuario.id;

    const pedido = db.prepare(' SELECT id FROM pedidos WHERE id = ? AND usuario_id = ? ').get(pedidoID, clienteID);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const statusAtual = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(pedidoID);
    const historico = db.prepare('SELECT * FROM historic_pedidos WHERE pedido_id = ? ORDER BY criado_em ASC').all(pedidoID);

    res.write(`data: ${JSON.stringify({ status: statusAtual.status, historico })}\n\n`);

    const clienteId = `${usuarioId}_${pedidoId}_${Date.now()}`
    clientes.set(clienteId, { res, pedidoId });

    req.on('close', () => {
        clientes.delete(clienteId);
    });

    router.post('/:pedido_id', verificarAdmin, (req, res) => {
        const pedidoID = parseInt(req.params.pedido_id);
        const { status, msg } = req.body;
        const statusValidando = [
            'pendente',
            'processando',
            'enviado',
            'entregue',
            'cancelado'
        ];
        if (!statusValidando.includes(status)) {
            return res.status(400).json({ erro: 'Status inválido' });
        }
        const pedido = db.prepare('SELECT id FROM pedidos WHERE id = ?').get(pedidoId)
        if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });

        db.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(status, pedidoID);
        db.prepare('INSERT INTO historic_pedidos (pedido_id, status, msg) VALUES (?, ?, ?)').run(pedidoID, status, msg || null);

        const historico = db.prepare('SELECT * FROM historic_pedidos WHERE pedido_id = ? ORDER BY criado_em ASC').all(pedidoID);
        res.json({ historico });
    });
    clientes.forEach((cliente) => {
    if (cliente.pedidoId === pedidoId) {
      cliente.res.write(`data: ${JSON.stringify({ status, historico })}\n\n`)
    }
  })

  res.json({ mensagem: 'Status atualizado!' })
})

module.exports = { router, clientes };
