let eventoAtual = null

document.addEventListener('DOMContentLoaded', async () => {
  await carregarPedidos()

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/usuarios/logout', { method: 'POST' })
    window.location.href = '/'
  })

  document.getElementById('fechar-modal-pedido').addEventListener('click', () => {
    document.getElementById('modal-pedido').style.display = 'none'
    if (eventoAtual) { eventoAtual.close(); eventoAtual = null }
  })
})

async function carregarPedidos() {
  const res = await fetch('/api/pedidos/meus')
  if (!res.ok) { window.location.href = '/login.html'; return }

  const { pedidos } = await res.json()
  const lista = document.getElementById('lista-pedidos')

  if (pedidos.length === 0) {
    lista.innerHTML = `
      <div style="text-align:center;padding:3rem;color:var(--muted)">
        <p style="font-size:3rem;margin-bottom:1rem">🛍️</p>
        <p>Você ainda não fez nenhum pedido.</p>
        <a href="/" class="btn btn-primario" style="margin-top:1rem;display:inline-flex">Ver produtos</a>
      </div>
    `
    return
  }

  lista.innerHTML = pedidos.map(p => `
    <div style="background:var(--card);border:1px solid var(--borda);border-radius:12px;padding:1.5rem;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
      <div>
        <p style="font-weight:700;margin-bottom:.3rem">Pedido #${p.id}</p>
        <p style="color:var(--muted);font-size:.85rem">${new Date(p.criado_em).toLocaleDateString('pt-BR')}</p>
        <span class="badge ${badgeStatus(p.status)}" style="margin-top:.5rem;display:inline-block">
          ${labelStatus(p.status)}
        </span>
      </div>
      <div style="text-align:right">
        <p style="color:var(--roxo2);font-weight:800;font-size:1.2rem">
          R$ ${Number(p.total).toFixed(2).replace('.', ',')}
        </p>
        <button class="btn btn-ghost" style="margin-top:.5rem" onclick="acompanhar(${p.id})">
          📍 Acompanhar
        </button>
      </div>
    </div>
  `).join('')
}

async function acompanhar(pedidoId) {
  // Fecha conexão anterior se houver
  if (eventoAtual) eventoAtual.close()

  document.getElementById('modal-numero').textContent = `Pedido #${pedidoId}`
  document.getElementById('modal-pedido').style.display = 'flex'
  document.getElementById('timeline').innerHTML = '<p style="color:var(--muted)">Conectando...</p>'

  // Conecta via SSE para receber atualizações em tempo real
  eventoAtual = new EventSource(`/api/status/${pedidoId}`)

  eventoAtual.onmessage = (e) => {
    const data = JSON.parse(e.data)
    atualizarModal(data.status, data.historico)
  }

  eventoAtual.onerror = () => {
    document.getElementById('timeline').innerHTML =
      '<p style="color:var(--erro)">Erro na conexão. Recarregue a página.</p>'
  }
}

function atualizarModal(status, historico) {
  // Badge de status atual
  document.getElementById('status-badge-container').innerHTML = `
    <span class="badge ${badgeStatus(status)}" style="font-size:1rem;padding:.5rem 1.2rem">
      ${emojiStatus(status)} ${labelStatus(status)}
    </span>
  `

  // Timeline
  const etapas = [
    { key: 'aguardando_pagamento', label: 'Aguardando pagamento' },
    { key: 'pagamento_confirmado', label: 'Pagamento confirmado' },
    { key: 'em_separacao',         label: 'Em separação'         },
    { key: 'enviado',              label: 'Enviado'              },
    { key: 'entregue',             label: 'Entregue'             },
  ]

  const indexAtual = etapas.findIndex(e => e.key === status)

  document.getElementById('timeline').innerHTML = `
    <div style="position:relative;padding-left:2rem">
      ${etapas.map((etapa, i) => {
        const feito    = i <= indexAtual
        const atual    = i === indexAtual
        const entrada  = historico.find(h => h.status === etapa.key)

        return `
          <div style="display:flex;gap:1rem;margin-bottom:1.2rem;align-items:flex-start;position:relative">
            <!-- Linha vertical -->
            ${i < etapas.length - 1 ? `
              <div style="position:absolute;left:.6rem;top:1.4rem;width:2px;height:calc(100% + .8rem);
                background:${feito && i < indexAtual ? 'var(--roxo)' : 'var(--borda)'}"></div>
            ` : ''}

            <!-- Círculo -->
            <div style="
              width:1.2rem;height:1.2rem;border-radius:50%;flex-shrink:0;margin-top:.15rem;
              background:${atual ? 'var(--roxo)' : feito ? 'var(--sucesso)' : 'var(--borda)'};
              ${atual ? 'box-shadow:0 0 0 4px rgba(124,58,237,.3)' : ''}
            "></div>

            <!-- Texto -->
            <div>
              <p style="font-weight:${atual ? '700' : '400'};color:${feito ? 'var(--texto)' : 'var(--muted)'}">
                ${etapa.label}
              </p>
              ${entrada ? `
                <p style="font-size:.8rem;color:var(--muted)">
                  ${new Date(entrada.criado_em).toLocaleString('pt-BR')}
                </p>
                ${entrada.mensagem ? `<p style="font-size:.85rem;color:var(--roxo2);margin-top:.2rem">"${entrada.mensagem}"</p>` : ''}
              ` : ''}
            </div>
          </div>
        `
      }).join('')}
    </div>
  `
}

function labelStatus(s) {
  const labels = {
    aguardando_pagamento: 'Aguardando pagamento',
    pagamento_confirmado: 'Pagamento confirmado',
    em_separacao:         'Em separação',
    enviado:              'Enviado',
    entregue:             'Entregue',
    cancelado:            'Cancelado',
  }
  return labels[s] ?? s
}

function emojiStatus(s) {
  const emojis = {
    aguardando_pagamento: '⏳',
    pagamento_confirmado: '✅',
    em_separacao:         '📦',
    enviado:              '🚚',
    entregue:             '🎉',
    cancelado:            '❌',
  }
  return emojis[s] ?? '•'
}

function badgeStatus(s) {
  if (s === 'entregue')             return 'badge-verde'
  if (s === 'cancelado')            return 'badge-vermelho'
  if (s === 'enviado')              return 'badge-verde'
  return 'badge-amarelo'
}