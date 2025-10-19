/**
 * Utility to check Chrome AI API availability
 */

export async function checkAIAPIs() {
  const results = {
    summarizer: false,
    translation: false,
    details: {}
  };

  // Check Summarizer API
  if ('ai' in self && 'summarizer' in self.ai) {
    results.summarizer = true;
    try {
      const availability = await self.ai.summarizer.capabilities();
      results.details.summarizer = availability;
    } catch (e) {
      results.details.summarizer = { error: e.message };
    }
  } else if ('Summarizer' in self) {
    // Legacy API
    results.summarizer = true;
    try {
      const availability = await self.Summarizer.availability();
      results.details.summarizer = { availability };
    } catch (e) {
      results.details.summarizer = { error: e.message };
    }
  }

  // Check Translation API
  if ('translation' in self && 'createTranslator' in self.translation) {
    results.translation = true;
    try {
      const canTranslate = await self.translation.canTranslate({
        sourceLanguage: 'en',
        targetLanguage: 'es'
      });
      results.details.translation = { canTranslate };
    } catch (e) {
      results.details.translation = { error: e.message };
    }
  }

  return results;
}

export function logAPIStatus() {
  console.log('Chrome AI APIs Status:');
  console.log('- Summarizer API:', 'Summarizer' in self ? 'Available' : 'Not available');
  console.log('- Translation API:', 'translation' in self ? 'Available' : 'Not available');

  if ('translation' in self) {
    console.log('  - createTranslator:', 'createTranslator' in self.translation ? 'Yes' : 'No');
    console.log('  - canTranslate:', 'canTranslate' in self.translation ? 'Yes' : 'No');
  }
}
