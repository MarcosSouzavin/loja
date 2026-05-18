function toast(mensagem, tipo = 'info') {
  const container = document.getElementById('toast-container')
  const el = document.createElement('div')

  const icones = { sucesso: '✅', erro: '❌', info: '💡' }

  el.className = `toast toast-${tipo}`
  el.innerHTML = `<span>${icones[tipo]}</span> ${mensagem}`
  container.appendChild(el)

  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transition = 'opacity 0.4s'
    setTimeout(() => el.remove(), 400)
  }, 3000)
}