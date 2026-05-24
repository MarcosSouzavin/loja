const params    = new URLSearchParams(window.location.search)
const produtoId = params.get('id')
let notaSelecionada = 0
let usuarioLogado   = null

document.addEventListener('DOMContentLoaded', async () => {
  if (!produtoId) { window.location.href = '/'; return }

  usuarioLogado = await checarLogin()
  await carregarDetalhe()
  await carregarAvaliacoes()
  configurarEstrelas()

  document.getElementById('btn-avaliar').addEventListener('click', enviarAvaliacao)
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await fetch('/api/usuarios/logout', { method: 'POST' })
    window.location.href = '/'
  })
})

async function checarLogin() {
  const res = await fetch('/api/usuarios/perfil').catch(() => null)
  if (res && res.ok) {
    const data = await res.json()
    document.getElementById('usuario-logado').textContent = `Olá, ${data.nome}`
    document.getElementById('area-logado').style.display = 'flex'
    document.getElementById('link-login').style.display  = 'none'
    document.getElementById('form-avaliacao').style.display = 'block'
    return data
  }
  document.getElementById('aviso-login-avaliacao').style.display = 'block'
  return null
}

async function carregarDetalhe() {
  const res = await fetch(`/api/produtos/${produtoId}`)
  if (!res.ok) { window.location.href = '/'; return }
  const p = await res.json()

  document.title = `${p.nome} — TechStore`

  document.getElementById('detalhe-produto').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:start">
      <div>
        ${p.imagem
          ? `<img src="${p.imagem}" alt="${p.nome}" style="width:100%;border-radius:12px;object-fit:cover;max-height:420px;background:var(--bg2)">`
          : `<div style="width:100%;height:360px;background:var(--bg2);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:6rem">📦</div>`
        }
      </div>
      <div>
        <h1 style="font-size:1.7rem;margin-bottom:.8rem;line-height:1.3">${p.nome}</h1>
        <div id="media-produto" style="margin-bottom:1rem"></div>
        <p style="color:var(--muted);line-height:1.7;margin-bottom:1.5rem">${p.descricao || ''}</p>
        <p style="font-size:2.4rem;font-weight:900;color:var(--roxo2);margin-bottom:.5rem">
          R$ ${Number(p.preco).toFixed(2).replace('.', ',')}
        </p>
        <p style="color:${p.estoque > 0 ? 'var(--sucesso)' : 'var(--erro)'};font-size:.9rem;margin-bottom:1.5rem">
          ${p.estoque > 0 ? `✅ ${p.estoque} unidades disponíveis` : '❌ Fora de estoque'}
        </p>
        <div style="display:flex;gap:1rem;align-items:center">
          <div style="display:flex;align-items:center;border:1px solid var(--borda);border-radius:8px;overflow:hidden">
            <button onclick="mudarQtd(-1)" style="padding:.6rem 1rem;background:var(--card);border:none;color:var(--texto);font-size:1.1rem;cursor:pointer">−</button>
            <span id="qtd-detalhe" style="padding:.6rem 1.2rem;min-width:3rem;text-align:center;font-weight:700">1</span>
            <button onclick="mudarQtd(1)" style="padding:.6rem 1rem;background:var(--card);border:none;color:var(--texto);font-size:1.1rem;cursor:pointer">+</button>
          </div>
          <button class="btn btn-primario" style="flex:1;padding:.8rem" id="btn-add-detalhe"
            ${p.estoque === 0 ? 'disabled' : ''}
            onclick="adicionarComQtd(${p.id}, '${p.nome.replace(/'/g,"\\'")}', ${p.preco}, ${p.estoque})">
            ${p.estoque === 0 ? 'Sem estoque' : '🛒 Adicionar ao carrinho'}
          </button>
        </div>
      </div>
    </div>
  `
}

let qtdDetalhe = 1
function mudarQtd(delta) {
  const produto = document.getElementById('btn-add-detalhe')
  const estoqueMax = parseInt(produto?.dataset?.estoque || 99)
  qtdDetalhe = Math.max(1, Math.min(qtdDetalhe + delta, estoqueMax))
  document.getElementById('qtd-detalhe').textContent = qtdDetalhe
}

function adicionarComQtd(id, nome, preco, estoque) {
  for (let i = 0; i < qtdDetalhe; i++) adicionarAoCarrinho(id, nome, preco, estoque)
}

async function carregarAvaliacoes() {
  const res  = await fetch(`/api/avaliacoes/${produtoId}`)
  if (!res.ok) return
  const data = await res.json()
  const { avaliacoes, media, total } = data

  const mediaEl = document.getElementById('media-produto')
  if (mediaEl && total > 0) {
    mediaEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:.5rem">
        <span style="color:var(--amarelo);font-size:1.1rem">${estrelas(media)}</span>
        <span style="font-weight:700">${media}</span>
        <span style="color:var(--muted);font-size:.85rem">(${total} avaliação${total !== 1 ? 'ões' : ''})</span>
      </div>
    `
  }

  const lista = document.getElementById('lista-avaliacoes')
  const resumo = document.getElementById('resumo-avaliacoes')

  if (total > 0) {
    resumo.innerHTML = `
      <div style="display:flex;align-items:center;gap:.8rem">
        <span style="font-size:2.5rem;font-weight:900">${media}</span>
        <div>
          <div style="color:var(--amarelo);font-size:1.2rem">${estrelas(media)}</div>
          <p style="color:var(--muted);font-size:.8rem">${total} avaliações</p>
        </div>
      </div>
    `
  }

  if (avaliacoes.length === 0) {
    lista.innerHTML = '<p style="color:var(--muted)">Nenhuma avaliação ainda. Seja o primeiro!</p>'
    return
  }

  lista.innerHTML = avaliacoes.map(a => `
    <div style="padding:1.2rem 0;border-bottom:1px solid var(--borda)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
        <div style="display:flex;align-items:center;gap:.8rem">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--roxo);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.9rem">
            ${a.usuario_nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style="font-weight:600;font-size:.95rem">${a.usuario_nome}</p>
            <p style="color:var(--muted);font-size:.78rem">${new Date(a.criado_em).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <span style="color:var(--amarelo)">${estrelas(a.nota)}</span>
      </div>
      ${a.comentario ? `<p style="color:var(--texto);font-size:.9rem;line-height:1.6">${a.comentario}</p>` : ''}
    </div>
  `).join('')
}

function estrelas(nota) {
  const cheia  = Math.round(nota)
  return '★'.repeat(cheia) + '☆'.repeat(5 - cheia)
}

function configurarEstrelas() {
  const spans = document.querySelectorAll('#estrelas span')
  spans.forEach(s => {
    s.addEventListener('mouseover', () => {
      const n = parseInt(s.dataset.nota)
      spans.forEach((x, i) => { x.textContent = i < n ? '★' : '☆'; x.style.color = i < n ? 'var(--amarelo)' : '' })
    })
    s.addEventListener('mouseout', () => {
      spans.forEach((x, i) => { x.textContent = i < notaSelecionada ? '★' : '☆'; x.style.color = i < notaSelecionada ? 'var(--amarelo)' : '' })
    })
    s.addEventListener('click', () => {
      notaSelecionada = parseInt(s.dataset.nota)
      document.getElementById('av-nota').value = notaSelecionada
      spans.forEach((x, i) => { x.textContent = i < notaSelecionada ? '★' : '☆'; x.style.color = i < notaSelecionada ? 'var(--amarelo)' : 'var(--muted)'; x.style.transform = i < notaSelecionada ? 'scale(1.2)' : 'scale(1)' })
    })
  })
}

async function enviarAvaliacao() {
  const nota       = parseInt(document.getElementById('av-nota').value)
  const comentario = document.getElementById('av-comentario').value.trim()
  const btn        = document.getElementById('btn-avaliar')

  if (nota === 0)  { toast('Selecione uma nota!', 'erro'); return }

  btn.textContent = 'Enviando...'
  btn.disabled    = true

  const res  = await fetch('/api/avaliacoes', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ produto_id: parseInt(produtoId), nota, comentario })
  })
  const data = await res.json()

  btn.textContent = 'Enviar avaliação'
  btn.disabled    = false

  if (res.ok) {
    toast('Avaliação enviada! ⭐', 'sucesso')
    document.getElementById('av-nota').value      = '0'
    document.getElementById('av-comentario').value = ''
    notaSelecionada = 0
    document.querySelectorAll('#estrelas span').forEach(s => { s.textContent = '☆'; s.style.color = ''; s.style.transform = '' })
    document.getElementById('form-avaliacao').style.display = 'none'
    await carregarAvaliacoes()
  } else {
    toast(data.erro || 'Erro ao enviar', 'erro')
  }
}