const express = require('express')
const router = express.Router()
const db = require('../banco')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { verificarToken } = require('../middlewares/auth')

const SEGREDO = process.env.JWT_SECRET

// Cadastro
router.post('/cadastrar', async (req, res) => {
  const { nome, email, senha } = req.body
  if (!nome || !email || !senha)
    return res.status(400).json({ erro: 'Preencha todos os campos' })

  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email)
  if (existe) return res.status(409).json({ erro: 'E-mail já cadastrado' })

  const senhaHash = await bcrypt.hash(senha, 10)
  const resultado = db.prepare(
    'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)'
  ).run(nome, email, senhaHash)

  res.status(201).json({ id: resultado.lastInsertRowid, mensagem: 'Cadastro realizado!' })
})
router.post('/login', async (req, res) => {
  const { email, senha } = req.body
  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email)
  const senhaOk = usuario ? await bcrypt.compare(senha, usuario.senha) : false

  if (!usuario || !senhaOk)
    return res.status(401).json({ erro: 'E-mail ou senha inválidos' })

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, admin: usuario.admin === 1 },
    SEGREDO,
    { expiresIn: '7d' }
  )

  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
  res.json({ mensagem: 'Login realizado!', usuario: { id: usuario.id, nome: usuario.nome, admin: usuario.admin === 1 } })
})


router.post('/login-admin', async (req, res) => {
  const { email, senha } = req.body
  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email)
  const senhaOk = usuario ? await bcrypt.compare(senha, usuario.senha) : false

  if (!usuario || !senhaOk)
    return res.status(401).json({ erro: 'E-mail ou senha inválidos' })

  if (usuario.admin !== 1)
    return res.status(403).json({ erro: 'Acesso negado. Você não é administrador.' })

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, admin: true },
    SEGREDO,
    { expiresIn: '7d' }
  )

  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
  res.json({ mensagem: 'Login admin realizado!', usuario: { id: usuario.id, nome: usuario.nome } })
})

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ mensagem: 'Logout realizado!' })
})


router.get('/perfil', verificarToken, (req, res) => {
  try {
    const usuario = db.prepare('SELECT id, nome, email, admin FROM usuarios WHERE id = ?')
      .get(req.usuario.id)

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado. Faça login novamente.' })
    }

    // Retorna os dados corretos e transforma o campo admin em true/false
    return res.json({ 
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      admin: usuario.admin === 1 
    })

  } catch (error) {
    console.error("Erro ao buscar perfil:", error)
    return res.status(500).json({ erro: 'Erro interno no servidor.' })
  }
})
router.get('/listar-todos/:senha', (req, res) => {
  if (req.params.senha !== process.env.ADMIN_SETUP_KEY) {
    return res.status(403).json({ erro: 'Negado' })
  }
  const usuarios = db.prepare('SELECT id, nome, email, admin FROM usuarios').all()
  res.json(usuarios)
})
router.post('/tornar-admin', async (req, res) => {
  try {
    const { nome, senha_master } = req.body

    if (senha_master !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ erro: 'Senha master incorreta' })
    }

    const usuario = db.prepare('SELECT * FROM usuarios WHERE nome = ?').get(nome)
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })

    // Garante que a coluna admin existe
    try {
      db.prepare('ALTER TABLE usuarios ADD COLUMN admin INTEGER DEFAULT 0').run()
    } catch (e) {
      // Coluna já existe, tudo bem
    }

    db.prepare('UPDATE usuarios SET admin = 1 WHERE nome = ?').run(nome)
    res.json({ mensagem: `${usuario.nome} agora é admin!` })
  } catch (e) {
    console.error(e)
    res.status(500).json({ erro: 'Erro interno', detalhe: e.message })
  }
})
module.exports = router