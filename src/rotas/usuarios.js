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

// Login normal
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

// Login admin — verifica se é admin antes de deixar entrar
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

// Perfil
router.get('/perfil', verificarToken, (req, res) => {
  const usuario = db.prepare('SELECT id, nome, email, admin FROM usuarios WHERE id = ?')
    .get(req.usuario.id)
  res.json({ ...usuario, admin: usuario.admin === 1 })
})

// Tornar admin (só use uma vez pelo terminal para criar seu admin)
router.post('/tornar-admin', verificarToken, (req, res) => {
  db.prepare('UPDATE usuarios SET admin = 1 WHERE id = ?').run(req.usuario.id)
  res.json({ mensagem: 'Agora você é admin! Faça login novamente.' })
})

module.exports = router