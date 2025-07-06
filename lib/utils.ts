import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Intelligently hyphenates text to prevent overflow in small containers
 * @param text - The text to hyphenate
 * @param maxWordLength - Maximum length before adding hyphens (default: 8)
 * @returns Text with strategic hyphens added
 */
export function hyphenateText(text: string, maxWordLength: number = 8): string {
  return text
    .split(' ')
    .map(word => {
      if (word.length <= maxWordLength) {
        return word;
      }
      
      // For very long words, add hyphens at strategic points
      const hyphenated = [];
      let currentSegment = '';
      
      for (let i = 0; i < word.length; i++) {
        currentSegment += word[i];
        
        // Add hyphen after vowels or before consonant clusters
        const currentChar = word[i].toLowerCase();
        const nextChar = word[i + 1]?.toLowerCase() || '';
        const isVowel = 'aeiou'.includes(currentChar);
        const nextIsConsonant = nextChar && !'aeiou'.includes(nextChar);
        
        if (
          currentSegment.length >= 4 && // Minimum segment length
          i < word.length - 3 && // Don't hyphenate too close to end
          (
            (isVowel && nextIsConsonant) || // After vowel before consonant
            (currentSegment.length >= 6) // Force break for very long segments
          )
        ) {
          hyphenated.push(currentSegment + '-');
          currentSegment = '';
        }
      }
      
      if (currentSegment) {
        hyphenated.push(currentSegment);
      }
      
      return hyphenated.join('');
    })
    .join(' ');
}
