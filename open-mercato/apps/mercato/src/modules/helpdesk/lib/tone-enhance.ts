/** Rule-based tone polish (JSM-style) without calling external AI packages. */
export function enhanceReplyTone(
  draft: string,
  tone: 'professional' | 'empathetic' | 'friendly' = 'professional',
): string {
  let text = draft.trim()
  if (!text) return text

  if (tone === 'empathetic') {
    if (!/sorry|przepraszam|understand|rozumiem/i.test(text)) {
      text = `We understand the impact of this issue. ${text}`
    }
  } else if (tone === 'friendly') {
    if (!/hi|hello|cześć|dzień dobry/i.test(text)) {
      text = `Hi,\n\n${text}`
    }
  } else {
    if (!/thank you|dziękujemy/i.test(text)) {
      text = `${text}\n\nThank you for your patience.`
    }
  }

  return text.replace(/\s+/g, ' ').replace(/ \n /g, '\n').trim()
}
