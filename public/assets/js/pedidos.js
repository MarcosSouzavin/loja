let todosPedidos = []
let eventoSSE    = null

document.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch('/api/usuarios/perfil').catch(() => null)
  if (!res || !res.ok) { window.location.href = '/login.html'; return }

  await carregarPedidos()

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/usuarios/logout', { method: 'POST' })
    window.location.href = '/'
  })

  document.getElementById('busca-pedido').addEventListener('input', function () {
    const termo = this.value.toLowerCase()
    const filtrados = todosPedidos.filter(p =>
      String(p.id).includes(termo) ||
      p.status.includes(termo) ||
      p.itens.some(i => i.nome.toLowerCase().includes(termo))
    )
    renderizarPedidos(filtrados)
  })
})

async function carregarPedidos() {
  const res = await fetch('/api/pedidos/meus')
  if (!res.ok) { window.location.href = '/login.html'; return }
  const data = await res.json()
  todosPedidos = data.pedidos
  renderizarPedidos(todosPedidos)
}

function renderizarPedidos(pedidos) {
  const lista = document.getElementById('lista-pedidos')

  if (pedidos.length === 0) {
    lista.innerHTML = `
      <div style="text-align:center;padding:4rem;color:var(--muted)">
        <p style="font-size:3.5rem;margin-bottom:1rem">🛍️</p>
        <p style="font-size:1.1rem;margin-bottom:.5rem">Nenhum pedido encontrado</p>
        <a href="/" class="btn btn-primario" style="margin-top:1rem;display:inline-flex">Ver produtos</a>
      </div>
    `
    return
  }

  lista.innerHTML = pedidos.map(p => `
    <div style="background:var(--card);border:1px solid var(--borda);border-radius:12px;margin-bottom:1rem;overflow:hidden;cursor:pointer;transition:border-color .2s"
      onmouseover="this.style.borderColor='var(--roxo)'" onmouseout="this.style.borderColor='var(--borda)'"
      onclick="abrirPedido(${p.id})">

      <!-- Header do card -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:1rem 1.5rem;border-bottom:1px solid var(--borda);flex-wrap:wrap;gap:.5rem">
        <div style="display:flex;gap:2rem;flex-wrap:wrap">
          <div>
            <p style="color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.5px">Pedido</p>
            <p style="font-weight:700">#${p.id}</p>
          </div>
          <div>
            <p style="color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.5px">Data</p>
            <p style="font-weight:600">${new Date(p.criado_em).toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p style="color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.5px">Total</p>
            <p style="font-weight:700;color:var(--roxo2)">R$ ${Number(p.total).toFixed(2).replace('.', ',')}</p>
          </div>
        </div>
        <span class="badge ${badgeStatus(p.status)}" style="font-size:.85rem">
          ${emojiStatus(p.status)} ${labelStatus(p.status)}
        </span>
      </div>

      <!-- Itens resumo -->
      <div style="padding:1rem 1.5rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap">
        ${p.itens.slice(0, 3).map(i => `
          <div style="display:flex;align-items:center;gap:.6rem">
            ${i.imagem
              ? `<img src="${i.imagem}" style="width:40px;height:40px;border-radius:6px;object-fit:cover">`
              : `<div style="width:40px;height:40px;border-radius:6px;background:var(--bg2);display:flex;align-items:center;justify-content:center">📦</div>`
            }
            <span style="font-size:.85rem;color:var(--texto)">${i.nome} <span style="color:var(--muted)">x${i.quantidade}</span></span>
          </div>
        `).join('')}
        ${p.itens.length > 3 ? `<span style="color:var(--muted);font-size:.85rem">+${p.itens.length - 3} item(s)</span>` : ''}
        <span style="margin-left:auto;color:var(--muted);font-size:.82rem">Ver detalhes →</span>
      </div>
    </div>
  `).join('')
}

function abrirPedido(pedidoId) {
  const p = todosPedidos.find(x => x.id === pedidoId)
  if (!p) return

  document.getElementById('modal-titulo').textContent = `Pedido #${p.id}`
  document.getElementById('modal-pedido').style.display = 'flex'

  const etapas = [
    { key: 'aguardando_pagamento', label: 'Aguardando pagamento', emoji: '⏳' },
    { key: 'pagamento_confirmado', label: 'Pagamento confirmado', emoji: '✅' },
    { key: 'em_separacao',         label: 'Em separação',         emoji: '📦' },
    { key: 'enviado',              label: 'Enviado',              emoji: '🚚' },
    { key: 'entregue',             label: 'Entregue',             emoji: '🎉' },
  ]

  const indexAtual = p.status === 'cancelado' ? -1 : etapas.findIndex(e => e.key === p.status)

  document.getElementById('modal-conteudo-pedido').innerHTML = `

    <!-- Status atual -->
    <div style="background:var(--bg);border-radius:10px;padding:1rem 1.5rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between">
      <span style="color:var(--muted);font-size:.85rem">Status atual</span>
      <span class="badge ${badgeStatus(p.status)}" style="font-size:.9rem">${emojiStatus(p.status)} ${labelStatus(p.status)}</span>
    </div>

    <!-- Timeline -->
    ${p.status !== 'cancelado' ? `
    <div style="margin-bottom:2rem">
      <div style="display:flex;justify-content:space-between;position:relative;margin-bottom:.5rem">
        <div style="position:absolute;top:16px;left:10%;right:10%;height:2px;background:var(--borda);z-index:0"></div>
        <div style="position:absolute;top:16px;left:10%;height:2px;background:var(--roxo);z-index:0;width:${indexAtual >= 0 ? (indexAtual / (etapas.length-1)) * 80 : 0}%"></div>
        ${etapas.map((e, i) => `
          <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem;position:relative;z-index:1;width:${100/etapas.length}%">
            <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.9rem;
              background:${i <= indexAtual ? 'var(--roxo)' : 'var(--card)'};
              border:2px solid ${i <= indexAtual ? 'var(--roxo)' : 'var(--borda)'};
              ${i === indexAtual ? 'box-shadow:0 0 0 4px rgba(124,58,237,.3)' : ''}">
              ${i <= indexAtual ? '✓' : (i + 1)}
            </div>
            <span style="font-size:.72rem;text-align:center;color:${i <= indexAtual ? 'var(--texto)' : 'var(--muted)'};line-height:1.2">${e.label}</span>
          </div>
        `).join('')}
      </div>
    </div>
    ` : `<div style="background:rgba(244,63,94,.1);border:1px solid var(--erro);border-radius:10px;padding:1rem;margin-bottom:1.5rem;text-align:center;color:var(--erro)">❌ Este pedido foi cancelado</div>`}

    <!-- Itens do pedido -->
    <div style="margin-bottom:1.5rem">
      <h4 style="margin-bottom:1rem;color:var(--muted);font-size:.8rem;text-transform:uppercase;letter-spacing:.5px">Itens</h4>
      ${p.itens.map(i => `
        <div style="display:flex;align-items:center;gap:1rem;padding:.8rem 0;border-bottom:1px solid var(--borda)">
          ${i.imagem
            ? `<img src="${i.imagem}" style="width:52px;height:52px;border-radius:8px;object-fit:cover">`
            : `<div style="width:52px;height:52px;border-radius:8px;background:var(--bg2);display:flex;align-items:center;justify-content:center">📦</div>`
          }
          <div style="flex:1">
            <p style="font-weight:600;font-size:.95rem">${i.nome}</p>
            <p style="color:var(--muted);font-size:.82rem">Qtd: ${i.quantidade} × R$ ${Number(i.preco_unitario).toFixed(2).replace('.', ',')}</p>
          </div>
          <p style="font-weight:700;color:var(--roxo2)">R$ ${(i.quantidade * i.preco_unitario).toFixed(2).replace('.', ',')}</p>
        </div>
      `).join('')}
    </div>

    <!-- Total -->
    <div style="display:flex;justify-content:space-between;padding:1rem;background:var(--bg);border-radius:8px;margin-bottom:1.5rem">
      <span style="font-weight:700">Total</span>
      <span style="font-weight:900;font-size:1.2rem;color:var(--roxo2)">R$ ${Number(p.total).toFixed(2).replace('.', ',')}</span>
    </div>

    <!-- Histórico -->
    ${p.historico && p.historico.length > 0 ? `
    <div>
      <h4 style="margin-bottom:1rem;color:var(--muted);font-size:.8rem;text-transform:uppercase;letter-spacing:.5px">Histórico</h4>
      ${p.historico.map(h => `
        <div style="display:flex;gap:1rem;margin-bottom:.8rem;align-items:flex-start">
          <div style="width:8px;height:8px;border-radius:50%;background:var(--roxo);margin-top:.35rem;flex-shrink:0"></div>
          <div>
            <p style="font-size:.88rem;font-weight:600">${labelStatus(h.status)}</p>
            ${h.mensagem ? `<p style="font-size:.82rem;color:var(--muted)">${h.mensagem}</p>` : ''}
            <p style="font-size:.78rem;color:var(--borda);margin-top:.2rem">${new Date(h.criado_em).toLocaleString('pt-BR')}</p>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}
  `

  // Conecta SSE para atualizações em tempo real
  if (eventoSSE) eventoSSE.close()
  eventoSSE = new EventSource(`/api/status/${pedidoId}`)
  eventoSSE.onmessage = async () => {
    await carregarPedidos()
    abrirPedido(pedidoId)
  }
}

function fecharModal() {
  document.getElementById('modal-pedido').style.display = 'none'
  if (eventoSSE) { eventoSSE.close(); eventoSSE = null }
}

function labelStatus(s) {
  return { aguardando_pagamento:'Aguardando pagamento', pagamento_confirmado:'Pagamento confirmado', em_separacao:'Em separação', enviado:'Enviado', entregue:'Entregue', cancelado:'Cancelado' }[s] ?? s
}

function emojiStatus(s) {
  return { aguardando_pagamento:'⏳', pagamento_confirmado:'✅', em_separacao:'📦', enviado:'🚚', entregue:'🎉', cancelado:'❌' }[s] ?? '•'
}

function badgeStatus(s) {
  if (s === 'entregue' || s === 'enviado' || s === 'pagamento_confirmado') return 'badge-verde'
  if (s === 'cancelado') return 'badge-vermelho'
  return 'badge-amarelo'
}