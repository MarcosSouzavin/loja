const params   = new URLSearchParams(window.location.search)
const produtoId = params.get('id')

let notaSelecionada = 0

document.addEventListener('DOMContentLoaded', async () => {
  if (!produtoId) {
    window.location.href = '/'
    return
  }

  await carregarDetalhe()
  await carregarAvaliacoes()
  await verificarLogin()
  configurarEstrelas()

  document.getElementById('btn-avaliar').addEventListener('click', enviarAvaliacao)
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
  await fetch('/api/usuarios/logout', { method: 'POST' })
  toast('Até logo!', 'info')
  setTimeout(() => window.location.href = '/', 1000)
})
})

async function carregarDetalhe() {
  const res     = await fetch(`/api/produtos/${produtoId}`)
  if (!res.ok)  { window.location.href = '/'; return }
  const produto = await res.json()

  // Atualiza o título da aba xD 
  document.title = `${produto.nome} — TechStore`

  document.getElementById('detalhe-produto').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;align-items:start">

      <div>
        ${produto.imagem
          ? `<img src="${produto.imagem}" alt="${produto.nome}"
               style="width:100%;border-radius:12px;object-fit:cover;max-height:400px">`
          : `<div style="width:100%;height:300px;background:var(--bg2);border-radius:12px;
               display:flex;align-items:center;justify-content:center;font-size:5rem">📦</div>`
        }
      </div>

      <div>
        <p style="color:var(--muted);font-size:.85rem;margin-bottom:.5rem">
          ${produto.categoria || 'Eletrônicos'}
        </p>
        <h1 style="font-size:1.8rem;margin-bottom:1rem">${produto.nome}</h1>
        <p style="color:var(--muted);line-height:1.6;margin-bottom:1.5rem">
          ${produto.descricao || 'Sem descrição.'}
        </p>

        <div id="media-estrelas" style="margin-bottom:1rem"></div>

        <p style="font-size:2.2rem;font-weight:800;color:var(--roxo2);margin-bottom:.5rem">
          R$ ${Number(produto.preco).toFixed(2).replace('.', ',')}
        </p>
        <p style="color:var(--muted);font-size:.9rem;margin-bottom:1.5rem">
          ${produto.estoque > 0 ? `✅ ${produto.estoque} em estoque` : '❌ Sem estoque'}
        </p>

        <div style="display:flex;gap:1rem">
          <button
            class="btn btn-primario"
            style="flex:1;padding:.9rem"
            id="btn-add-detalhe"
            ${produto.estoque === 0 ? 'disabled' : ''}
            onclick="adicionarAoCarrinho(${produto.id}, '${produto.nome.replace(/'/g,"\\'")}', ${produto.preco}, ${produto.estoque})"
          >
            ${produto.estoque === 0 ? 'Sem estoque' : '🛒 Adicionar ao carrinho'}
          </button>
        </div>
      </div>
    </div>
  `
}

async function carregarAvaliacoes() {
  const res        = await fetch(`/api/avaliacoes/${produtoId}`)
  if (!res.ok) return
  const avaliacoes = await res.json()
  const lista      = document.getElementById('lista-avaliacoes')

  if (avaliacoes.length === 0) {
    lista.innerHTML = '<p style="color:var(--muted)">Nenhuma avaliação ainda. Seja o primeiro!</p>'

    document.getElementById('media-estrelas').innerHTML = ''
    return
  }

  const media = avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length


  const mediaEl = document.getElementById('media-estrelas')
  if (mediaEl) {
    mediaEl.innerHTML = `
      <span style="color:#f59e0b;font-size:1.1rem">${'★'.repeat(Math.round(media))}${'☆'.repeat(5 - Math.round(media))}</span>
      <span style="color:var(--muted);font-size:.9rem;margin-left:.5rem">${media.toFixed(1)} (${avaliacoes.length} avaliações)</span>
    `
  }

  lista.innerHTML = avaliacoes.map(a => `
    <div style="background:var(--card);border:1px solid var(--borda);border-radius:10px;padding:1.2rem;margin-bottom:.8rem">
      <div style="display:flex;justify-content:space-between;margin-bottom:.5rem">
        <span style="font-weight:600">${a.usuario_nome}</span>
        <span style="color:#f59e0b">${'★'.repeat(a.nota)}${'☆'.repeat(5 - a.nota)}</span>
      </div>
      <p style="color:var(--muted);font-size:.9rem">${a.comentario || ''}</p>
      <p style="color:var(--borda);font-size:.75rem;margin-top:.5rem">
        ${new Date(a.criado_em).toLocaleDateString('pt-BR')}
      </p>
    </div>
  `).join('')
}

function configurarEstrelas() {
  const estrelas = document.querySelectorAll('#estrelas span')
  estrelas.forEach(star => {
    star.addEventListener('mouseover', () => {
      const nota = parseInt(star.dataset.nota)
      estrelas.forEach((s, i) => s.textContent = i < nota ? '★' : '☆')
    })
    star.addEventListener('mouseout', () => {
      estrelas.forEach((s, i) => s.textContent = i < notaSelecionada ? '★' : '☆')
    })
    star.addEventListener('click', () => {
      notaSelecionada = parseInt(star.dataset.nota)
      document.getElementById('av-nota').value = notaSelecionada
      estrelas.forEach((s, i) => {
        s.textContent = i < notaSelecionada ? '★' : '☆'
        s.style.color = i < notaSelecionada ? '#f59e0b' : 'var(--muted)'
      })
    })
  })
}

async function enviarAvaliacao() {
  const nota       = parseInt(document.getElementById('av-nota').value)
  const comentario = document.getElementById('av-comentario').value.trim()

  if (nota === 0) { toast('Selecione uma nota!', 'erro'); return }

  const res  = await fetch('/api/avaliacoes', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ produto_id: produtoId, nota, comentario })
  })
  const data = await res.json()

  if (res.ok) {
    toast('Avaliação enviada!', 'sucesso')
    document.getElementById('av-nota').value    = '0'
    document.getElementById('av-comentario').value = ''
    notaSelecionada = 0
    document.querySelectorAll('#estrelas span').forEach(s => {
      s.textContent = '☆'
      s.style.color = ''
    })
    carregarAvaliacoes()
  } else {
    toast(data.erro || 'Erro ao enviar avaliação', 'erro')
  }
}

async function verificarLogin() {
  const res = await fetch('/api/usuarios/perfil').catch(() => null)
  if (res && res.ok) {
    const data = await res.json()
    document.getElementById('usuario-logado').textContent = `Olá, ${data.nome}`
    document.getElementById('link-login').style.display = 'none'
    document.getElementById('btn-logout').style.display = 'inline-flex'
    document.getElementById('form-avaliacao').style.display = 'block'
  }
}