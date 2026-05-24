require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
const db = require('./banco')

const app = express()
const PORT = process.env.PORT || 3000


app.use(express.json({ limit: '5mb' }))
app.use(cookieParser())
app.use(express.static('public'))

// ── Headers de segurança ──
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  next()
})


const tentativas = new Map()

function rateLimiter(req, res, next) {
  const ip = req.ip
  const agora = Date.now()
  const registro = tentativas.get(ip) || { count: 0, desde: agora }


  if (agora - registro.desde > 15 * 60 * 1000) {
    registro.count = 0
    registro.desde = agora
  }

  registro.count++
  tentativas.set(ip, registro)

  if (registro.count > 10) {
    return res.status(429).json({
      erro: 'Muitas tentativas de login. Aguarde 15 minutos.'
    })
  }

  next()
}

app.use('/api/usuarios/login', rateLimiter)
app.use('/api/usuarios/login-admin', rateLimiter)


app.use('/api/produtos',  require('./rotas/produtos'))
app.use('/api/usuarios',  require('./rotas/usuarios'))
app.use('/api/pedidos',   require('./rotas/pedidos'))
app.use('/api/avaliacoes', require('./rotas/avaliacoes'))
app.use('/api/status', require('./rotas/status').router)


// ── Rota 404 para API ──
app.use('/api', (req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' })
})


app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err)
  res.status(500).json({ erro: 'Erro interno do servidor' })
})

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
  console.log(`Ambiente: ${process.env.NODE_ENV}`)
})

