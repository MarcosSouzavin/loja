let carrinho = JSON.parse(localStorage.getItem('carrinho') || '[]')
let todosProdutos = []

document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos()
  atualizarContador()
  verificarLogin()
  iniciarCarrossel()
  verificarPedidos()

  document.getElementById('btn-carrinho').addEventListener('click', abrirCarrinho)
  document.getElementById('btn-fechar').addEventListener('click', fecharCarrinho)
  document.getElementById('btn-finalizar').addEventListener('click', finalizarPedido)
})

async function carregarProdutos() {
  const res = await fetch('/api/produtos')
  todosProdutos = await res.json()
  renderizarProdutos(todosProdutos)

  // Eventos de busca e filtro
  document.getElementById('busca').addEventListener('input', filtrar)
  document.getElementById('filtro-ordem').addEventListener('change', filtrar)
  document.getElementById('btn-limpar').addEventListener('click', () => {
    document.getElementById('busca').value = ''
    document.getElementById('filtro-ordem').value = ''
    document.getElementById('btn-limpar').style.display = 'none'
    renderizarProdutos(todosProdutos)
  })
}

function filtrar() {
  const busca = document.getElementById('busca').value.toLowerCase().trim()
  const ordem = document.getElementById('filtro-ordem').value
  const btnLimpar = document.getElementById('btn-limpar')

  btnLimpar.style.display = busca || ordem ? 'inline-flex' : 'none'

  let resultado = [...todosProdutos]

  if (busca) {
    resultado = resultado.filter(p =>
      p.nome.toLowerCase().includes(busca) ||
      (p.descricao || '').toLowerCase().includes(busca)
    )
  }

  if (ordem === 'menor') resultado.sort((a, b) => a.preco - b.preco)
  if (ordem === 'maior') resultado.sort((a, b) => b.preco - a.preco)
  if (ordem === 'nome')  resultado.sort((a, b) => a.nome.localeCompare(b.nome))

  renderizarProdutos(resultado, busca)
}

function renderizarProdutos(produtos, busca = '') {
  const lista = document.getElementById('lista-produtos')
  const resultado = document.getElementById('resultado-busca')

  if (busca) {
    resultado.textContent = `${produtos.length} resultado${produtos.length !== 1 ? 's' : ''} para "${busca}"`
  } else {
    resultado.textContent = ''
  }

  if (produtos.length === 0) {
    lista.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)">
        <p style="font-size:2rem;margin-bottom:.5rem">🔍</p>
        <p>Nenhum produto encontrado.</p>
      </div>
    `
    return
  }

  lista.innerHTML = produtos.map(p => `
    <div class="card-produto">
      <a href="produto.html?id=${p.id}" style="text-decoration:none;color:inherit">
        ${p.imagem
          ? `<img src="${p.imagem}" alt="${p.nome}" onerror="this.style.display='none'">`
          : `<div class="sem-imagem">📦</div>`
        }
        <h3 style="margin-bottom:.4rem">${destacar(p.nome, busca)}</h3>
      </a>
      <p class="descricao">${p.descricao || '—'}</p>
      <p class="preco">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</p>
      <p class="estoque">${p.estoque > 0 ? `${p.estoque} em estoque` : '⚠️ Sem estoque'}</p>
      <button
        class="btn btn-primario"
        style="width:100%"
        ${p.estoque === 0 ? 'disabled' : ''}
        onclick="adicionarAoCarrinho(${p.id}, '${p.nome.replace(/'/g,"\\'")}', ${p.preco}, ${p.estoque})"
      >
        ${p.estoque === 0 ? 'Sem estoque' : 'Adicionar ao carrinho'}
      </button>
    </div>
  `).join('')
}

function adicionarAoCarrinho(id, nome, preco, estoque) {
  const existente = carrinho.find(i => i.produto_id === id)

  if (existente) {
    if (existente.quantidade >= estoque) {
      toast('Quantidade máxima atingida!', 'erro')
      return
    }
    existente.quantidade++
  } else {
    carrinho.push({ produto_id: id, nome, preco, quantidade: 1 })
  }

  salvarCarrinho()
  atualizarContador()
  toast(`"${nome}" adicionado ao carrinho!`, 'sucesso')
}

function salvarCarrinho() {
  localStorage.setItem('carrinho', JSON.stringify(carrinho))
}

function atualizarContador() {
  const total = carrinho.reduce((s, i) => s + i.quantidade, 0)
  document.getElementById('qtd-carrinho').textContent = total
}

function abrirCarrinho() {
  const lista = document.getElementById('itens-carrinho')

  if (carrinho.length === 0) {
    lista.innerHTML = '<p style="color:var(--muted);padding:1rem 0">Seu carrinho está vazio.</p>'
  } else {
    lista.innerHTML = carrinho.map((i, index) => `
      <div class="item-carrinho">
        <span class="item-nome">${i.nome} <span style="color:var(--muted)">x${i.quantidade}</span></span>
        <div style="display:flex;align-items:center;gap:1rem">
          <span class="item-preco">R$ ${(i.preco * i.quantidade).toFixed(2).replace('.', ',')}</span>
          <button onclick="removerDoCarrinho(${index})" style="background:none;border:none;color:var(--erro);cursor:pointer;font-size:1.1rem">✕</button>
        </div>
      </div>
    `).join('')
  }

  const total = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0)
  document.getElementById('total-carrinho').textContent = total.toFixed(2).replace('.', ',')
  document.getElementById('modal-carrinho').style.display = 'flex'
}

function removerDoCarrinho(index) {
  const nome = carrinho[index].nome
  carrinho.splice(index, 1)
  salvarCarrinho()
  atualizarContador()
  abrirCarrinho()
  toast(`"${nome}" removido do carrinho`, 'info')
}

function fecharCarrinho() {
  document.getElementById('modal-carrinho').style.display = 'none'
}

async function finalizarPedido() {
  if (carrinho.length === 0) { toast('Carrinho vazio!', 'erro'); return }

  const res = await fetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itens: carrinho.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade })) })
  })

  const data = await res.json()

  if (res.ok) {
    toast(`Pedido #${data.pedido_id} criado! Total: R$ ${data.total.toFixed(2)}`, 'sucesso')
    carrinho = []
    salvarCarrinho()
    atualizarContador()
    fecharCarrinho()
    carregarProdutos()
  } else {
    toast(data.erro || 'Faça login para finalizar o pedido', 'erro')
  }
}

function filtrarCategoria(termo) {
  document.querySelectorAll('.nav-categorias a').forEach(a => a.classList.remove('ativo'))
  event.target.classList.add('ativo')

  if (!termo) {
    renderizarProdutos(todosProdutos)
    return
  }
  const resultado = todosProdutos.filter(p =>
    (p.nome + ' ' + (p.descricao || '')).toLowerCase().includes(termo)
  )
  renderizarProdutos(resultado)
}

function filtrarPreco(min, max) {
  const resultado = todosProdutos.filter(p => p.preco >= min && p.preco <= max)
  renderizarProdutos(resultado)
  document.getElementById('resultado-busca').textContent =
    `Filtrando por preço: R$ ${min} – ${max === 999999 ? '∞' : 'R$ ' + max}`
  document.getElementById('btn-limpar').style.display = 'inline-flex'
}

function destacar(texto, busca) {
  if (!busca) return texto
  const regex = new RegExp(`(${busca})`, 'gi')
  return texto.replace(regex, `<mark style="background:var(--roxo);color:white;border-radius:3px;padding:0 2px">$1</mark>`)
}
async function verificarPedidos() {
   const res = await fetch('/api/usuarios/perfil').catch(() => null)
  if (res && res.ok) {
    const data = await res.json()
    document.getElementById('usuario-logado').textContent = `Olá, ${data.nome}`
    document.getElementById('area-logado').style.display = 'flex'
    document.getElementById('link-login').style.display = 'none'

    const areaUsuario = document.getElementById('area-usuario')
    if (!document.getElementById('link-pedidos')) {
      const linkPedidos = document.createElement('a')
      linkPedidos.id        = 'link-pedidos'
      linkPedidos.href      = 'pedidos.html'
      linkPedidos.className = 'header-btn'
      linkPedidos.textContent = '🧾 Pedidos'
      areaUsuario.appendChild(linkPedidos)
    }

    if (data.admin) {
      document.getElementById('link-admin').style.display = 'inline-flex'
    }
  }
}
async function verificarLogin() {
  const res = await fetch('/api/usuarios/perfil').catch(() => null)
  
  const linkLogin = document.getElementById('link-login')
  const areaLogado = document.getElementById('area-logado')
  const btnLogout = document.getElementById('btn-logout')
  const linkAdmin = document.getElementById('link-admin')

  // CASO 1: USUÁRIO LOGADO COM SUCESSO
  if (res && res.ok) {
    const data = await res.json()
    
    // 1. Esconde o botão de entrar de vez
    if (linkLogin) linkLogin.style.display = 'none'

    // 2. Mostra a área do usuário e injeta o nome correto
    if (areaLogado) areaLogado.style.display = 'inline-flex'
    const txtUsuario = document.getElementById('usuario-logado')
    if (txtUsuario) txtUsuario.textContent = `Olá, ${data.nome} `
    
    // 3. Mostra o botão de Sair e vincula o clique
    if (btnLogout) {
      btnLogout.style.display = 'inline-flex'
      btnLogout.onclick = logout  
    }

    // 4. Mostra a engrenagem APENAS se o retorno do banco for admin (true)
    if (linkAdmin) {
      linkAdmin.style.display = data.admin ? 'inline-flex' : 'none'
    }

  } 

  else {
    // 1. Garante que o botão de Entrar reapareça
    if (linkLogin) linkLogin.style.display = 'inline-flex'

    if (areaLogado) areaLogado.style.display = 'none'
    if (btnLogout) btnLogout.style.display = 'none'
    if (linkAdmin) linkAdmin.style.display = 'none'
  } 
}

async function logout() {
  await fetch('/api/usuarios/logout', { method: 'POST' })
  toast('Até logo!', 'info')
  setTimeout(() => location.reload(), 1000)
}

let slideAtual = 0
const totalSlides = 3

function irParaSlide(n) {
  slideAtual = (n + totalSlides) % totalSlides
  document.querySelector('.banner-slides').style.transform = `translateX(-${slideAtual * 100}%)`
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('ativo', i === slideAtual)
  })
}

function iniciarCarrossel() {
  document.getElementById('seta-dir').addEventListener('click', () => irParaSlide(slideAtual + 1))
  document.getElementById('seta-esq').addEventListener('click', () => irParaSlide(slideAtual - 1))

  document.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('click', () => irParaSlide(parseInt(dot.dataset.slide)))
  })

  // Troca automática a cada 5 segundos
  setInterval(() => irParaSlide(slideAtual + 1), 5000)
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarCarrossel()
})
