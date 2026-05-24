const express = require('express')
const router  = express.Router()
const db      = require('../banco')
const { verificarToken, verificarAdmin } = require('../middlewares/auth')

router.use(verificarToken)

// POST /api/pedidos — criar pedido
router.post('/', (req, res) => {
  try {
    const { itens } = req.body
    if (!itens || itens.length === 0) return res.status(400).json({ erro: 'Carrinho vazio' })

    let total = 0
    const itensValidados = []

    for (const item of itens) {
      const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(item.produto_id)
      if (!produto) return res.status(404).json({ erro: `Produto não encontrado` })
      if (produto.estoque < item.quantidade) return res.status(409).json({ erro: `Estoque insuficiente: "${produto.nome}"` })
      total += produto.preco * item.quantidade
      itensValidados.push({ ...item, preco_unitario: produto.preco })
    }

    const criarPedido = db.transaction(() => {
      const pedido   = db.prepare('INSERT INTO pedidos (usuario_id, total) VALUES (?, ?)').run(req.usuario.id, total)
      const pedidoId = pedido.lastInsertRowid

      for (const item of itensValidados) {
        db.prepare('INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)').run(pedidoId, item.produto_id, item.quantidade, item.preco_unitario)
        db.prepare('UPDATE produtos SET estoque = estoque - ? WHERE id = ?').run(item.quantidade, item.produto_id)
      }

      db.prepare('INSERT INTO historico_pedido (pedido_id, status, mensagem) VALUES (?, ?, ?)').run(pedidoId, 'aguardando_pagamento', 'Pedido realizado!')

      return pedidoId
    })

    const pedidoId = criarPedido()
    res.status(201).json({ mensagem: 'Pedido criado!', pedido_id: pedidoId, total })
  } catch (e) {
    console.error(e)
    res.status(500).json({ erro: 'Erro ao criar pedido' })
  }
})

// GET /api/pedidos/meus
router.get('/meus', (req, res) => {
  try {
    const pedidos = db.prepare(`
      SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY criado_em DESC
    `).all(req.usuario.id)

    const resultado = pedidos.map(p => ({
      ...p,
      itens: db.prepare(`
        SELECT i.*, pr.nome, pr.imagem
        FROM itens_pedido i
        JOIN produtos pr ON pr.id = i.produto_id
        WHERE i.pedido_id = ?
      `).all(p.id),
      historico: db.prepare(
        'SELECT * FROM historico_pedido WHERE pedido_id = ? ORDER BY criado_em ASC'
      ).all(p.id)
    }))

    res.json({ pedidos: resultado })
  } catch (e) {
    console.error(e)
    res.status(500).json({ erro: 'Erro ao buscar pedidos' })
  }
})

// GET /api/pedidos/todos — admin
router.get('/todos', verificarAdmin, (req, res) => {
  try {
    const pedidos = db.prepare(`
      SELECT p.*, u.nome as usuario_nome, u.email as usuario_email
      FROM pedidos p
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      ORDER BY p.criado_em DESC
    `).all()

    const resultado = pedidos.map(p => ({
      ...p,
      itens: db.prepare(`
        SELECT i.*, pr.nome, pr.imagem
        FROM itens_pedido i
        JOIN produtos pr ON pr.id = i.produto_id
        WHERE i.pedido_id = ?
      `).all(p.id)
    }))

    res.json(resultado)
  } catch (e) {
    console.error(e)
    res.status(500).json({ erro: 'Erro ao buscar pedidos' })
  }
})

// PATCH /api/pedidos/:id — admin atualiza status
router.patch('/:id', verificarAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { status, observacao, rastreio } = req.body

    const statusValidos = ['aguardando_pagamento','pagamento_confirmado','em_separacao','enviado','entregue','cancelado']
    if (status && !statusValidos.includes(status)) return res.status(400).json({ erro: 'Status inválido' })

    const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id)
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' })

    if (status)              db.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(status, id)
    if (observacao !== undefined) db.prepare('UPDATE pedidos SET observacao = ? WHERE id = ?').run(observacao, id)
    if (rastreio  !== undefined) db.prepare('UPDATE pedidos SET rastreio = ? WHERE id = ?').run(rastreio, id)

    if (status && status !== pedido.status) {
      const msgs = { pagamento_confirmado:'Pagamento confirmado!', em_separacao:'Em separação.', enviado:'Pedido enviado!', entregue:'Pedido entregue!', cancelado:'Pedido cancelado.' }
      db.prepare('INSERT INTO historico_pedido (pedido_id, status, mensagem) VALUES (?, ?, ?)').run(id, status, msgs[status] || null)

      // Notifica via SSE
      const { clientes } = require('./status')
      clientes.forEach((cliente) => {
        if (cliente.pedidoId === id) {
          const historico = db.prepare('SELECT * FROM historico_pedido WHERE pedido_id = ? ORDER BY criado_em ASC').all(id)
          cliente.res.write(`data: ${JSON.stringify({ status, historico })}\n\n`)
        }
      })
    }

    res.json({ mensagem: 'Pedido atualizado!' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ erro: 'Erro ao atualizar pedido' })
  }
})

module.exports = router