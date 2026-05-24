require('dotenv').config()
const express     = require('express')
const cookieParser = require('cookie-parser')

const app  = express()
const PORT = process.env.PORT || 3000

app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())
app.use(express.static('public'))

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  next()
})

// Rate limit no login
const tentativas = new Map()
app.use('/api/usuarios/login', (req, res, next) => {
  const ip = req.ip
  const agora = Date.now()
  const reg = tentativas.get(ip) || { count: 0, desde: agora }
  if (agora - reg.desde > 15 * 60 * 1000) { reg.count = 0; reg.desde = agora }
  reg.count++
  tentativas.set(ip, reg)
  if (reg.count > 10) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde 15 min.' })
  next()
})

app.use('/api/produtos',   require('./rotas/produtos'))
app.use('/api/usuarios',   require('./rotas/usuarios'))
app.use('/api/pedidos',    require('./rotas/pedidos'))
app.use('/api/avaliacoes', require('./rotas/avaliacoes'))
app.use('/api/status',     require('./rotas/status').router)

app.use((err, req, res, next) => {
  console.error('Erro:', err)
  res.status(500).json({ erro: 'Erro interno' })
})

app.listen(PORT, () => {
  console.log(`Rodando na porta ${PORT} — ${process.env.NODE_ENV}`)
})