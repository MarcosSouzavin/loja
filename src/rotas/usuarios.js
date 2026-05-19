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
router.post('/tornar-admin', verificarToken, (req, res) => {
  const { senha_master } = req.body
  const ip = req.ip

  if (!senha_master)
    return res.status(400).json({ erro: 'Senha master obrigatória' })

 
  let registro = db.prepare(
    'SELECT * FROM tentativas_admin WHERE ip = ?'
  ).get(ip)

  const agora = new Date()

  // Verifica se está bloqueado
  if (registro?.bloqueado_ate) {
    const bloqueadoAte = new Date(registro.bloqueado_ate)
    if (agora < bloqueadoAte) {
      const minutosRestantes = Math.ceil((bloqueadoAte - agora) / 60000)
      return res.status(429).json({
        erro: `IP bloqueado. Tente novamente em ${minutosRestantes} minuto(s).`
      })
    } else {

      db.prepare('DELETE FROM tentativas_admin WHERE ip = ?').run(ip)
      registro = null
    }
  }


  const senhaCorreta = senha_master === process.env.MASTER_SECRET

  if (!senhaCorreta) {
    const tentativasAtuais = (registro?.tentativas ?? 0) + 1

    if (tentativasAtuais >= 3) {
      // Bloqueia o IP por 1 hora
      const bloqueadoAte = new Date(agora.getTime() + 60 * 60 * 1000).toISOString()

      if (registro) {
        db.prepare(`
          UPDATE tentativas_admin
          SET tentativas = ?, bloqueado_ate = ?, ultima_tentativa = CURRENT_TIMESTAMP
          WHERE ip = ?
        `).run(tentativasAtuais, bloqueadoAte, ip)
      } else {
        db.prepare(`
          INSERT INTO tentativas_admin (ip, tentativas, bloqueado_ate)
          VALUES (?, ?, ?)
        `).run(ip, tentativasAtuais, bloqueadoAte)
      }

      return res.status(429).json({
        erro: 'Muitas tentativas incorretas. IP bloqueado por 1 hora.'
      })
    }

    const restantes = 3 - tentativasAtuais
    if (registro) {
      db.prepare(`
        UPDATE tentativas_admin
        SET tentativas = ?, ultima_tentativa = CURRENT_TIMESTAMP
        WHERE ip = ?
      `).run(tentativasAtuais, ip)
    } else {
      db.prepare('INSERT INTO tentativas_admin (ip, tentativas) VALUES (?, ?)').run(ip, tentativasAtuais)
    }

    return res.status(401).json({
      erro: `Senha master incorreta. ${restantes} tentativa(s) restante(s).`
    })
  }

  const usuario = db.prepare('SELECT admin FROM usuarios WHERE id = ?').get(req.usuario.id)
  if (usuario.admin === 1)
    return res.status(409).json({ erro: 'Você já é admin.' })


  db.prepare('UPDATE usuarios SET admin = 1 WHERE id = ?').run(req.usuario.id)
  db.prepare('DELETE FROM tentativas_admin WHERE ip = ?').run(ip)

  res.json({ mensagem: '✅ Você agora é administrador! Faça login novamente.' })
})
module.exports = router