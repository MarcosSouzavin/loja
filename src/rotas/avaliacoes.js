const express = require('express')
const router  = express.Router()
const db      = require('../banco')
const { verificarToken } = require('../middlewares/auth')

// GET /api/avaliacoes/:produto_id
router.get('/:produto_id', (req, res) => {
  try {
    const avaliacoes = db.prepare(`
      SELECT a.id, a.nota, a.comentario, a.criado_em, u.nome as usuario_nome
      FROM avaliacoes a
      JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.produto_id = ?
      ORDER BY a.criado_em DESC
    `).all(req.params.produto_id)

    const media = avaliacoes.length
      ? avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length
      : 0

    res.json({ avaliacoes, media: parseFloat(media.toFixed(1)), total: avaliacoes.length })
  } catch (e) {
    console.error(e)
    res.status(500).json({ erro: 'Erro ao buscar avaliações' })
  }
})

// POST /api/avaliacoes
router.post('/', verificarToken, (req, res) => {
  try {
    const { produto_id, nota, comentario } = req.body

    if (!produto_id) return res.status(400).json({ erro: 'Produto não informado' })
    if (!nota || nota < 1 || nota > 5) return res.status(400).json({ erro: 'Nota deve ser entre 1 e 5' })

    const produto = db.prepare('SELECT id FROM produtos WHERE id = ?').get(produto_id)
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' })

    const jaAvaliou = db.prepare(
      'SELECT id FROM avaliacoes WHERE produto_id = ? AND usuario_id = ?'
    ).get(produto_id, req.usuario.id)

    if (jaAvaliou) return res.status(409).json({ erro: 'Você já avaliou este produto' })

    db.prepare(
      'INSERT INTO avaliacoes (produto_id, usuario_id, nota, comentario) VALUES (?, ?, ?, ?)'
    ).run(produto_id, req.usuario.id, nota, comentario?.trim() || null)

    res.status(201).json({ mensagem: 'Avaliação enviada com sucesso!' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ erro: 'Erro ao salvar avaliação' })
  }
})

module.exports = router