const jwt = require('jsonwebtoken')

// Nunca mais vai ter a chave hardcoded no código
const SEGREDO = process.env.JWT_SECRET

if (!SEGREDO) {
  throw new Error('JWT_SECRET não definido no .env!')
}

function verificarToken(req, res, next) {
  const token = req.cookies?.token
  if (!token) return res.status(401).json({ erro: 'Você precisa estar logado' })

  try {
    req.usuario = jwt.verify(token, SEGREDO)
    next()
  } catch {
    return res.status(401).json({ erro: 'Sessão expirada, faça login novamente' })
  }
}

function verificarAdmin(req, res, next) {
  const token = req.cookies?.token
  if (!token) return res.status(401).json({ erro: 'Não autenticado' })

  try {
    const usuario = jwt.verify(token, SEGREDO)
    if (!usuario.admin) return res.status(403).json({ erro: 'Acesso negado' })
    req.usuario = usuario
    next()
  } catch {
    return res.status(401).json({ erro: 'Sessão expirada' })
  }
}

module.exports = { verificarToken, verificarAdmin }