const statusEl = document.getElementById('llm-status')
const form = document.getElementById('translate-form')
const resultSection = document.getElementById('result')
const resultText = document.getElementById('result-text')
const resultRationale = document.getElementById('result-rationale')
const placeholderBanner = document.getElementById('result-placeholder-banner')
const errorEl = document.getElementById('error')

async function checkHealth() {
  try {
    const res = await fetch('/api/health')
    const data = await res.json()
    if (data.llmConfigured) {
      statusEl.textContent = '✓ LLM configurado'
      statusEl.classList.remove('warn')
    } else {
      statusEl.textContent = '⚠️ nenhum LLM configurado (modo placeholder) — defina LLM_BASE_URL e LLM_MODEL'
      statusEl.classList.add('warn')
    }
  } catch {
    statusEl.textContent = '✗ não foi possível falar com a API'
    statusEl.classList.add('warn')
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  errorEl.hidden = true
  resultSection.hidden = true

  const tones = Array.from(document.querySelectorAll('input[name="tone"]:checked')).map((el) => el.value)

  const payload = {
    text: document.getElementById('text').value,
    sourceLang: document.getElementById('sourceLang').value || undefined,
    targetLang: document.getElementById('targetLang').value,
    messageType: document.getElementById('messageType').value,
    reason: document.getElementById('reason').value,
    importance: document.getElementById('importance').value,
    formality: document.getElementById('formality').value,
    desiredTone: tones,
    relationship: document.getElementById('relationship').value || undefined,
  }

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      errorEl.textContent = (data.errors || ['erro desconhecido']).join('; ')
      errorEl.hidden = false
      return
    }
    resultText.textContent = data.translatedText
    resultRationale.textContent = data.rationale
    placeholderBanner.hidden = !data.isPlaceholder
    resultSection.hidden = false
  } catch (err) {
    errorEl.textContent = 'Falha ao falar com a API: ' + err.message
    errorEl.hidden = false
  }
})

checkHealth()
