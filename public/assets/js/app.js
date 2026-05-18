let carrinho = JSON.parse(localStorage.getItem('carrinho') || '[]')

document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos()
  atualizarContador()
  verificarLogin()

  document.getElementById('btn-carrinho').addEventListener('click', abrirCarrinho)
  document.getElementById('btn-fechar').addEventListener('click', fecharCarrinho)
  document.getElementById('btn-finalizar').addEventListener('click', finalizarPedido)
})

async function carregarProdutos() {
  const res = await fetch('/api/produtos')
  const produtos = await res.json()
  const lista = document.getElementById('lista-produtos')

  if (produtos.length === 0) {
    lista.innerHTML = '<p style="color:var(--muted)">Nenhum produto cadastrado ainda.</p>'
    return
  }

lista.innerHTML = produtos.map(p => `
  <div class="card-produto">
    <a href="produto.html?id=${p.id}" style="text-decoration:none;color:inherit">
      ${p.imagem
        ? `<img src="${p.imagem}" alt="${p.nome}" onerror="this.style.display='none'">`
        : `<div class="sem-imagem">📦</div>`
      }
      <h3 style="margin-bottom:.4rem">${p.nome}</h3>
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

async function verificarLogin() {
  const res = await fetch('/api/usuarios/perfil').catch(() => null)
  if (res && res.ok) {
    const data = await res.json()
    document.getElementById('usuario-logado').textContent = `Olá, ${data.nome}`
    document.getElementById('link-login').style.display = 'none'

    const btnLogout = document.getElementById('btn-logout')
    btnLogout.style.display = 'inline-flex'
    btnLogout.onclick = logout  // registra direto aqui, depois que o botão aparece

    const linkAdmin = document.getElementById('link-admin')
    if (data.admin) linkAdmin.style.display = 'inline-flex'
  }
}

async function logout() {
  await fetch('/api/usuarios/logout', { method: 'POST' })
  toast('Até logo!', 'info')
  setTimeout(() => location.reload(), 1000)
}