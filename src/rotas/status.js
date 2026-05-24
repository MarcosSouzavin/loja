const express = require('express')
const router  = express.Router()
const db      = require('../banco')
const { verificarToken, verificarAdmin } = require('../middlewares/auth')

const clientes = new Map()

// GET /api/status/:pedido_id — SSE tempo real
router.get('/:pedido_id', verificarToken, (req, res) => {
  const pedidoId  = parseInt(req.params.pedido_id)
  const usuarioId = req.usuario.id

  const pedido = db.prepare(
    'SELECT id FROM pedidos WHERE id = ? AND usuario_id = ?'
  ).get(pedidoId, usuarioId)

  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' })

  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.flushHeaders()

  const statusAtual = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(pedidoId)
  const historico   = db.prepare(
    'SELECT * FROM historico_pedido WHERE pedido_id = ? ORDER BY criado_em ASC'
  ).all(pedidoId)

  res.write(`data: ${JSON.stringify({ status: statusAtual.status, historico })}\n\n`)

  const clienteId = `${usuarioId}_${pedidoId}_${Date.now()}`
  clientes.set(clienteId, { res, pedidoId })

  req.on('close', () => clientes.delete(clienteId))
})

// POST /api/status/:pedido_id — admin atualiza status
router.post('/:pedido_id', verificarAdmin, (req, res) => {
  const pedidoId = parseInt(req.params.pedido_id)
  const { status, mensagem } = req.body

  const statusValidos = [
    'aguardando_pagamento',
    'pagamento_confirmado',
    'em_separacao',
    'enviado',
    'entregue',
    'cancelado'
  ]

  if (!statusValidos.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido' })
  }

  const pedido = db.prepare('SELECT id, status FROM pedidos WHERE id = ?').get(pedidoId)
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' })

  db.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(status, pedidoId)

  if (status !== pedido.status) {
    db.prepare(
      'INSERT INTO historico_pedido (pedido_id, status, mensagem) VALUES (?, ?, ?)'
    ).run(pedidoId, status, mensagem || null)
  }

  const historico = db.prepare(
    'SELECT * FROM historico_pedido WHERE pedido_id = ? ORDER BY criado_em ASC'
  ).all(pedidoId)

  // Notifica clientes SSE conectados
  clientes.forEach((cliente) => {
    if (cliente.pedidoId === pedidoId) {
      cliente.res.write(`data: ${JSON.stringify({ status, historico })}\n\n`)
    }
  })

  res.json({ mensagem: 'Status atualizado!' })
})

module.exports = { router, clientes }