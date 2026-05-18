// Verifica se é admin antes de mostrar qualquer coisa
async function verificarAdmin() {
  const res = await fetch('/api/usuarios/perfil').catch(() => null)
  if (!res || !res.ok) {
    window.location.href = '/login-admin.html'
    return false
  }
  const data = await res.json()
  if (!data.admin) {
    window.location.href = '/login-admin.html'
    return false
  }
  return true
}

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await verificarAdmin()
  if (!ok) return

  carregarProdutosAdmin()

  document.getElementById('btn-adicionar-produto').addEventListener('click', adicionarProduto)
  document.getElementById('btn-logout').addEventListener('click', logout)
  document.getElementById('btn-fechar-edicao').addEventListener('click', fecharEdicao)
  document.getElementById('btn-salvar-edicao').addEventListener('click', salvarEdicao)

  document.getElementById('nav-produtos').addEventListener('click', (e) => {
    e.preventDefault()
    document.getElementById('secao-produtos').style.display = 'block'
    document.getElementById('secao-pedidos').style.display = 'none'
    document.getElementById('nav-produtos').classList.add('ativo')
    document.getElementById('nav-pedidos').classList.remove('ativo')
    carregarProdutosAdmin()
  })

  document.getElementById('nav-pedidos').addEventListener('click', (e) => {
    e.preventDefault()
    document.getElementById('secao-produtos').style.display = 'none'
    document.getElementById('secao-pedidos').style.display = 'block'
    document.getElementById('nav-pedidos').classList.add('ativo')
    document.getElementById('nav-produtos').classList.remove('ativo')
    carregarPedidosAdmin()
  })
})

async function carregarPedidosAdmin() {
  const res = await fetch('/api/pedidos/todos')
  if (!res.ok) { toast('Erro ao carregar pedidos', 'erro'); return }

  const pedidos = await res.json()
  const tbody = document.getElementById('tbody-pedidos')

  if (pedidos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted);padding:1rem">Nenhum pedido ainda.</td></tr>'
    return
  }

  tbody.innerHTML = pedidos.map(p => `
    <tr>
      <td>#${p.id}</td>
      <td>
        <span style="color:var(--texto)">${p.usuario_nome || 'N/A'}</span><br>
        <span style="color:var(--muted);font-size:.8rem">${p.usuario_email || ''}</span>
      </td>
      <td style="color:var(--roxo2);font-weight:700">
        R$ ${Number(p.total).toFixed(2).replace('.', ',')}
      </td>
      <td><span class="badge badge-verde">${p.status}</span></td>
      <td style="color:var(--muted);font-size:.85rem">
        ${new Date(p.criado_em).toLocaleDateString('pt-BR')}
      </td>
    </tr>
  `).join('')
}

async function adicionarProduto() {
  const nome      = document.getElementById('p-nome').value.trim()
  const preco     = parseFloat(document.getElementById('p-preco').value)
  const descricao = document.getElementById('p-descricao').value.trim()
  const estoque   = parseInt(document.getElementById('p-estoque').value)
  const imagem    = document.getElementById('p-imagem').value.trim()

  if (!nome || !preco) { toast('Nome e preço são obrigatórios', 'erro'); return }

  const res = await fetch('/api/produtos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, preco, descricao, estoque, imagem })
  })
  const data = await res.json()

  if (res.ok) {
    toast('Produto adicionado!', 'sucesso')
    document.getElementById('p-nome').value = ''
    document.getElementById('p-preco').value = ''
    document.getElementById('p-descricao').value = ''
    document.getElementById('p-estoque').value = '0'
    document.getElementById('p-imagem').value = ''
    carregarProdutosAdmin()
  } else {
    toast(data.erro || 'Erro ao adicionar', 'erro')
  }
}

function abrirEdicao(id, nome, preco, descricao, estoque, imagem) {
  document.getElementById('edit-id').value        = id
  document.getElementById('edit-nome').value      = nome
  document.getElementById('edit-preco').value     = preco
  document.getElementById('edit-descricao').value = descricao
  document.getElementById('edit-estoque').value   = estoque
  document.getElementById('edit-imagem').value    = imagem || ''

  const preview = document.getElementById('preview-edicao')
  if (imagem) {
    preview.src = imagem
    preview.style.display = 'block'
    document.querySelector('#edit-imagem-file').closest('.upload-area').querySelector('p').style.display = 'none'
  } else {
    preview.style.display = 'none'
    document.querySelector('#edit-imagem-file').closest('.upload-area').querySelector('p').style.display = 'block'
  }

  document.getElementById('modal-edicao').style.display = 'flex'
}

function fecharEdicao() {
  document.getElementById('modal-edicao').style.display = 'none'
}

function previewImagem(input, previewId, hiddenId) {
  const file = input.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const preview = document.getElementById(previewId)
    preview.src = e.target.result
    preview.style.display = 'block'
    document.getElementById(hiddenId).value = e.target.result
    document.querySelector(`#${input.id}`).previousElementSibling
    input.closest('.upload-area').querySelector('p').style.display = 'none'
  }
  reader.readAsDataURL(file)
}
async function salvarEdicao() {
  const id       = document.getElementById('edit-id').value
  const nome     = document.getElementById('edit-nome').value.trim()
  const preco    = parseFloat(document.getElementById('edit-preco').value)
  const descricao = document.getElementById('edit-descricao').value.trim()
  const estoque  = parseInt(document.getElementById('edit-estoque').value)
  const imagem   = document.getElementById('edit-imagem').value.trim()

  if (!nome || !preco) { toast('Nome e preço são obrigatórios', 'erro'); return }

  const res = await fetch(`/api/produtos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, preco, descricao, estoque, imagem })
  })
  const data = await res.json()

  if (res.ok) {
    toast('Produto atualizado!', 'sucesso')
    fecharEdicao()
    carregarProdutosAdmin()
  } else {
    toast(data.erro || 'Erro ao atualizar', 'erro')
  }
}

async function excluirProduto(id, nome) {
  if (!confirm(`Excluir "${nome}"?`)) return

  const res = await fetch(`/api/produtos/${id}`, { method: 'DELETE' })
  const data = await res.json()

  if (res.ok) {
    toast(data.mensagem, 'sucesso')
    carregarProdutosAdmin()
  } else {
    toast(data.erro || 'Erro ao excluir', 'erro')
  }
}

async function excluirProduto(id, nome) {
  if (!confirm(`Excluir "${nome}"?`)) return

  const res = await fetch(`/api/produtos/${id}`, { method: 'DELETE' })
  const data = await res.json()

  if (res.ok) {
    toast(data.mensagem, 'sucesso')
    carregarProdutosAdmin()
  } else {
    toast(data.erro || 'Erro ao excluir', 'erro')
  }
}

async function carregarProdutosAdmin() {
  const res = await fetch('/api/produtos')
  const produtos = await res.json()
  const tbody = document.getElementById('tbody-produtos')

  tbody.innerHTML = produtos.map(p => `
    <tr>
      <td>${p.nome}</td>
      <td>R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</td>
      <td>${p.estoque}</td>
      <td>
        <span class="badge ${p.estoque > 0 ? 'badge-verde' : 'badge-vermelho'}">
          ${p.estoque > 0 ? 'Disponível' : 'Sem estoque'}
        </span>
      </td>
      <td style="display:flex;gap:.5rem">
        <button class="btn btn-ghost" onclick="abrirEdicao(${p.id}, '${p.nome.replace(/'/g,"\\'")}', ${p.preco}, '${(p.descricao||'').replace(/'/g,"\\'")}', ${p.estoque}, '${p.imagem||''}')">
          ✏️ Editar
        </button>
        <button class="btn btn-perigo" onclick="excluirProduto(${p.id}, '${p.nome.replace(/'/g,"\\'")}')">
          🗑️ Excluir
        </button>
      </td>
    </tr>
  `).join('')
}

async function carregarPedidosAdmin() {
  const res = await fetch('/api/pedidos/todos')
  if (!res.ok) { toast('Erro ao carregar pedidos', 'erro'); return }

  const pedidos = await res.json()
  const tbody = document.getElementById('tbody-pedidos')

  if (pedidos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted);padding:1rem">Nenhum pedido ainda.</td></tr>'
    return
  }

  tbody.innerHTML = pedidos.map(p => `
    <tr>
      <td>#${p.id}</td>
      <td>
        <span style="color:var(--texto)">${p.usuario_nome || 'N/A'}</span><br>
        <span style="color:var(--muted);font-size:.8rem">${p.usuario_email || ''}</span>
      </td>
      <td style="color:var(--roxo2);font-weight:700">
        R$ ${Number(p.total).toFixed(2).replace('.', ',')}
      </td>
      <td><span class="badge badge-verde">${p.status}</span></td>
      <td style="color:var(--muted);font-size:.85rem">
        ${new Date(p.criado_em).toLocaleDateString('pt-BR')}
      </td>
    </tr>
  `).join('')
}

async function logout() {
  await fetch('/api/usuarios/logout', { method: 'POST' })
  window.location.href = '/'
}