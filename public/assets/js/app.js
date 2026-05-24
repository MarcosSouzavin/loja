let carrinho     = JSON.parse(localStorage.getItem('carrinho') || '[]')
let todosProdutos = []
let slideAtual   = 0
const totalSlides = 3

document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos()
  atualizarContador()
  verificarLogin()
  iniciarCarrossel()

  document.getElementById('btn-buscar')?.addEventListener('click', filtrar)
  document.getElementById('busca')?.addEventListener('keydown', e => { if (e.key === 'Enter') filtrar() })
  document.getElementById('btn-carrinho')?.addEventListener('click', abrirCarrinho)
  document.getElementById('btn-fechar')?.addEventListener('click', fecharCarrinho)
  document.getElementById('btn-finalizar')?.addEventListener('click', finalizarPedido)
  document.getElementById('filtro-ordem')?.addEventListener('change', filtrar)
  document.getElementById('btn-limpar')?.addEventListener('click', () => {
    document.getElementById('busca').value = ''
    document.getElementById('filtro-ordem').value = ''
    document.getElementById('btn-limpar').style.display = 'none'
    renderizarProdutos(todosProdutos)
  })
  document.getElementById('btn-logout')?.addEventListener('click', logout)
})

// ── PRODUTOS ──
async function carregarProdutos() {
  const res     = await fetch('/api/produtos')
  todosProdutos = await res.json()
  renderizarProdutos(todosProdutos)
}

function filtrar() {
  const busca  = document.getElementById('busca')?.value.toLowerCase().trim() || ''
  const ordem  = document.getElementById('filtro-ordem')?.value || ''
  const btnLimpar = document.getElementById('btn-limpar')
  if (btnLimpar) btnLimpar.style.display = busca || ordem ? 'inline-flex' : 'none'

  let resultado = [...todosProdutos]
  if (busca) resultado = resultado.filter(p => p.nome.toLowerCase().includes(busca) || (p.descricao||'').toLowerCase().includes(busca))
  if (ordem === 'menor') resultado.sort((a,b) => a.preco - b.preco)
  if (ordem === 'maior') resultado.sort((a,b) => b.preco - a.preco)
  if (ordem === 'nome')  resultado.sort((a,b) => a.nome.localeCompare(b.nome))

  renderizarProdutos(resultado, busca)
}

function renderizarProdutos(produtos, busca = '') {
  const lista = document.getElementById('lista-produtos')
  const info  = document.getElementById('resultado-busca')
  if (info) info.textContent = busca ? `${produtos.length} resultado(s) para "${busca}"` : ''

  if (produtos.length === 0) {
    lista.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)"><p style="font-size:2rem">🔍</p><p>Nenhum produto encontrado.</p></div>`
    return
  }

  lista.innerHTML = produtos.map(p => `
    <div class="card-produto">
      <a href="produto.html?id=${p.id}" style="text-decoration:none;color:inherit">
        ${p.imagem ? `<img src="${p.imagem}" alt="${p.nome}" onerror="this.style.display='none'">` : `<div class="sem-imagem">📦</div>`}
        <h3>${destacar(p.nome, busca)}</h3>
      </a>
      <p class="descricao">${p.descricao || '—'}</p>
      <p class="preco">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</p>
      <p class="estoque">${p.estoque > 0 ? `${p.estoque} em estoque` : '⚠️ Sem estoque'}</p>
      <button class="btn btn-primario" style="width:100%" ${p.estoque===0?'disabled':''}
        onclick="adicionarAoCarrinho(${p.id}, '${p.nome.replace(/'/g,"\\'")}', ${p.preco}, ${p.estoque})">
        ${p.estoque === 0 ? 'Sem estoque' : 'Adicionar ao carrinho'}
      </button>
    </div>
  `).join('')
}

function destacar(texto, busca) {
  if (!busca) return texto
  return texto.replace(new RegExp(`(${busca})`, 'gi'), `<mark style="background:var(--roxo);color:white;border-radius:3px;padding:0 2px">$1</mark>`)
}

function filtrarCategoria(termo) {
  document.querySelectorAll('.nav-categorias a').forEach(a => a.classList.remove('ativo'))
  event.target.classList.add('ativo')
  renderizarProdutos(termo ? todosProdutos.filter(p => (p.nome+' '+(p.descricao||'')).toLowerCase().includes(termo)) : todosProdutos)
}

function filtrarPreco(min, max) {
  renderizarProdutos(todosProdutos.filter(p => p.preco >= min && p.preco <= max))
  const info = document.getElementById('resultado-busca')
  if (info) info.textContent = `Preço: R$ ${min} – ${max === 999999 ? '∞' : 'R$ '+max}`
  const btn = document.getElementById('btn-limpar')
  if (btn) btn.style.display = 'inline-flex'
}

// ── CARRINHO ──
function adicionarAoCarrinho(id, nome, preco, estoque) {
  const existente = carrinho.find(i => i.produto_id === id)

  if (existente) {
    if (existente.quantidade >= estoque) { toast('Quantidade máxima atingida!', 'erro'); return }
    existente.quantidade++
  } else {
    carrinho.push({ produto_id: id, nome, preco, quantidade: 1, estoque })
  }

  salvarCarrinho()
  atualizarContador()
  toast(`"${nome}" adicionado! 🛒`, 'sucesso')
}

function salvarCarrinho() {
  localStorage.setItem('carrinho', JSON.stringify(carrinho))
}

function atualizarContador() {
  const total = carrinho.reduce((s, i) => s + i.quantidade, 0)
  const el = document.getElementById('qtd-carrinho')
  if (el) el.textContent = total
}

function abrirCarrinho() {
  const lista = document.getElementById('itens-carrinho')

  if (carrinho.length === 0) {
    lista.innerHTML = '<p style="color:var(--muted);padding:1rem 0;text-align:center">Seu carrinho está vazio.</p>'
  } else {
    lista.innerHTML = carrinho.map((item, idx) => `
      <div class="item-carrinho">
        <div style="flex:1">
          <p class="item-nome">${item.nome}</p>
          <p style="color:var(--muted);font-size:.8rem">R$ ${Number(item.preco).toFixed(2).replace('.',',')} cada</p>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem">
          <button onclick="mudarQuantidade(${idx}, -1)"
            style="width:28px;height:28px;border-radius:6px;border:1px solid var(--borda);background:var(--bg);color:var(--texto);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center">−</button>
          <span style="min-width:24px;text-align:center;font-weight:700">${item.quantidade}</span>
          <button onclick="mudarQuantidade(${idx}, 1)"
            style="width:28px;height:28px;border-radius:6px;border:1px solid var(--borda);background:var(--bg);color:var(--texto);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center">+</button>
          <span class="item-preco" style="min-width:80px;text-align:right">R$ ${(item.preco * item.quantidade).toFixed(2).replace('.',',')}</span>
          <button onclick="removerDoCarrinho(${idx})"
            style="background:none;border:none;color:var(--erro);cursor:pointer;font-size:1.1rem;padding:.2rem">✕</button>
        </div>
      </div>
    `).join('')
  }

  const total = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0)
  document.getElementById('total-carrinho').textContent = total.toFixed(2).replace('.', ',')
  document.getElementById('modal-carrinho').style.display = 'flex'
}

function mudarQuantidade(idx, delta) {
  const item = carrinho[idx]
  if (!item) return
  const novaQtd = item.quantidade + delta
  if (novaQtd < 1) { removerDoCarrinho(idx); return }
  if (novaQtd > (item.estoque || 99)) { toast('Estoque máximo atingido!', 'erro'); return }
  item.quantidade = novaQtd
  salvarCarrinho()
  atualizarContador()
  abrirCarrinho()
}

function removerDoCarrinho(idx) {
  const nome = carrinho[idx]?.nome
  carrinho.splice(idx, 1)
  salvarCarrinho()
  atualizarContador()
  abrirCarrinho()
  if (nome) toast(`"${nome}" removido`, 'info')
}

function fecharCarrinho() {
  document.getElementById('modal-carrinho').style.display = 'none'
}

async function finalizarPedido() {
  if (carrinho.length === 0) { toast('Carrinho vazio!', 'erro'); return }

  const btn = document.getElementById('btn-finalizar')
  btn.textContent = 'Processando...'
  btn.disabled    = true

  const res  = await fetch('/api/pedidos', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ itens: carrinho.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade })) })
  })
  const data = await res.json()

  btn.textContent = 'Finalizar Pedido'
  btn.disabled    = false

  if (res.ok) {
    toast(`Pedido #${data.pedido_id} criado! ✅`, 'sucesso')
    carrinho = []
    salvarCarrinho()
    atualizarContador()
    fecharCarrinho()
    carregarProdutos()
    setTimeout(() => window.location.href = 'pedidos.html', 1500)
  } else {
    toast(data.erro || 'Faça login para finalizar', 'erro')
  }
}

// ── AUTH ──
async function verificarLogin() {
  const res = await fetch('/api/usuarios/perfil').catch(() => null)
  if (res && res.ok) {
    const data = await res.json()
    const areaLogado = document.getElementById('area-logado')
    const linkLogin  = document.getElementById('link-login')
    const userEl     = document.getElementById('usuario-logado')
    const linkAdmin  = document.getElementById('link-admin')

    if (userEl)     userEl.textContent          = `Olá, ${data.nome}`
    if (areaLogado) areaLogado.style.display     = 'flex'
    if (linkLogin)  linkLogin.style.display      = 'none'
    if (linkAdmin && data.admin) linkAdmin.style.display = 'inline-flex'

    // Adiciona link de pedidos se não existir
    const areaUsuario = document.getElementById('area-usuario')
    if (areaUsuario && !document.getElementById('link-pedidos')) {
      const a = document.createElement('a')
      a.id        = 'link-pedidos'
      a.href      = 'pedidos.html'
      a.className = 'header-btn'
      a.textContent = '🧾 Pedidos'
      areaUsuario.appendChild(a)
    }
  }
}

async function logout() {
  await fetch('/api/usuarios/logout', { method: 'POST' })
  // Limpa carrinho ao deslogar — isolamento de sessão
  carrinho = []
  localStorage.removeItem('carrinho')
  toast('Até logo!', 'info')
  setTimeout(() => window.location.href = '/', 800)
}

// ── CARROSSEL ──
function irParaSlide(n) {
  slideAtual = (n + totalSlides) % totalSlides
  const slides = document.querySelector('.banner-slides')
  if (slides) slides.style.transform = `translateX(-${slideAtual * 100}%)`
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('ativo', i === slideAtual))
}

function iniciarCarrossel() {
  document.getElementById('seta-dir')?.addEventListener('click', () => irParaSlide(slideAtual + 1))
  document.getElementById('seta-esq')?.addEventListener('click', () => irParaSlide(slideAtual - 1))
  document.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('click', () => irParaSlide(parseInt(dot.dataset.slide)))
  })
  setInterval(() => irParaSlide(slideAtual + 1), 5000)
}