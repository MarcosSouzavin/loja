const express = require('express')
const router = express.Router()
const db = require('../banco')
const { verificarAdmin } = require('../middlewares/auth')

// Listar todos
router.get('/', (req, res) => {
  const produtos = db.prepare('SELECT * FROM produtos').all()
  res.json(produtos)
})

// Buscar um
router.get('/:id', (req, res) => {
  const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id)
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' })
  res.json(produto)
})

// Criar — só admin
router.post('/', verificarAdmin, (req, res) => {
  const { nome, descricao, preco, estoque, imagem } = req.body
  if (!nome || !preco) return res.status(400).json({ erro: 'Nome e preço são obrigatórios' })

  const resultado = db.prepare(
    'INSERT INTO produtos (nome, descricao, preco, estoque, imagem) VALUES (?, ?, ?, ?, ?)'
  ).run(nome, descricao, preco, estoque || 0, imagem || null)

  res.status(201).json({ id: resultado.lastInsertRowid, mensagem: 'Produto criado!' })
})

// Editar — só admin
router.put('/:id', verificarAdmin, (req, res) => {
  const id = parseInt(req.params.id)
  const { nome, descricao, preco, estoque, imagem } = req.body

  const produto = db.prepare('SELECT id FROM produtos WHERE id = ?').get(id)
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' })

  db.prepare(`
    UPDATE produtos SET nome = ?, descricao = ?, preco = ?, estoque = ?, imagem = ? WHERE id = ?
  `).run(nome, descricao, preco, estoque, imagem || null, id)

  res.json({ mensagem: 'Produto atualizado!' })
})

router.delete('/:id', verificarAdmin, (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ erro: 'ID inválido' })

  const produto = db.prepare('SELECT id FROM produtos WHERE id = ?').get(id)
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' })

  // Remove os itens de pedido vinculados primeiro, depois exclui
  db.prepare('DELETE FROM itens_pedido WHERE produto_id = ?').run(id)
  db.prepare('DELETE FROM produtos WHERE id = ?').run(id)

  res.json({ mensagem: 'Produto excluído!' })
})

module.exports = router