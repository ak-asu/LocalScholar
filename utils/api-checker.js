/**
 * Utility to check Chrome AI API availability
 * Checks all Built-in AI APIs and their enablement status
 */

/**
 * Chrome AI API Configuration
 * Maps each API to its flag requirements and detection method
 */
const AI_API_CONFIG = [
  {
    name: 'Prompt API for Gemini Nano',
    description: 'Prompt API for Gemini Nano',
    flag: 'prompt-api-for-gemini-nano',
    flagValue: 'Enabled',
    check: async () => {
      if (!('LanguageModel' in self)) {
        return { enabled: false, available: false, reason: 'API not found - flag not enabled' };
      }
      try {
        const availability = await LanguageModel.availability();
        // If availability check works, the API is enabled
        return {
          enabled: true,
          available: availability === 'available',
          status: availability,
          reason: availability !== 'available' ? 'Model downloading/not ready yet' : null
        };
      } catch (e) {
        // If the check itself fails, the flag might not be fully enabled
        return { enabled: false, available: false, reason: `Check failed: ${e.message}` };
      }
    }
  },
  {
    name: 'Summarization API for Gemini Nano',
    description: 'Summarization API for Gemini Nano',
    flag: 'summarization-api-for-gemini-nano',
    flagValue: 'Enabled',
    check: async () => {
      if (!('Summarizer' in self)) {
        return { enabled: false, available: false, reason: 'API not found - flag not enabled' };
      }
      try {
        const availability = await Summarizer.availability();
        // 'available', 'downloadable', or 'unavailable'
        const isUsable = availability === 'available' || availability === 'downloadable';
        return {
          enabled: true,
          available: isUsable,
          status: availability,
          reason: availability === 'unavailable' ? 'Not supported on this device' :
                  availability === 'downloadable' ? 'Model will download on first use' : null
        };
      } catch (e) {
        return { enabled: false, available: false, reason: `Check failed: ${e.message}` };
      }
    }
  },
  {
    name: 'Writer API for Gemini Nano',
    description: 'Writer API for Gemini Nano',
    flag: 'writer-api-for-gemini-nano',
    flagValue: 'Enabled',
    check: async () => {
      if (!('Writer' in self)) {
        return { enabled: false, available: false, reason: 'API not found - flag not enabled' };
      }
      try {
        const availability = await Writer.availability();
        const isUsable = availability === 'available' || availability === 'downloadable';
        return {
          enabled: true,
          available: isUsable,
          status: availability,
          reason: availability === 'unavailable' ? 'Not supported on this device' :
                  availability === 'downloadable' ? 'Model will download on first use' : null
        };
      } catch (e) {
        return { enabled: false, available: false, reason: `Check failed: ${e.message}` };
      }
    }
  },
  {
    name: 'Rewriter API for Gemini Nano',
    description: 'Rewriter API for Gemini Nano',
    flag: 'rewriter-api-for-gemini-nano',
    flagValue: 'Enabled',
    check: async () => {
      if (!('Rewriter' in self)) {
        return { enabled: false, available: false, reason: 'API not found - flag not enabled' };
      }
      try {
        const availability = await Rewriter.availability();
        const isUsable = availability === 'available' || availability === 'downloadable';
        return {
          enabled: true,
          available: isUsable,
          status: availability,
          reason: availability === 'unavailable' ? 'Not supported on this device' :
                  availability === 'downloadable' ? 'Model will download on first use' : null
        };
      } catch (e) {
        return { enabled: false, available: false, reason: `Check failed: ${e.message}` };
      }
    }
  },
  {
    name: 'Proofreader API for Gemini Nano',
    description: 'Proofreader API for Gemini Nano',
    flag: 'proofreader-api-for-gemini-nano',
    flagValue: 'Enabled',
    check: async () => {
      if (!('Proofreader' in self)) {
        return { enabled: false, available: false, reason: 'API not found - flag not enabled' };
      }
      try {
        const availability = await Proofreader.availability();
        const isUsable = availability === 'available' || availability === 'downloadable';
        return {
          enabled: true,
          available: isUsable,
          status: availability,
          reason: availability === 'unavailable' ? 'Not supported on this device' :
                  availability === 'downloadable' ? 'Model will download on first use' : null
        };
      } catch (e) {
        return { enabled: false, available: false, reason: `Check failed: ${e.message}` };
      }
    }
  },
  {
    name: 'Experimental Translation API',
    description: 'Experimental translation API',
    flag: 'translation-api',
    flagValue: 'Enabled',
    check: async () => {
      // The Translation API can be accessed via 'Translator' (global) or 'self.translation'
      if (!('Translator' in self) && !('translation' in self)) {
        return { enabled: false, available: false, reason: 'API not found - flag not enabled' };
      }

      try {
        // Try the standard Translator API first
        if ('Translator' in self) {
          const availability = await Translator.availability({
            sourceLanguage: 'en',
            targetLanguage: 'es'
          });
          // Translation API returns 'readily', 'after-download', or 'no'
          return {
            enabled: true,
            available: availability === 'readily' || availability === 'after-download',
            status: availability,
            reason: availability === 'after-download' ? 'Model will download on first use' :
                    availability === 'no' ? 'Language pair not supported' : null
          };
        }

        // Fallback to self.translation pattern
        if ('translation' in self && self.translation.canTranslate) {
          const canTranslate = await self.translation.canTranslate({
            sourceLanguage: 'en',
            targetLanguage: 'es'
          });
          return {
            enabled: true,
            available: canTranslate === 'readily' || canTranslate === 'after-download',
            status: canTranslate,
            reason: canTranslate === 'no' ? 'Not supported' :
                    canTranslate === 'after-download' ? 'Model will download on first use' : null
          };
        }

        return { enabled: false, available: false, reason: 'Unable to check availability' };
      } catch (e) {
        return { enabled: false, available: false, reason: `Check failed: ${e.message}` };
      }
    }
  },
  {
    name: 'Language Detector API',
    description: 'Language detection API',
    flag: 'language-detection-api',
    flagValue: 'Enabled',
    check: async () => {
      if (!('LanguageDetector' in self)) {
        return { enabled: false, available: false, reason: 'API not found - flag not enabled' };
      }
      try {
        const availability = await LanguageDetector.availability();
        const isUsable = availability === 'available' || availability === 'downloadable';
        return {
          enabled: true,
          available: isUsable,
          status: availability,
          reason: availability === 'downloadable' ? 'Model will download on first use' : null
        };
      } catch (e) {
        return { enabled: false, available: false, reason: `Check failed: ${e.message}` };
      }
    }
  }
];

/**
 * Check all Chrome AI APIs and return their status
 * @returns {Promise<Object>} Object containing:
 *   - allEnabled: boolean - true if all APIs are enabled
 *   - results: Array of API check results
 *   - disabledAPIs: Array of APIs that need to be enabled
 */
export async function checkAllAIAPIs() {
  const results = [];

  for (const api of AI_API_CONFIG) {
    try {
      const checkResult = await api.check();
      results.push({
        name: api.name,
        description: api.description,
        flag: api.flag,
        flagValue: api.flagValue,
        enabled: checkResult.enabled,
        available: checkResult.available,
        status: checkResult.status,
        reason: checkResult.reason
      });
    } catch (error) {
      results.push({
        name: api.name,
        description: api.description,
        flag: api.flag,
        flagValue: api.flagValue,
        enabled: false,
        available: false,
        reason: `Check failed: ${error.message}`
      });
    }
  }

  // Only include APIs that are truly not enabled (flag not enabled)
  // Don't include APIs that are enabled but models need to download - that's expected
  const disabledAPIs = results.filter(r => !r.enabled);
  const allEnabled = disabledAPIs.length === 0;

  return {
    allEnabled,
    results,
    disabledAPIs
  };
}

/**
 * Get list of APIs that are not enabled (flags not enabled in chrome://flags)
 * Note: This does NOT include APIs that are enabled but need model downloads
 * @returns {Promise<Array>} Array of disabled API info
 */
export async function getDisabledAPIs() {
  const { disabledAPIs } = await checkAllAIAPIs();
  return disabledAPIs;
}

/**
 * Format API status for display
 * @param {Array} disabledAPIs - Array of disabled API objects
 * @returns {string} Formatted HTML string
 */
export function formatAPIWarning(disabledAPIs) {
  if (disabledAPIs.length === 0) {
    return '';
  }

  const apiList = disabledAPIs.map(api =>
    `• <strong>${api.name}</strong>${api.reason ? ` - ${api.reason}` : ''}`
  ).join('<br>');

  // Group by unique flags
  const uniqueFlags = [...new Set(disabledAPIs.map(api => api.flag))];
  const flagInstructions = uniqueFlags.map(flag =>
    `<code>${flag}</code>`
  ).join(', ');

  return `
    <div style="line-height: 1.5;">
      <div style="margin-bottom: 4px;">⚠️ <strong>AI APIs Not Available</strong></div>
      <div style="font-size: 10px; margin-bottom: 6px;">
        ${apiList}
      </div>
      <div style="font-size: 10px; margin-bottom: 6px;">
        <strong>Enable the following flags at chrome://flags:</strong><br>
        ${flagInstructions}
      </div>
      <div style="font-size: 10px;">
        Then restart Chrome for changes to take effect.
      </div>
    </div>
  `;
}

/**
 * Legacy compatibility function
 */
export async function checkAIAPIs() {
  const { results } = await checkAllAIAPIs();

  return {
    summarizer: results.find(r => r.name.includes('Summarization'))?.enabled || false,
    translation: results.find(r => r.name.includes('Translation'))?.enabled || false,
    details: results.reduce((acc, r) => {
      acc[r.flag] = { enabled: r.enabled, available: r.available, status: r.status };
      return acc;
    }, {})
  };
}

/**
 * Log API status to console for debugging
 */
export function logAPIStatus() {
  console.log('Chrome AI APIs Status Check:');
  AI_API_CONFIG.forEach(api => {
    const exists = api.flag.includes('prompt') ? ('LanguageModel' in self) :
                   api.flag.includes('summarization') ? ('Summarizer' in self) :
                   api.flag.includes('writer') ? ('Writer' in self) :
                   api.flag.includes('rewriter') ? ('Rewriter' in self) :
                   api.flag.includes('proofreader') ? ('Proofreader' in self) :
                   api.flag.includes('translation') ? ('Translator' in self) :
                   api.flag.includes('language-detection') ? ('LanguageDetector' in self) : false;

    console.log(`- ${api.name}: ${exists ? 'API found' : 'API not found'}`);
  });
}
