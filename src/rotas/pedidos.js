const express = require('express')
const router = express.Router()
const db = require('../banco')
const { verificarToken, verificarAdmin } = require('../middlewares/auth')

// Todas as rotas de pedido exigem login
router.use(verificarToken)

router.post('/', (req, res) => {
  const { itens } = req.body
  // itens = [{ produto_id, quantidade }, ...]

  if (!itens || itens.length === 0) {
    return res.status(400).json({ erro: 'Carrinho vazio' })
  }

  let total = 0
  const itensComPreco = []

  for (const item of itens) {
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(item.produto_id)

    if (!produto) return res.status(404).json({ erro: `Produto ${item.produto_id} não encontrado` })
    if (produto.estoque < item.quantidade) {
      return res.status(409).json({ erro: `Estoque insuficiente para "${produto.nome}"` })
    }

    total += produto.preco * item.quantidade
    itensComPreco.push({ ...item, preco_unitario: produto.preco })
  }

  const criarPedido = db.transaction(() => {
    const pedido = db.prepare(`
      INSERT INTO pedidos (usuario_id, total) VALUES (?, ?)
    `).run(req.usuario.id, total)

    for (const item of itensComPreco) {
      db.prepare(`
        INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
        VALUES (?, ?, ?, ?)
      `).run(pedido.lastInsertRowid, item.produto_id, item.quantidade, item.preco_unitario)

      db.prepare(`
        UPDATE produtos SET estoque = estoque - ? WHERE id = ?
      `).run(item.quantidade, item.produto_id)
    }

    return pedido.lastInsertRowid
  })

  const pedidoId = criarPedido()
  res.status(201).json({ mensagem: 'Pedido criado!', pedido_id: pedidoId, total })
})

router.get('/meus', (req, res) => {
  const pedidos = db.prepare(`
    SELECT p.*, COUNT(i.id) as total_itens
    FROM pedidos p
    LEFT JOIN itens_pedido i ON i.pedido_id = p.id
    WHERE p.usuario_id = ?
    GROUP BY p.id
    ORDER BY p.criado_em DESC
  `).all(req.usuario.id)

  res.json(pedidos)
})

router.get('/todos', verificarAdmin, (req, res) => {
  const pedidos = db.prepare(`
    SELECT p.*, u.nome as usuario_nome, u.email as usuario_email
    FROM pedidos p
    LEFT JOIN usuarios u ON u.id = p.usuario_id
    ORDER BY p.criado_em DESC
  `).all()
  res.json(pedidos)
})

module.exports = router