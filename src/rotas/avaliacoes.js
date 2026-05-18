const express = require('express')
const router  = express.Router()
const db      = require('../banco')
const { verificarToken } = require('../middlewares/auth')

// Listar avaliações de um produto
router.get('/:produto_id', (req, res) => {
  const avaliacoes = db.prepare(`
    SELECT a.*, u.nome as usuario_nome
    FROM avaliacoes a
    JOIN usuarios u ON u.id = a.usuario_id
    WHERE a.produto_id = ?
    ORDER BY a.criado_em DESC
  `).all(req.params.produto_id)

  res.json(avaliacoes)
})

// Criar avaliação
router.post('/', verificarToken, (req, res) => {
  const { produto_id, nota, comentario } = req.body

  if (!nota || nota < 1 || nota > 5) {
    return res.status(400).json({ erro: 'Nota deve ser entre 1 e 5' })
  }

  const jaAvaliou = db.prepare(
    'SELECT id FROM avaliacoes WHERE produto_id = ? AND usuario_id = ?'
  ).get(produto_id, req.usuario.id)

  if (jaAvaliou) {
    return res.status(409).json({ erro: 'Você já avaliou este produto' })
  }

  db.prepare(
    'INSERT INTO avaliacoes (produto_id, usuario_id, nota, comentario) VALUES (?, ?, ?, ?)'
  ).run(produto_id, req.usuario.id, nota, comentario || null)

  res.status(201).json({ mensagem: 'Avaliação enviada!' })
})

module.exports = router