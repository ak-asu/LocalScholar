// Popup logic: Summarizer integration with availability gating and streaming

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function getPageText(source) {
  const tabId = await getActiveTabId();
  if (!tabId) return '';
  const resp = await chrome.tabs.sendMessage(tabId, { type: 'QUIZZER_GET_TEXT', source });
  return resp?.text || '';
}

function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

function renderOutput(markdownOrText) {
  const out = document.getElementById('output');
  if (out) out.textContent = markdownOrText;
}

async function ensureSummarizer(type, length, format) {
  if (!('Summarizer' in self)) return { error: 'Summarizer API not supported in this Chrome.' };
  const availability = await Summarizer.availability();
  if (availability === 'unavailable') return { error: 'Summarizer unavailable on this device.' };

  // Require user activation (button click triggers this function)
  try {
    const summarizer = await Summarizer.create({
      type, length, format,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          setStatus(`Downloading model: ${(e.loaded * 100).toFixed(0)}%`);
        });
      }
    });
    return { summarizer };
  } catch (e) {
    return { error: e?.message || String(e) };
  }
}

async function run() {
  renderOutput('');
  setStatus('Checking availability…');
  const source = document.getElementById('source').value;
  const type = document.getElementById('sum-type').value;
  const length = document.getElementById('sum-length').value;
  const format = document.getElementById('sum-format').value;

  const text = await getPageText(source);
  if (!text?.trim()) {
    setStatus('No readable text found.');
    return;
  }
  const { summarizer, error } = await ensureSummarizer(type, length, format);
  if (error) {
    setStatus(error);
    return;
  }
  setStatus('Summarizing…');

  try {
    const stream = summarizer.summarizeStreaming(text, {
      context: 'Audience: general web reader.',
    });
    let acc = '';
    for await (const chunk of stream) {
      acc += chunk;
      renderOutput(acc);
    }
    setStatus('Done.');
  } catch (e) {
    setStatus(e?.message || String(e));
  }
}

document.getElementById('run').addEventListener('click', run);
