document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-login').addEventListener('click', login)
  document.getElementById('btn-cadastrar').addEventListener('click', cadastrar)
  document.getElementById('ir-cadastro').addEventListener('click', (e) => {
    e.preventDefault()
    document.getElementById('tela-login').style.display = 'none'
    document.getElementById('tela-cadastro').style.display = 'block'
  })
  document.getElementById('ir-login').addEventListener('click', (e) => {
    e.preventDefault()
    document.getElementById('tela-cadastro').style.display = 'none'
    document.getElementById('tela-login').style.display = 'block'
  })
})

async function login() {
  const email = document.getElementById('login-email').value
  const senha = document.getElementById('login-senha').value

  if (!email || !senha) { toast('Preencha todos os campos', 'erro'); return }

  const res  = await fetch('/api/usuarios/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  })
  const data = await res.json()

  if (res.ok) {
    toast('Login realizado!', 'sucesso')
    setTimeout(() => window.location.href = '/', 800)
  } else {
    toast(data.erro, 'erro')
  }
}

async function cadastrar() {
  const nome  = document.getElementById('cad-nome').value
  const email = document.getElementById('cad-email').value
  const senha = document.getElementById('cad-senha').value

  if (!nome || !email || !senha) { toast('Preencha todos os campos', 'erro'); return }
  if (senha.length < 6) { toast('Senha muito curta', 'erro'); return }

  const res  = await fetch('/api/usuarios/cadastrar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, senha })
  })
  const data = await res.json()

  if (res.ok) {
    toast('Conta criada! Faça login.', 'sucesso')
    setTimeout(() => {
      document.getElementById('tela-cadastro').style.display = 'none'
      document.getElementById('tela-login').style.display = 'block'
    }, 1000)
  } else {
    toast(data.erro, 'erro')
  }
}